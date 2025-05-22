"use client";

import { useEffect, useRef } from "react";

import { CodeEditor } from "@/components/EditorSection/CodeEditor";
import { MainLayout } from "./MainLayout";
import { CodeEditorDTO } from "@/types/editor";

import "../Terminal/terminal.css";

import dynamic from "next/dynamic";
import { useSocket } from "@/hooks/useSocket";
import LoadingOverlay from "../LoaderOverlay";
import FileStructureNavbar from "../FileStructureNavbar";

const XTerminal = dynamic(() => import("../Terminal/index"), {
  ssr: false,
});

export const CodeEditorMainSection = () => {
  const editorRef = useRef<CodeEditorDTO>(null);

  const socketHook = useSocket();

  //Unify socket calls into a single place

  //Whenever we have file data, overwrite the terminal
  //This is used for already used and modified containers so UI don't get out of sync
  //Eventually this can be used to change multiple files (multi file editor with file structure)
  useEffect(() => {
    if (editorRef.current && socketHook.fileData)
      editorRef.current.setValue(socketHook.fileData.content);
  }, [editorRef, socketHook.fileData]);

  return (
    <>
      <FileStructureNavbar structure={socketHook.fileStructure} />

      <div className="flex flex-col w-full h-full max-h-full overflow-hidden">
        <LoadingOverlay isLoading={!socketHook.isEnvReady} />

        <div className="flex flex-col flex-grow min-h-0">
          <MainLayout>
            <CodeEditor
              onSave={(content) => {
                socketHook.handlers.sendEvent({
                  type: "write_file",
                  data: {
                    content,
                  },
                });
              }}
              editorRef={editorRef}
            />
          </MainLayout>
        </div>

        <XTerminal socketHook={socketHook} />
      </div>
    </>
  );
};
