// Languages offered in the editor. `id` is the Monaco language id.
export const LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "markdown", label: "Markdown" },
  { id: "plaintext", label: "Plain text" },
];

export const languageLabel = (id) =>
  LANGUAGES.find((l) => l.id === id)?.label || id;

// A friendly first line for a brand-new document, per language.
export const STARTERS = {
  javascript: "// Welcome to SyncPad — start typing.\n// From Sprint 2, anyone you share this pad with types here live, with you.\n",
  typescript: "// Welcome to SyncPad — start typing.\n",
  python: "# Welcome to SyncPad — start typing.\n",
  java: "// Welcome to SyncPad — start typing.\n",
  c: "// Welcome to SyncPad — start typing.\n",
  cpp: "// Welcome to SyncPad — start typing.\n",
  html: "<!-- Welcome to SyncPad — start typing. -->\n",
  css: "/* Welcome to SyncPad — start typing. */\n",
  json: '{ "welcome": "SyncPad — start typing." }\n',
  markdown: "# Welcome to SyncPad\n\nStart typing — this pad is yours.\n",
  plaintext: "Welcome to SyncPad — start typing.\n",
};
