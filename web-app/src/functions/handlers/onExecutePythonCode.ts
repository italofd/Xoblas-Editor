import { SetExecutionResponse } from "@/types/api";
import { ApiHandlers } from "..";

export const onExecutePythonCode = async (
  setExecutionResponse: SetExecutionResponse,
  code: string,
  should_save: boolean,
) => {
  const handlers = new ApiHandlers();

  const res = await handlers.execute(code, should_save);

  if (res) setExecutionResponse(res);
};
