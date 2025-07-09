import { useCallback, useEffect, useRef, useState } from "react";
import { getServerURL } from "@/utils/getServerURL";
import { TrackAnonymous } from "@/handlers/tracking";
import {
  LSPCompletionItem,
  LSPHoverResult,
  LSPDiagnostic,
  LSPRequestMessage,
  LSPResponse,
} from "@/types/lsp";
import {
  sendLSPRequest,
  getCompletions as getCompletionsAPI,
  getHover as getHoverAPI,
  getDiagnostics as getDiagnosticsAPI,
} from "@/handlers/lspHandlers";

export const useLSP = () => {
  const socket = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);
  const requestCallbacks = useRef<Map<string, (data: LSPResponse) => void>>(new Map());

  useEffect(() => {
    if (socket.current) return;

    const tracker = new TrackAnonymous();
    const webSocket = new WebSocket(
      getServerURL("ws") + `/ws/lsp/${encodeURIComponent(tracker.getUserID())}`,
    );

    webSocket.addEventListener("open", () => setIsConnected(true));

    webSocket.addEventListener("message", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data);

      if (data.type === "supported_languages") return setSupportedLanguages(data.languages);

      const callback = requestCallbacks.current.get(data.type);

      if (callback) {
        callback(data.data);
        requestCallbacks.current.delete(data.type);
      }
    });

    webSocket.addEventListener("close", () => setIsConnected(false));

    socket.current = webSocket;

    return () => {
      if (webSocket.readyState === WebSocket.OPEN) webSocket.close();
    };
  }, []);

  const sendRequest = useCallback(
    (type: string, params: LSPRequestMessage): Promise<LSPResponse> => {
      return sendLSPRequest(socket.current, isConnected, type, params, requestCallbacks.current);
    },
    [isConnected],
  );

  const getCompletions = useCallback(
    async (
      language: string,
      text: string,
      line: number,
      character: number,
      filePath?: string,
    ): Promise<LSPCompletionItem[]> =>
      getCompletionsAPI(sendRequest, {
        language,
        text,
        line,
        character,
        filePath,
      }),
    [sendRequest],
  );

  const getHover = useCallback(
    async (
      language: string,
      text: string,
      line: number,
      character: number,
      filePath?: string,
    ): Promise<LSPHoverResult | null> =>
      getHoverAPI(sendRequest, {
        language,
        text,
        line,
        character,
        filePath,
      }),
    [sendRequest],
  );

  const getDiagnostics = useCallback(
    async (language: string, text: string, filePath?: string): Promise<LSPDiagnostic[]> =>
      getDiagnosticsAPI(sendRequest, {
        language,
        text,
        filePath,
      }),
    [sendRequest],
  );

  return {
    isConnected,
    supportedLanguages,
    getCompletions,
    getHover,
    getDiagnostics,
  };
};
