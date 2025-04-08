import { apiClient } from "@/api/client";
import { OutputCodeDBSchema } from "./db";

export interface ExecuteRequestBody {
  code: string;
  should_save: boolean;
}

export interface ExecuteRequestResponse {
  message: string;
  code_output?: string;
}

export interface GetLastOutputsBody {
  quantity: number;
}

export interface GetLastOutputsResponse {
  outputs: Array<OutputCodeDBSchema>;
}

export type PingRequestBody = null;

export type ApiClient = ReturnType<typeof apiClient>;
