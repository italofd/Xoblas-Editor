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

  useEffect(() => {
    const webSocket = new WebSocket(getServerURL("ws") + "/ws/terminal");

    // Connection opened
    webSocket.addEventListener("open", (event) => {
      //[TO-DO]: Implement ACK
      // webSocket.send("Connection established");
    });

    // Listen for messages
    webSocket.addEventListener("message", (event: MessageEvent<string>) => {
      console.log("Message from server ", event.data);

      if (event.data) {
        const parsedJson: WsMessage = JSON.parse(event.data);

        setWsData(parsedJson);
      }
    });

    socket.current = webSocket;

    return () => {
      webSocket.readyState === webSocket.OPEN && webSocket.close();
    };
  }, []);

  return { socket, wsData };
};
