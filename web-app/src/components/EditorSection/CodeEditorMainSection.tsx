"use client";
import { useState } from "react";

import { CodeEditor } from "@/components/EditorSection/CodeEditor";
import { DEFAULT_PYTHON_CODE } from "@/constants/editor";
import { PythonCodeDTO } from "@/types/api";
import { MainLayout } from "./MainLayout";
import { OutputLayout } from "./OutputLayout";

export const CodeEditorMainSection = () => {
  const [code, setCode] = useState<PythonCodeDTO>(DEFAULT_PYTHON_CODE);
  const [isExecLoading, setIsExecLoading] = useState<boolean>(false);

  const [executionResponse, setExecutionResponse] =
    useState<PythonCodeDTO>(null);

  return (
    <div className="flex w-full h-full">
      <MainLayout
        code={code}
        setExecutionResponse={setExecutionResponse}
        setIsExecLoading={setIsExecLoading}
      >
        <div className="flex h-full gap-8">
          <CodeEditor onChange={(code) => code && setCode(code)} />
        </div>
      </MainLayout>
      <OutputLayout isExecLoading={isExecLoading}>
        <p>{executionResponse}</p>
      </OutputLayout>
    </div>
  );
};
