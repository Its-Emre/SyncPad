import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

// Landing point for share links: /join/<shareId>
// Joins the document as a collaborator, then opens it in the editor.
export default function JoinPage() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .joinDocument(shareId)
      .then((doc) => navigate(`/editor/${doc._id}`, { replace: true }))
      .catch((err) => setError(err.message));
  }, [shareId, navigate]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {error ? (
        <>
          <p className="font-display text-xl font-semibold text-white">
            That link doesn't work
          </p>
          <p className="mt-2 max-w-sm text-sm text-slate-400">{error}</p>
          <Link to="/dashboard" className="btn-primary mt-6">
            Go to my documents
          </Link>
        </>
      ) : (
        <p className="text-sm text-slate-400">Joining the document…</p>
      )}
    </main>
  );
}
