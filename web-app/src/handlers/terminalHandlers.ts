import { blue, green, reset } from "@/constants/terminal";
import { Handlers, Socket, WsData } from "@/types/terminal";
import { Terminal } from "@xterm/xterm";
import { RefObject } from "react";

export type PromptRef = RefObject<number>;

// ANSI escape sequences for terminal operations
const ANSI = {
  CURSOR_LEFT: "\x1b[D",
  CURSOR_RIGHT: "\x1b[C",
  SAVE_CURSOR: "\u001B[s",
  MOVE_LEFT: (n: number) => `\x1b[${n}D`,
};

// Function to create an appropriately sized prompt based on terminal width
const createPrompt = (cols: number, wsData: WsData, promptLengthRef: PromptRef) => {
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

// Helper function to update line content when inserting/deleting characters
const updateLine = (terminal: Terminal, currentLine: string, relativePos: number) => {
  const remaining = currentLine.slice(relativePos);
  terminal.write(remaining + " ");
  terminal.write(ANSI.MOVE_LEFT(remaining.length + 1));
};

const handleCommand = (command: string, terminal: Terminal | null, handlers: Handlers) => {
  //[TO-DO]: Treat case where its not connected by displaying a error or trying a reconnection
  console.log("EVA04 INSIDE HANDLE", command);

  const res = handlers.sendEvent({ type: "command", data: { command } });

  //[TO-DO]: Receive response and display, implement path for working directory
  if (!res && terminal) terminal.writeln("Not connected to server.");
};

export const onWsData = (
  wsData: WsData,
  terminal: Terminal | null,
  promptLengthRef: PromptRef,
  currentLineRef: RefObject<string>,
  isRawMode: boolean,
) => {
  if (!wsData || !terminal) return;

  // Handle raw mode
  if (isRawMode) {
    terminal.write(wsData.output);
    return;
  }

  // For streaming chunks (incomplete), just write the output
  if (wsData.is_complete === false) {
    terminal.write(wsData.output);
    return;
  }

  // For complete commands, write output and show new prompt
  terminal.write(wsData.output);

  // Get terminal width and generate prompt
  const dimensions = terminal.cols;
  const prompt = createPrompt(dimensions, wsData, promptLengthRef);

  // Reset line buffer after command completes
  currentLineRef.current = " ";

  // Write new prompt and save cursor position
  terminal.write(`${prompt}${ANSI.SAVE_CURSOR}`);
};

export const resetTerminal = (
  wsData: WsData,
  terminal: Terminal | null,
  promptLengthRef: PromptRef,
  currentLineRef: RefObject<string>,
) => {
  if (!wsData || !terminal) return;

  // Get terminal width
  const dimensions = terminal.cols;

  // Generate prompt and update promptLengthRef
  const prompt = createPrompt(dimensions, wsData, promptLengthRef);

  // Reset line buffer after command completes
  currentLineRef.current = " ";

  // Write new prompt and save cursor position
  terminal.write(`${prompt}${ANSI.SAVE_CURSOR}`);
};

export const handleTerminalKeyEvent =
  (
    terminal: Terminal,
    currentLineRef: RefObject<string>,
    promptLengthRef: PromptRef,
    isRawMode: boolean,
    handlers: Handlers,
  ) =>
  // Async just for the clipboard for now, i want to remove the this dependency when i can
  async ({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
    const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;
    const eventKey = domEvent.key;

    // @ts-expect-error: Internal API to get current cursor position
    const cursorX = terminal._core.buffer.x;

    const relativePos = cursorX - promptLengthRef.current;

    if (!isRawMode && (domEvent.ctrlKey || domEvent.metaKey) && eventKey.toLowerCase() === "v") {
      domEvent.preventDefault();
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          currentLineRef.current =
            currentLineRef.current.slice(0, relativePos) +
            text +
            currentLineRef.current.slice(relativePos);

          const tail = currentLineRef.current.slice(relativePos);
          terminal.write(tail);

          const movesLeft = tail.length - 1;
          if (movesLeft > 0) terminal.write(ANSI.MOVE_LEFT(movesLeft));
        }
      } catch (err) {
        console.error("Paste failed:", err);
      }
      return;
    }

    // Handle raw mode separately
    if (isRawMode) {
      handlers.sendEvent({
        type: "input",
        data: { specialKey: domEvent.key, data: key },
      });
      return;
    }

    switch (eventKey) {
      case "Enter":
        terminal.writeln("");
        handleCommand(currentLineRef.current, terminal, handlers);
        currentLineRef.current = " ";
        break;

      case "Backspace":
        if (cursorX > promptLengthRef.current) {
          currentLineRef.current =
            currentLineRef.current.slice(0, relativePos - 1) +
            currentLineRef.current.slice(relativePos);

          terminal.write(ANSI.CURSOR_LEFT);
          updateLine(terminal, currentLineRef.current, relativePos - 1);
        }
        break;

      case "Delete":
        if (relativePos < currentLineRef.current.length) {
          currentLineRef.current =
            currentLineRef.current.slice(0, relativePos) +
            currentLineRef.current.slice(relativePos + 1);

          updateLine(terminal, currentLineRef.current, relativePos);
        }
        break;

      case "ArrowUp":
      case "ArrowDown":
        // [TO-DO]: Implement History =)
        break;

      case "ArrowLeft":
        if (cursorX > promptLengthRef.current) {
          terminal.write(ANSI.CURSOR_LEFT);
        }
        break;

      case "ArrowRight":
        if (cursorX < promptLengthRef.current + currentLineRef.current.length) {
          terminal.write(ANSI.CURSOR_RIGHT);
        }
        break;

      case "End":
      case "Home":
      case "Insert":
        // [TO-DO]: Breaking events that need proper handling
        break;

      default:
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
          if (movesLeft > 0) terminal.write(ANSI.MOVE_LEFT(movesLeft));
        }
        break;
    }
  };
