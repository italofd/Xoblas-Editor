import { apiClient as axiosClient } from "@/api/client";
import { ping } from "./ping";
import { ExecuteRequestBody } from "@/types/api";

export const executePythonCode = async (
	apiClient: typeof axiosClient,
	code: string
) => {
	//[TO-DO]: Transform into a factory and avoid this drilling
	await ping(apiClient);

	//Wait for ping to be successful to proceed, that could be just on cold starts
	//[TO-DO]: Implement type for response, great if could be directly from the OpenAPI doc from python server =)
	const res = await apiClient().post<
		ExecuteRequestBody,
		{ code_output?: string }
	>("/execute", {
		code,
	});

	return res;
};
