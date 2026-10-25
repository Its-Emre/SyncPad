import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { monaco } from "../lib/monacoSetup";
import { api, tokenStore, WS_BASE } from "../lib/api";
import { LANGUAGES } from "../lib/languages";
import { colorForUser, initialsOf } from "../lib/presence";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Navbar";

const cssEscapeName = (name) =>
  (name || "Guest").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");

export default function EditorPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [loadError, setLoadError] = useState("");
  const [connStatus, setConnStatus] = useState("connecting");
  const [peers, setPeers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [editorReady, setEditorReady] = useState(0);

  const editorRef = useRef(null);
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const decorationsRef = useRef([]);
  const styleRef = useRef(null);

  const isOwner = doc && user && String(doc.owner) === String(user._id);

  // ---- Load document metadata (content itself flows over the CRDT) ----
  useEffect(() => {
    api
      .getDocument(id)
      .then((d) => {
        setDoc(d);
        setTitle(d.title);
      })
      .catch((err) => setLoadError(err.message));
  }, [id]);

  // ---- Remote cursors + presence -------------------------------------
  const renderRemote = () => {
    const provider = providerRef.current;
    const ydoc = ydocRef.current;
    if (!provider || !ydoc) return;

    // Presence list (one entry per user, even with several tabs open)
    const byUser = new Map();
    provider.awareness.getStates().forEach((state) => {
      if (state?.user && !byUser.has(state.user.id)) {
        byUser.set(state.user.id, state.user);
      }
    });
    setPeers([...byUser.values()]);

    const editor = editorRef.current;
    if (!editor || !bindingRef.current) return;
    const model = editor.getModel();
    if (!model) return;

    if (!styleRef.current) {
      styleRef.current = document.createElement("style");
      document.head.appendChild(styleRef.current);
    }

    let css = "";
    const decorations = [];
    const totalLength = model.getValueLength();

    provider.awareness.getStates().forEach((state, clientId) => {
      if (clientId === provider.awareness.clientID) return;
      if (!state?.user || !state?.cursor) return;
      const { name, color } = state.user;

      const anchorAbs = Y.createAbsolutePositionFromRelativePosition(
        Y.createRelativePositionFromJSON(state.cursor.anchor),
        ydoc
      );
      const headAbs = Y.createAbsolutePositionFromRelativePosition(
        Y.createRelativePositionFromJSON(state.cursor.head),
        ydoc
      );
      if (!anchorAbs || !headAbs) return;

      css +=
        `.remote-sel-${clientId}{background:${color}30;}` +
        `.remote-head-${clientId}{position:relative;}` +
        `.remote-head-${clientId}::before{content:"";position:absolute;left:-1px;top:1px;bottom:1px;width:2px;background:${color};border-radius:2px;}` +
        `.remote-head-${clientId}::after{content:"${cssEscapeName(name)}";position:absolute;left:calc(100% + 5px);top:50%;transform:translateY(-50%);background:${color};color:#fff;font-size:10px;font-weight:600;line-height:1;padding:3px 7px;border-radius:999px;white-space:nowrap;pointer-events:none;z-index:20;}`;

      const start = Math.min(anchorAbs.index, headAbs.index);
      const end = Math.max(anchorAbs.index, headAbs.index);
      if (end > start) {
        const s = model.getPositionAt(start);
        const e = model.getPositionAt(end);
        decorations.push({
          range: new monaco.Range(s.lineNumber, s.column, e.lineNumber, e.column),
          options: { className: `remote-sel-${clientId}` },
        });
      }
      // Caret flag rides on one character at the head position.
      if (totalLength > 0) {
        const headIndex = Math.min(headAbs.index, totalLength);
        const from = headIndex < totalLength ? headIndex : headIndex - 1;
        const to = from + 1;
        const s = model.getPositionAt(from);
        const e = model.getPositionAt(to);
        decorations.push({
          range: new monaco.Range(s.lineNumber, s.column, e.lineNumber, e.column),
          options: { className: `remote-head-${clientId}` },
        });
      }
    });

    styleRef.current.textContent = css;
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      decorations
    );
  };

  // ---- Connect the CRDT room -----------------------------------------
  useEffect(() => {
    if (!user) return;
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(WS_BASE, id, ydoc, {
      params: { token: tokenStore.get() },
    });
    provider.awareness.setLocalStateField("user", {
      id: user._id,
      name: user.name,
      color: colorForUser(user._id),
    });
    const onStatus = ({ status }) => setConnStatus(status);
    provider.on("status", onStatus);
    provider.awareness.on("change", renderRemote);

    ydocRef.current = ydoc;
    providerRef.current = provider;

    return () => {
      provider.awareness.off("change", renderRemote);
      provider.off("status", onStatus);
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
      if (styleRef.current) styleRef.current.textContent = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // ---- Bind Yjs to Monaco when both are ready -------------------------
  useEffect(() => {
    const editor = editorRef.current;
    const ydoc = ydocRef.current;
    const provider = providerRef.current;
    if (!editorReady || !editor || !ydoc || !provider) return;

    const ytext = ydoc.getText("monaco");
    const binding = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );
    bindingRef.current = binding;

    const publishCursor = () => {
      const sel = editor.getSelection();
      const model = editor.getModel();
      if (!sel || !model) return;
      const position = sel.getPosition();
      const startPos = sel.getStartPosition();
      const anchorPos = position.equals(startPos)
        ? sel.getEndPosition()
        : startPos;
      try {
        provider.awareness.setLocalStateField("cursor", {
          anchor: Y.createRelativePositionFromTypeIndex(
            ytext,
            model.getOffsetAt(anchorPos)
          ).toJSON(),
          head: Y.createRelativePositionFromTypeIndex(
            ytext,
            model.getOffsetAt(position)
          ).toJSON(),
        });
      } catch {
        /* model changed mid-publish — the next move will re-send */
      }
    };
    const cursorDisp = editor.onDidChangeCursorSelection(publishCursor);
    publishCursor();
    renderRemote();

    return () => {
      cursorDisp.dispose();
      binding.destroy();
      bindingRef.current = null;
      decorationsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorReady, id]);

  // ---- Metadata actions ------------------------------------------------
  const saveTitle = async () => {
    if (!isOwner) return;
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
    if (!isOwner) return;
    try {
      const updated = await api.updateDocument(id, { language });
      setDoc(updated);
    } catch {
      /* collaborators keep editing regardless */
    }
  };

  const copyShareLink = async () => {
    try {
      const data = await api.getShareLink(id);
      const link = `${window.location.origin}${data.path}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this share link:", `${window.location.origin}/join/…`);
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
          readOnly={!isOwner}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 font-display text-base font-semibold text-white outline-none transition hover:bg-ink-800 focus:bg-ink-800 focus:ring-1 focus:ring-violet-500/50 read-only:hover:bg-transparent"
          maxLength={120}
          aria-label="Document title"
        />
        <select
          value={doc.language}
          onChange={(e) => changeLanguage(e.target.value)}
          disabled={!isOwner}
          className="input w-36 px-3 py-1.5 text-xs disabled:opacity-60"
          aria-label="Language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id} className="bg-ink-800">
              {l.label}
            </option>
          ))}
        </select>

        {/* Presence */}
        <div className="hidden items-center sm:flex">
          <div className="flex -space-x-2">
            {peers.slice(0, 5).map((p) => (
              <span
                key={p.id}
                title={p.id === user._id ? `${p.name} (you)` : p.name}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink-900 text-[10px] font-bold text-white"
                style={{ background: p.color }}
              >
                {initialsOf(p.name)}
              </span>
            ))}
          </div>
          {peers.length > 5 && (
            <span className="ml-1 text-xs text-slate-400">+{peers.length - 5}</span>
          )}
        </div>

        <span className="hidden items-center gap-2 text-xs text-slate-400 lg:flex">
          <span
            className={`h-2 w-2 rounded-full ${
              connStatus === "connected"
                ? "bg-emerald-400"
                : connStatus === "connecting"
                  ? "bg-amber-300"
                  : "bg-rose-400"
            }`}
          />
          {connStatus === "connected"
            ? `Live · ${peers.length} online`
            : connStatus === "connecting"
              ? "Connecting…"
              : "Offline — will sync"}
        </span>

        {isOwner ? (
          <button onClick={copyShareLink} className="btn-primary px-4 py-1.5 text-xs">
            {copied ? "✓ Link copied" : "🔗 Share"}
          </button>
        ) : (
          <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-300">
            Shared with you
          </span>
        )}
      </header>

      {/* Monaco — content owned by the Yjs binding, not React state */}
      <div className="min-h-0 flex-1">
        <Editor
          language={doc.language}
          theme="syncpad-dark"
          onMount={(editor) => {
            editorRef.current = editor;
            setEditorReady((n) => n + 1);
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
