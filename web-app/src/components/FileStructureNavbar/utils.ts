import { getIconForDirectoryPath, getIconForFilePath } from "vscode-material-icons";

export function resolveIcon(fileName: string, isFolder: boolean): string {
  if (isFolder) {
    const folderIcon = getIconForDirectoryPath(fileName);
    return folderIcon ? `/icons/${folderIcon}.svg` : "/icons/folder.svg";
  } else {
    const fileIcon = getIconForFilePath(fileName);
    return fileIcon ? `/icons/${fileIcon}.svg` : "/icons/file.svg";
  }
}
