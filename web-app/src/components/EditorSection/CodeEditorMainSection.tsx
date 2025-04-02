"use client";
import { useState } from "react";

import { CodeEditorFooter } from "@/components/EditorSection/CodeEditorFooter";
import { CodeEditor } from "@/components/EditorSection/CodeEditor";

export const CodeEditorMainSection = () => {
	const [code, setCode] = useState<null | string>(null);

	const [executionResponse, setExecutionResponse] = useState<null | string>(
		null
	);

	return (
		<>
			<div className="flex gap-8">
				<CodeEditor onChange={(code) => code && setCode(code)} code="python" />
				<div className="border-2 border-gray-300 w-full p-2">
					<p className="text-2xl">{executionResponse}</p>
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
