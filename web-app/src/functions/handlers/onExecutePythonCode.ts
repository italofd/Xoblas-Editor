import { apiClient } from "@/api/client";
import { executePythonCode } from "@/functions/execute";
import { SetExecutionResponse } from "@/types/api";

export const onExecutePythonCode = async (
	setExecutionResponse: SetExecutionResponse,
	code: string,
	should_save: boolean
) => {
	const res = await executePythonCode(apiClient, code, should_save);

	if (res) setExecutionResponse(res);
};
