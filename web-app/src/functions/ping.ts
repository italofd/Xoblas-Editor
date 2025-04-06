import { ApiClient, PingRequestBody } from "@/types/api";

export const ping = async (deps: { apiClient: ApiClient }) =>
  await deps.apiClient.post<PingRequestBody, { message: string }>("/ping");
