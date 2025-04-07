"use client";
import { useEffect, useRef, useState } from "react";

import { CodeEditor } from "@/components/EditorSection/CodeEditor";
import { PythonCodeDTO } from "@/types/api";
import { MainLayout } from "./MainLayout";
import { OutputLayout } from "./OutputLayout";
import { CodeEditorDTO } from "@/types/editor";
import { Notification } from "../Notification";

export const CodeEditorMainSection = () => {
  const [isExecLoading, setIsExecLoading] = useState<boolean>(false);
  const [executionResponse, setExecutionResponse] =
    useState<PythonCodeDTO>(null);
  const [shouldShowDialog, setShouldShowDialog] = useState(false);

  const editorRef = useRef<CodeEditorDTO>(null);
  const notificationRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!notificationRef.current) return;

    return shouldShowDialog
      ? notificationRef.current.show()
      : notificationRef.current.close();
  }, [notificationRef, shouldShowDialog]);

  return (
    <>
      <div className="flex w-full h-full">
        <MainLayout
          monacoRef={editorRef}
          isExecLoading={isExecLoading}
          setters={{
            setExecutionResponse,
            setIsExecLoading,
            setShouldShowDialog,
          }}
        >
          <div className="flex h-full gap-8">
            <CodeEditor editorRef={editorRef} />
          </div>
        </MainLayout>
        <OutputLayout isExecLoading={isExecLoading}>
          <p>{executionResponse}</p>
        </OutputLayout>
      </div>
      <Notification
        message="Your code and his output was stored into the database"
        dialogRef={notificationRef}
        setShouldShowDialog={setShouldShowDialog}
      />
    </>
  );
};
