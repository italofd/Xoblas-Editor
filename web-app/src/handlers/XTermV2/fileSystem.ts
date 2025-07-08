import * as vscode from "vscode";
import { getServerURL } from "@/utils/getServerURL";
import { TrackAnonymous } from "@/handlers/tracking";

// Define the types for file operations
interface FileOperationInfo {
  path: string;
  isDirectory: boolean;
  operation: "create" | "delete" | "change" | "rename";
  oldPath?: string; // Only for rename operations
}

interface FileOperationBatch {
  operation: "create" | "delete" | "change" | "rename";
  files: FileOperationInfo[];
  timestamp: number;
}

// Fast file extension check
function hasFileExtension(uri: vscode.Uri): boolean {
  const path = uri.fsPath;
  const lastSegment = path.split(/[/\\]/).pop() || "";
  return lastSegment.includes(".") && !lastSegment.startsWith(".");
}

// Determine if path is directory with smart detection
async function isDirectory(uri: vscode.Uri, operation: string): Promise<boolean> {
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
  } catch (error) {
    // If stat fails, assume it's a directory (no extension)
    return true;
  }
}

// Generic function to process all file operations including rename
async function processFileOperation(
  operation: "create" | "delete" | "change" | "rename",
  files: readonly vscode.Uri[] | readonly { oldUri: vscode.Uri; newUri: vscode.Uri }[],
  websocket: WebSocket,
): Promise<void> {
  try {
    const fileInfos: FileOperationInfo[] = await Promise.all(
      files.map(async (file): Promise<FileOperationInfo> => {
        let uri: vscode.Uri;
        let oldPath: string | undefined;

        // Handle rename vs other operations
        if (operation === "rename") {
          const renameFile = file as { oldUri: vscode.Uri; newUri: vscode.Uri };
          uri = renameFile.newUri;
          oldPath = renameFile.oldUri.fsPath;
        } else {
          uri = file as vscode.Uri;
        }

        const isDir = await isDirectory(uri, operation);

        console.log("EVA01 IsDirectory:", isDir);

        return {
          path: uri.fsPath,
          isDirectory: isDir,
          operation,
          ...(oldPath && { oldPath }),
        };
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
function handleContainerFilesystemChange(changeData: any) {
  console.log("Received filesystem change from container:", changeData);

  // Extract file information
  const files = changeData.files || [];

  for (const fileInfo of files) {
    const { operation, path, oldPath, isDirectory } = fileInfo;

    // Apply the change to the local file system
    applyContainerChangeToWorkspace(operation, path, oldPath, isDirectory);
  }
}

// Apply filesystem changes from container to the VSCode workspace
async function applyContainerChangeToWorkspace(
  operation: string,
  path: string,
  oldPath?: string,
  isDirectory?: boolean,
) {
  try {
    const uri = vscode.Uri.file(path);

    switch (operation) {
      case "create":
        if (isDirectory) {
          await vscode.workspace.fs.createDirectory(uri);
        } else {
          await vscode.workspace.fs.writeFile(uri, new Uint8Array());
        }
        break;

      case "delete":
        try {
          await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: false });
        } catch (error) {
          // File might already be deleted, ignore error
          console.log(`File already deleted: ${path}`);
        }
        break;

      case "rename":
        if (oldPath) {
          const oldUri = vscode.Uri.file(oldPath);
          try {
            await vscode.workspace.fs.rename(oldUri, uri, { overwrite: true });
          } catch (error) {
            console.error(`Error renaming ${oldPath} to ${path}:`, error);
          }
        }
        break;

      case "change":
        // For file changes, we could potentially reload the file content
        // For now, just log it
        console.log(`File changed in container: ${path}`);
        break;

      default:
        console.log(`Unknown operation from container: ${operation}`);
    }
  } catch (error) {
    console.error(`Error applying container change: ${operation} ${path}`, error);
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
  websocket.send(
    JSON.stringify({
      type: "file_operation",
      data: batch,
    }),
  );
}

// Initialize WebSocket connection for file operations
function initializeFilesystemWebSocket(): WebSocket {
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
        // Handle filesystem changes from the container
        handleContainerFilesystemChange(data);
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
export const fileSystemWatcher = () => {
  // Initialize WebSocket connection within the function scope
  const filesystemWebSocket = initializeFilesystemWebSocket();

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
};
