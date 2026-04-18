import { createBrowserRouter } from "react-router-dom";
import AppShell from "../components/AppShell";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminPanel from "../pages/AdminPanel";
import CustomerDashboard from "../pages/CustomerDashboard";
import DriverDashboard from "../pages/DriverDashboard";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import SupportPage from "../pages/SupportPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <CustomerDashboard /> },
          {
            element: <ProtectedRoute roles={["RIDER", "ADMIN"]} />,
            children: [{ path: "/driver", element: <DriverDashboard /> }]
          },
          {
            element: <ProtectedRoute roles={["ADMIN"]} />,
            children: [{ path: "/admin", element: <AdminPanel /> }]
          },
          { path: "/support", element: <SupportPage /> }
        ]
      }
    ]
  }
]);
