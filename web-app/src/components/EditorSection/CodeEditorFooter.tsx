"use client";

import { onExecutePythonCode } from "@/functions/handlers/onExecutePythonCode";
import {
  PythonCodeDTO,
  SetIsExecLoading,
  SetExecutionResponse,
} from "@/types/api";
import { CodeEditorRef } from "@/types/editor";

export const CodeEditorFooter = ({
  monacoRef,
  setExecutionResponse,
  setIsExecLoading,
}: {
  monacoRef: CodeEditorRef;
  setExecutionResponse: SetExecutionResponse;
  setIsExecLoading: SetIsExecLoading;
}) => {
  const onClick = async (shouldSave: boolean) => {
    if (!monacoRef.current) return;

    const code: PythonCodeDTO = monacoRef.current.getValue();

    if (code) {
      try {
        setIsExecLoading(true);

        await onExecutePythonCode(setExecutionResponse, code, shouldSave);
      } catch (error) {
        throw error;
      } finally {
        setIsExecLoading(false);
      }
    }
  };

  return (
    <>
      <button
        className="px-4 py-2 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-700 flex items-center"
        onClick={async () => await onClick(false)}
      >
        Run
      </button>
      <button
        className="px-4 py-2 rounded-md bg-zinc-700 hover:bg-zinc-600 flex items-center"
        onClick={async () => await onClick(true)}
      >
        Run and Save
      </button>
    </>
  );
};
