"use client";
import { Terminal } from "@xterm/xterm";
import { RefObject, useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { createPrompt, handleTerminalKeyEvent, onWsData } from "@/handlers/terminalHandlers";
import { Socket, WsData } from "@/types/terminal";

const fitAddon = new FitAddon();

export const useTerminal = (
  terminal: Terminal | null,
  ref: RefObject<HTMLDivElement>,
  socket: Socket,
  wsData: WsData,
) => {
  const currentLineRef = useRef("");

  useEffect(() => {
    if (terminal && socket && ref.current) {
      //Load addon and use it
      terminal.loadAddon(fitAddon);

      fitAddon.fit();

      terminal.writeln("Xoblas Terminal =) \n"); // Welcome message

      // Handles keyboard events on the terminal
      terminal.onKey(handleTerminalKeyEvent(terminal, socket, currentLineRef));

      // Initial prompt
      terminal.write("$ \u001B[s"); // Save cursor position after prompt

      // Clean up on unmount
      return () => {
        terminal.dispose();
      };
    }
  }, [terminal, ref, socket]);

  //Handles new income of data coming trough websocket
  useEffect(() => onWsData(wsData, terminal), [wsData, terminal]);

  return {
    onResize: (
      lastSizeRef: RefObject<{
        cols: number;
        rows: number;
      }>,
    ) => {
      if (!terminal) return;

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
          const prompt = createPrompt(cols, wsData);

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
