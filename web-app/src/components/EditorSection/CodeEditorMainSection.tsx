"use client";

import { useEffect, useRef, useState } from "react";

import { CodeEditor } from "@/components/EditorSection/CodeEditor";
import { PythonCodeDTO } from "@/types/api";
import { MainLayout } from "./MainLayout";
import { CodeOutputComponent, OutputLayout } from "./OutputLayout";
import { CodeEditorDTO } from "@/types/editor";
import { Notification } from "../Notification";
import { useTabs } from "@/hooks/useTabs";
import Tabs from "../Tabs";

export const CodeEditorMainSection = () => {
  const [isExecLoading, setIsExecLoading] = useState<boolean>(false);
  const [executionResponse, setExecutionResponse] = useState<PythonCodeDTO>(null);
  const [shouldShowDialog, setShouldShowDialog] = useState(false);
  const editorRef = useRef<CodeEditorDTO>(null);
  const notificationRef = useRef<HTMLDialogElement>(null);

  const tabs = useTabs();

  useEffect(() => {
    if (!notificationRef.current) return;

    return shouldShowDialog ? notificationRef.current.show() : notificationRef.current.close();
  }, [notificationRef, shouldShowDialog]);

  return (
    <>
      <div className="flex flex-col lg:flex-row w-full h-full">
        <MainLayout
          monacoRef={editorRef}
          isExecLoading={isExecLoading}
          setters={{
            setExecutionResponse,
            setIsExecLoading,
            setShouldShowDialog,
            setIsLoadingOutputs: tabs.handlers.setIsLoadingOutputs,
            addOutputFiles: tabs.handlers.addFiles,
          }}
        >
          <div className="flex h-full gap-8">
            <CodeEditor editorRef={editorRef} />
          </div>
        </MainLayout>
        <div className="flex flex-col sm:h-full lg:max-w-[30%] lg:min-w-[30%] bg-zinc-800 border border-zinc-700 rounded-lg p-4 gap-4">
          <OutputLayout isLoading={isExecLoading}>
            <p className="text-green-400 ">{executionResponse}</p>
          </OutputLayout>

          <Tabs tabs={tabs}>
            <CodeOutputComponent isLoading={tabs.state.isLoadingOutputs}>
              {/* We can safely pass a undefined because 
              active file is being handled at the Tabs (main component) level */}
              <p className=" text-blue-400 ">{tabs?.state?.activeFile?.content}</p>
            </CodeOutputComponent>
          </Tabs>
        </div>
      </div>

      <Notification
        message="Your code and his output was stored into the database"
        dialogRef={notificationRef}
        setShouldShowDialog={setShouldShowDialog}
      />
    </>
  );
};
