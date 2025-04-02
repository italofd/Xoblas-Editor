"use client";
import { useState } from "react";

import { CodeEditorFooter } from "@/components/EditorSection/CodeEditorFooter";
import { CodeEditor } from "@/components/EditorSection/CodeEditor";
import { DEFAULT_PYTHON_CODE } from "@/constants/editor";
import { PythonCodeDTO } from "@/types/api";

export const CodeEditorMainSection = () => {
	const [code, setCode] = useState<PythonCodeDTO>(DEFAULT_PYTHON_CODE);

	const [executionResponse, setExecutionResponse] =
		useState<PythonCodeDTO>(null);

	return (
		<>
			<div className="flex gap-8">
				<CodeEditor onChange={(code) => code && setCode(code)} />
				<div className="border-2 border-gray-300 w-[30%] p-4">
					<p className="text-2xl whitespace-pre-wrap">{executionResponse}</p>
				</div>
			</div>
			<div className="mt-12 flex gap-6">
				<CodeEditorFooter
					code={code}
					setExecutionResponse={setExecutionResponse}
				/>
			</div>
		</>
	);
};
