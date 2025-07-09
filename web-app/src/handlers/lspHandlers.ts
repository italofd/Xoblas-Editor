import {
  LSPCompletionItem,
  LSPHoverResult,
  LSPDiagnostic,
  LSPRequestParams,
  LSPDiagnosticsParams,
  LSPRequestMessage,
  LSPResponse,
} from "@/types/lsp";

const DEFAULT_FILE_PATH = "/home/termuser/root/main.py";

export const sendLSPRequest = (
  socket: WebSocket | null,
  isConnected: boolean,
  type: string,
  params: LSPRequestMessage,
  requestCallbacks: Map<string, (data: LSPResponse) => void>,
): Promise<LSPResponse> => {
  return new Promise((resolve, reject) => {
    if (!socket || !isConnected) {
      reject(new Error("LSP not connected"));
      return;
    }

    requestCallbacks.set(type, resolve);

    socket.send(
      JSON.stringify({
        ...params,
        type,
      }),
    );
  });
};

export const getCompletions = async (
  sendRequest: (type: string, params: LSPRequestMessage) => Promise<LSPResponse>,
  params: LSPRequestParams,
): Promise<LSPCompletionItem[]> => {
  try {
    const result = await sendRequest("completion", {
      type: "completion",
      language: params.language,
      file_path: params.filePath || DEFAULT_FILE_PATH,
      line: params.line,
      character: params.character,
      text: params.text,
    });

    return result?.result?.items || [];
  } catch (error) {
    console.error("LSP completion error:", error);
    return [];
  }
};

export const getHover = async (
  sendRequest: (type: string, params: LSPRequestMessage) => Promise<LSPResponse>,
  params: LSPRequestParams,
): Promise<LSPHoverResult | null> => {
  try {
    const result = await sendRequest("hover", {
      type: "hover",
      language: params.language,
      file_path: params.filePath || DEFAULT_FILE_PATH,
      line: params.line,
      character: params.character,
      text: params.text,
    });

    if (result?.result?.contents) {
      return {
        contents: result.result.contents,
        range: result.result.range,
      };
    }

    return null;
  } catch (error) {
    console.error("LSP hover error:", error);
    return null;
  }
};

export const getDiagnostics = async (
  sendRequest: (type: string, params: LSPRequestMessage) => Promise<LSPResponse>,
  params: LSPDiagnosticsParams,
): Promise<LSPDiagnostic[]> => {
  try {
    const result = await sendRequest("diagnostics", {
      type: "diagnostics",
      language: params.language,
      file_path: params.filePath || DEFAULT_FILE_PATH,
      text: params.text,
    });

    return result?.diagnostics || [];
  } catch (error) {
    console.error("LSP diagnostics error:", error);
    return [];
  }
};
