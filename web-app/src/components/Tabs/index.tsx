import { useTabs } from "@/hooks/useTabs";
import { ReactNode } from "react";

export default function Tabs({
  children,
  tabs,
}: {
  children: ReactNode;
  tabs: ReturnType<typeof useTabs>;
}) {
  const {
    handlers: { activateFile, closeFile },
    state: { files, activeFile },
  } = tabs;

  return (
    <div className="flex flex-col h-1/2 border border-zinc-600 rounded shadow-md">
      {/* Header with tabs */}
      <div className="flex items-center justify-between bg-zinc-800 border-b border-gray-600">
        <h2 className="text-lg font-semibold ml-6 my-1">Last Saved</h2>
        <div className="flex overflow-x-auto">
          {files.map((file) => (
            <div
              key={file.id}
              className={`flex items-center px-4 py-2 cursor-pointer  bg-zinc-800 ${file.active ? "bg-white border-t-2 border-blue-500" : "hover:bg-gray-200"}`}
              onClick={() => activateFile(file.id)}
            >
              <span className="mr-2">{file.title}</span>
              <button
                className="ml-2 text-gray-500 hover:text-gray-700"
                onClick={(e) => closeFile(file.id, e)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 p-4 overflow-auto w-full">
        {activeFile ? (
          children
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No output file open
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-6 py-1.5 text-sm text-blue-400 border-t border-gray-500 bg-zinc-800">
        {activeFile ? `${activeFile.title} active` : "No file selected"} •{" "}
        {files.length} file(s) open
      </div>
    </div>
  );
}
