import { TrackAnonymous } from "@/handlers/tracking";
import { getServerURL } from "@/utils/getServerURL";
import { useEffect, useRef, useState } from "react";

export type BaseMessage = {
  type: "command" | "file";
};

//[TO-DO]: Export this somewhere else
export interface WsCommandMessage extends BaseMessage {
  host: string;
  user: string;
  cwd: string;
  output: string;
}

export interface WsFileMessage extends BaseMessage {
  file_path: string;
  content: string;
}

// Type guard for WsCommandMessage
function isCommandMessage(message: any): message is WsCommandMessage {
  return message && typeof message === "object" && message.type === "command";
}

// Type guard for WsFileMessage
function isFileMessage(message: any): message is WsFileMessage {
  return message && typeof message === "object" && message.type === "file";
}

export const useSocket = () => {
  const socket = useRef<WebSocket | null>(null);
  const [wsData, setWsData] = useState<WsCommandMessage | null>(null);
  const [fileData, setFileData] = useState<WsFileMessage | null>(null);
  const [isEnvReady, setIsEnvReady] = useState<boolean>(false);

  const tracker = new TrackAnonymous();

  useEffect(() => {
    if (socket.current) return;

    const webSocket = new WebSocket(
      //Encode it because it can contain breaking URL characters
      getServerURL("ws") + `/ws/terminal/${encodeURIComponent(tracker.getUserID())}`,
    );

    // Connection opened
    webSocket.addEventListener("open", () => {
      //[TO-DO]: Implement ACK
      // webSocket.send("Connection established");
    });

    // Listen for messages
    webSocket.addEventListener("message", (event: MessageEvent<string>) => {
      console.log("Message from server ", event.data);

      if (event.data) {
        const parsedJson = JSON.parse(event.data);

        if (isCommandMessage(parsedJson)) setWsData(parsedJson);
        if (isFileMessage(parsedJson)) setFileData(parsedJson);

        setIsEnvReady(true);
      }
    });

    socket.current = webSocket;

    return () => {
      if (webSocket.readyState === webSocket.OPEN) webSocket.close();
    };
  }, [tracker]);

  return { socket, wsData, isEnvReady, fileData };
};
