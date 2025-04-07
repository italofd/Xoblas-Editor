"use client";

import { onExecutePythonCode } from "@/functions/handlers/onExecutePythonCode";
import {
  PythonCodeDTO,
  SetIsExecLoading,
  SetExecutionResponse,
} from "@/types/api";
import { SetShouldShowDialog } from "@/types/components";
import { CodeEditorRef } from "@/types/editor";

export const CodeEditorFooter = ({
  monacoRef,
  isExecLoading,
  setExecutionResponse,
  setIsExecLoading,
  setShouldShowDialog,
}: {
  monacoRef: CodeEditorRef;
  isExecLoading: boolean;
  setExecutionResponse: SetExecutionResponse;
  setIsExecLoading: SetIsExecLoading;
  setShouldShowDialog: SetShouldShowDialog;
}) => {
  const onClick = async (shouldSave: boolean) => {
    if (!monacoRef.current) return;

    const code: PythonCodeDTO = monacoRef.current.getValue();

    if (code) {
      try {
        setIsExecLoading(true);

        await onExecutePythonCode(
          setExecutionResponse,
          setShouldShowDialog,
          code,
          shouldSave,
        );
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
        className="px-4 py-2 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-700 flex items-center disabled:bg-violet-950"
        onClick={async () => await onClick(false)}
        disabled={isExecLoading}
      >
        Run
      </button>
      <button
        className="px-4 py-2 rounded-md bg-zinc-700 hover:bg-zinc-600 flex items-center disabled:bg-violet-950"
        onClick={async () => await onClick(true)}
        disabled={isExecLoading}
      >
        Run and Save
      </button>
    </>
  );
};
