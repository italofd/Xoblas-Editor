"use client";

import {
  ITerminalChildProcess,
  SimpleTerminalBackend,
  SimpleTerminalProcess,
} from "@codingame/monaco-vscode-terminal-service-override";
import * as vscode from "vscode";

import { getServerURL } from "@/utils/getServerURL";
import { TrackAnonymous } from "@/handlers/tracking";
import { isCommandMessage, isFileMessage, isXoblasMessage } from "@/types/socket";
import { TerminalInputHandler } from "@/handlers/XTermV2/terminalHandlers";

export class XTerm extends SimpleTerminalBackend {
  private socket: WebSocket | null = null;
  private isEnvReady = false;
  private isRawMode = false;
  private inputHandler: TerminalInputHandler;

  constructor() {
    super();
    this.inputHandler = new TerminalInputHandler();
  }

  override getDefaultSystemShell = async (): Promise<string> => Promise.resolve("bash");

  override createProcess = async (): Promise<ITerminalChildProcess> => {
    const propertyEmitter = new vscode.EventEmitter<{
      type: string;
      value: string;
    }>();
    const dataEmitter = new vscode.EventEmitter<string>();

    // Initialize websocket connection
    this.initializeWebSocket(dataEmitter, propertyEmitter);

    class XTermProcess extends SimpleTerminalProcess {
      private parent: XTerm;
      private cursorPosition = { x: 0, y: 0 };
      private lastData = "";

      constructor(pid: number, cwd: string, onData: vscode.Event<string>, parent: XTerm) {
        super(pid, 1, cwd, onData);
        this.parent = parent;
      }

      async start(): Promise<undefined> {
        if (this.parent.socket?.readyState !== WebSocket.OPEN) {
          dataEmitter.fire(`Connecting to terminal...\r\n`);
        }
        return undefined;
      }

      override onDidChangeProperty = propertyEmitter.event;

      override shutdown(immediate: boolean): void {
        console.log("shutdown", immediate);
        if (this.parent.socket) {
          this.parent.socket.close();
        }
      }

      public queryCursorPosition(dataEmitter: vscode.EventEmitter<string>) {
        dataEmitter.fire("\x1b[6n");
      }

      override input(data: string): void {
        // Handle cursor position response
        if (data.includes("\x1b[6n") || data.match(/\u001b\[\d+;\d+R/)) {
          const match = data.match(/\x1b\[(\d+);(\d+)R/);
          if (match) {
            const row = parseInt(match[1]);
            const col = parseInt(match[2]);
            this.cursorPosition = { x: col - 1, y: row - 1 }; // Convert to 0-based
          }

          // Process the actual input using the input handler
          this.parent.inputHandler.handleInput(
            this.lastData,
            dataEmitter,
            this.cursorPosition,
            this.parent.isRawMode,
            (command: string) => this.parent.handleCommand(command),
            (data: string, specialKey: string) => this.parent.handleRawInput(data, specialKey),
          );

          this.lastData = "";
          return;
        }

        // Store input and query cursor position
        this.lastData = data;
        this.queryCursorPosition(dataEmitter);
      }

      override resize(cols: number, rows: number): void {
        // Update input handler's terminal dimensions
        this.parent.inputHandler.updateTerminalDimensions(cols, rows);

        // Send resize command to websocket
        if (this.parent.socket?.readyState === WebSocket.OPEN && this.parent.isEnvReady) {
          // Check behavior first to not overload the server with resizing calls
          // this.parent.socket.send(
          //   JSON.stringify({
          //     type: "resize",
          //     cols,
          //     rows,
          //   }),
          // );
        }
      }

      override clearBuffer(): void | Promise<void> {
        console.log("clearBuffer");
      }
    }

    const process = new XTermProcess(1, "/workspace", dataEmitter.event, this);
    return process;
  };

  /**
   * Handle command execution
   */
  private handleCommand(command: string): void {
    console.log("Executing command:", command);

    // Send command via websocket
    if (this.socket?.readyState === WebSocket.OPEN && this.isEnvReady) {
      this.socket.send(
        JSON.stringify({
          type: "command",
          command: command,
        }),
      );
    }
  }

  /**
   * Handle raw input (for applications like vim, nano, etc.)
   */
  private handleRawInput(data: string, specialKey: string): void {
    if (this.socket?.readyState === WebSocket.OPEN && this.isEnvReady) {
      this.socket.send(
        JSON.stringify({
          type: "input",
          specialKey: specialKey,
          data: data,
        }),
      );
    }
  }

  private initializeWebSocket(
    dataEmitter: vscode.EventEmitter<string>,
    propertyEmitter: vscode.EventEmitter<{ type: string; value: string }>,
  ) {
    if (this.socket) return;

    const tracker = new TrackAnonymous();

    const webSocket = new WebSocket(
      getServerURL("ws") + `/ws/terminal/${encodeURIComponent(tracker.getUserID())}`,
    );

    webSocket.addEventListener("open", () => {
      console.log("WebSocket connected");
      dataEmitter.fire("Terminal connected!\r\n");
    });

    webSocket.addEventListener("message", (event: MessageEvent<string>) => {
      if (event.data) {
        try {
          const parsedJson = JSON.parse(event.data);
          console.log("Terminal received:", parsedJson);

          if (!parsedJson) return;

          // Handle command messages (terminal output)
          if (isCommandMessage(parsedJson)) {
            this.isRawMode = parsedJson.raw_mode;

            // Update input handler with new WebSocket data
            this.inputHandler.updateWsData(parsedJson);

            // Write the output to terminal (this preserves all ANSI sequences)
            if (parsedJson.output) {
              dataEmitter.fire(parsedJson.output);
            }

            // Update terminal title with current directory
            if (parsedJson.cwd) {
              propertyEmitter.fire({
                type: "title",
                value: `${parsedJson.user}@${parsedJson.host}`,
              });
            }

            // Mark environment as ready when we receive first complete command
            if (parsedJson.is_complete && !this.isEnvReady) {
              this.isEnvReady = true;
              console.log("Environment ready!");
            }

            // Reset terminal with new prompt when command is complete
            if (parsedJson.is_complete && !this.isRawMode) {
              this.inputHandler.resetTerminal(dataEmitter, parsedJson);
            }
          }

          // Handle file messages if needed
          if (isFileMessage(parsedJson)) {
            console.log("File operation:", parsedJson);
          }

          // Handle xoblas messages (file structure updates)
          if (isXoblasMessage(parsedJson)) {
            console.log("File structure update:", parsedJson);
          }
        } catch (error) {
          console.error("Error parsing websocket message:", error);
        }
      }
    });

    webSocket.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
      dataEmitter.fire("Terminal connection error\r\n");
    });

    webSocket.addEventListener("close", () => {
      console.log("WebSocket disconnected");
      dataEmitter.fire("Terminal disconnected\r\n");
      this.socket = null;
      this.isEnvReady = false;
      this.inputHandler.reset();
    });

    this.socket = webSocket;
  }
}
