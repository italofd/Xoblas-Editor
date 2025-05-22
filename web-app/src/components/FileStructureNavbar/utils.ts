import { getIconForDirectoryPath, getIconForFilePath } from "vscode-material-icons";
import { FileTreeStructure } from "@/types/filestructure";
import { TreeCommandNode } from "@/types/socket";

export function resolveIcon(fileName: string, isFolder: boolean): string {
  if (isFolder) {
    const folderIcon = getIconForDirectoryPath(fileName);
    return folderIcon ? `/icons/${folderIcon}.svg` : "/icons/folder.svg";
  } else {
    const fileIcon = getIconForFilePath(fileName);
    return fileIcon ? `/icons/${fileIcon}.svg` : "/icons/file.svg";
  }
}

export function convertTreeCommandToFileStructure(treeNodes: TreeCommandNode[]): FileTreeStructure {
  const result: FileTreeStructure = {};
  const len = treeNodes.length;

  // Using a for loop with cached length for best performance
  for (let i = 0; i < len; i++) {
    const node = treeNodes[i];
    // Inline type checks for fewer property lookups
    const isDirectory = node.type === "directory";

    if (isDirectory && node.contents) {
      result[node.name] = convertTreeCommandToFileStructure(node.contents);
    } else if (node.type === "file" || node.type === "link") {
      result[node.name] = null;
    }
  }

  return result;
}
