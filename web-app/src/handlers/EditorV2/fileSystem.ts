import * as vscode from "vscode";
import { getServerURL } from "@/utils/getServerURL";
import { TrackAnonymous } from "@/handlers/tracking";
import {
  FileOperationType,
  FileOperationInfo,
  FileOperationBatch,
  ContainerFilesystemChange,
  FilesystemInitialSync,
  FileContentResult,
  FileOperationWebSocketMessage,
  VSCodeRenameFile,
  VSCodeFileOperationFiles,
} from "@/types/filesystem";

// Fast file extension check
function hasFileExtension(uri: vscode.Uri): boolean {
  const path = uri.fsPath;
  const lastSegment = path.split(/[/\\]/).pop() || "";
  return lastSegment.includes(".") && !lastSegment.startsWith(".");
}

// Determine if path is directory with smart detection
async function isDirectory(uri: vscode.Uri, operation: FileOperationType): Promise<boolean> {
  // If it has a file extension, it's definitely a file
  if (hasFileExtension(uri)) {
    return false;
  }

  // For delete operations, we can't stat the file since it's gone
  if (operation === "delete") {
    return true; // Assume directory if no extension and can't stat
  }

  // No extension detected, use fs.stat to check
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return (stat.type & vscode.FileType.Directory) !== 0;
  } catch {
    // If stat fails, assume it's a directory (no extension)
    return true;
  }
}

// Read file content for sending to server
async function readFileContent(uri: vscode.Uri): Promise<FileContentResult> {
  try {
    const data = await vscode.workspace.fs.readFile(uri);

    // Try to decode as UTF-8 first
    try {
      const content = new TextDecoder("utf-8", { fatal: true }).decode(data);
      return { content, contentType: "text" };
    } catch {
      // If UTF-8 fails, encode as base64
      const content = btoa(String.fromCharCode(...data));
      return { content, contentType: "binary" };
    }
  } catch {
    console.error(`Error reading file content for ${uri.fsPath}`);
    return {};
  }
}

// Generic function to process all file operations including rename
async function processFileOperation(
  operation: FileOperationType,
  files: VSCodeFileOperationFiles,
  websocket: WebSocket,
): Promise<void> {
  try {
    const fileInfos: FileOperationInfo[] = await Promise.all(
      files.map(async (file): Promise<FileOperationInfo> => {
        let uri: vscode.Uri;
        let oldPath: string | undefined;

        // Handle rename vs other operations
        if (operation === "rename") {
          const renameFile = file as VSCodeRenameFile;
          uri = renameFile.newUri;
          oldPath = renameFile.oldUri.fsPath;
        } else {
          uri = file as vscode.Uri;
        }

        const isDir = await isDirectory(uri, operation);

        const fileInfo: FileOperationInfo = {
          path: uri.fsPath,
          isDirectory: isDir,
          operation,
          ...(oldPath && { oldPath }),
        };

        // Include content for file operations that involve content (not delete, not directories)
        if (!isDir && operation !== "delete") {
          const { content, contentType } = await readFileContent(uri);
          if (content !== undefined) {
            fileInfo.content = content;
            fileInfo.contentType = contentType;
          }
        }

        return fileInfo;
      }),
    );

    const batch: FileOperationBatch = {
      operation,
      files: fileInfos,
      timestamp: Date.now(),
    };

    sendFileOperationToWebSocket(batch, websocket);
  } catch (error) {
    console.error(`Error processing ${operation} operation:`, error);
  }
}

// Handle filesystem changes coming from the container
function handleContainerFilesystemChange(changeData: ContainerFilesystemChange) {
  console.log("Received filesystem change from container:", changeData);

  // Extract file information
  const files = changeData.files || [];

  for (const fileInfo of files) {
    const { operation, path, oldPath, isDirectory, content, contentType } = fileInfo;

    // Apply the change to the local file system
    applyContainerChangeToWorkspace(operation, path, oldPath, isDirectory, content, contentType);
  }
}

// Handle initial filesystem sync from container
async function handleInitialFilesystemSync(
  syncData: FilesystemInitialSync,
  setIsVsCodeReady: (isReady: boolean) => void,
) {
  console.log("Received initial filesystem sync from container:", syncData);

  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!workspaceRoot) {
      console.error("No workspace folder available");
      return;
    }

    // Simple approach: just clear everything and recreate
    console.log("Clearing workspace for sync...");

    try {
      // Get all items in workspace root
      const existingItems = await vscode.workspace.fs.readDirectory(workspaceRoot);

      // Delete everything except .vscode
      for (const [name] of existingItems) {
        if (name.startsWith(".vscode")) {
          continue; // Keep VS Code settings
        }

        try {
          const itemUri = vscode.Uri.joinPath(workspaceRoot, name);
          await vscode.workspace.fs.delete(itemUri, { recursive: true, useTrash: false });
        } catch (error) {
          console.warn(`Could not delete ${name}:`, error);
        }
      }
    } catch (error) {
      console.warn("Could not clear workspace:", error);
    }

    // No sorting needed - VS Code's filesystem API handles directory creation automatically
    console.log(`Syncing ${syncData.files.length} items to workspace...`);

    // Just process files in the order they come - VS Code will create parent dirs as needed
    for (const fileInfo of syncData.files) {
      try {
        await applyContainerChangeToWorkspace(
          "create",
          fileInfo.path,
          undefined,
          fileInfo.isDirectory,
          fileInfo.content,
          fileInfo.contentType,
        );
      } catch (error) {
        console.error(`Error syncing ${fileInfo.path}:`, error);
      }
    }

    console.log("Initial filesystem sync completed successfully");

    vscode.window.showInformationMessage(
      `Synced ${syncData.files.length} items from container workspace`,
    );

    setIsVsCodeReady(true);
  } catch (error) {
    console.error("Error during initial filesystem sync:", error);
    vscode.window.showErrorMessage("Failed to sync filesystem from container");
  }
}

// Updated workspace path mapping
function mapContainerPathToWorkspace(containerPath: string, watchPath: string): string {
  // Remove the watch path prefix and map to workspace
  const relativePath = containerPath.replace(watchPath, "").replace(/^\/+/, "");

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    throw new Error("No workspace folder available");
  }

  return relativePath ? `${workspaceRoot}/${relativePath}` : workspaceRoot;
}

// Simplified apply function - VS Code handles parent directory creation
async function applyContainerChangeToWorkspace(
  operation: FileOperationType | string,
  containerPath: string,
  oldContainerPath?: string,
  isDirectory?: boolean,
  content?: string,
  contentType?: string,
) {
  try {
    // Map container path to workspace path
    const workspacePath = mapContainerPathToWorkspace(containerPath, "/home/termuser/root");
    const uri = vscode.Uri.file(workspacePath);

    let oldUri: vscode.Uri | undefined;
    if (oldContainerPath) {
      const oldWorkspacePath = mapContainerPathToWorkspace(oldContainerPath, "/home/termuser/root");
      oldUri = vscode.Uri.file(oldWorkspacePath);
    }

    switch (operation) {
      case "create":
        if (isDirectory) {
          // VS Code createDirectory automatically creates parent directories
          await vscode.workspace.fs.createDirectory(uri);
        } else {
          // VS Code writeFile automatically creates parent directories
          let fileData: Uint8Array;

          if (content !== undefined) {
            if (contentType === "binary") {
              const binaryString = atob(content);
              fileData = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                fileData[i] = binaryString.charCodeAt(i);
              }
            } else {
              fileData = new TextEncoder().encode(content);
            }
          } else {
            fileData = new Uint8Array();
          }

          await vscode.workspace.fs.writeFile(uri, fileData);
        }
        break;

      case "delete":
        try {
          // VS Code delete with recursive=true handles everything
          await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: false });
        } catch {
          console.log(`File already deleted: ${workspacePath}`);
        }
        break;

      case "change":
        if (!isDirectory && content !== undefined) {
          let fileData: Uint8Array;

          if (contentType === "binary") {
            const binaryString = atob(content);
            fileData = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              fileData[i] = binaryString.charCodeAt(i);
            }
          } else {
            fileData = new TextEncoder().encode(content);
          }

          await vscode.workspace.fs.writeFile(uri, fileData);
        }
        break;

      case "rename":
        if (oldUri) {
          try {
            await vscode.workspace.fs.rename(oldUri, uri, { overwrite: true });

            if (!isDirectory && content !== undefined) {
              let fileData: Uint8Array;

              if (contentType === "binary") {
                const binaryString = atob(content);
                fileData = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  fileData[i] = binaryString.charCodeAt(i);
                }
              } else {
                fileData = new TextEncoder().encode(content);
              }

              await vscode.workspace.fs.writeFile(uri, fileData);
            }
          } catch (error) {
            console.error(`Error renaming ${oldContainerPath} to ${containerPath}:`, error);
          }
        }
        break;

      default:
        console.log(`Unknown operation from container: ${operation}`);
    }
  } catch (error) {
    console.error(`Error applying container change: ${operation} ${containerPath}`, error);
  }
}

// WebSocket sender function
function sendFileOperationToWebSocket(batch: FileOperationBatch, websocket: WebSocket): void {
  console.log("Sending to WebSocket:", batch);

  if (websocket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket not connected, cannot send file operation");
    return;
  }

  // Send the file operation batch to the server
  const message: FileOperationWebSocketMessage = {
    type: "file_operation",
    data: batch,
  };

  websocket.send(JSON.stringify(message));
}

// Initialize WebSocket connection for file operations
function initializeFilesystemWebSocket(setIsVsCodeReady: (isReady: boolean) => void): WebSocket {
  const tracker = new TrackAnonymous();
  const userId = tracker.getUserID();

  const wsUrl = getServerURL("ws") + `/ws/filesystem/${encodeURIComponent(userId)}`;

  const websocket = new WebSocket(wsUrl);

  websocket.addEventListener("open", () => {
    console.log("Filesystem WebSocket connected");
  });

  websocket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("Filesystem WebSocket received:", data);

      // Handle different message types
      if (data.type === "filesystem_change_from_container") {
        handleContainerFilesystemChange(data as ContainerFilesystemChange);
      } else if (data.type === "filesystem_initial_sync") {
        handleInitialFilesystemSync(data as FilesystemInitialSync, setIsVsCodeReady);
      }
    } catch (error) {
      console.error("Error parsing filesystem WebSocket message:", error);
    }
  });

  websocket.addEventListener("error", (error) => {
    console.error("Filesystem WebSocket error:", error);
  });

  websocket.addEventListener("close", () => {
    console.log("Filesystem WebSocket disconnected");
  });

  return websocket;
}

// Updated file system watcher with unified handler
export const fileSystemWatcher = (setIsVsCodeReady: (isReady: boolean) => void) => {
  // Initialize WebSocket connection within the function scope
  const filesystemWebSocket = initializeFilesystemWebSocket(setIsVsCodeReady);

  // Workspace events (batch operations) - pass websocket to each handler
  vscode.workspace.onDidCreateFiles((event) => {
    processFileOperation("create", event.files, filesystemWebSocket);
  });

  vscode.workspace.onDidDeleteFiles((event) => {
    processFileOperation("delete", event.files, filesystemWebSocket);
  });

  vscode.workspace.onDidRenameFiles((event) => {
    processFileOperation("rename", event.files, filesystemWebSocket);
  });

  // Handle file content changes
  vscode.workspace.onDidChangeTextDocument((event) => {
    // Only send change events for saved files to avoid spam
    const uri = event.document.uri;
    if (event.document.isDirty) {
      return; // Don't send changes for unsaved files
    }

    processFileOperation("change", [uri], filesystemWebSocket);
  });
};
