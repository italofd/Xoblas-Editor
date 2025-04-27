import { CodeEditorMainSection } from "@/components/EditorSection/CodeEditorMainSection";

export default function Home() {
  return (
    <div className="h-screen w-full">
      <div className="flex h-full mx-auto py-12 px-16">
        {/* Separated client logic on this div, 
        if you need to follow with more server components down, 
        pass a children to the MainSection*/}
        <CodeEditorMainSection />
      </div>
    </div>
  );
}
