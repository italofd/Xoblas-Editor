"use client";
import { Terminal } from "@xterm/xterm";
import { RefObject, useEffect, useMemo, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { handleTerminalKeyEvent, onWsData, resetTerminal } from "@/handlers/terminalHandlers";
import { FileStructure, Handlers, Socket, WsData } from "@/types/terminal";

/**
 * The approach i have follow is that the all the UI logic involving user input
 * Would be treated here and not let the PTY terminal handles everything
 * The prompt (user + host + cwd) and the user input (command) are all controlled trough JS
 */
export const useTerminal = (
  terminal: Terminal | null,
  ref: RefObject<HTMLDivElement>,
  socket: Socket,
  wsData: WsData,
  fileStructure: FileStructure,
  isRawMode: boolean,
  handlers: Handlers,
) => {
  //Current line is just user input
  const currentLineRef = useRef("");
  //Prompt ref would be the the length of [host + user + cwd]
  const promptLengthRef = useRef(2);
  const fitAddon = useMemo(() => new FitAddon(), []);

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

      // Handles keyboard events on the terminal
      const keyDisposable = terminal.onKey(
        handleTerminalKeyEvent(terminal, currentLineRef, promptLengthRef, isRawMode, handlers),
      );

      // Clean up handlers on unmount
      return () => {
        keyDisposable.dispose();
      };
    }
  }, [terminal, ref, socket, promptLengthRef, currentLineRef, isRawMode, fitAddon]);

  //Handles new income of data coming trough websocket
  useEffect(
    () => onWsData(wsData, terminal, promptLengthRef, currentLineRef, isRawMode),
    [wsData, terminal, promptLengthRef, currentLineRef, isRawMode],
  );

  //[TO-DO]: rethink that solution as it will not work long time with other and more complex states
  useEffect(
    () => resetTerminal(wsData, terminal, promptLengthRef, currentLineRef),
    [fileStructure],
  );

  return {
    //[TO-DO]: Fix resize when inside a alternate screen its not following up and its breaking afterwards
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

        if (socket.current?.readyState === WebSocket.OPEN) {
          //SOCKET CALL
          //[TO-DO]: Pass it over trough send event not directly, avoid checking for state
          socket.current.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      }
    },
  };
};
