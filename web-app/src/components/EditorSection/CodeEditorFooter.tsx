"use client";

import { onExecutePythonCode } from "@/functions/handlers/onExecutePythonCode";
import { PythonCodeDTO, SetExecutionResponse } from "@/types/api";

export const CodeEditorFooter = ({
  code,
  setExecutionResponse,
}: {
  code: PythonCodeDTO;
  setExecutionResponse: SetExecutionResponse;
}) => {
  return (
    <>
      <button
        className="px-4 py-2 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-700 flex items-center"
        onClick={async () =>
          code && onExecutePythonCode(setExecutionResponse, code, false)
        }
      >
        Run
      </button>
      <button
        className="px-4 py-2 rounded-md bg-zinc-700 hover:bg-zinc-600 flex items-center"
        onClick={async () =>
          code && onExecutePythonCode(setExecutionResponse, code, true)
        }
      >
        Run and Save
      </button>
    </>
  );
};
