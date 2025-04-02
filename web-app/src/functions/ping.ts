import { apiClient as axiosClient } from "@/api/client";

export const ping = async (apiClient: typeof axiosClient) =>
	//[TO-DO]: Implement separated type for response for each fn
	await apiClient().post<{}, { message: string }>("/ping", {});
