"use client";

// import { ApiHandlers } from "@/api";
import { onExecutePythonCode } from "@/handlers/onExecutePythonCode";
import {
  PythonCodeDTO,
  SetIsExecLoading,
  SetExecutionResponse,
} from "@/types/api";
import { SetShouldShowDialog } from "@/types/components";
import { CodeEditorRef } from "@/types/editor";

const baseStyle =
  "px-4 py-2 rounded-md flex items-center disabled:animate-pulse";

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
    // const res = await new ApiHandlers().getLastOutputs(5);
    //[TO-DO]: Add set state and do something with the outputs
  };

  return (
    <div className="flex flex-col justify-between p-4 border-t gap-4 border-zinc-700 sm:flex-row min-h-30 sm:h-18 sm:min-h-18 sm:max-h-18">
      <div className="flex justify-between gap-4 md:gap-8">
        <button
          className={`${baseStyle} border border-zinc-700 text-zinc-300 hover:bg-zinc-700 disabled:hover:bg-zinc-800`}
          onClick={async () => await onClick(false)}
          disabled={isExecLoading}
        >
          Run
        </button>
        <button
          className={`${baseStyle} bg-zinc-700 hover:bg-zinc-600 disabled:hover:bg-zinc-700`}
          onClick={async () => await onClick(true)}
          disabled={isExecLoading}
        >
          Run and Save
        </button>
      </div>
      <button
        onClick={async () => await getLastOutputs()}
        disabled={isExecLoading}
        className={`${baseStyle} justify-center border-green-700 border-1 hover:bg-green-700 transition-discrete disabled:animate-pulse`}
      >
        Get Last Outputs
      </button>
    </div>
  );
};
