import { Dispatch, RefObject, SetStateAction } from "react";

export type DialogRef = RefObject<HTMLDialogElement | null>;

export type SetShouldShowDialog = Dispatch<SetStateAction<boolean>>;

export type SetExecutionResponse = Dispatch<SetStateAction<PythonCodeDTO>>;

export type SetIsExecLoading = Dispatch<SetStateAction<boolean>>;

export type PythonCodeDTO = string | null;
