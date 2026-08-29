import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";
import LoadingScreen from "../components/Loading";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await api("get", "me");
      setUser(res.data.user);
    } catch(error) {
      setUser(null);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api("post", "auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
    setUser(null);
    window.location.href = "/login";
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);