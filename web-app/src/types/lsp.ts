export interface LSPCompletionItem {
  label: string;
  kind: number;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
}

export interface LSPHoverResult {
  contents: string | { kind: string; value: string }[];
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface LSPDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: number;
  message: string;
  source?: string;
}

export interface LSPRequestParams {
  language: string;
  text: string;
  line: number;
  character: number;
  filePath?: string;
}

export interface LSPDiagnosticsParams {
  language: string;
  text: string;
  filePath?: string;
}

export interface LSPRequestMessage {
  type: string;
  language: string;
  file_path?: string;
  line?: number;
  character?: number;
  text?: string;
}

export interface LSPResponse {
  result?: {
    items?: LSPCompletionItem[];
    contents?: string | { kind: string; value: string }[];
    range?: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
  };
  diagnostics?: LSPDiagnostic[];
  error?: {
    code: number;
    message: string;
  };
}
