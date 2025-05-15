import { FileItemProps, FolderItemProps } from "@/types/filestructure";
import { resolveIcon } from "./utils";

export const FileItem = ({ name, depth }: FileItemProps) => {
  const iconPath = resolveIcon(name, false);

  return (
    <div
      className={`flex items-center py-1 hover:bg-gray-700 rounded cursor-pointer ml-${depth * 4}`}
      title={name}
    >
      <img src={iconPath} alt="" className="w-4 h-4 mr-1.5" />
      <span className="text-gray-300 truncate">{name}</span>
    </div>
  );
};

export const FolderItem = ({ name, toggleFolder, path, depth }: FolderItemProps) => {
  const iconPath = resolveIcon(name, true);

  return (
    <div
      className={`flex items-center py-1 hover:bg-gray-700 rounded cursor-pointer ml-${depth * 4}`}
      onClick={() => toggleFolder(path)}
      title={name}
    >
      <img src={iconPath} alt="" className="w-4 h-4 mr-1.5" />
      <span className="text-gray-200 truncate">{name}</span>
    </div>
  );
};
