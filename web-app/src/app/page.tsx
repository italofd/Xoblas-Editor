"use client";
import dynamic from "next/dynamic";

const CodeEditorMainSection = dynamic(
  () =>
    import("@/components/EditorSection/CodeEditorMainSection").then(
      (mod) => mod.CodeEditorMainSection,
    ),
  {
    ssr: false,
  },
);

export default function Home() {
  return (
    <div className="h-screen w-full">
      {/* <div className="flex h-full mx-auto py-12 px-16"> */}
      <CodeEditorMainSection />
    </div>
  );
}
