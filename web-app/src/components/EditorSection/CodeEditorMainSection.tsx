"use client";
import { useState } from "react";

import { CodeEditor } from "@/components/EditorSection/CodeEditor";
import { DEFAULT_PYTHON_CODE } from "@/constants/editor";
import { PythonCodeDTO } from "@/types/api";
import { MainLayout } from "./MainLayout";
import { OutputLayout } from "./OutputLayout";

export const CodeEditorMainSection = () => {
  const [code, setCode] = useState<PythonCodeDTO>(DEFAULT_PYTHON_CODE);

  const [executionResponse, setExecutionResponse] =
    useState<PythonCodeDTO>(null);

  return (
    <div className="flex w-full">
      <MainLayout code={code} setExecutionResponse={setExecutionResponse}>
        <div className="flex gap-8">
          <CodeEditor onChange={(code) => code && setCode(code)} />
        </div>
      </MainLayout>
      <OutputLayout>
        <p>{executionResponse}</p>
      </OutputLayout>
    </div>
  );
};
