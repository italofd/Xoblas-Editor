import { editor } from "monaco-editor";
import { RefObject } from "react";

export type CodeEditorDTO = editor.IStandaloneCodeEditor | null;

export type CodeEditorRef = RefObject<CodeEditorDTO>;
