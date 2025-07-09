// Filesystem operation types for file synchronization
import * as vscode from "vscode";

// Base operation types
export type FileOperationType = "create" | "delete" | "change" | "rename";
export type ContentType = "text" | "binary";

export interface FileInfo {
  size: number;
  mtime: number;
  permissions: string;
  name: string;
}

export interface FileOperationInfo {
  path: string;
  isDirectory: boolean;
  operation: FileOperationType;
  oldPath?: string; // Only for rename operations
  content?: string; // File content for create/change operations
  contentType?: ContentType; // Content encoding type
  fileInfo?: FileInfo;
}

export interface FileOperationBatch {
  operation: FileOperationType;
  files: FileOperationInfo[];
  timestamp: number;
}

// Interface for filesystem changes from container
export interface ContainerFilesystemChange {
  type: "filesystem_change_from_container";
  operation: string;
  files: FileOperationInfo[];
  timestamp: number;
  source: "container";
}

// Interface for initial filesystem sync
export interface FilesystemInitialSync {
  type: "filesystem_initial_sync";
  files: FileOperationInfo[];
  timestamp: number;
  source: "container";
  watch_path: string;
}

// Type for file content reading results
export interface FileContentResult {
  content?: string;
  contentType?: ContentType;
}

// WebSocket message types
export interface FileOperationWebSocketMessage {
  type: "file_operation";
  data: FileOperationBatch;
}

// VSCode file operation types
export interface VSCodeRenameFile {
  oldUri: vscode.Uri;
  newUri: vscode.Uri;
}

export type VSCodeFileOperationFiles = readonly vscode.Uri[] | readonly VSCodeRenameFile[];
