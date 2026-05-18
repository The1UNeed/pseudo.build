import type * as Monaco from "monaco-editor";

export function getPseudocodeEditorOptions(
  appleTouchDevice: boolean,
): Monaco.editor.IStandaloneEditorConstructionOptions {
  return {
    minimap: { enabled: false },
    fontFamily: "'Fira Code', monospace",
    fontSize: appleTouchDevice ? 16 : 13,
    lineHeight: appleTouchDevice ? 24 : 21,
    lineNumbers: "on",
    lineNumbersMinChars: 3,
    roundedSelection: false,
    automaticLayout: true,
    renderLineHighlight: "all",
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    mouseWheelScrollSensitivity: appleTouchDevice ? 0.7 : 0.85,
    fastScrollSensitivity: 3,
    stickyScroll: {
      enabled: false,
    },
    padding: {
      top: 8,
      bottom: 18,
    },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },
    scrollbar: {
      verticalScrollbarSize: appleTouchDevice ? 14 : 10,
      horizontalScrollbarSize: appleTouchDevice ? 14 : 10,
      alwaysConsumeMouseWheel: false,
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: "off",
    acceptSuggestionOnCommitCharacter: false,
    autoClosingQuotes: "always",
    autoClosingBrackets: "always",
    autoSurround: "quotes",
    wordBasedSuggestions: "off",
    snippetSuggestions: "top",
    tabCompletion: "on",
    // Safari on iPhone/iPad exposes EditContext, but Monaco input handling is unreliable there.
    editContext: !appleTouchDevice,
    hover: {
      enabled: !appleTouchDevice,
    },
    occurrencesHighlight: appleTouchDevice ? "off" : "singleFile",
  };
}
