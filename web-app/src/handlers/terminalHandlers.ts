// Function to create an appropriately sized prompt based on terminal width

import { blue, green, reset } from "@/constants/terminal";
import { Socket, WsData } from "@/types/terminal";
import { Terminal } from "@xterm/xterm";
import { RefObject } from "react";

export type PromptRef = RefObject<number>;

export const createPrompt = (cols: number, wsData: WsData, promptLengthRef: PromptRef) => {
  if (!wsData) return "$ ";

  // Full prompt content (without ANSI escape sequences)
  const user = wsData.user;
  const host = wsData.host;
  const cwd = wsData.cwd;

  // Base characters in prompt (brackets, @, spaces)
  const baseChars = "[] $ ".length;

  // Calculate total visible length
  const totalLength = user.length + host.length + cwd.length + baseChars;

  promptLengthRef.current = totalLength + 1;

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

export const onWsData = (
  wsData: WsData,
  terminal: Terminal | null,
  promptLengthRef: PromptRef,
  currentLineRef: RefObject<string>,
) => {
  if (wsData && terminal) {
    // Write command output
    terminal.writeln(wsData.output);

    // Get terminal width
    const dimensions = terminal.cols;

    // Generate prompt and update promptLengthRef
    const prompt = createPrompt(dimensions, wsData, promptLengthRef);

    // Reset line buffer after command completes
    currentLineRef.current = " ";

    // Write new prompt and save cursor position
    terminal.write(`${prompt}\u001B[s`);
  }
};

export const handleTerminalKeyEvent =
  (
    terminal: Terminal,
    socket: Socket,
    currentLineRef: RefObject<string>,
    promptLengthRef: PromptRef,
  ) =>
  ({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
    const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;
    const eventKey = domEvent.key;

    // @ts-expect-error: Internal API to get current cursor position
    const cursorX = terminal._core.buffer.x;

    const relativePos = cursorX - promptLengthRef.current;

    if (eventKey === "Enter") {
      terminal.writeln("");
      handleCommand(currentLineRef.current, terminal, socket);
      currentLineRef.current = " ";
      return;
    }

    if (eventKey === "Backspace") {
      if (cursorX > promptLengthRef.current) {
        currentLineRef.current =
          currentLineRef.current.slice(0, relativePos - 1) +
          currentLineRef.current.slice(relativePos);

        terminal.write("\x1b[D");

        const remaining = currentLineRef.current.slice(relativePos - 1);
        terminal.write(remaining + " ");
        terminal.write(`\x1b[${remaining.length + 1}D`);
      }
      return;
    }

    if (eventKey === "Delete") {
      if (relativePos < currentLineRef.current.length) {
        currentLineRef.current =
          currentLineRef.current.slice(0, relativePos) +
          currentLineRef.current.slice(relativePos + 1);

        const remaining = currentLineRef.current.slice(relativePos);
        terminal.write(remaining + " ");
        terminal.write(`\x1b[${remaining.length + 1}D`);
      }
      return;
    }

    if (eventKey === "ArrowUp" || eventKey === "ArrowDown") {
      // [TO-DO]: Implement History =)
      return;
    }

    if (eventKey === "ArrowLeft") {
      if (cursorX > promptLengthRef.current) {
        terminal.write("\x1b[D");
      }
      return;
    }

    if (eventKey === "ArrowRight") {
      if (cursorX < promptLengthRef.current + currentLineRef.current.length) {
        terminal.write("\x1b[C");
      }
      return;
    }

    //[TO-DO]: Breaking events that needs proper handling
    if (eventKey === "End" || eventKey === "Home" || eventKey === "Insert") return;

    if (printable) {
      currentLineRef.current =
        currentLineRef.current.slice(0, relativePos) +
        key +
        currentLineRef.current.slice(relativePos);

      // Overwrite from cursor position to end of line
      const tail = currentLineRef.current.slice(relativePos);
      terminal.write(tail);

      // Move cursor back to just after inserted char
      const movesLeft = tail.length - 1;
      if (movesLeft > 0) terminal.write(`\x1b[${movesLeft}D`);
    }
  };
