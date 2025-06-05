"use client";
import { useEffect, useRef, useState } from "react";
import { initialize, LogLevel } from "@codingame/monaco-vscode-api";
import * as monaco from "@codingame/monaco-vscode-editor-api";

import "@codingame/monaco-vscode-theme-defaults-default-extension";
import "@codingame/monaco-vscode-python-default-extension";

// Import this to ensure VS Code API is properly initialized
import "vscode/localExtensionHost";

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

import getModelServiceOverride from "@codingame/monaco-vscode-model-service-override";
import getBaseServiceOverride from "@codingame/monaco-vscode-base-service-override";
import viewServiceOverride from "@codingame/monaco-vscode-views-service-override";
import { Uri } from "vscode";

// import getViewsServiceOverride from "@codingame/monaco-vscode-views-service-override";

/**
 * Hook to initialize Monaco VS Code API
 * Returns true when initialization is complete
 */
export function useMonacoInitialization() {
  const isInitialized = useRef(false);
  const isVscodeInitialized = useRef(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initMonaco = async () => {
      try {
        if (!isInitialized.current) {
          if (mounted) {
            isInitialized.current = true;
          }

          await initialize(
            {
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
              ...viewServiceOverride(),
              ...getExtensionsServiceOverride(),
              ...getHostServiceOverride(),
            },
            undefined,
            {
              enabledExtensions: ["mlc-app-playground"],

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
                  workspaceUri: Uri.file("/workspace/.vscode/workspace.code-workspace"),
                },
              },
              configurationDefaults: {
                "window.title": "Xoblas Editor${separator}${dirty}${activeEditorShort}",
              },
              productConfiguration: {
                nameShort: "Xoblas Editor",
                nameLong: "Xoblas Editor",
              },
              defaultLayout: {
                editors: [
                  {
                    uri: monaco.Uri.file("/workspace/test.js"),
                    viewColumn: 1,
                  },
                  {
                    uri: monaco.Uri.file("/workspace/test.md"),
                    viewColumn: 2,
                  },
                ],
                layout: {
                  editors: {
                    orientation: 0,
                    groups: [{ size: 1 }, { size: 1 }],
                  },
                },
              },
            },
          );
        }
      } catch (err) {
        console.error("Failed to initialize Monaco VS Code API:", err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    initMonaco().then(() => {
      isVscodeInitialized.current = true;
    });

    return () => {
      mounted = false;
    };
  }, [isInitialized.current]);

  return { isInitialized, isVscodeInitialized, error };
}
