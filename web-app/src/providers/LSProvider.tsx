import { useEffect, useRef } from "react";
import { useLSP } from "@/hooks/useLSP";
import { LSPCompletionItem, LSPDiagnostic } from "@/types/lsp";
import * as monaco from "monaco-editor";
import { CodeEditorRef, MonacoInstanceRef } from "@/types/editor";

interface MonacoLSPProviderProps {
  editorRef: CodeEditorRef;
  monacoRef: MonacoInstanceRef;
  language: string;
}

export const MonacoLSPProvider = ({ editorRef, monacoRef, language }: MonacoLSPProviderProps) => {
  const lsp = useLSP();
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  const markersOwner = "lsp-diagnostics";

  const editor = editorRef.current;
  const monaco = monacoRef.current;

  const convertLSPCompletionsToMonaco = (
    items: LSPCompletionItem[],
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): monaco.languages.CompletionItem[] => {
    return items.map((item) => {
      // Use the exact same range calculation as your working data
      const range = new monaco!.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column,
      );

      return {
        label: item.label,
        kind: mapLSPKindToMonaco(item.kind as monaco.languages.CompletionItemKind),
        // documentation: item.documentation,
        range: range,
        //[TO-DO]: Make this a optional insert instead of blank string
        insertText: item.insertText || "",
        sortText: item.sortText || "",
      };
    });
  };
  const mapLSPKindToMonaco = (lspKind: number): monaco.languages.CompletionItemKind => {
    // LSP CompletionItemKind to Monaco mapping
    const kindMap = {
      1: monaco.languages.CompletionItemKind.Text,
      2: monaco.languages.CompletionItemKind.Method,
      3: monaco.languages.CompletionItemKind.Function, // 𝑓 Functions
      4: monaco.languages.CompletionItemKind.Constructor,
      5: monaco.languages.CompletionItemKind.Field,
      6: monaco.languages.CompletionItemKind.Variable, // Variables
      7: monaco.languages.CompletionItemKind.Class, // 🅒 Classes
      8: monaco.languages.CompletionItemKind.Interface,
      9: monaco.languages.CompletionItemKind.Module,
      10: monaco.languages.CompletionItemKind.Property, // Properties
      11: monaco.languages.CompletionItemKind.Unit,
      12: monaco.languages.CompletionItemKind.Value,
      13: monaco.languages.CompletionItemKind.Enum,
      14: monaco.languages.CompletionItemKind.Keyword, // Keywords
      15: monaco.languages.CompletionItemKind.Snippet,
      16: monaco.languages.CompletionItemKind.Color,
      17: monaco.languages.CompletionItemKind.File,
      18: monaco.languages.CompletionItemKind.Reference,
    } as const;

    return kindMap[lspKind] || monaco.languages.CompletionItemKind.Text;
  };

  // Convert LSP diagnostics to Monaco markers
  const convertLSPDiagnosticsToMarkers = (
    diagnostics: LSPDiagnostic[],
  ): monaco.editor.IMarkerData[] => {
    return diagnostics.map((diagnostic) => ({
      startLineNumber: diagnostic.range.start.line + 1, // Monaco is 1-based
      startColumn: diagnostic.range.start.character + 1,
      endLineNumber: diagnostic.range.end.line + 1,
      endColumn: diagnostic.range.end.character + 1,
      message: diagnostic.message,
      // LSP: Error=1, Warning=2, Info=3, Hint=4
      // Monaco: Error=8, Warning=4, Info=2, Hint=1
      // These values are from stable specifications and rarely change
      severity: ([0, 8, 4, 2, 1] as const)[diagnostic.severity] as monaco.MarkerSeverity,
      source: diagnostic.source || "LSP",
    }));
  };

  useEffect(() => {
    if (!lsp.isConnected || !monaco) return;

    const completionProvider = monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: async (model, position, _, token) => {
        console.log("MONACO: Completion requested");

        if (!editor || token.isCancellationRequested) {
          return { suggestions: [] };
        }

        const text = model.getValue();
        const line = position.lineNumber - 1;
        const character = position.column - 1;

        console.log("EVA01", character, line);

        try {
          const completions = await lsp.getCompletions(language, text, line, character);

          if (token.isCancellationRequested) {
            return { suggestions: [] };
          }

          const suggestions = convertLSPCompletionsToMonaco(completions, model, position);

          console.log("MONACO: Returning suggestions:", suggestions.length);

          return Promise.resolve({
            suggestions: suggestions,
            incomplete: false,
          });
        } catch (error) {
          console.error("MONACO: Completion provider error:", error);
          return Promise.resolve({
            suggestions: [],
            incomplete: false,
          });
        }
      },
      triggerCharacters: [".", ":", "<", '"', "'", "/"],
    });

    disposablesRef.current.push(completionProvider);
  }, [lsp.isConnected, language, editor, monaco]);

  // Register hover provider
  useEffect(() => {
    if (!lsp.isConnected || !monaco) return;

    console.log("PASSOU PORRA 02");

    const hoverProvider = monaco.languages.registerHoverProvider(language, {
      provideHover: async (model, position) => {
        if (!editor) return { contents: [], range: undefined };

        const text = model.getValue();
        const line = position.lineNumber - 1;
        const character = position.column - 1;

        try {
          const hoverResult = await lsp.getHover(language, text, line, character);

          if (!hoverResult || !hoverResult.contents) return { contents: [], range: undefined };

          let contents: monaco.IMarkdownString[];

          if (typeof hoverResult.contents === "string") {
            contents = [{ value: hoverResult.contents }];
          } else if (Array.isArray(hoverResult.contents)) {
            contents = hoverResult.contents.map((content) => ({
              value: typeof content === "string" ? content : content.value,
            }));
          } else {
            contents = [{ value: hoverResult.contents["value"] }];
          }

          return Promise.resolve({
            contents,
            range: hoverResult.range
              ? new monaco.Range(
                  hoverResult.range.start.line + 1,
                  hoverResult.range.start.character + 1,
                  hoverResult.range.end.line + 1,
                  hoverResult.range.end.character + 1,
                )
              : undefined,
          });
        } catch (error) {
          console.error("Hover provider error:", error);
          return Promise.resolve({
            contents: [],
            range: undefined,
          });
        }
      },
    });

    disposablesRef.current.push(hoverProvider);
  }, [lsp.isConnected, language, editor, monaco]);

  // Handle diagnostics on content change
  useEffect(() => {
    if (!editor || !lsp.isConnected || !monaco) return;

    console.log("PASSOU PORRA 03");

    const handleContentChange = async () => {
      const model = editor.getModel();
      if (!model) return;

      const text = model.getValue();

      try {
        const diagnostics = await lsp.getDiagnostics(language, text);
        const markers = convertLSPDiagnosticsToMarkers(diagnostics);

        monaco.editor.setModelMarkers(model, markersOwner, markers);
      } catch (error) {
        console.error("Diagnostics error:", error);
      }
    };

    // Debounce diagnostics to avoid too many requests
    let timeoutId: NodeJS.Timeout;
    const debouncedDiagnostics = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleContentChange, 10000);
    };

    const disposable = editor.onDidChangeModelContent(debouncedDiagnostics);
    disposablesRef.current.push(disposable);

    // Initial diagnostics
    handleContentChange();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [editor, lsp.isConnected, language, monaco]);

  // Cleanup disposables
  useEffect(() => {
    console.log("PASSOU PORRA 04");
    if (!editor || !monaco) return;

    return () => {
      disposablesRef.current.forEach((disposable) => {
        console.log("EVA05", disposable);
        disposable.dispose();
      });
      disposablesRef.current = [];

      // Clear markers
      if (editor) {
        const model = editor.getModel();
        if (model) {
          monaco.editor.setModelMarkers(model, markersOwner, []);
        }
      }
    };
  }, [editor, monaco]);

  return null; // This is a provider component, renders nothing
};
