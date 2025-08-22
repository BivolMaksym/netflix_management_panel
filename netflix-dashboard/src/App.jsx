import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Media from "./pages/Media";
import Customers from "./pages/Customers";
import Subscriptions from "./pages/Subscriptions";
import PreferencesAnon from "./pages/PreferencesAnon";
import { useAuth } from "./store/auth";

function PrivateRoute({ children }) {
  const { token, isExpired } = useAuth();
  // if no token or token expired -> redirect to login
  if (!token || isExpired) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      {/* protected routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/media"
        element={
          <PrivateRoute>
            <Media />
          </PrivateRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <PrivateRoute>
            <Customers />
          </PrivateRoute>
        }
      />
      <Route
        path="/subscriptions"
        element={
          <PrivateRoute>
            <Subscriptions />
          </PrivateRoute>
        }
      />
      <Route
        path="/views/preferences-anon"
        element={
            <PrivateRoute>
            <PreferencesAnon />
            </PrivateRoute>
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
