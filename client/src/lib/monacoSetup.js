// Self-hosted Monaco: bundle the editor (and its language workers) with
// the app instead of loading them from a CDN, so the editor works the
// same locally, offline and in production.
import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less")
      return new cssWorker();
    if (label === "html" || label === "handlebars" || label === "razor")
      return new htmlWorker();
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  },
};

loader.config({ monaco });

// The app's editor theme — matches the ink + violet design system.
monaco.editor.defineTheme("syncpad-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#0b0b13",
    "editor.lineHighlightBackground": "#151524",
    "editorLineNumber.foreground": "#4b4b63",
    "editorLineNumber.activeForeground": "#a78bfa",
    "editorCursor.foreground": "#a78bfa",
    "editor.selectionBackground": "#8b5cf655",
    "editorIndentGuide.background1": "#1f1f31",
    "editorWidget.background": "#10101a",
    "editorWidget.border": "#2b2b42",
  },
});

export { monaco };
