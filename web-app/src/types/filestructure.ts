import { FileStructure } from "./terminal";

export type FileTreeStructure = {
  [key: string]: FileTreeStructure | null;
};

export interface FileItemProps {
  name: string;
  depth: number;
}

export interface FolderItemProps {
  name: string;
  isExpanded: boolean;
  toggleFolder: (path: string) => void;
  path: string;
  depth: number;
}

export interface FileTreeProps {
  structure: FileStructure;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (path: string) => void;
  path?: string;
  depth?: number;
}
