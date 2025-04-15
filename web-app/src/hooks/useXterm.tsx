import { Terminal } from "@xterm/xterm";
import { RefObject, useEffect } from "react";
import { useSocket } from "./useSocket";

const green = "\x1b[32m";
const blue = "\x1b[34m";
const reset = "\x1b[0m";

export const useTerminal = (
  terminal: Terminal | null,
  ref: RefObject<HTMLDivElement>,
  socket: ReturnType<typeof useSocket>["socket"],
  wsData: ReturnType<typeof useSocket>["wsData"],
) => {
  useEffect(() => {
    if (terminal && socket && ref.current) {
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
      terminal.write("$ ");

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

      //Insert the same bash pattern, show current working directory
      terminal.write(
        `[${green}${wsData.user}@${wsData.host}${reset} ${blue}${wsData.cwd}${reset}]$ `,
      );
    }
  }, [wsData, terminal]);
};
