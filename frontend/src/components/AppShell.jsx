import { Link, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../lib/auth";

export default function AppShell() {
  const navigate = useNavigate();
  const session = getSession();
  const roles = session?.roles || [];

  function logout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-orange-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold text-brand-primary">KituiRides</Link>
          <nav className="flex items-center gap-4 text-sm">
            {roles.includes("CUSTOMER") && <Link to="/">Customer</Link>}
            {roles.includes("RIDER") && <Link to="/driver">Driver</Link>}
            {roles.includes("ADMIN") && <Link to="/admin">Admin</Link>}
            <Link to="/support">Support</Link>
            <button onClick={logout} className="rounded bg-brand-accent px-3 py-1 text-white">Logout</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
