import { createBrowserRouter } from "react-router-dom";
import { Navigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../hooks/useAuth";
import { roleHomePath } from "../lib/auth";
import AdminPanel from "../pages/AdminPanel";
import CustomerDashboard from "../pages/CustomerDashboard";
import DriverDashboard from "../pages/DriverDashboard";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import SupportPage from "../pages/SupportPage";

function RouterErrorFallback() {
  return (
    <div className="mx-auto mt-16 max-w-xl rounded-xl border border-red-200 bg-red-50 p-6">
      <h1 className="text-lg font-semibold text-red-700">Frontend Error</h1>
      <p className="mt-2 text-sm text-red-700">
        The app hit a runtime error. Refresh once. If it persists, restart containers with
        <code className="ml-1 rounded bg-red-100 px-1 py-0.5">docker compose up --build</code>.
      </p>
    </div>
  );
}

function RoleHomeRedirect() {
  const { role } = useAuth();
  return <Navigate to={roleHomePath(role)} replace />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage />, errorElement: <RouterErrorFallback /> },
  { path: "/register", element: <RegisterPage />, errorElement: <RouterErrorFallback /> },
  {
    element: <ProtectedRoute />,
    errorElement: <RouterErrorFallback />,
    children: [
      {
        element: <AppShell />,
        errorElement: <RouterErrorFallback />,
        children: [
          { path: "/", element: <RoleHomeRedirect /> },
          {
            element: <ProtectedRoute role="CUSTOMER" />,
            children: [{ path: "/customer", element: <CustomerDashboard /> }]
          },
          {
            element: <ProtectedRoute role="DRIVER" />,
            children: [{ path: "/driver", element: <DriverDashboard /> }]
          },
          {
            element: <ProtectedRoute role="ADMIN" />,
            children: [{ path: "/admin", element: <AdminPanel /> }]
          },
          {
            element: <ProtectedRoute role="SUPPORT_AGENT" />,
            children: [{ path: "/support", element: <SupportPage /> }]
          }
        ]
      }
    ]
  },
  { path: "*", element: <LoginPage />, errorElement: <RouterErrorFallback /> }
]);
