import { Link, Outlet, useNavigate } from "react-router-dom";
import { roleHomePath } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";

export default function AppShell() {
  const navigate = useNavigate();
  const { session, role, logout } = useAuth();

  function onLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-orange-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to={roleHomePath(role)} className="text-xl font-bold text-brand-primary">KituiRides</Link>
          <nav className="flex items-center gap-4 text-sm">
            {role === "CUSTOMER" && <Link to="/customer">Customer</Link>}
            {role === "DRIVER" && <Link to="/driver">Driver</Link>}
            {role === "ADMIN" && <Link to="/admin">Admin</Link>}
            {role === "SUPPORT_AGENT" && <Link to="/support">Support</Link>}
            <span className="text-slate-500">{session?.email}</span>
            <button onClick={onLogout} className="rounded bg-brand-accent px-3 py-1 text-white">Logout</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
