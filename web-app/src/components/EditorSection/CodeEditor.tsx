"use client";
import { Editor, OnChange } from "@monaco-editor/react";

/**
 * This is only client side since monaco-react is not adapted fully to server components
 */
export const CodeEditor = ({
	code = "py",
	onChange = () => {},
}: {
	code: string;
	onChange: OnChange;
}) => {
	return (
		<Editor
			height="500px"
			width="80%"
			defaultLanguage="python"
			defaultValue={'def main():\n    print("Hello, world!")\n\nmain()'}
			//[TO-DO]: Implement a debouncer, this will not work and its just to see how things is going =)
			onChange={onChange}
			theme="vs-dark"
			options={{
				minimap: { enabled: false },
				scrollBeyondLastLine: false,
				fontSize: 14,
				lineHeight: 24,
				fontLigatures: true,
				formatOnPaste: true,
				formatOnType: true,
				scrollbar: {
					verticalScrollbarSize: 12,
					horizontalScrollbarSize: 12,
					verticalHasArrows: false,
					horizontalHasArrows: false,
					alwaysConsumeMouseWheel: false,
					useShadows: true,
				},
				padding: { top: 16, bottom: 16 },
				parameterHints: { enabled: true },
				tabCompletion: "on",
				lineNumbers: "on",
				renderLineHighlight: "all",
				bracketPairColorization: { enabled: true },
				automaticLayout: true,
			}}
		/>
	);
};
