import { Link, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { roleHomePath } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";
import { Avatar, Badge } from "./UIComponents";

export default function AppShell() {
  const navigate = useNavigate();
  const { session, role, logout, user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  function onLogout() {
    logout();
    navigate("/login");
  }

  const userName = user ? `${user.firstName} ${user.lastName}` : session?.email || 'User';

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-orange-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          {/* Logo */}
          <Link to={roleHomePath(role)} className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-teal-700 text-white px-3 py-1 rounded-lg">
              KR
            </div>
            <span className="text-xl font-bold text-gray-800 hidden sm:inline">KituiRides</span>
          </Link>

          {/* Navigation */}
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

            {/* User Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                <Avatar name={userName} size="sm" />
                <div className="text-left hidden sm:block">
                  <p className="font-semibold text-gray-800 text-sm">{userName}</p>
                  <Badge label={role} variant="teal" size="sm" />
                </div>
                <span className="text-gray-600">▼</span>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-10">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition"
                    onClick={() => setShowUserMenu(false)}
                  >
                    👤 My Profile
                  </Link>
                  <button
                    onClick={onLogout}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 transition border-t border-gray-100"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
