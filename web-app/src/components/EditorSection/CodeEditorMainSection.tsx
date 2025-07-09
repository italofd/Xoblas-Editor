"use client";

import { useState } from "react";

import "../Terminal/terminal.css";

import dynamic from "next/dynamic";
import LoadingOverlay from "../LoaderOverlay";
import { useLSPConnection } from "@/hooks/useLSPConnection";
import { EditorV2 } from "../EditorV2/index";
import "./editor.css";

// Use dynamic import only for server-side rendering, but import the component directly for client-side
// This prevents duplicate instances of the component
const DynamicEditorV2 = dynamic(() => Promise.resolve(EditorV2), {
  ssr: false,
  loading: () => <LoadingOverlay isLoading={true} />,
});

export const CodeEditorMainSection = () => {
  const lspConnection = useLSPConnection();
  const [isVsCodeReady, setIsVsCodeReady] = useState(false);

  // Determine if we should show the editor
  const isReady = lspConnection.isConnected && isVsCodeReady;

  return (
    <>
      <LoadingOverlay isLoading={!isReady} />

      {lspConnection.isConnected && (
        <DynamicEditorV2 lspConnection={lspConnection} setIsVsCodeReady={setIsVsCodeReady} />
      )}
    </>
  );
};
