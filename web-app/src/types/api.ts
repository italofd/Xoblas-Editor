import { Dispatch, SetStateAction } from "react";

export interface ExecuteRequestBody {
	code: string;
}

export type SetExecutionResponse = Dispatch<SetStateAction<PythonCodeDTO>>;

export type PythonCodeDTO = string | null;
