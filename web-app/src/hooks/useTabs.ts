import { TabFile } from "@/types/tabs";
import { useState, MouseEvent as MouseEventType } from "react";

/**
 * [TO-DO]: if we still have time left, refac for a object approach
 * Making it faster for operations like insertion and delete (or even update, but its not implemented)
 */
export const useTabs = () => {
  const [isLoadingOutputs, setIsLoadingOutputs] = useState<boolean>(false);
  const [files, setFiles] = useState<TabFile[]>([]);

  // Get the currently active file
  //[To-do]: Memoize this value =)
  const activeFile = files.find((file) => file.active);

  // Add a new file
  const addFiles = (db_files: typeof files) => {
    if (db_files.length > 0) {
      setFiles((prev) =>
        //Make previous unactive and add new
        prev.map((file) => ({ ...file, active: false })).concat(db_files),
      );
      activateFile(db_files.at(-1)!.id);
    }
  };

  // Close a file
  const closeFile = (
    id: string,
    e: MouseEventType<HTMLButtonElement, MouseEvent>,
  ) => {
    e.stopPropagation();
    const fileToClose = files.find((file) => file.id === id);

    // If we're closing the active file, activate another one if possible
    if (fileToClose?.active && files.length > 1) {
      const index = files.findIndex((file) => file.id === id);
      const newActiveIndex = index === 0 ? 1 : index - 1;

      setFiles((prev) =>
        prev
          .filter((file) => file.id !== id)
          .map((file) => ({
            ...file,
            active: files.findIndex((f) => f.id === file.id) === newActiveIndex,
          })),
      );
    } else {
      setFiles((prev) => prev.filter((file) => file.id !== id));
    }
  };

  // Activate a file
  const activateFile = (id: string) => {
    setFiles((prev) =>
      prev.map((file) => ({
        ...file,
        active: file.id === id,
      })),
    );
  };

  return {
    state: {
      isLoadingOutputs,
      files,
      activeFile,
    },
    handlers: {
      closeFile,
      addFiles,
      activateFile,
      setIsLoadingOutputs,
    },
  };
};
