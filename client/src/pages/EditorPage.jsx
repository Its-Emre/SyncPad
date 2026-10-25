import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import "../lib/monacoSetup";
import { api } from "../lib/api";
import { LANGUAGES } from "../lib/languages";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Navbar";

const SAVE_LABELS = {
  saved: "All changes saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Save failed — will retry as you type",
};

export default function EditorPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("saved");
  const saveTimer = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    api
      .getDocument(id)
      .then((d) => {
        setDoc(d);
        setTitle(d.title);
      })
      .catch((err) => setLoadError(err.message));
    return () => clearTimeout(saveTimer.current);
  }, [id]);

  // Debounced autosave — Sprint 1 saves the whole text; from Sprint 2
  // the CRDT sync makes saving continuous instead of snapshot-based.
  const scheduleSave = (value) => {
    setSaveState("unsaved");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        await api.saveContent(id, value ?? "");
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 1200);
  };

  const saveTitle = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === doc.title) {
      setTitle(doc.title);
      return;
    }
    try {
      const updated = await api.updateDocument(id, { title: trimmed });
      setDoc(updated);
    } catch {
      setTitle(doc.title);
    }
  };

  const changeLanguage = async (language) => {
    try {
      const updated = await api.updateDocument(id, { language });
      setDoc(updated);
    } catch {
      /* keep editing; the next save still carries the text */
    }
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-rose-300">{loadError}</p>
        <Link to="/dashboard" className="btn-ghost">
          ← Back to documents
        </Link>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Opening your pad…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-ink-950">
      {/* Editor top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink-700 bg-ink-900 px-4">
        <Link to="/dashboard" className="btn-ghost px-3 py-1.5 text-xs">
          ← Documents
        </Link>
        <span className="hidden md:block">
          <Logo />
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 font-display text-base font-semibold text-white outline-none transition hover:bg-ink-800 focus:bg-ink-800 focus:ring-1 focus:ring-violet-500/50"
          maxLength={120}
          aria-label="Document title"
        />
        <select
          value={doc.language}
          onChange={(e) => changeLanguage(e.target.value)}
          className="input w-36 px-3 py-1.5 text-xs"
          aria-label="Language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id} className="bg-ink-800">
              {l.label}
            </option>
          ))}
        </select>
        <span
          className={`hidden items-center gap-2 text-xs sm:flex ${
            saveState === "error" ? "text-rose-300" : "text-slate-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              saveState === "saved"
                ? "bg-emerald-400"
                : saveState === "error"
                  ? "bg-rose-400"
                  : "bg-amber-300"
            }`}
          />
          {SAVE_LABELS[saveState]}
        </span>
        <span className="hidden rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-300 lg:block">
          {user?.name}
        </span>
      </header>

      {/* Monaco */}
      <div className="min-h-0 flex-1">
        <Editor
          defaultValue={doc.content}
          language={doc.language}
          theme="syncpad-dark"
          onChange={scheduleSave}
          onMount={(editor) => {
            editorRef.current = editor;
            editor.focus();
          }}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            minimap: { enabled: true },
            wordWrap: "on",
            automaticLayout: true,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            renderLineHighlight: "all",
          }}
        />
      </div>
    </div>
  );
}
