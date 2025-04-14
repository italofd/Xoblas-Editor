import { CodeEditorMainSection } from "@/components/EditorSection/CodeEditorMainSection";

export default function Home() {
  return (
    <div className="h-screen w-full overflow-auto">
      <div className="flex h-full lg:h-[72%] w-[80%] mx-auto mt-12">
        {/* Separated client logic on this div, 
        if you need to follow with more server components down, 
        pass a children to the MainSection*/}
        <div className="h-full w-full">
          <CodeEditorMainSection />
        </div>
      </div>
    </div>
  );
}
