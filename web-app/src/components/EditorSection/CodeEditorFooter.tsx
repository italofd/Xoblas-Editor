"use client";

import { ApiHandlers } from "@/api";
import { onExecutePythonCode } from "@/handlers/onExecutePythonCode";
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

  const getLastOutputs = async () => {
    const res = await new ApiHandlers().getLastOutputs(5);
    //[TO-DO]: Add set state and do something with the outputs
  };

  return (
    <div className="h-18 min-h-18 max-h-18 p-4 border-t border-zinc-700 flex justify-between">
      <div className="flex gap-8">
        <button
          className="px-4 py-2 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-700 flex items-center disabled:animate-pulse disabled:hover:bg-zinc-800"
          onClick={async () => await onClick(false)}
          disabled={isExecLoading}
        >
          Run
        </button>
        <button
          className="px-4 py-2 rounded-md bg-zinc-700 hover:bg-zinc-600 flex items-center disabled:animate-pulse disabled:hover:bg-zinc-700"
          onClick={async () => await onClick(true)}
          disabled={isExecLoading}
        >
          Run and Save
        </button>
      </div>
      <button
        onClick={async () => await getLastOutputs()}
        className="px-4 py-2 rounded-md border-green-700 border-1 hover:bg-green-700 transition-discrete disabled:animate-pulse"
      >
        Get Last Outputs
      </button>
    </div>
  );
};
