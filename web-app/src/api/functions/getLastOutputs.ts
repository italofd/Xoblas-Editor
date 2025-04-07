import { ApiClient } from "@/types/api";

export const getLastOutputs = async (
  deps: { apiClient: ApiClient },
  params: {
    quantity: number;
  },
) => {
  const { data } = await deps.apiClient.post<
    { quantity: number },
    { outputs: Array<string> }
  >("/get_outputs", { quantity: params.quantity });

  return data;
};
