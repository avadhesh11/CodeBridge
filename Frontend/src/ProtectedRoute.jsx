import { Navigate } from "react-router-dom";
import { useAuth } from "./context/authContext.jsx";
import LoadingScreen from "./components/Loading.jsx";
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" />;

  return children;
}