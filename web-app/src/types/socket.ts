//Socket communication from client
export type TerminalEventType = "input" | "resize" | "command";

export type CodeEditorEventType = "write_file";

export type AllSocketEvents = TerminalEventType | CodeEditorEventType;
//

//Socket communication from server
export type BaseMessage = {
  type: "command" | "file" | "event" | "xoblas";
};

//[TO-DO]: Export this somewhere else
export interface WsCommandMessage extends BaseMessage {
  host: string;
  user: string;
  cwd: string;
  output: string;
  raw_mode: boolean;
  is_complete: boolean;
}

export interface WsFileMessage extends BaseMessage {
  file_path: string;
  content: string;
}

export interface WsXoblasMessage extends BaseMessage {
  file_structure: TreeCommandNode[];
}

// Type guard for WsCommandMessage
export function isCommandMessage(message: unknown): message is WsCommandMessage {
  return (
    message !== null &&
    typeof message === "object" &&
    "type" in message &&
    message.type === "command"
  );
}

// Type guard for WsFileMessage
export function isFileMessage(message: unknown): message is WsFileMessage {
  return (
    message !== null && typeof message === "object" && "type" in message && message.type === "file"
  );
}

export function isXoblasMessage(message: unknown): message is WsXoblasMessage {
  return (
    message !== null &&
    typeof message === "object" &&
    "type" in message &&
    message.type === "xoblas"
  );
}
//

/**
 * Interface for tree command JSON output
 */
export interface TreeCommandNode {
  type: "directory" | "file" | "link";
  name: string;
  contents?: TreeCommandNode[];
}
