import { FileTreeProps } from "@/types/filestructure";
import { FileItem, FolderItem } from "./Items";

export const FileTree = ({
  structure,
  expandedFolders,
  toggleFolder,
  path = "",
  depth = 0,
}: FileTreeProps) => {
  return Object.entries(structure).map(([key, value]) => {
    const fullPath = path ? `${path}/${key}` : key;
    const isFolder = value !== null;

    if (isFolder) {
      const isExpanded = expandedFolders[fullPath];
      return (
        <div key={fullPath} className="mb-0.5">
          <FolderItem
            name={key}
            isExpanded={isExpanded}
            toggleFolder={toggleFolder}
            path={fullPath}
            depth={depth}
          />
          {isExpanded && (
            <div className="pl-2">
              <FileTree
                structure={value}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                path={fullPath}
                depth={depth + 1}
              />
            </div>
          )}
        </div>
      );
    } else {
      return <FileItem key={fullPath} name={key} depth={depth} />;
    }
  });
};
