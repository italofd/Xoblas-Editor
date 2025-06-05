import { FileItemProps, FolderItemProps } from "@/types/filestructure";
import { resolveIcon } from "./utils";
import Image from "next/image";

// Chevron SVG component
const ChevronIcon = ({ isExpanded }: { isExpanded: boolean }) => (
  <svg
    className={`w-3 h-3 mr-1 text-gray-400 transition-transform duration-150 ${
      isExpanded ? "rotate-90" : "rotate-0"
    }`}
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path d="M6 4l4 4-4 4V4z" />
  </svg>
);

export const FileItem = ({ name, depth }: FileItemProps) => {
  const iconPath = resolveIcon(name, false);

  return (
    <div
      className={`flex items-center py-1 hover:bg-gray-700 rounded cursor-pointer transition-colors duration-100 ml-${depth * 4}`}
      title={name}
    >
      <div className="w-3 mr-1"></div> {/* Spacer for alignment with folders */}
      <Image src={iconPath} alt="" className="w-4 h-4 mr-1.5" />
      <span className="text-gray-300 truncate">{name}</span>
    </div>
  );
};

export const FolderItem = ({ name, toggleFolder, path, depth, isExpanded }: FolderItemProps) => {
  const iconPath = resolveIcon(name, true);

  return (
    <div
      className={`flex items-center py-1 hover:bg-gray-700 rounded cursor-pointer transition-colors duration-100 ml-${depth * 4}`}
      onClick={() => toggleFolder(path)}
      title={name}
    >
      <ChevronIcon isExpanded={isExpanded} />
      <Image src={iconPath} alt="" className="w-4 h-4 mr-1.5" />
      <span className="text-gray-200 truncate">{name}</span>
    </div>
  );
};
