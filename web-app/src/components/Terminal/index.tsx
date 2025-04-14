import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";

export const XTerminal = () => {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      // Create terminal instance
      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        theme: {
          background: "#1e1e1e",
          foreground: "#f8f8f8",

          cursor: "#a0a0a0",
        },
      });

      // Open terminal in the container
      terminal.open(terminalRef.current);

      // Welcome message
      terminal.writeln("Xoblas Terminal =) \n");

      // Set up input handling
      let currentLine = "";

      terminal.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

        // Handle Enter key
        if (domEvent.key === "Enter") {
          terminal.writeln("");
          // handleCommand(currentLine, terminal);
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
  }, []);

  // [TO-DO]: Integrate with FastAPI websocket =)
  // const handleCommand = (command, terminal) => {};

  return (
    <div className="w-full flex flex-col">
      <div className="bg-zinc-800 text-white p-2 rounded-t">Terminal</div>
      <div
        ref={terminalRef}
        className="flex-grow bg-black rounded-b overflow-hidden"
        style={{ minHeight: "100px", maxHeight: "230px" }}
      />
    </div>
  );
};
