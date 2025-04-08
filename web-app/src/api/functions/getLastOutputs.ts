import { ApiClient, GetLastOutputsBody, GetLastOutputsResponse } from "@/types/api";

export const getLastOutputs = async (
  deps: { apiClient: ApiClient },
  params: GetLastOutputsBody,
) => {
  const { data } = await deps.apiClient.post<GetLastOutputsBody, GetLastOutputsResponse>(
    "/get_outputs",
    { quantity: params.quantity },
  );

  return data;
};
