import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { LANGUAGES, STARTERS, languageLabel } from "../lib/languages";

const formatWhen = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

export default function Dashboard() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const load = async () => {
    try {
      setDocs(await api.listDocuments());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const doc = await api.createDocument({ title: title.trim(), language });
      // Seed the pad with a starter line (not fatal if this fails).
      const starter = STARTERS[language];
      if (starter) {
        try {
          await api.saveContent(doc._id, starter);
        } catch {
          /* the editor will simply open empty */
        }
      }
      navigate(`/editor/${doc._id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  const handleShare = async (doc) => {
    try {
      const data = await api.getShareLink(doc._id);
      await navigator.clipboard.writeText(`${window.location.origin}${data.path}`);
      setCopiedId(doc._id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteDocument(doc._id);
      setDocs((prev) => prev.filter((d) => d._id !== doc._id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-white">
            My documents
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Every pad you own. Open one and start typing.
          </p>
        </div>
      </div>

      {/* Create */}
      <form onSubmit={handleCreate} className="card mt-8 p-5">
        <p className="font-display text-sm font-semibold uppercase tracking-wider text-violet-300">
          New document
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="e.g. DSA revision notes, Team project draft…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input flex-1"
            maxLength={120}
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="input sm:w-48"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id} className="bg-ink-800">
                {l.label}
              </option>
            ))}
          </select>
          <button type="submit" disabled={creating || !title.trim()} className="btn-primary">
            {creating ? "Creating…" : "+ Create pad"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="mt-12 text-center text-sm text-slate-500">Loading your documents…</p>
      ) : docs.length === 0 ? (
        <div className="card mt-8 border-dashed p-12 text-center">
          <div className="text-4xl">📝</div>
          <p className="mt-4 font-display text-lg font-semibold text-white">
            No documents yet
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Create your first pad above — it opens straight in the editor.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <div key={doc._id} className="card group p-5 transition hover:border-violet-500/50">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-base font-semibold leading-snug text-white">
                  {doc.title}
                </h3>
                <span className="shrink-0 rounded-full bg-violet-500/15 px-2.5 py-1 font-mono text-[11px] font-medium text-violet-300">
                  {languageLabel(doc.language)}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Edited {formatWhen(doc.updatedAt)}
                {doc.collaboratorCount > 0 && (
                  <span className="ml-2 rounded-full bg-violet-500/15 px-2 py-0.5 font-medium text-violet-300">
                    👥 {doc.collaboratorCount} collaborator
                    {doc.collaboratorCount > 1 ? "s" : ""}
                  </span>
                )}
                {!doc.isOwner && (
                  <span className="ml-2 rounded-full bg-fuchsia-500/15 px-2 py-0.5 font-medium text-fuchsia-300">
                    Shared with you
                  </span>
                )}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => navigate(`/editor/${doc._id}`)}
                  className="btn-primary flex-1 py-2"
                >
                  Open
                </button>
                {doc.isOwner && (
                  <>
                    <button onClick={() => handleShare(doc)} className="btn-ghost">
                      {copiedId === doc._id ? "✓ Copied" : "🔗 Share"}
                    </button>
                    <button onClick={() => handleDelete(doc)} className="btn-ghost">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
