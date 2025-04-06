import { editor } from "monaco-editor";
import { RefObject } from "react";

export type CodeEditorDTO = editor.ICodeEditor | null;

export type CodeEditorRef = RefObject<CodeEditorDTO>;
