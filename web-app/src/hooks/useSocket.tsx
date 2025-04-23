import { TrackAnonymous } from "@/handlers/tracking";
import { getServerURL } from "@/utils/getServerURL";
import { useEffect, useRef, useState } from "react";

//[TO-DO]: Export this somewhere else
export type WsMessage = {
  host: string;
  user: string;
  cwd: string;
  output: string;
} | null;

export const useSocket = () => {
  const socket = useRef<WebSocket | null>(null);
  const [wsData, setWsData] = useState<WsMessage>(null);
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
        const parsedJson: WsMessage = JSON.parse(event.data);

        setWsData(parsedJson);
        setIsEnvReady(true);
      }
    });

    socket.current = webSocket;

    return () => {
      if (webSocket.readyState === webSocket.OPEN) webSocket.close();
    };
  }, [tracker]);

  return { socket, wsData, isEnvReady };
};
