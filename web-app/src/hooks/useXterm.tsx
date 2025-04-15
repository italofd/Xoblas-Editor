import { Terminal } from "@xterm/xterm";
import { RefObject, useEffect } from "react";
import { useSocket } from "./useSocket";

export const useTerminal = (
  terminal: Terminal | null,
  ref: RefObject<HTMLDivElement>,
  socket: ReturnType<typeof useSocket>["socket"],
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
          console.log("EVA01", command, socket.current);
          socket.current.send(command);
          //[TO-DO]: Receive response and display, implement path for working directory
        } else {
          terminal.writeln("Not connected to server.");
        }
      };

      terminal.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

        // Handle Enter key
        if (domEvent.key === "Enter") {
          terminal.writeln("");
          handleCommand(currentLine, terminal);
          currentLine = "";
          terminal.write("$ ");
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
};
