import { apiClient } from "@/api/client";
import { Dispatch, SetStateAction } from "react";

export interface ExecuteRequestBody {
  code: string;
  should_save: boolean;
}

export interface PingRequestBody {}

export type PythonCodeDTO = string | null;

//React
export type SetExecutionResponse = Dispatch<SetStateAction<PythonCodeDTO>>;

export type SetIsExecLoading = Dispatch<SetStateAction<boolean>>;
//

export type ApiClient = ReturnType<typeof apiClient>;
