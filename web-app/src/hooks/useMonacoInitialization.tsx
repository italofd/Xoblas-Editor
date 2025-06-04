"use client";
import { useEffect, useRef, useState } from "react";
import { initialize, LogLevel } from "@codingame/monaco-vscode-api";

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
import getFilesServiceOverride from "@codingame/monaco-vscode-files-service-override";
import getModelServiceOverride from "@codingame/monaco-vscode-model-service-override";

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

          await initialize({
            ...getEnvironmentServiceOverride(),
            ...getLanguagesServiceOverride(),
            ...getKeybindingsServiceOverride(),
            ...getBannerServiceOverride(),
            ...getStatusBarServiceOverride(),
            ...getTitleBarServiceOverride(),
            ...getConfigurationServiceOverride(),
            ...getTextMateServiceOverride(),
            ...getThemeServiceOverride(),
            ...getFilesServiceOverride(),
            ...getModelServiceOverride(),
            logLevel: LogLevel.Debug,
          });
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
