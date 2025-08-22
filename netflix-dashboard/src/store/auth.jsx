import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";


const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("jwt"));
  const [isExpired, setIsExpired] = useState(false);

  function login(newToken) {
    localStorage.setItem("jwt", newToken);
    setToken(newToken);
    setIsExpired(false);
  }

  function logout() {
    localStorage.removeItem("jwt");
    setToken(null);
    setIsExpired(false);
  }

  // decode and check expiration every render or when token changes
  useEffect(() => {
    if (!token) return;
    try {
      const { exp } = jwtDecode(token);
      if (!exp) return;
      const now = Math.floor(Date.now() / 1000);
      if (exp <= now) {
        logout();
      } else {
        // schedule auto-logout
        const timeout = (exp - now) * 1000;
        const timer = setTimeout(() => logout(), timeout);
        return () => clearTimeout(timer);
      }
    } catch {
      logout();
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, isExpired, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
