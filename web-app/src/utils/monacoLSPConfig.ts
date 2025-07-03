// web-app/src/utils/monacoLSPConfig.ts
import * as monaco from "monaco-editor";

// Optimized editor options focused on LSP integration
export const getEnhancedEditorOptions = (): monaco.editor.IStandaloneEditorConstructionOptions => ({
  // Visual options
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 14,
  lineHeight: 24,
  fontLigatures: true,
  automaticLayout: true,

  // Scrollbar styling
  scrollbar: {
    verticalScrollbarSize: 12,
    horizontalScrollbarSize: 12,
    verticalHasArrows: false,
    horizontalHasArrows: false,
    useShadows: true,
  },

  // Editor behavior
  padding: { top: 16, bottom: 16 },
  lineNumbers: "on",
  renderLineHighlight: "all",
  bracketPairColorization: { enabled: true },
  glyphMargin: true,
  folding: true,
  showFoldingControls: "mouseover",

  // LSP-optimized settings (the important part)
  suggest: {
    showWords: false, // Disable word-based suggestions
    showSnippets: true, // Allow LSP snippets
    insertMode: "replace", // Better completion behavior
    filterGraceful: true, // Better fuzzy matching
  },

  quickSuggestions: {
    other: true, // Enable quick suggestions
    comments: false, // Disable in comments
    strings: false, // Disable in strings
  },

  // LSP interaction settings
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: "on",
  tabCompletion: "off", // Let LSP handle completions
  wordBasedSuggestions: "off", // Rely entirely on LSP
  parameterHints: { enabled: true },

  // Hover configuration
  hover: {
    enabled: true,
    delay: 100, // Small delay before showing hover
    sticky: true, // Keep hover visible when moving to it
  },

  // Formatting (let LSP/prettier handle this)
  formatOnPaste: false, // LSP will handle formatting
  formatOnType: false, // LSP will handle formatting
});
