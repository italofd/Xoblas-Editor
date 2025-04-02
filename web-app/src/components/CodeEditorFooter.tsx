"use client";
import { apiClient } from "@/api/client";
import { executePythonCode } from "@/functions/execute";

export const CodeEditorFooter = () => {
	return (
		<>
			<button
				className="px-6 py-2 bg-gradient-to-r font-bold from-blue-500 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
				onClick={() => executePythonCode(apiClient)}
			>
				Run your code
			</button>
			<button className="px-6 py-2 bg-gradient-to-r font-bold from-green-500 to-green-600 text-white rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
				Run and Store
			</button>
		</>
	);
};
