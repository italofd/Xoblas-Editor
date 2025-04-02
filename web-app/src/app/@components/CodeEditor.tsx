"use client";
import { Editor } from "@monaco-editor/react";

export const CodeEditor = () => {
	return (
		<Editor
			height="80vh"
			width="80%"
			theme="vs-dark"
			defaultLanguage="py"
			defaultValue="homework = true"
		/>
	);
};
