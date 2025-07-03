"use client";
import { DEFAULT_PYTHON_CODE } from "@/constants/editor";
import { CodeEditorRef, MonacoInstanceRef } from "@/types/editor";
import { useEffect } from "react";
import * as monaco from "monaco-editor";

import { Editor } from "@monaco-editor/react";

export const CodeEditor = ({
  editorRef,
  monacoRef,
  onSave,
}: {
  editorRef: CodeEditorRef;
  monacoRef: MonacoInstanceRef;
  onSave?: (content: string) => void;
}) => {
  // Prevent default browser save behavior
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
  ) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // Add custom key binding for Ctrl+S
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      // Call the onSave callback with current editor content
      if (onSave && editor) {
        onSave(editor.getValue());
      }
    });

    // Configure LSP-friendly editor options
    editor.updateOptions({
      suggest: {
        showWords: false, // Disable word-based suggestions to prioritize LSP
        showSnippets: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: "on",
      tabCompletion: "off", // Let LSP handle completions
    });
  };

  return (
    <>
      <Editor
        height="100%"
        width="100%"
        defaultLanguage="python"
        defaultValue={DEFAULT_PYTHON_CODE}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineHeight: 24,
          fontLigatures: true,
          formatOnPaste: true,
          formatOnType: true,
          scrollbar: {
            verticalScrollbarSize: 12,
            horizontalScrollbarSize: 12,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            alwaysConsumeMouseWheel: false,
            useShadows: true,
          },
          padding: { top: 16, bottom: 16 },
          parameterHints: { enabled: true },
          tabCompletion: "off", // Let LSP handle this
          lineNumbers: "on",
          renderLineHighlight: "all",
          bracketPairColorization: { enabled: true },
          automaticLayout: true,
          // LSP-specific options
          suggest: {
            showWords: false,
            showSnippets: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          suggestOnTriggerCharacters: true,
        }}
      />
    </>
  );
};
