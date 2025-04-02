import { CodeEditorFooter } from "@/_components/CodeEditorFooter";
import { CodeEditor } from "../_components/CodeEditor";

export default function Home() {
	return (
		<div className="h-full w-full">
			<h1 className="text-4xl py-16 text-center">AQ-Home-Test</h1>
			<div className="h-[60vh] w-[60%] justify-self-center">
				<CodeEditor />
				<div className="mt-12 flex gap-6">
					<CodeEditorFooter />
				</div>
			</div>
		</div>
	);
}
