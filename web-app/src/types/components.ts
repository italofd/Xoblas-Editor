import { Dispatch, RefObject, SetStateAction } from "react";

export type DialogRef = RefObject<HTMLDialogElement | null>;

export type SetShouldShowDialog = Dispatch<SetStateAction<boolean>>;
