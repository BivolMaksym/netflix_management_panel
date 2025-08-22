import React from "react";
import { useAuth } from "../store/auth";

export default function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Dashboard</h2>
        <div>
          <span style={{ marginRight: 12 }}>{user?.email}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <nav style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <a href="/media">Media</a>
        <a href="/customers">Customers</a>
        <a href="/subscriptions">Subscriptions</a>
        <a href="/views/preferences-anon">Preferences (Anon)</a>
      </nav>
    </div>
  );
}
