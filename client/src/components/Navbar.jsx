import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 font-display text-lg font-bold text-white shadow-lg shadow-violet-900/50">
        S
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-white">
        Sync<span className="text-violet-400">Pad</span>
      </span>
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="border-b border-ink-700 bg-ink-900/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to={user ? "/dashboard" : "/"}>
          <Logo />
        </Link>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400">
              Hi, <span className="text-slate-100 font-medium">{user.name}</span>
            </span>
            <button onClick={handleLogout} className="btn-ghost">
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost">
              Log in
            </Link>
            <Link to="/register" className="btn-primary">
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
