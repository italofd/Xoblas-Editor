"use client";

import { useEffect, useRef, useState } from "react";

import { MainLayout } from "./MainLayout";
import { CodeEditorDTO } from "@/types/editor";

import "../Terminal/terminal.css";

import dynamic from "next/dynamic";
import { useSocket } from "@/hooks/useSocket";
import LoadingOverlay from "../LoaderOverlay";
import FileStructureNavbar from "../FileStructureNavbar";
import { useMonacoInitialization } from "@/hooks/useMonacoInitialization";
import { useLSPConnection } from "@/hooks/useLSPConnection";
import { EditorV2 } from "../EditorV2/index";

const XTerminal = dynamic(() => import("../Terminal/index"), {
  ssr: false,
});

// Use dynamic import only for server-side rendering, but import the component directly for client-side
// This prevents duplicate instances of the component
const DynamicEditorV2 = dynamic(() => Promise.resolve(EditorV2), {
  ssr: false,
  loading: () => <LoadingOverlay isLoading={true} />,
});

export const CodeEditorMainSection = () => {
  const editorRef = useRef<CodeEditorDTO>(null);
  const socketHook = useSocket();
  const { isInitialized, isVscodeInitialized, error: monacoInitError } = useMonacoInitialization();
  const lspConnection = useLSPConnection();
  const [isLoading, setIsLoading] = useState(true);

  // Handle Monaco initialization
  useEffect(() => {
    if (isInitialized.current) {
      setIsLoading(false);
    }

    if (monacoInitError) {
      console.error("Failed to initialize Monaco:", monacoInitError);
    }
  }, [isInitialized, monacoInitError]);

  //Whenever we have file data, overwrite the terminal
  //This is used for already used and modified containers so UI don't get out of sync
  //Eventually this can be used to change multiple files (multi file editor with file structure)
  useEffect(() => {
    if (editorRef.current && socketHook.fileData)
      editorRef.current.setValue(socketHook.fileData.content);
  }, [editorRef, socketHook.fileData]);

  // Determine if we should show the editor
  const showEditor =
    !isLoading && isInitialized.current && lspConnection.isConnected && isVscodeInitialized.current;

  // Determine overall loading state
  const isSystemLoading = isLoading || !socketHook.isEnvReady || !lspConnection.isConnected;

  return (
    <>
      <FileStructureNavbar structure={socketHook.fileStructure} />

      <div className="flex flex-col w-full h-full max-h-full overflow-hidden">
        <LoadingOverlay isLoading={isSystemLoading} />

        <div className="flex flex-col flex-grow min-h-0">
          <MainLayout>{showEditor && <DynamicEditorV2 lspConnection={lspConnection} />}</MainLayout>
        </div>

        <XTerminal socketHook={socketHook} />
      </div>
    </>
  );
};
