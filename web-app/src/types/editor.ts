import { editor } from "monaco-editor";
import { RefObject } from "react";
import * as monaco from "monaco-editor";

export type CodeEditorDTO = editor.IStandaloneCodeEditor | null;

export type CodeEditorRef = RefObject<CodeEditorDTO>;

export type MonacoInstanceRef = RefObject<typeof monaco | null>;
