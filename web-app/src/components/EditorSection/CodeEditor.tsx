import { DEFAULT_PYTHON_CODE } from "@/constants/editor";
import { CodeEditorRef } from "@/types/editor";
import { Editor } from "@monaco-editor/react";
import { useEffect } from "react";
import * as monaco from "monaco-editor";

/**
 * This is only client side since monaco-react is not adapted fully to server components
 */

export const CodeEditor = ({
  editorRef,
  onSave,
}: {
  editorRef: CodeEditorRef;
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

    // Add custom key binding for Ctrl+S
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      // Call the onSave callback with current editor content
      if (onSave && editor) {
        onSave(editor.getValue());
      }
    });
  };

  return (
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
        tabCompletion: "on",
        lineNumbers: "on",
        renderLineHighlight: "all",
        bracketPairColorization: { enabled: true },
        automaticLayout: true,
      }}
    />
  );
};
