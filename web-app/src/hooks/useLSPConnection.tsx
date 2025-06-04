import { useEffect, useRef, useState } from "react";
import { getServerURL } from "@/utils/getServerURL";
import { TrackAnonymous } from "@/handlers/tracking";
import { WebSocketMessageReader, WebSocketMessageWriter, toSocket } from "vscode-ws-jsonrpc";

export interface LSPConnection {
  socket: WebSocket | null;
  reader: WebSocketMessageReader | null;
  writer: WebSocketMessageWriter | null;
  isConnected: boolean;
  error: Error | null;
}

export const useLSPConnection = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const [connection, setConnection] = useState<LSPConnection>({
    socket: null,
    reader: null,
    writer: null,
    isConnected: false,
    error: null,
  });

  useEffect(() => {
    if (socketRef.current) return;

    const tracker = new TrackAnonymous();
    const sanitizedUserId = encodeURIComponent(tracker.getUserID());

    const wsUrl = `${getServerURL("ws")}/ws/lsp/${sanitizedUserId}`;
    console.log("Connecting to LSP server:", wsUrl);

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("LSP WebSocket connection established");

      try {
        // Convert WebSocket to socket for jsonrpc
        const jsonRpcSocket = toSocket(socket);
        const reader = new WebSocketMessageReader(jsonRpcSocket);
        const writer = new WebSocketMessageWriter(jsonRpcSocket);

        // Update connection state
        setConnection({
          socket,
          reader,
          writer,
          isConnected: true,
          error: null,
        });
      } catch (error) {
        console.error("Error setting up LSP connection:", error);
        setConnection((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error(String(error)),
          isConnected: false,
        }));
      }
    };

    socket.onerror = (event) => {
      console.error("LSP WebSocket error:", event);
      setConnection((prev) => ({
        ...prev,
        error: new Error("WebSocket connection error"),
        isConnected: false,
      }));
    };

    socket.onclose = () => {
      console.log("Warning: LSP WebSocket connection closed");
      setConnection((prev) => ({
        ...prev,
        isConnected: false,
      }));
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        console.log("Closing LSP connection");
        // Send shutdown request
        const shutdownRequest = {
          jsonrpc: "2.0",
          id: 999,
          method: "shutdown",
          params: null,
        };
        socket.send(JSON.stringify(shutdownRequest));

        // Send exit notification
        const exitNotification = {
          jsonrpc: "2.0",
          method: "exit",
          params: null,
        };
        socket.send(JSON.stringify(exitNotification));

        socket.close();

        console.log("LSP connection closed");
      }

      // Reset connection state
      setConnection({
        socket: null,
        reader: null,
        writer: null,
        isConnected: false,
        error: null,
      });
    };
  }, []);

  return connection;
};
