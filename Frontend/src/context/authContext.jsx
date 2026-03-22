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
    }
    setLoading(false);
  };
// if(loading) return <LoadingScreen />
  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);