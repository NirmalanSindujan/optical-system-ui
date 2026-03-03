import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";

function ProtectedRoute({ allowedRoles = [] }) {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
