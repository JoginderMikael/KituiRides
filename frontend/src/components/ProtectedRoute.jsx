import { Navigate, Outlet } from "react-router-dom";
import { getSession } from "../lib/auth";

export default function ProtectedRoute({ roles }) {
  const session = getSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.some((role) => session.roles.includes(role))) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
