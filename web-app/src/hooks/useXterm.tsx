"use client";
import { Terminal } from "@xterm/xterm";
import { RefObject, useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { createPrompt, handleTerminalKeyEvent, onWsData } from "@/handlers/terminalHandlers";
import { Socket, WsData } from "@/types/terminal";

const fitAddon = new FitAddon();

/**
 * The approach i have follow is that the all the UI logic involving user input
 * Would be treated here and not let the PTY terminal handles everything
 * The prompt (user + host + cwd) and the user input (command) are all controlled trough JS (based on output coming from PTY)
 */
export const useTerminal = (
  terminal: Terminal | null,
  ref: RefObject<HTMLDivElement>,
  socket: Socket,
  wsData: WsData,
) => {
  //Current line is just user input
  const currentLineRef = useRef("");
  //Prompt ref would be the the length of [host + user + cwd]
  const promptLengthRef = useRef(2);

  //Sets terminal config, initials input and eventListener for xterm
  useEffect(() => {
    if (terminal && socket && ref.current) {
      //Load addon and use it
      terminal.loadAddon(fitAddon);
      fitAddon.fit();

      //Terminal Config (cannot be set the way the API describes due to a NextJS bug with the library)
      terminal.options["convertEol"] = true;
      terminal.options["fontFamily"] = "monospace";
      terminal.options["cursorBlink"] = true;

      terminal.writeln("Xoblas Terminal =) \n"); // Welcome message

      // Handles keyboard events on the terminal
      terminal.onKey(handleTerminalKeyEvent(terminal, socket, currentLineRef, promptLengthRef));

      // Clean up on unmount
      return () => {
        terminal.dispose();
      };
    }
  }, [terminal, ref, socket, promptLengthRef, currentLineRef]);

  //Handles new income of data coming trough websocket
  useEffect(
    () => onWsData(wsData, terminal, promptLengthRef, currentLineRef),
    [wsData, terminal, promptLengthRef, currentLineRef],
  );

  return {
    //[TO-DO]: Fix resize that have broken after better commands control (backspace is broken and delete or/and insert)
    onResize: (
      lastSizeRef: RefObject<{
        cols: number;
        rows: number;
      }>,
      isEnvReady: boolean,
    ) => {
      if (!terminal || !isEnvReady) return;

      fitAddon.fit();

      const dimensions = fitAddon.proposeDimensions();

      if (!dimensions) return;

      const { cols, rows } = dimensions;

      const last = lastSizeRef.current;

      const changed = cols !== last.cols || rows !== last.rows;

      if (changed) {
        lastSizeRef.current = { cols, rows };

        terminal.resize(cols, rows);

        // After resize, redraw prompt and restore cursor position
        if (wsData) {
          terminal.write("\r\x1b[K"); // Clear current line
          const prompt = createPrompt(cols, wsData, promptLengthRef);

          // Write new prompt and save cursor position
          terminal.write(`${prompt}\u001B[s`);
        } else {
          terminal.write("\r\x1b[K$ \u001B[s");
        }

        if (socket.current?.readyState === WebSocket.OPEN) {
          socket.current.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      }
    },
  };
};
