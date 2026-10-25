import { createContext, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((me) => setUser(me))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const persist = (data) => {
    tokenStore.set(data.token);
    setUser({ _id: data._id, name: data.name, email: data.email });
  };

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    persist(data);
    return data;
  };

  const register = async (name, email, password) => {
    const data = await api.register({ name, email, password });
    persist(data);
    return data;
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
