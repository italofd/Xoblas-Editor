import { SetExecutionResponse } from "@/types/api";
import { ApiHandlers } from "../api";
import { SetShouldShowDialog } from "@/types/components";

export const onExecutePythonCode = async (
  setExecutionResponse: SetExecutionResponse,
  setShouldShowDialog: SetShouldShowDialog,
  code: string,
  should_save: boolean,
) => {
  const handlers = new ApiHandlers();

  const { output, wasInserted } = await handlers.execute(code, should_save);

  if (output) setExecutionResponse(output);
  if (wasInserted) setShouldShowDialog(true);
};
