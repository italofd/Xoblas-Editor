import { API_BASE_URL } from "@/constants/api";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export const apiClient = (baseUrl: string = API_BASE_URL) => {
	const get = async <R>(
		url: string,
		config?: AxiosRequestConfig
	): Promise<R> => {
		try {
			const response: AxiosResponse<R> = await axios.get(
				`${baseUrl}${url}`,
				config
			);

			return response.data;
		} catch (error) {
			throw new Error(`Failed to fetch data: ${error}`);
		}
	};

	const post = async <Request, Response>(
		url: string,
		data: Request,
		config?: AxiosRequestConfig
	): Promise<Response> => {
		try {
			const response: AxiosResponse<Response> = await axios.post(
				`${baseUrl}${url}`,
				data,
				config
			);

			return response.data;
		} catch (error) {
			throw new Error(`Failed to post data: ${error}`);
		}
	};

	return { get, post };
};
