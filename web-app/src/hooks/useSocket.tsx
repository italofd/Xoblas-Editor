import { TrackAnonymous } from "@/handlers/tracking";
import { isCommandMessage, isFileMessage, WsCommandMessage, WsFileMessage } from "@/types/socket";
import { getServerURL } from "@/utils/getServerURL";
import { useEffect, useRef, useState } from "react";

export const useSocket = () => {
  const socket = useRef<WebSocket | null>(null);
  const [wsData, setWsData] = useState<WsCommandMessage | null>(null);
  const [fileData, setFileData] = useState<WsFileMessage | null>(null);
  const [isRawMode, setIsRawMode] = useState(false);
  const [isEnvReady, setIsEnvReady] = useState<boolean>(false);

  useEffect(() => {
    if (socket.current) return;

    const tracker = new TrackAnonymous();

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

        if (!parsedJson) return;

        if (isCommandMessage(parsedJson)) {
          setIsRawMode(parsedJson.raw_mode);
          setWsData(parsedJson);
        }
        if (isFileMessage(parsedJson)) setFileData(parsedJson);
      }
    });

    socket.current = webSocket;

    return () => {
      if (webSocket.readyState === webSocket.OPEN) webSocket.close();
    };
  }, []);

  // Detects when env is ready
  useEffect(() => {
    if (fileData && wsData && !isEnvReady) setIsEnvReady(true);
  }, [fileData, wsData, isEnvReady]);

  return { socket, wsData, isEnvReady, fileData, isRawMode };
};
