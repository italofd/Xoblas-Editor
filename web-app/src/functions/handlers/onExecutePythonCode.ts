import { apiClient } from "@/api/client";
import { executePythonCode } from "@/functions/execute";
import { SetExecutionResponse } from "@/types/api";

export const onExecutePythonCode = async (
	setExecutionResponse: SetExecutionResponse,
	code: string
) => {
	const res = await executePythonCode(apiClient, code);

	if (res) setExecutionResponse(res);
};
