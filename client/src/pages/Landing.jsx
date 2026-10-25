import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const FEATURES = [
  {
    icon: "⚡",
    title: "Truly simultaneous",
    text: "Built on a CRDT (Yjs), every keystroke is an operation — two people can type at the same spot at the same moment and nothing is ever lost or overwritten.",
  },
  {
    icon: "👀",
    title: "Presence you can see",
    text: "Live cursors with names and colours, exactly like Google Docs — except this editor is the one from VS Code, with real syntax highlighting.",
  },
  {
    icon: "🛡️",
    title: "Survives anything",
    text: "Disconnect mid-edit, close the tab, even restart the server — the document is rebuilt from its update log and snapshots, exactly where everyone left it.",
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-16 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-violet-400">
            Real-time collaborative editor
          </p>
          <h1 className="mt-5 font-display text-5xl sm:text-6xl font-bold tracking-tight text-white">
            Type together,
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              in real time.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            SyncPad puts many cursors in one document — code or notes — powered
            by the same editor engine as VS Code and a CRDT that guarantees
            everyone always sees the same page.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={user ? "/dashboard" : "/register"}
              className="btn-primary px-7 py-3 text-base"
            >
              {user ? "Open my documents" : "Start typing — it's free"}
            </Link>
            {!user && (
              <Link to="/login" className="btn-ghost px-6 py-3 text-base">
                Log in
              </Link>
            )}
          </div>

          {/* Mock editor */}
          <div className="card mx-auto mt-14 max-w-3xl overflow-hidden text-left">
            <div className="flex items-center gap-2 border-b border-ink-700 bg-ink-850 px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-rose-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 font-mono text-xs text-slate-500">
                team-notes.js — 3 people typing
              </span>
            </div>
            <div className="relative px-5 py-4 font-mono text-[13px] leading-6">
              <p><span className="text-slate-600">1 </span><span className="text-fuchsia-400">function</span> <span className="text-violet-300">planSprint</span><span className="text-slate-300">() {"{"}</span></p>
              <p><span className="text-slate-600">2 </span><span className="text-slate-300">{"  "}ship(<span className="text-amber-300">"the editor"</span>);</span>
                <span className="remote-cursor-flag ml-2 bg-fuchsia-600">Nira</span></p>
              <p><span className="text-slate-600">3 </span><span className="text-slate-300">{"  "}test(<span className="text-amber-300">"nobody loses a keystroke"</span>);</span></p>
              <p><span className="text-slate-600">4 </span><span className="text-slate-300">{"}"}</span>
                <span className="remote-cursor-flag ml-2 bg-violet-600">Emre</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{f.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-14 text-center text-xs text-slate-600">
          SyncPad · Built with React, Node.js, Yjs (CRDT) and the Monaco editor
        </p>
      </section>
    </main>
  );
}
