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
import "vscode/localExtensionHost";
// import {
//   defaultHtmlAugmentationInstructions,
//   defaultViewsInit,
// } from "monaco-editor-wrapper/vscode/services";

import getEnvironmentServiceOverride from "@codingame/monaco-vscode-environment-service-override";
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override";
import getKeybindingsServiceOverride from "@codingame/monaco-vscode-keybindings-service-override";
import getBannerServiceOverride from "@codingame/monaco-vscode-view-banner-service-override";
import getStatusBarServiceOverride from "@codingame/monaco-vscode-view-status-bar-service-override";
import getTitleBarServiceOverride from "@codingame/monaco-vscode-view-title-bar-service-override";
import getConfigurationServiceOverride from "@codingame/monaco-vscode-configuration-service-override";
import getTextMateServiceOverride from "@codingame/monaco-vscode-textmate-service-override";
import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override";
import getHostServiceOverride from "@codingame/monaco-vscode-host-service-override";
import getExtensionsServiceOverride from "@codingame/monaco-vscode-extensions-service-override";
import getLifecycleServiceOverride from "@codingame/monaco-vscode-lifecycle-service-override";

import getModelServiceOverride from "@codingame/monaco-vscode-model-service-override";
import getBaseServiceOverride from "@codingame/monaco-vscode-base-service-override";
// import viewServiceOverride from "@codingame/monaco-vscode-views-service-override";
import { configureDefaultWorkerFactory } from "monaco-editor-wrapper/workers/workerLoaders";

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

        const newWrapper = new MonacoEditorLanguageClientWrapper();
        wrapperRef.current = newWrapper;

        await newWrapper.init({
          $type: "extended",
          id: "editor-wrapper",
          htmlContainer: editorContainerRef.current!,
          logLevel: LogLevel.Debug,
          editorAppConfig: {
            monacoWorkerFactory: configureDefaultWorkerFactory,
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
            // overrideAutomaticLayout: true,
          },

          vscodeApiConfig: {
            enableExtHostWorker: true,
            vscodeApiInitPerformExternally: false,
            userConfiguration: {
              json: JSON.stringify({
                "editor.fontSize": 12,
                "editor.lineHeight": 12,
                "editor.fontFamily": "monospace",
                "editor.letterSpacing": 0,
                "editor.experimental.asyncTokenization": true,
              }),
            },
            serviceOverrides: {
              ...getBaseServiceOverride(),
              ...getEnvironmentServiceOverride(),
              ...getLanguagesServiceOverride(),
              ...getKeybindingsServiceOverride(),
              ...getBannerServiceOverride(),
              ...getStatusBarServiceOverride(),
              ...getTitleBarServiceOverride(),
              ...getConfigurationServiceOverride(),
              ...getTextMateServiceOverride(),
              ...getThemeServiceOverride(),
              ...getModelServiceOverride(),
              ...getLifecycleServiceOverride(),
              // ...viewServiceOverride(),
              ...getExtensionsServiceOverride(),
              ...getHostServiceOverride(),
            },
            workspaceConfig: {
              enableWorkspaceTrust: true,
              windowIndicator: {
                label: "Xoblas Editor",
                tooltip: "",
                command: "",
              },

              workspaceProvider: {
                trusted: true,
                async open() {
                  window.open(window.location.href);
                  return true;
                },
                workspace: {
                  folderUri: vscode.Uri.file("/workspace"),
                  workspaceUri: vscode.Uri.file("/workspace/.vscode/workspace.code-workspace"),
                },
              },
              configurationDefaults: {
                "window.title": "Xoblas Editor${separator}${dirty}${activeEditorShort}",
              },
              productConfiguration: {
                nameShort: "Xoblas Editor",
                nameLong: "Xoblas Editor",
              },
              // defaultLayout: {
              //   editors: [
              //     {
              //       uri: monaco.Uri.file("/workspace/test.js"),
              //       viewColumn: 1,
              //     },
              //     {
              //       uri: monaco.Uri.file("/workspace/test.md"),
              //       viewColumn: 2,
              //     },
              //   ],
              //   layout: {
              //     editors: {
              //       orientation: 0,
              //       groups: [{ size: 1 }, { size: 1 }],
              //     },
              //   },
              // },
            },
            // viewsConfig: {
            //   viewServiceType: "ViewsService",
            //   htmlAugmentationInstructions: defaultHtmlAugmentationInstructions,
            //   viewsInitFunc: defaultViewsInit,
            // },
          },
        });

        console.log("Starting language wrapper");

        // await newWrapper.getInitializingAwait();

        await newWrapper.start(editorContainerRef.current!);

        // await newWrapper.getStartingAwait();

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
          // Use the reader and writer from our LSP connection
          messageTransports: {
            reader: lspConnection.reader!,
            writer: lspConnection.writer!,
          },
        });

        await updateUserConfiguration(`{
    "editor.fontSize": 12,
    "editor.lineHeight": 12,
    "editor.fontFamily": "monospace",
    "editor.letterSpacing": 0,
      "editor.experimental.asyncTokenization": true,
    "debug.toolBarLocation": "docked",

    "workbench.colorTheme": "Default Dark+"
    }`);

        await languageClient.start();

        console.log("Language client started");

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

  return (
    <>
      <div id="workbench-container" style={{ height: "100%", width: "100%" }}>
        <div id="titleBar"></div>
        <div id="banner"></div>
        <div id="workbench-top"></div>
        <div ref={editorContainerRef} style={{ height: "100%", width: "100%" }} />
      </div>
    </>
  );
};

export default EditorV2;
