import { getServerURL } from "@/utils/getServerURL";
import { useEffect, useRef } from "react";

export const useSocket = () => {
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    const webSocket = new WebSocket(getServerURL("ws") + "/ws/terminal");

    // Connection opened
    webSocket.addEventListener("open", (event) => {
      //[TO-DO]: Implement ACK
      // webSocket.send("Connection established");
    });

    // Listen for messages
    webSocket.addEventListener("message", (event) => {
      console.log("Message from server ", event.data);
    });

    socket.current = webSocket;

    return () => {
      webSocket.readyState === webSocket.OPEN && webSocket.close();
    };
  }, []);

  return { socket };
};
