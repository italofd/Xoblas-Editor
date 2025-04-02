import { CodeEditorMainSection } from "@/components/EditorSection/CodeEditorMainSection";

export default function Home() {
	return (
		<div className="h-full w-full">
			<h1 className="text-4xl py-16 text-center">AQ-Take-Home</h1>
			<div className="h-[60vh] w-[60%] justify-self-center">
				{/* Separated client logic on this div, if you need to follow with more server components down, pass a children to the MainSection*/}
				<div className="h-full">
					<CodeEditorMainSection />
				</div>
			</div>
		</div>
	);
}
