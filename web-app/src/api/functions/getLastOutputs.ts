import { ApiClient } from "@/types/api";
import { OutputCodeDBSchema } from "@/types/db";

export const getLastOutputs = async (
  deps: { apiClient: ApiClient },
  params: {
    quantity: number;
  },
) => {
  const { data } = await deps.apiClient.post<
    { quantity: number },
    { outputs: Array<OutputCodeDBSchema> }
  >("/get_outputs", { quantity: params.quantity });

  return data;
};
