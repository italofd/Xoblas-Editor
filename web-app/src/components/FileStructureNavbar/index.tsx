import { useState, useEffect, useRef } from "react";

import { FileTree } from "./FileTree";
import { FileStructure } from "@/types/terminal";
import "./scrollbar.css";

export default function FileStructureNavbar({ structure }: { structure: FileStructure }) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [width, setWidth] = useState<number>(256);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const minWidth = 160;
  const maxWidth = 480;
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const startResizing = () => {
    setIsResizing(true);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      ref={sidebarRef}
      className="h-full bg-gray-900 text-white p-2 overflow-y-auto border-r border-gray-700 flex-shrink-0 relative file-explorer-scrollbar"
      style={{ width: `${width}px` }}
    >
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="font-semibold">Explorer</h2>
      </div>
      <div className="space-y-0.5">
        <FileTree
          structure={structure}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
        />
      </div>

      <div
        ref={resizeHandleRef}
        className="absolute top-0 right-0 w-1 h-full cursor-ew-resize bg-transparent hover:bg-blue-500"
        onMouseDown={startResizing}
      />
    </div>
  );
}
