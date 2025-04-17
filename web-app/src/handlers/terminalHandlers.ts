// Function to create an appropriately sized prompt based on terminal width

import { blue, green, reset } from "@/constants/terminal";
import { Socket, WsData } from "@/types/terminal";
import { Terminal } from "@xterm/xterm";
import { RefObject } from "react";

export const createPrompt = (cols: number, wsData: WsData) => {
  if (!wsData) return "$ ";

  // Full prompt content (without ANSI escape sequences)
  const user = wsData.user;
  const host = wsData.host;
  const cwd = wsData.cwd;

  // Base characters in prompt (brackets, @, spaces)
  const baseChars = "[] $ ".length;

  // Calculate total visible length
  const totalLength = user.length + host.length + cwd.length + baseChars;

  // If prompt is too long for terminal width, create truncated version
  if (totalLength >= cols) {
    // Ensure we always have at least user@host and $
    const minPrompt = `${green}${user}@${host}${reset}$ `;

    // If even that's too long, just use a basic prompt
    if (minPrompt.length - (green.length + reset.length) >= cols) {
      return "$ ";
    }

    // Otherwise use the minimum prompt
    return minPrompt;
  }

  // Full prompt if it fits
  return `[${green}${user}@${host}${reset} ${blue}${cwd}${reset}]$ `;
};

export const handleCommand = (command: string, terminal: Terminal | null, socket: Socket) => {
  //[TO-DO]: Treat case where its not connected by displaying a error or trying a reconnection
  if (socket.current && socket.current.readyState === WebSocket.OPEN) {
    socket.current.send(command);

    //[TO-DO]: Receive response and display, implement path for working directory
  } else if (terminal) {
    terminal.writeln("Not connected to server.");
  }
};

export const onWsData = (wsData: WsData, terminal: Terminal | null) => {
  if (wsData && terminal) {
    terminal.writeln(wsData.output);

    // Get terminal dimensions
    const dimensions = terminal.cols;

    // Generate appropriate prompt based on current width
    const prompt = createPrompt(dimensions, wsData);

    // Write prompt and save cursor position
    terminal.write(`${prompt}\u001B[s`);
  }
};

export const handleTerminalKeyEvent =
  (terminal: Terminal, socket: Socket, currentLineRef: RefObject<string>) =>
  ({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
    const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

    // Handle Enter key (executing a command)
    if (domEvent.key === "Enter") {
      terminal.writeln("");
      handleCommand(currentLineRef.current, terminal, socket);
      currentLineRef.current = "";
    }

    // Handle regular Backspace
    else if (domEvent.key === "Backspace") {
      if (currentLineRef.current.length > 0) {
        currentLineRef.current = currentLineRef.current.substring(
          0,
          currentLineRef.current.length - 1,
        );
        terminal.write("\b \b");
      }
    }

    // Handle printable characters
    else if (printable) {
      currentLineRef.current += key;
      terminal.write(key);
    }
  };
