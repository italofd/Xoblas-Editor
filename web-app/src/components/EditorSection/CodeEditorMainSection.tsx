"use client";

import { useEffect, useRef, useState } from "react";

import { CodeEditor } from "@/components/EditorSection/CodeEditor";
import { MainLayout } from "./MainLayout";
import { CodeEditorDTO } from "@/types/editor";
import { Notification } from "../Notification";

import "../Terminal/terminal.css";

import dynamic from "next/dynamic";
import { useSocket } from "@/hooks/useSocket";
import LoadingOverlay from "../LoaderOverlay";

const XTerminal = dynamic(() => import("../Terminal/index"), {
  ssr: false,
});

export const CodeEditorMainSection = () => {
  const [shouldShowDialog, setShouldShowDialog] = useState(false);

  const editorRef = useRef<CodeEditorDTO>(null);
  const notificationRef = useRef<HTMLDialogElement>(null);

  const socketHook = useSocket();

  useEffect(() => {
    if (!notificationRef.current) return;

    return shouldShowDialog ? notificationRef.current.show() : notificationRef.current.close();
  }, [notificationRef, shouldShowDialog]);

  return (
    <>
      <LoadingOverlay isLoading={!socketHook.isEnvReady} />

      <div className="flex flex-col lg:flex-row w-full h-full">
        <MainLayout>
          <div className="flex h-full gap-8">
            <CodeEditor
              onSave={(content) =>
                socketHook.socket.current?.send(JSON.stringify({ type: "write_file", content }))
              }
              editorRef={editorRef}
            />
          </div>
        </MainLayout>
      </div>

      <XTerminal socketHook={socketHook} />
      <Notification
        message="Your code and his output was stored into the database"
        dialogRef={notificationRef}
        setShouldShowDialog={setShouldShowDialog}
      />
    </>
  );
};
