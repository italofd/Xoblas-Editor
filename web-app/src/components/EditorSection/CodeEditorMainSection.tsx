"use client";

import { useEffect, useRef } from "react";

import { CodeEditor } from "@/components/EditorSection/CodeEditor";
import { MainLayout } from "./MainLayout";
import { CodeEditorDTO } from "@/types/editor";

import "../Terminal/terminal.css";

import dynamic from "next/dynamic";
import { useSocket } from "@/hooks/useSocket";
import LoadingOverlay from "../LoaderOverlay";

const XTerminal = dynamic(() => import("../Terminal/index"), {
  ssr: false,
});

export const CodeEditorMainSection = () => {
  const editorRef = useRef<CodeEditorDTO>(null);

  const socketHook = useSocket();

  //Whenever we have file data, overwrite the terminal
  //This is used for already used and modified containers so UI don't get out of sync
  //Eventually this can be used to change multiple files (multi file editor with file structure)
  useEffect(() => {
    if (editorRef.current && socketHook.fileData)
      editorRef.current.setValue(socketHook.fileData.content);
  }, [editorRef, socketHook.fileData]);

  return (
    <>
      <LoadingOverlay isLoading={!socketHook.isEnvReady} />

      <div className="flex flex-col lg:flex-row w-full h-full">
        <MainLayout>
          <div className="flex h-full gap-8">
            <CodeEditor
              onSave={(content) =>
                socketHook.socket.current?.send(JSON.stringify({ type: "write_file", content }))
              }
              editorRef={editorRef}
            />
          </div>
        </MainLayout>
      </div>

      <XTerminal socketHook={socketHook} />
    </>
  );
};
