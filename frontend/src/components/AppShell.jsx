import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FiChevronDown, FiLogOut, FiUser } from "react-icons/fi";
import { roleHomePath } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";
import { Avatar, Badge } from "./UIComponents";

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role, logout, user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const isAdmin = role === "ADMIN";

  function onLogout() {
    setShowUserMenu(false);
    logout();
    navigate("/login");
  }

  useEffect(() => {
    setShowUserMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!userMenuRef.current?.contains(event.target)) {
        setShowUserMenu(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const userName = user ? `${user.firstName} ${user.lastName}` : session?.email || "User";

  return (
    <div className={isAdmin ? "min-h-screen bg-slate-100" : "min-h-screen bg-gradient-to-b from-teal-50 to-orange-50"}>
      <header className="relative z-[70] border-b bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to={roleHomePath(role)} className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-teal-700 text-white px-3 py-1 rounded-lg">
              KR
            </div>
            <span className="text-xl font-bold text-gray-800 hidden sm:inline">KituiRides</span>
          </Link>

          <nav className="flex items-center gap-6 text-sm">
            {role === "CUSTOMER" && (
              <Link to="/customer" className="text-gray-700 hover:text-teal-600 font-medium transition">
                Rides
              </Link>
            )}
            {role === "DRIVER" && (
              <Link to="/driver" className="text-gray-700 hover:text-teal-600 font-medium transition">
                Dashboard
              </Link>
            )}
            {role === "ADMIN" && (
              <Link to="/admin" className="text-gray-700 hover:text-teal-600 font-medium transition">
                Management
              </Link>
            )}
            {role === "SUPPORT_AGENT" && (
              <Link to="/support" className="text-gray-700 hover:text-teal-600 font-medium transition">
                Support
              </Link>
            )}

            <div ref={userMenuRef} className="relative z-[80]">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-200"
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
                aria-controls="app-user-menu"
              >
                <Avatar name={userName} size="sm" />
                <div className="text-left hidden sm:block">
                  <p className="font-semibold text-gray-800 text-sm">{userName}</p>
                  <Badge label={role} variant="teal" size="sm" />
                </div>
                <FiChevronDown
                  className={`text-gray-600 transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {showUserMenu && (
                <div
                  id="app-user-menu"
                  role="menu"
                  className="absolute right-0 z-[90] mt-3 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white/98 p-1.5 shadow-[0_24px_65px_-28px_rgba(15,23,42,0.45)] backdrop-blur"
                >
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email || session?.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    role="menuitem"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-700"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <FiUser className="text-base" aria-hidden="true" />
                    <span>Profile</span>
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-xl border-t border-slate-100 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <FiLogOut className="text-base" aria-hidden="true" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className={isAdmin ? "relative z-0 min-h-[calc(100vh-81px)]" : "mx-auto max-w-6xl px-4 py-6"}>
        <Outlet />
      </main>
    </div>
  );
}
