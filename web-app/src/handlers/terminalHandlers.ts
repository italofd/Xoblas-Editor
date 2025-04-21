// Function to create an appropriately sized prompt based on terminal width

import { blue, green, reset } from "@/constants/terminal";
import { Socket, WsData } from "@/types/terminal";
import { Terminal } from "@xterm/xterm";
import { RefObject } from "react";

export type PrompRef = RefObject<number>;

export const createPrompt = (cols: number, wsData: WsData, promptLengthRef: PrompRef) => {
  if (!wsData) return "$ ";

  // Full prompt content (without ANSI escape sequences)
  const user = wsData.user;
  const host = wsData.host;
  const cwd = wsData.cwd;

  // Base characters in prompt (brackets, @, spaces)
  const baseChars = "[] $ ".length;

  // Calculate total visible length
  const totalLength = user.length + host.length + cwd.length + baseChars;

  promptLengthRef.current = totalLength;

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
    socket.current.send(JSON.stringify({ type: "command", command }));

    //[TO-DO]: Receive response and display, implement path for working directory
  } else if (terminal) {
    terminal.writeln("Not connected to server.");
  }
};

export const onWsData = (wsData: WsData, terminal: Terminal | null, promptLengthRef: PrompRef) => {
  if (wsData && terminal) {
    terminal.writeln(wsData.output);

    // Get terminal dimensions
    const dimensions = terminal.cols;

    // Generate appropriate prompt based on current width
    const prompt = createPrompt(dimensions, wsData, promptLengthRef);

    // Write prompt and save cursor position
    terminal.write(`${prompt}\u001B[s`);
  }
};

export const handleTerminalKeyEvent =
  (
    terminal: Terminal,
    socket: Socket,
    currentLineRef: RefObject<string>,
    promptLengthRef: PrompRef,
  ) =>
  ({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
    const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

    const eventKey = domEvent.key;

    // This api its not stable and types are not updated =)
    // @ts-ignore
    const cursorX = terminal._core.buffer.x; // current cursor column

    // Handle Enter key (executing a command)
    if (eventKey === "Enter") {
      terminal.writeln("");
      handleCommand(currentLineRef.current, terminal, socket);
      currentLineRef.current = "";

      return;
    }

    //Handle regular backspace
    if (eventKey === "Backspace") {
      if (cursorX > promptLengthRef.current) {
        const relativePos = cursorX - promptLengthRef.current;

        // Remove character at cursor - 1
        currentLineRef.current =
          currentLineRef.current.slice(0, relativePos - 1) +
          currentLineRef.current.slice(relativePos);

        // Move cursor left
        terminal.write("\x1b[D");

        // Overwrite from current cursor to end of line
        const remaining = currentLineRef.current.slice(relativePos - 1);
        terminal.write(remaining + " ");

        // Move cursor back to correct position
        const movesLeft = remaining.length + 1;
        terminal.write(`\x1b[${movesLeft}D`);
      }

      return;
    }

    if (eventKey === "Delete") {
      const relativePos = cursorX - promptLengthRef.current;

      if (relativePos < currentLineRef.current.length) {
        // Remove character at cursor
        currentLineRef.current =
          currentLineRef.current.slice(0, relativePos) +
          currentLineRef.current.slice(relativePos + 1);

        // Overwrite from current cursor to end of line
        const remaining = currentLineRef.current.slice(relativePos);
        terminal.write(remaining + " ");

        // Move cursor back to correct position
        const movesLeft = remaining.length + 1;
        terminal.write(`\x1b[${movesLeft}D`);
      }

      return;
    }

    if (eventKey === "ArrowUp" || eventKey === "ArrowDown") {
      //[TO-DO]: Implement History =)
      return;
    }

    if (eventKey === "ArrowLeft") {
      if (cursorX > promptLengthRef.current) {
        terminal.write("\x1b[D"); // Move cursor left
      }
      return;
    }

    if (eventKey === "ArrowRight") {
      if (cursorX < promptLengthRef.current + currentLineRef.current.length) {
        terminal.write("\x1b[C"); // Move cursor right
      }
      return;
    }

    // Handle printable characters
    if (printable) {
      currentLineRef.current += key;
      terminal.write(key);
    }
  };
