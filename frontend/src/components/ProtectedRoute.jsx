import { Navigate, Outlet } from "react-router-dom";
import { roleHomePath } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ role }) {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (role && session.role !== role) {
    return <Navigate to={roleHomePath(session.role)} replace />;
  }
  return <Outlet />;
}
