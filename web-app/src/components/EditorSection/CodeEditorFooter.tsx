"use client";

import { onExecutePythonCode } from "@/functions/handlers/onExecutePythonCode";
import {
  PythonCodeDTO,
  SetIsExecLoading,
  SetExecutionResponse,
} from "@/types/api";

export const CodeEditorFooter = ({
  code,
  setExecutionResponse,
  setIsExecLoading,
}: {
  code: PythonCodeDTO;
  setExecutionResponse: SetExecutionResponse;
  setIsExecLoading: SetIsExecLoading;
}) => {
  const onClick = async (code: PythonCodeDTO, shouldSave: boolean) => {
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
        onClick={async () => await onClick(code, false)}
      >
        Run
      </button>
      <button
        className="px-4 py-2 rounded-md bg-zinc-700 hover:bg-zinc-600 flex items-center"
        onClick={async () => await onClick(code, true)}
      >
        Run and Save
      </button>
    </>
  );
};
