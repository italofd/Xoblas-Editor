import * as vscode from "vscode";
import { WsCommandMessage } from "@/types/socket";

/**
 * Terminal Input Handler Class
 * Handles all terminal input processing, cursor management, and line editing operations
 */
export class TerminalInputHandler {
  private currentLine = "";
  private promptLength = 2;
  private terminalCols = 80;
  private currentWsData: WsCommandMessage | null = null;

  // ANSI escape sequences for terminal operations
  private static readonly ANSI = {
    CURSOR_LEFT: "\x1b[D",
    CURSOR_RIGHT: "\x1b[C",
    SAVE_CURSOR: "\u001B[s",
    MOVE_LEFT: (n: number) => `\x1b[${n}D`,
  };

  // Terminal colors
  private static readonly COLORS = {
    GREEN: "\x1b[32m",
    BLUE: "\x1b[34m",
    RESET: "\x1b[0m",
  };

  constructor() {
    this.reset();
  }

  /**
   * Reset the handler state
   */
  public reset(): void {
    this.currentLine = "";
    this.promptLength = 2;
  }

  /**
   * Update terminal dimensions
   */
  public updateTerminalDimensions(cols: number, rows: number): void {
    this.terminalCols = cols;
  }

  /**
   * Update current WebSocket data
   */
  public updateWsData(wsData: WsCommandMessage | null): void {
    this.currentWsData = wsData;
  }

  /**
   * Function to create an appropriately sized prompt based on terminal width
   */
  public createPrompt(
    cols: number,
    wsData: WsCommandMessage | null,
  ): { prompt: string; length: number } {
    if (!wsData) {
      const defaultPrompt = "$ ";
      return { prompt: defaultPrompt, length: defaultPrompt.length };
    }

    // Full prompt content (without ANSI escape sequences for length calculation)
    const user = wsData.user || "user";
    const host = wsData.host || "host";
    const cwd = wsData.cwd || "~";

    // Base characters in prompt (brackets, @, spaces, $)
    const baseChars = "[] $ ".length;

    // Calculate total visible length (without ANSI escape sequences)
    const totalLength = user.length + host.length + cwd.length + baseChars;

    // If prompt is too long for terminal width, create truncated version
    if (totalLength >= cols) {
      // Ensure we always have at least user@host and $
      const minPrompt = `${TerminalInputHandler.COLORS.GREEN}${user}@${host}${TerminalInputHandler.COLORS.RESET}$ `;
      const minPromptVisibleLength = user.length + host.length + 2 + 2; // user@host + "@ " + "$ "

      // If even that's too long, just use a basic prompt
      if (minPromptVisibleLength >= cols) {
        const basicPrompt = "$ ";
        return { prompt: basicPrompt, length: basicPrompt.length };
      }

      // Otherwise use the minimum prompt
      return { prompt: minPrompt, length: minPromptVisibleLength };
    }

    // Full prompt if it fits
    const fullPrompt = `[${TerminalInputHandler.COLORS.GREEN}${user}@${host}${TerminalInputHandler.COLORS.RESET} ${TerminalInputHandler.COLORS.BLUE}${cwd}${TerminalInputHandler.COLORS.RESET}]$ `;
    return { prompt: fullPrompt, length: totalLength };
  }

  /**
   * Helper function to update line content when inserting/deleting characters
   */
  private updateLine(
    dataEmitter: vscode.EventEmitter<string>,
    currentLine: string,
    relativePos: number,
  ): void {
    const remaining = currentLine.slice(relativePos);
    dataEmitter.fire(remaining + " ");
    dataEmitter.fire(TerminalInputHandler.ANSI.MOVE_LEFT(remaining.length + 1));
  }

  /**
   * Reset terminal with new prompt after command completes
   */
  public resetTerminal(
    dataEmitter: vscode.EventEmitter<string>,
    wsData: WsCommandMessage | null,
  ): void {
    if (!wsData) return;

    // Generate prompt and update promptLength
    const { prompt, length } = this.createPrompt(this.terminalCols, wsData);
    this.promptLength = length;

    // Reset line buffer after command completes
    this.currentLine = "";

    // Write new prompt and save cursor position
    dataEmitter.fire(`\n${prompt}${TerminalInputHandler.ANSI.SAVE_CURSOR}`);
  }

  /**
   * Main input handling function
   */
  public handleInput(
    data: string,
    dataEmitter: vscode.EventEmitter<string>,
    cursorPosition: { x: number; y: number },
    isRawMode: boolean,
    onCommand: (command: string) => void,
    onRawInput: (data: string, specialKey: string) => void,
  ): void {
    const isPrintableRegex = /^[\x20-\x7E]$/;
    const isBackspace = data === "\b" || data === "\u007f";
    const isEnter = data === "\r" || data === "\n" || data === "\r\n";

    console.log("Handling input:", JSON.stringify(data), "Raw mode:", isRawMode);
    console.log("Cursor position:", cursorPosition, "Prompt length:", this.promptLength);

    // Calculate relative position from prompt
    const relativePos = Math.max(0, cursorPosition.x - this.promptLength);

    // Handle raw mode separately
    if (isRawMode) {
      const specialKey = this.getSpecialKeyFromData(data);
      onRawInput(data, specialKey);
      return;
    }

    // Handle backspace
    if (isBackspace) {
      this.handleBackspace(dataEmitter, cursorPosition, relativePos);
      return;
    }

    // Handle printable characters
    if (isPrintableRegex.test(data)) {
      this.handlePrintableCharacter(data, dataEmitter, relativePos);
      return;
    }

    // Handle enter key
    if (isEnter) {
      console.log("Enter detected, sending command:", this.currentLine);
      onCommand(this.currentLine.trim());
      this.currentLine = "";
      return;
    }

    // Handle other special keys (Delete, Arrow keys, etc.)
    this.handleSpecialKeys(data, dataEmitter, cursorPosition, relativePos);
  }

  /**
   * Handle backspace key
   */
  private handleBackspace(
    dataEmitter: vscode.EventEmitter<string>,
    cursorPosition: { x: number; y: number },
    relativePos: number,
  ): void {
    if (cursorPosition.x > this.promptLength) {
      // Remove character from current line
      this.currentLine =
        this.currentLine.slice(0, relativePos - 1) + this.currentLine.slice(relativePos);

      // Move cursor left and update display
      dataEmitter.fire(TerminalInputHandler.ANSI.CURSOR_LEFT);
      this.updateLine(dataEmitter, this.currentLine, relativePos - 1);
    }
  }

  /**
   * Handle printable character input
   */
  private handlePrintableCharacter(
    data: string,
    dataEmitter: vscode.EventEmitter<string>,
    relativePos: number,
  ): void {
    // Insert character at cursor position
    this.currentLine =
      this.currentLine.slice(0, relativePos) + data + this.currentLine.slice(relativePos);

    // Overwrite from cursor position to end of line
    const tail = this.currentLine.slice(relativePos);
    dataEmitter.fire(tail);

    // Move cursor back to just after inserted char
    const movesLeft = tail.length - 1;
    if (movesLeft > 0) {
      dataEmitter.fire(TerminalInputHandler.ANSI.MOVE_LEFT(movesLeft));
    }
  }

  /**
   * Handle special keys (Delete, Arrow keys, Home, End, etc.)
   */
  private handleSpecialKeys(
    data: string,
    dataEmitter: vscode.EventEmitter<string>,
    cursorPosition: { x: number; y: number },
    relativePos: number,
  ): void {
    switch (data) {
      case "\x1b[3~": // Delete key
        this.handleDelete(dataEmitter, relativePos);
        break;

      case "\x1b[H": // Home key
      case "\x1b[1~":
        this.handleHome(dataEmitter, cursorPosition);
        break;

      case "\x1b[F": // End key
      case "\x1b[4~":
        this.handleEnd(dataEmitter, cursorPosition);
        break;

      case "\x1b[D": // Arrow Left
        this.handleArrowLeft(dataEmitter, cursorPosition);
        break;

      case "\x1b[C": // Arrow Right
        this.handleArrowRight(dataEmitter, cursorPosition);
        break;

      case "\x1b[A": // Arrow Up
      case "\x1b[B": // Arrow Down
        this.handleArrowUpDown(data, dataEmitter);
        break;

      default:
        console.log("Unhandled special key:", JSON.stringify(data));
        break;
    }
  }

  /**
   * Handle Delete key
   */
  private handleDelete(dataEmitter: vscode.EventEmitter<string>, relativePos: number): void {
    if (relativePos < this.currentLine.length) {
      this.currentLine =
        this.currentLine.slice(0, relativePos) + this.currentLine.slice(relativePos + 1);

      this.updateLine(dataEmitter, this.currentLine, relativePos);
    }
  }

  /**
   * Handle Home key
   */
  private handleHome(
    dataEmitter: vscode.EventEmitter<string>,
    cursorPosition: { x: number; y: number },
  ): void {
    if (cursorPosition.x > this.promptLength) {
      const movesLeft = cursorPosition.x - this.promptLength;
      dataEmitter.fire(TerminalInputHandler.ANSI.MOVE_LEFT(movesLeft));
    }
  }

  /**
   * Handle End key
   */
  private handleEnd(
    dataEmitter: vscode.EventEmitter<string>,
    cursorPosition: { x: number; y: number },
  ): void {
    const endPos = this.promptLength + this.currentLine.length;
    if (cursorPosition.x < endPos) {
      const movesRight = endPos - cursorPosition.x;
      for (let i = 0; i < movesRight; i++) {
        dataEmitter.fire(TerminalInputHandler.ANSI.CURSOR_RIGHT);
      }
    }
  }

  /**
   * Handle Arrow Left key
   */
  private handleArrowLeft(
    dataEmitter: vscode.EventEmitter<string>,
    cursorPosition: { x: number; y: number },
  ): void {
    if (cursorPosition.x > this.promptLength) {
      dataEmitter.fire(TerminalInputHandler.ANSI.CURSOR_LEFT);
    }
  }

  /**
   * Handle Arrow Right key
   */
  private handleArrowRight(
    dataEmitter: vscode.EventEmitter<string>,
    cursorPosition: { x: number; y: number },
  ): void {
    if (cursorPosition.x < this.promptLength + this.currentLine.length) {
      dataEmitter.fire(TerminalInputHandler.ANSI.CURSOR_RIGHT);
    }
  }

  /**
   * Handle Arrow Up/Down keys (for history navigation)
   */
  private handleArrowUpDown(data: string, dataEmitter: vscode.EventEmitter<string>): void {
    // TODO: Implement history navigation
    console.log("History navigation not implemented yet:", JSON.stringify(data));
  }

  /**
   * Map ANSI sequences to special key names
   */
  private getSpecialKeyFromData(data: string): string {
    const keyMap: { [key: string]: string } = {
      "\b": "Backspace",
      "\u007f": "Backspace",
      "\r": "Enter",
      "\n": "Enter",
      "\x1b[A": "ArrowUp",
      "\x1b[B": "ArrowDown",
      "\x1b[C": "ArrowRight",
      "\x1b[D": "ArrowLeft",
      "\x1b[3~": "Delete",
      "\x1b[H": "Home",
      "\x1b[F": "End",
      "\x1b[1~": "Home",
      "\x1b[4~": "End",
    };

    return keyMap[data] || "Unknown";
  }
}
