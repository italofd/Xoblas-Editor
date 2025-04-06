"use client";
import { DEFAULT_PYTHON_CODE } from "@/constants/editor";
import { Editor, OnChange } from "@monaco-editor/react";

/**
 * This is only client side since monaco-react is not adapted fully to server components
 */

export const CodeEditor = ({ onChange = () => {} }: { onChange: OnChange }) => {
  return (
    <Editor
      height="100%"
      width="100%"
      defaultLanguage="python"
      defaultValue={DEFAULT_PYTHON_CODE}
      //[TO-DO]: Implement a debouncer, this will not work and its just to see how things is going =)
      onChange={onChange}
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
