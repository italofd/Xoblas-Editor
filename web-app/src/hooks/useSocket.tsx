import { TrackAnonymous } from "@/handlers/tracking";
import {
  AllSocketEvents,
  isCommandMessage,
  isFileMessage,
  isXoblasMessage,
  WsCommandMessage,
  WsFileMessage,
  WsXoblasMessage,
} from "@/types/socket";
import { getServerURL } from "@/utils/getServerURL";
import { useCallback, useEffect, useRef, useState } from "react";

export const useSocket = () => {
  const socket = useRef<WebSocket | null>(null);
  const [wsData, setWsData] = useState<WsCommandMessage | null>(null);
  const [fileData, setFileData] = useState<WsFileMessage | null>(null);
  const [isRawMode, setIsRawMode] = useState(false);
  const [isEnvReady, setIsEnvReady] = useState<boolean>(false);
  const [fileStructure, setFileStructure] = useState<WsXoblasMessage["file_structure"]>();

  // ref for keeping fresh value accessible inside closures
  const isEnvReadyRef = useRef(isEnvReady);

  /**
   * Returns a boolean meaning that we could send the message if returned true or not if false
   */
  const sendEvent = useCallback((params: { type: AllSocketEvents; data: Object }) => {
    if (!isEnvReadyRef.current) return false;

    socket.current!.send(JSON.stringify({ type: params.type, ...params.data }));
    return true;
  }, []);

  useEffect(() => {
    if (socket.current) return;

    const tracker = new TrackAnonymous();

    const webSocket = new WebSocket(
      //Encode it because it can contain breaking URL characters
      getServerURL("ws") + `/ws/terminal/${encodeURIComponent(tracker.getUserID())}`,
    );

    // Listen for messages
    webSocket.addEventListener("message", (event: MessageEvent<string>) => {
      if (event.data) {
        const parsedJson = JSON.parse(event.data);

        if (!parsedJson) return;

        if (isCommandMessage(parsedJson)) {
          setIsRawMode(parsedJson.raw_mode);
          setWsData(parsedJson);
        }

        if (isFileMessage(parsedJson)) setFileData(parsedJson);

        if (isXoblasMessage(parsedJson)) {
          setFileStructure(parsedJson.file_structure);
        }
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

  useEffect(() => {
    isEnvReadyRef.current = isEnvReady;
  }, [isEnvReady]);

  return {
    socket,
    wsData,
    isEnvReady,
    fileData,
    isRawMode,
    fileStructure,
    handlers: { sendEvent },
  };
};
