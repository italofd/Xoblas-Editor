"use client";
import { Terminal } from "@xterm/xterm";
import { RefObject, useEffect } from "react";
import { useSocket } from "./useSocket";
import { FitAddon } from "@xterm/addon-fit";

const green = "\x1b[32m";
const blue = "\x1b[34m";
const reset = "\x1b[0m";

const fitAddon = new FitAddon();

export const useTerminal = (
  terminal: Terminal | null,
  ref: RefObject<HTMLDivElement>,
  socket: ReturnType<typeof useSocket>["socket"],
  wsData: ReturnType<typeof useSocket>["wsData"],
) => {
  //[TO-DO]: Put it outside
  // Function to create an appropriately sized prompt based on terminal width
  const createPrompt = (cols: number) => {
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

  useEffect(() => {
    if (terminal && socket && ref.current) {
      terminal.loadAddon(fitAddon);

      fitAddon.fit();

      // Welcome message
      terminal.writeln("Xoblas Terminal =) \n");

      // Set up input handling
      let currentLine = "";

      //[TO-DO]: Isolate this function
      const handleCommand = (command: string, terminal: Terminal) => {
        //[TO-DO]: Treat case where its not connected by displaying a error or trying a reconnection
        if (socket.current && socket.current.readyState === WebSocket.OPEN) {
          socket.current.send(command);
          //[TO-DO]: Receive response and display, implement path for working directory
        } else {
          terminal.writeln("Not connected to server.");
        }
      };

      terminal.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

        // Handle Enter key (executing a command)
        if (domEvent.key === "Enter") {
          terminal.writeln("");
          handleCommand(currentLine, terminal);
          currentLine = "";
        }

        // Handle regular Backspace
        else if (domEvent.key === "Backspace") {
          if (currentLine.length > 0) {
            currentLine = currentLine.substring(0, currentLine.length - 1);
            terminal.write("\b \b");
          }
        }

        // Handle printable characters
        else if (printable) {
          currentLine += key;
          terminal.write(key);
        }
      });

      // Initial prompt
      terminal.write("$ \u001B[s"); // Save cursor position after prompt

      // Clean up on unmount
      return () => {
        terminal.dispose();
      };
    }
  }, [terminal, ref, socket]);

  //Handles new income of data coming trough websocket
  useEffect(() => {
    if (wsData && terminal) {
      terminal.writeln(wsData.output);

      // Get terminal dimensions
      const dimensions = terminal.cols;

      // Generate appropriate prompt based on current width
      const prompt = createPrompt(dimensions);

      // Write prompt and save cursor position
      terminal.write(`${prompt}\u001B[s`);
    }
  }, [wsData, terminal]);

  return {
    onResize: ({ cols, rows }: { cols: number; rows: number }) => {
      if (terminal) {
        terminal.resize(cols, Math.floor(rows));

        fitAddon.fit(); // Call fit to ensure terminal dimensions match container

        console.log("EVA03", wsData);
        // After resize, redraw prompt and restore cursor position
        if (wsData) {
          terminal.write("\r\x1b[K"); // Clear current line
          const prompt = createPrompt(cols);

          // Write new prompt and save cursor position
          terminal.write(`${prompt}\u001B[s`);
        } else {
          terminal.write("\r\x1b[K$ \u001B[s");
        }
      }

      if (socket.current?.readyState === WebSocket.OPEN) {
        // socket.current.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    },
  };
};
