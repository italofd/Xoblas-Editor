"use client";

import { useEffect, useRef } from "react";

import { MainLayout } from "./MainLayout";
import { CodeEditorDTO } from "@/types/editor";

import "../Terminal/terminal.css";

import dynamic from "next/dynamic";
import { useSocket } from "@/hooks/useSocket";
import LoadingOverlay from "../LoaderOverlay";
import FileStructureNavbar from "../FileStructureNavbar";
import { useLSPConnection } from "@/hooks/useLSPConnection";
import { EditorV2 } from "../EditorV2/index";
import "./editor.css";

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
  const lspConnection = useLSPConnection();

  //Whenever we have file data, overwrite the terminal
  //This is used for already used and modified containers so UI don't get out of sync
  //Eventually this can be used to change multiple files (multi file editor with file structure)
  useEffect(() => {
    if (editorRef.current && socketHook.fileData)
      editorRef.current.setValue(socketHook.fileData.content);
  }, [editorRef, socketHook.fileData]);

  // Determine if we should show the editor
  const showEditor = lspConnection.isConnected;

  // Determine overall loading state
  const isSystemLoading = !socketHook.isEnvReady || !lspConnection.isConnected;

  return (
    <>
      {/* <FileStructureNavbar structure={socketHook.fileStructure} /> */}

      {/* <div className="flex flex-col w-full h-full max-h-full overflow-hidden"> */}
      {/* <LoadingOverlay isLoading={isSystemLoading} /> */}

      {/* <div className="flex flex-col flex-grow min-h-0"> */}
      {showEditor && <DynamicEditorV2 lspConnection={lspConnection} />}
      {/* </div> */}

      {/* <XTerminal socketHook={socketHook} /> */}
      {/* </div> */}
    </>
  );
};
