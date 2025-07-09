"use client";
import { useEffect, useRef } from "react";
import { MonacoEditorLanguageClientWrapper } from "monaco-editor-wrapper";
import * as monaco from "@codingame/monaco-vscode-editor-api";
import { MonacoLanguageClient } from "monaco-languageclient";
import { WorkerLoader } from "monaco-languageclient/workerFactory";

import { LSPConnection } from "@/hooks/useLSPConnection";

import { createAndStartLanguageClient } from "@/handlers/EditorV2/config";
import { createAndInitializeWrapper } from "@/handlers/EditorV2/config";
import { setupFileSystemProvider } from "@/handlers/EditorV2/config";
import { fileSystemWatcher } from "@/handlers/EditorV2/fileSystem";

import "@codingame/monaco-vscode-python-default-extension";
import "@codingame/monaco-vscode-theme-defaults-default-extension";
import "vscode/localExtensionHost";
import "@codingame/monaco-vscode-clojure-default-extension";
import "@codingame/monaco-vscode-cpp-default-extension";
import "@codingame/monaco-vscode-csharp-default-extension";
import "@codingame/monaco-vscode-css-default-extension";
import "@codingame/monaco-vscode-diff-default-extension";
import "@codingame/monaco-vscode-fsharp-default-extension";
import "@codingame/monaco-vscode-go-default-extension";
import "@codingame/monaco-vscode-groovy-default-extension";
import "@codingame/monaco-vscode-html-default-extension";
import "@codingame/monaco-vscode-java-default-extension";
import "@codingame/monaco-vscode-javascript-default-extension";
import "@codingame/monaco-vscode-json-default-extension";
import "@codingame/monaco-vscode-julia-default-extension";
import "@codingame/monaco-vscode-lua-default-extension";
import "@codingame/monaco-vscode-markdown-basics-default-extension";
import "@codingame/monaco-vscode-objective-c-default-extension";
import "@codingame/monaco-vscode-perl-default-extension";
import "@codingame/monaco-vscode-php-default-extension";
import "@codingame/monaco-vscode-powershell-default-extension";
import "@codingame/monaco-vscode-r-default-extension";
import "@codingame/monaco-vscode-ruby-default-extension";
import "@codingame/monaco-vscode-rust-default-extension";
import "@codingame/monaco-vscode-scss-default-extension";
import "@codingame/monaco-vscode-shellscript-default-extension";
import "@codingame/monaco-vscode-sql-default-extension";
import "@codingame/monaco-vscode-swift-default-extension";
import "@codingame/monaco-vscode-typescript-basics-default-extension";
import "@codingame/monaco-vscode-vb-default-extension";
import "@codingame/monaco-vscode-xml-default-extension";
import "@codingame/monaco-vscode-yaml-default-extension";
import "@codingame/monaco-vscode-theme-defaults-default-extension";
import "@codingame/monaco-vscode-theme-seti-default-extension";
import "@codingame/monaco-vscode-references-view-default-extension";
import "@codingame/monaco-vscode-search-result-default-extension";
import "@codingame/monaco-vscode-configuration-editing-default-extension";
import "@codingame/monaco-vscode-markdown-math-default-extension";
import "@codingame/monaco-vscode-npm-default-extension";
import "@codingame/monaco-vscode-media-preview-default-extension";
import "@codingame/monaco-vscode-ipynb-default-extension";

// Define Props for the Editor
export interface CustomMonacoEditorProps {
  lspConnection: LSPConnection;
  setIsVsCodeReady: (isReady: boolean) => void;
}

const imptUrl = import.meta.url;

const workerLoaders: Partial<Record<string, WorkerLoader>> = {
  TextEditorWorker: () =>
    new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", imptUrl), {
      type: "module",
    }),
  TextMateWorker: () =>
    new Worker(new URL("@codingame/monaco-vscode-textmate-service-override/worker", imptUrl), {
      type: "module",
    }),
  LocalFileSearchWorker: () =>
    new Worker(new URL("@codingame/monaco-vscode-search-service-override/worker", imptUrl), {
      type: "module",
    }),
  LanguageDetectionWorker: () =>
    new Worker(
      new URL(
        "@codingame/monaco-vscode-language-detection-worker-service-override/worker",
        imptUrl,
      ),
      { type: "module" },
    ),
  OutputLinkDetectionWorker: () =>
    new Worker(new URL("@codingame/monaco-vscode-output-service-override/worker", imptUrl), {
      type: "module",
    }),
};

window.MonacoEnvironment = {
  getWorker: function (_moduleId, label) {
    const workerFactory = workerLoaders[label];
    if (workerFactory != null) {
      return workerFactory();
    }
    throw new Error(`Worker ${label} not found`);
  },
};

export const EditorV2 = ({ lspConnection, setIsVsCodeReady }: CustomMonacoEditorProps) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<MonacoEditorLanguageClientWrapper | null>(null);
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const hasInitializedRef = useRef(false);
  const languageClientRef = useRef<MonacoLanguageClient | null>(null);

  // Initialize editor when LSP connection is ready
  useEffect(() => {
    // Skip if already initialized or if connection is not ready

    if (
      hasInitializedRef.current ||
      !editorContainerRef.current ||
      !lspConnection.isConnected ||
      !lspConnection.reader ||
      !lspConnection.writer ||
      lspConnection.socket?.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    const initEditor = async () => {
      try {
        hasInitializedRef.current = true;

        console.log("Initializing editor with LSP connection", lspConnection);

        const workspaceRoot = "/home/termuser/root";

        // Setup file system
        setupFileSystemProvider();

        // Create and initialize wrapper
        const newWrapper = await createAndInitializeWrapper(
          workspaceRoot,
          "",
          editorContainerRef.current!,
        );
        wrapperRef.current = newWrapper;

        // Create and start language client
        const languageClient = await createAndStartLanguageClient("python", lspConnection);
        languageClientRef.current = languageClient;
      } catch (error) {
        console.error("Failed to initialize or start Monaco Editor wrapper:", error);
        if (wrapperRef.current) {
          wrapperRef.current.dispose();
          wrapperRef.current = null;
        }
        hasInitializedRef.current = false;
      }
    };

    initEditor().then(() => {
      fileSystemWatcher(setIsVsCodeReady);
    });

    return () => {
      if (languageClientRef.current && languageClientRef.current.isRunning()) {
        console.log("Warning: Stopping language client");
        languageClientRef.current.stop();
        languageClientRef.current = null;
      }

      if (editorInstanceRef.current) {
        console.log("Warning: Disposing editor instance");
        const model = editorInstanceRef.current.getModel();
        if (model && !model.isDisposed()) {
          model.dispose();
        }
        editorInstanceRef.current.dispose();
        editorInstanceRef.current = null;
      }

      if (wrapperRef.current) {
        console.log("Warning: Disposing language wrapper");
        wrapperRef.current.dispose();
        wrapperRef.current = null;
      }
    };
  }, [lspConnection, setIsVsCodeReady]);

  if (lspConnection.error) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-900 text-white p-4">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Connection Error</h3>
          <p className="text-red-400">{lspConnection.error.message}</p>
          <p className="mt-2">Unable to connect to the language server.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={editorContainerRef} style={{ height: "100%", width: "100%" }} />
    </>
  );
};

export default EditorV2;
