import { CodeEditorFooter } from "@/components/CodeEditorFooter";
import { CodeEditor } from "../components/CodeEditor";

export default function Home() {
	return (
		<div className="h-full w-full">
			<h1 className="text-4xl py-16 text-center">AQ-Take-Home</h1>
			<div className="h-[60vh] w-[60%] justify-self-center">
				{/* Separated client logic on this div, if you need to follow down pass a children for both*/}
				<CodeEditor />
				<div className="mt-12 flex gap-6">
					<CodeEditorFooter />
				</div>
			</div>
		</div>
	);
}
