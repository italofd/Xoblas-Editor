"use client";
import { useEffect, useRef } from "react";
import { MonacoEditorLanguageClientWrapper } from "monaco-editor-wrapper";
import * as monaco from "@codingame/monaco-vscode-editor-api";

import { MonacoLanguageClient } from "monaco-languageclient";
import { CloseAction, ErrorAction } from "vscode-languageclient";
import * as vscode from "vscode";

import { LogLevel } from "@codingame/monaco-vscode-api";
import { LSPConnection } from "@/hooks/useLSPConnection";
import { WorkerLoader } from "monaco-languageclient/workerFactory";
import { updateUserConfiguration } from "@codingame/monaco-vscode-configuration-service-override";
import "@codingame/monaco-vscode-theme-defaults-default-extension";
import "@codingame/monaco-vscode-python-default-extension";

// Define Props for the Editor
export interface CustomMonacoEditorProps {
  initialCode?: string;
  languageId?: string;
  theme?: string;
  editorOptions?: monaco.editor.IStandaloneEditorConstructionOptions;
  onCodeChange?: (code: string, event: monaco.editor.IModelContentChangedEvent) => void;
  lspConnection: LSPConnection;
}

const workerLoaders: Partial<Record<string, WorkerLoader>> = {
  TextEditorWorker: () =>
    new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), {
      type: "module",
    }),
  TextMateWorker: () =>
    new Worker(
      new URL("@codingame/monaco-vscode-textmate-service-override/worker", import.meta.url),
      { type: "module" },
    ),
};

window.MonacoEnvironment = {
  getWorker: function (_moduleId, label) {
    console.log("getWorker", _moduleId, label);
    const workerFactory = workerLoaders[label];
    if (workerFactory != null) {
      return workerFactory();
    }
    throw new Error(`Worker ${label} not found`);
  },
};

export const EditorV2 = ({
  initialCode = "# Start coding here!",
  languageId = "python",
  theme = "vs-dark",
  editorOptions,
  onCodeChange,
  lspConnection,
}: CustomMonacoEditorProps) => {
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

        // Create the language client
        const languageClient = new MonacoLanguageClient({
          name: "Python Language Client",
          id: "python-language-client",
          clientOptions: {
            progressOnInitialization: true,

            workspaceFolder: {
              index: 0,
              name: workspaceRoot,
              uri: vscode.Uri.parse(workspaceRoot),
            },
            documentSelector: [languageId],
            errorHandler: {
              error: (err) => {
                console.log("Error", err);
                return { action: ErrorAction.Continue };
              },
              closed: () => ({ action: CloseAction.DoNotRestart }),
            },
          },
          // Use the reader and writer                                  from our LSP connection
          messageTransports: {
            reader: lspConnection.reader!,
            writer: lspConnection.writer!,
          },
        });

        await updateUserConfiguration(`{
    "editor.fontSize": 16,
    "editor.lineHeight": 12,
    "editor.fontFamily": "monospace",
    "editor.letterSpacing": 0,
                            "workbench.colorTheme": "Default Dark Modern",

    }`);

        await languageClient.start();

        const newWrapper = new MonacoEditorLanguageClientWrapper();
        wrapperRef.current = newWrapper;

        await newWrapper.init({
          $type: "extended",
          id: "editor-wrapper",
          logLevel: LogLevel.Debug,

          editorAppConfig: {
            codeResources: {
              modified: {
                text: initialCode,
                uri: workspaceRoot + "/main.py",
                enforceLanguageId: "python",
              },
              original: {
                text: initialCode,
                uri: workspaceRoot + "/main.py",
                enforceLanguageId: "python",
              },
            },
          },
          vscodeApiConfig: {
            vscodeApiInitPerformExternally: true,
          },
        });

        console.log("Starting language wrapper");

        await newWrapper.getStartingAwait();
        await newWrapper.getInitializingAwait();

        await newWrapper.start(editorContainerRef.current!);

        console.log("Started language wrapper");
      } catch (error) {
        console.error("Failed to initialize or start Monaco Editor wrapper:", error);
        if (wrapperRef.current) {
          wrapperRef.current.dispose();
          wrapperRef.current = null;
        }
        hasInitializedRef.current = false;
      }
    };

    initEditor();

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
  }, [
    lspConnection.isConnected,
    lspConnection.reader,
    lspConnection.writer,
    lspConnection.socket,
    initialCode,
    languageId,
    theme,
    editorOptions,
    onCodeChange,
  ]);

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

  return <div ref={editorContainerRef} style={{ height: "100%", width: "100%" }} />;
};

export default EditorV2;
