import { CodeEditorMainSection } from "@/components/EditorSection/CodeEditorMainSection";

export default function Home() {
  return (
    <div className="h-screen w-full overflow-auto">
      <h1 className="text-4xl py-16 text-center">AQ-Take-Home</h1>
      <div className="h-[72%] w-[80%] mx-auto">
        {/* Separated client logic on this div, if you need to follow with more server components down, pass a children to the MainSection*/}
        <div className="h-full">
          <CodeEditorMainSection />
        </div>
      </div>
    </div>
  );
}
