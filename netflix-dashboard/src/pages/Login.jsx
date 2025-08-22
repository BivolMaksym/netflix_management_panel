import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { notify } from "../services/notify";
import api from "../services/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {

      const res = await api.post("/api/accounts/login", { email, password });
      // store token in context/localStorage
      login(res.data.token);
      notify.ok("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Login failed"
      );
      notify.err(err, "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <form onSubmit={onSubmit} style={{ width: 360, padding: 24, border: "1px solid #e5e7eb", borderRadius: 12 }}>
        <h1 style={{ marginBottom: 16 }}>Netflix Admin — Login</h1>
        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />
        <label>Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />
        {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}
        <button disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
