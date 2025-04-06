"use client";
import { useRef, useState } from "react";

import { CodeEditor } from "@/components/EditorSection/CodeEditor";
import { PythonCodeDTO } from "@/types/api";
import { MainLayout } from "./MainLayout";
import { OutputLayout } from "./OutputLayout";
import { CodeEditorDTO } from "@/types/editor";

export const CodeEditorMainSection = () => {
  const [isExecLoading, setIsExecLoading] = useState<boolean>(false);
  const editorRef = useRef<CodeEditorDTO>(null);

  const [executionResponse, setExecutionResponse] =
    useState<PythonCodeDTO>(null);

  return (
    <div className="flex w-full h-full">
      <MainLayout
        monacoRef={editorRef}
        setExecutionResponse={setExecutionResponse}
        setIsExecLoading={setIsExecLoading}
      >
        <div className="flex h-full gap-8">
          <CodeEditor editorRef={editorRef} />
        </div>
      </MainLayout>
      <OutputLayout isExecLoading={isExecLoading}>
        <p>{executionResponse}</p>
      </OutputLayout>
    </div>
  );
};
