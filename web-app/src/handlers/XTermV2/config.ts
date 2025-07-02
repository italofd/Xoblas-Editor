import { CloseAction, ErrorAction } from "vscode-languageclient";
import * as vscode from "vscode";

import { LogLevel } from "@codingame/monaco-vscode-api";
import {
  defaultHtmlAugmentationInstructions,
  defaultViewsInit,
} from "monaco-editor-wrapper/vscode/services";

import getEnvironmentServiceOverride from "@codingame/monaco-vscode-environment-service-override";
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override";
import getKeybindingsServiceOverride from "@codingame/monaco-vscode-keybindings-service-override";
import getBannerServiceOverride from "@codingame/monaco-vscode-view-banner-service-override";
import getStatusBarServiceOverride from "@codingame/monaco-vscode-view-status-bar-service-override";
import getTitleBarServiceOverride from "@codingame/monaco-vscode-view-title-bar-service-override";
import getConfigServiceOverride from "@codingame/monaco-vscode-configuration-service-override";
import getTextMateServiceOverride from "@codingame/monaco-vscode-textmate-service-override";
import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override";
import getHostServiceOverride from "@codingame/monaco-vscode-host-service-override";
import getExtensionsServiceOverride from "@codingame/monaco-vscode-extensions-service-override";
import getLifecycleServiceOverride from "@codingame/monaco-vscode-lifecycle-service-override";

import getModelServiceOverride from "@codingame/monaco-vscode-model-service-override";
import getBaseServiceOverride from "@codingame/monaco-vscode-base-service-override";
import viewServiceOverride, {
  isEditorPartVisible,
} from "@codingame/monaco-vscode-views-service-override";
import getExplorerServiceOverride from "@codingame/monaco-vscode-explorer-service-override";
import getDialogServiceOverride from "@codingame/monaco-vscode-dialogs-service-override";
import getOutputServiceOverride from "@codingame/monaco-vscode-output-service-override";
import { configureDefaultWorkerFactory } from "monaco-editor-wrapper/workers/workerLoaders";
import getExtensionGalleryServiceOverride from "@codingame/monaco-vscode-extension-gallery-service-override";
import getPreferencesServiceOverride from "@codingame/monaco-vscode-preferences-service-override";
import getSearchServiceOverride from "@codingame/monaco-vscode-search-service-override";
import getLanguageDetectionServiceOverride from "@codingame/monaco-vscode-language-detection-worker-service-override";
import getUserDataSyncServiceOverride from "@codingame/monaco-vscode-user-data-sync-service-override";
import getUserDataProfileServiceOverride from "@codingame/monaco-vscode-user-data-profile-service-override";
import getEditSessionsServiceOverride from "@codingame/monaco-vscode-edit-sessions-service-override";
import getInteractiveServiceOverride from "@codingame/monaco-vscode-interactive-service-override";
import getPerformanceServiceOverride from "@codingame/monaco-vscode-performance-service-override";
import getQuickAccessServiceOverride from "@codingame/monaco-vscode-quickaccess-service-override";
import getExtensionServiceOverride from "@codingame/monaco-vscode-extensions-service-override";
import getFileServiceOverride, {
  RegisteredFileSystemProvider,
  registerFileSystemOverlay,
  RegisteredMemoryFile,
} from "@codingame/monaco-vscode-files-service-override";
import getStorageServiceOverride from "@codingame/monaco-vscode-storage-service-override";
import getSecretStorageServiceOverride from "@codingame/monaco-vscode-secret-storage-service-override";
import getTerminalServiceOverride from "@codingame/monaco-vscode-terminal-service-override";
import { XTerm } from "@/handlers/XTermV2";
import { MonacoEditorLanguageClientWrapper } from "monaco-editor-wrapper";
import { LSPConnection } from "@/hooks/useLSPConnection";
import { MonacoLanguageClient } from "monaco-languageclient";

export const setupFileSystemProvider = (workspaceRoot: string, initialCode: string) => {
  const helloTsUri = vscode.Uri.file("/workspace/hello.ts");
  const testerTsUri = vscode.Uri.file("/workspace/tester.js");
  const fileSystemProvider = new RegisteredFileSystemProvider(false);

  // Register sample files
  fileSystemProvider.registerFile(new RegisteredMemoryFile(helloTsUri, "ioJASDIOAJDIOW"));
  fileSystemProvider.registerFile(new RegisteredMemoryFile(testerTsUri, "Xoblas pra caralho"));

  // Register main Python file
  fileSystemProvider.registerFile(
    new RegisteredMemoryFile(vscode.Uri.file(workspaceRoot + "/main.py"), initialCode),
  );

  // Register workspace configuration
  fileSystemProvider.registerFile(
    new RegisteredMemoryFile(
      vscode.Uri.file("/workspace.code-workspace"),
      JSON.stringify(
        {
          folders: [
            {
              path: "/workspace",
            },
          ],
        },
        null,
        2,
      ),
    ),
  );

  // Register VSCode extensions configuration
  fileSystemProvider.registerFile(
    new RegisteredMemoryFile(
      vscode.Uri.file("/workspace/.vscode/extensions.json"),
      JSON.stringify(
        {
          installed: ["PKief.material-icon-theme"],
          recommendations: ["vscodevim.vim", "PKief.material-icon-theme"],
        },
        null,
        2,
      ),
    ),
  );

  registerFileSystemOverlay(1, fileSystemProvider);
  return fileSystemProvider;
};

export const createAndInitializeWrapper = async (
  workspaceRoot: string,
  initialCode: string,
  htmlContainer: HTMLElement,
): Promise<MonacoEditorLanguageClientWrapper> => {
  const newWrapper = new MonacoEditorLanguageClientWrapper();

  await newWrapper.init({
    $type: "extended",
    id: "editor-wrapper",
    htmlContainer,
    logLevel: LogLevel.Debug,

    editorAppConfig: {
      monacoWorkerFactory: configureDefaultWorkerFactory,
      codeResources: {
        modified: {
          text: initialCode,
          uri: vscode.Uri.file(workspaceRoot + "/main.py").path,
          enforceLanguageId: "python",
        },
        original: {
          text: initialCode,
          uri: vscode.Uri.file(workspaceRoot + "/main.py").path,
          enforceLanguageId: "python",
        },
      },
    },
    vscodeApiConfig: {
      enableExtHostWorker: true,
      workspaceConfig: {
        enableWorkspaceTrust: true,
        welcomeBanner: { message: "Welcome to Xoblas Editor My Brotha" },
        workspaceProvider: {
          trusted: true,
          async open() {
            window.open(window.location.href);
            return true;
          },
          workspace: {
            workspaceUri: vscode.Uri.file("/workspace.code-workspace"),
          },
        },
        productConfiguration: {
          nameShort: "monaco-vscode-api",
          nameLong: "monaco-vscode-api",
          extensionsGallery: {
            serviceUrl: "https://open-vsx.org/vscode/gallery",
            resourceUrlTemplate:
              "https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}",
            extensionUrlTemplate: "https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest",
            controlUrl: "",
            nlsBaseUrl: "",
          },
        },
      },
      vscodeApiInitPerformExternally: false,
      userConfiguration: {
        json: JSON.stringify({
          "editor.fontSize": 12,
          "editor.lineHeight": 12,
          "editor.fontFamily": "monospace",
          "editor.letterSpacing": 0,
          "editor.experimental.asyncTokenization": true,
          "workbench.colorTheme": "Default Dark+",
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
        ...getConfigServiceOverride(),
        ...getTextMateServiceOverride(),
        ...getThemeServiceOverride(),
        ...getModelServiceOverride(),
        ...getLifecycleServiceOverride(),
        ...viewServiceOverride(),
        ...getExtensionsServiceOverride(),
        ...getHostServiceOverride(),
        ...getDialogServiceOverride(),
        ...getOutputServiceOverride(),
        ...getExtensionGalleryServiceOverride(),
        ...getPreferencesServiceOverride(),
        ...getSearchServiceOverride(),
        ...getLanguageDetectionServiceOverride(),
        ...getUserDataSyncServiceOverride(),
        ...getUserDataProfileServiceOverride(),
        ...getEditSessionsServiceOverride(),
        ...getInteractiveServiceOverride(),
        ...getPerformanceServiceOverride(),
        ...getQuickAccessServiceOverride({
          isKeybindingConfigurationVisible: isEditorPartVisible,
          shouldUseGlobalPicker: (_editor, isStandalone) => !isStandalone && isEditorPartVisible(),
        }),
        ...getStorageServiceOverride(),
        ...getExplorerServiceOverride(),
        ...getFileServiceOverride(),
        ...getSecretStorageServiceOverride(),
        ...getExtensionServiceOverride(),
        ...getTerminalServiceOverride(new XTerm()),
      },
      viewsConfig: {
        viewServiceType: "ViewsService",
        htmlAugmentationInstructions: defaultHtmlAugmentationInstructions,
        viewsInitFunc: defaultViewsInit,
      },
    },
  });

  console.log("Starting language wrapper");
  await newWrapper.start(htmlContainer);

  return newWrapper;
};

export const createAndStartLanguageClient = async (
  languageId: string,
  lspConnection: LSPConnection,
): Promise<MonacoLanguageClient> => {
  const languageClient = new MonacoLanguageClient({
    name: "Python Language Client",
    id: "python-language-client",
    clientOptions: {
      progressOnInitialization: true,
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

  await languageClient.start();
  console.log("Language client started");

  return languageClient;
};
