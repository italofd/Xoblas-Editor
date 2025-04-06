import { ApiClient, ExecuteRequestBody } from "@/types/api";
import axios from "axios";

export const executePythonCode = async (
  deps: { apiClient: ApiClient },
  params: { code: string; should_save: boolean },
) => {
  const { apiClient } = deps;
  const { code, should_save } = params;

  let output: string | null = null;

  //[TO-DO]: Implement type for response, great if could be directly from the OpenAPI doc from python server =)
  try {
    const res = await apiClient.post<
      ExecuteRequestBody,
      { message: string; code_output?: string }
    >("/execute", {
      code,
      should_save,
    });

    output = res.code_output ? res.code_output : res.message;
  } catch (e) {
    const isAxiosError = axios.isAxiosError(e);
    if (isAxiosError) output = `Error: ${e?.response?.data.detail.error}`;
    else throw e;
  }

  return output;
};
