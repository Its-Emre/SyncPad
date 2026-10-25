import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import JoinPage from "./pages/JoinPage";

// Monaco is a heavy bundle — load the editor route (and the editor)
// only when a user actually opens a document.
const EditorPage = lazy(() => import("./pages/EditorPage"));

export default function App() {
  const location = useLocation();
  // The editor is a full-screen workspace with its own top bar.
  const isEditor = location.pathname.startsWith("/editor/");

  return (
    <div className="min-h-screen bg-ink-950">
      {!isEditor && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/join/:shareId"
          element={
            <ProtectedRoute>
              <JoinPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/:id"
          element={
            <ProtectedRoute>
              <Suspense
                fallback={
                  <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
                    Loading the editor…
                  </div>
                }
              >
                <EditorPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
