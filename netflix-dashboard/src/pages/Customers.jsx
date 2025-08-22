import React, { useEffect, useState } from "react";
import { ProfilesAPI } from "../services/profiles";
import { AccountsAPI } from "../services/accounts";
import { notify } from "../services/notify";

const LANGS = ["EN", "DE", "FR", "NL", "ES", "IT", "PL", "UA", "RU", "TR"];

export default function Customers() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // edit panel state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState(null); // keep full row (has account_id)
  const [form, setForm] = useState({ email: "", name: "", age: "", language: "EN" });

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const rows = await ProfilesAPI.list();
      setProfiles(rows);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to load profiles";
      setErr(String(msg));
      notify.err(e, "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openEdit(row) {
    setEditId(row.profile_id);
    setEditRow(row);
    setForm({
      email: row.email || "",
      name: row.name || "",
      age: row.age ?? "",
      language: row.language || "EN",
    });
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditId(null);
    setEditRow(null);
    setForm({ email: "", name: "", age: "", language: "EN" });
  }

  async function onSave(e) {
    e.preventDefault();
    try {
      // 1) update profile fields
      const profilePayload = {
        name: String(form.name || "").trim(),
        age: form.age === "" ? null : Number(form.age),
        language: String(form.language || "EN").toUpperCase(),
      };
      if (!profilePayload.name) return notify.err(null, "Name is required.");
      if (profilePayload.age !== null && (isNaN(profilePayload.age) || profilePayload.age < 0)) {
        return notify.err(null, "Age must be a non-negative number.");
      }
      await ProfilesAPI.update(editId, profilePayload);

      // 2) if email changed -> update account email
      const newEmail = String(form.email || "").trim();
      const oldEmail = editRow?.email || "";
      if (newEmail && newEmail !== oldEmail) {
        await AccountsAPI.update(editRow.account_id, { email: newEmail });
      }

      notify.ok("Profile saved");
      await load();
      closeEdit();
    } catch (e) {
      notify.err(e, "Save failed");
    }
  }

  async function onDelete(profile_id) {
    if (!confirm("Delete this profile?")) return;
    try {
      await ProfilesAPI.remove(profile_id);
      notify.ok("Profile deleted");
      setProfiles((prev) => prev.filter((p) => p.profile_id !== profile_id));
    } catch (e) {
      notify.err(e, "Delete failed");
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (err) return <div style={{ padding: 24, color: "crimson" }}>{err}</div>;
  if (!profiles.length) return <div style={{ padding: 24 }}>No profiles found.</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Profiles</h2>

      {/* Edit panel */}
      {editOpen && (
        <form
          onSubmit={onSave}
          style={{
            margin: "16px 0",
            padding: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            display: "grid",
            gap: 8,
          }}
        >
          <h3 style={{ margin: 0 }}>Edit profile #{editId}</h3>

          <div>
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <div>
            <label>Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label>Age</label>
              <input
                type="number"
                min="0"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                style={{ width: "100%", padding: 8 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Language</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                style={{ width: "100%", padding: 8 }}
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={closeEdit}>
              Cancel
            </button>
            <button type="submit">Save</button>
          </div>
        </form>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: 8 }}>Profile ID</th>
            <th style={{ padding: 8 }}>Account ID</th>
            <th style={{ padding: 8 }}>Email</th>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>Age</th>
            <th style={{ padding: 8 }}>Language</th>
            <th style={{ padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.profile_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 8 }}>{p.profile_id}</td>
              <td style={{ padding: 8 }}>{p.account_id}</td>
              <td style={{ padding: 8 }}>{p.email}</td>
              <td style={{ padding: 8 }}>{p.name}</td>
              <td style={{ padding: 8 }}>{p.age}</td>
              <td style={{ padding: 8 }}>{p.language}</td>
              <td style={{ padding: 8, display: "flex", gap: 8 }}>
                <button onClick={() => openEdit(p)}>Edit</button>
                <button onClick={() => onDelete(p.profile_id)} style={{ color: "crimson" }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
