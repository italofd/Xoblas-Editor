import { ApiClient } from "@/types/api";

export const ping = async (deps: { apiClient: ApiClient }) =>
  //[TO-DO]: Implement separated type for response for each fn
  await deps.apiClient.post<unknown, { message: string }>("/ping");
