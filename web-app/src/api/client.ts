import { KEY_STORAGE_USER_ID } from "@/constants/tracking";
import { TrackAnonymous } from "@/handlers/tracking";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export const apiClient = (baseUrl: string) => {
  const userID = new TrackAnonymous().getUserID();

  axios.interceptors.request.use((config) => {
    config.headers[KEY_STORAGE_USER_ID] = userID;

    return config;
  });

  const get = async <R>(url: string, config?: AxiosRequestConfig): Promise<R> => {
    try {
      const response: AxiosResponse<R> = await axios.get(`${baseUrl}${url}`, config);

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch data: ${error}`);
    }
  };

  const post = async <Request, Response>(
    url: string,
    data?: Request,
    config?: AxiosRequestConfig,
  ): Promise<{ data: Response; status: number }> => {
    try {
      const response: AxiosResponse<Response> = await axios.post(`${baseUrl}${url}`, data, config);

      return { data: response.data, status: response.status };
    } catch (error) {
      throw error;
    }
  };

  return { get, post };
};
