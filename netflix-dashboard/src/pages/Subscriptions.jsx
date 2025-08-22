import React, { useEffect, useState } from "react";
import { SubscriptionsAPI } from "../services/subscriptions";
import { notify } from "../services/notify";

const QUALITIES = ["SD", "HD", "UHD"];

export default function Subscriptions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // create form
  const [form, setForm] = useState({ account_id: "", quality: "HD", trial_days: "" });

  // inline edit tracker
  const [editingId, setEditingId] = useState(null);
  const [editingQuality, setEditingQuality] = useState("HD");

  async function load(account_id) {
    setLoading(true);
    setErr("");
    try {
      const rows = await SubscriptionsAPI.list(account_id);
      setSubs(rows);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to load subscriptions";
      setErr(String(msg));
      notify.err(e, "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    try {
      if (!form.account_id) return notify.err(null, "Account ID is required");
      if (!QUALITIES.includes(String(form.quality).toUpperCase()))
        return notify.err(null, "Quality must be SD, HD, or UHD");
      await SubscriptionsAPI.create(form);
      notify.ok("Subscription created");
      setForm({ account_id: "", quality: "HD", trial_days: "" });
      load();
    } catch (e) {
      notify.err(e, "Failed to create subscription");
    }
  }

  async function onSaveQuality(sub) {
    try {
      if (!QUALITIES.includes(editingQuality)) return notify.err(null, "Invalid quality");
      await SubscriptionsAPI.changeQuality(sub.subscription_id, editingQuality);
      notify.ok("Quality updated");
      setEditingId(null);
      load();
    } catch (e) {
      notify.err(e, "Failed to update quality");
    }
  }

  async function onCancel(sub) {
    if (!confirm("Cancel this subscription?")) return;
    try {
      await SubscriptionsAPI.cancel(sub.subscription_id);
      notify.ok("Subscription cancelled");
      load();
    } catch (e) {
      notify.err(e, "Failed to cancel subscription");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Subscriptions</h2>

      {/* Create */}
      <form onSubmit={onCreate} style={{ margin: "12px 0", display: "grid", gap: 8, maxWidth: 640 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            placeholder="Account ID"
            value={form.account_id}
            onChange={(e) => setForm({ ...form, account_id: e.target.value })}
            style={{ flex: 1, padding: 8 }}
            required
          />
          <select
            value={form.quality}
            onChange={(e) => setForm({ ...form, quality: e.target.value })}
            style={{ flex: 1, padding: 8 }}
          >
            {QUALITIES.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            placeholder="Trial days (optional)"
            value={form.trial_days}
            onChange={(e) => setForm({ ...form, trial_days: e.target.value })}
            style={{ flex: 1, padding: 8 }}
          />
          <button type="submit" style={{ padding: 8, minWidth: 120 }}>Create</button>
        </div>
      </form>

      {/* List */}
      {loading ? (
        <div>Loading…</div>
      ) : err ? (
        <div style={{ color: "crimson" }}>{err}</div>
      ) : subs.length === 0 ? (
        <div>No subscriptions found.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 8 }}>ID</th>
              <th style={{ padding: 8 }}>Account</th>
              <th style={{ padding: 8 }}>Quality</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Start</th>
              <th style={{ padding: 8 }}>End</th>
              <th style={{ padding: 8 }}>Trial ends</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.subscription_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 8 }}>{s.subscription_id}</td>
                <td style={{ padding: 8 }}>{s.account_id}</td>
                <td style={{ padding: 8 }}>
                  {editingId === s.subscription_id ? (
                    <select
                      value={editingQuality}
                      onChange={(e) => setEditingQuality(e.target.value)}
                      style={{ padding: 6 }}
                    >
                      {QUALITIES.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  ) : (
                    s.quality
                  )}
                </td>
                <td style={{ padding: 8 }}>{s.status}</td>
                <td style={{ padding: 8 }}>{s.start_date?.slice?.(0, 10) || ""}</td>
                <td style={{ padding: 8 }}>{s.end_date?.slice?.(0, 10) || ""}</td>
                <td style={{ padding: 8 }}>{s.trial_ends_at?.slice?.(0, 10) || ""}</td>
                <td style={{ padding: 8, display: "flex", gap: 8 }}>
                  {editingId === s.subscription_id ? (
                    <>
                      <button onClick={() => onSaveQuality(s)}>Save</button>
                      <button onClick={() => setEditingId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(s.subscription_id);
                          setEditingQuality(String(s.quality || "HD").toUpperCase());
                        }}
                      >
                        Edit
                      </button>
                      <button onClick={() => onCancel(s)} style={{ color: "crimson" }}>
                        Cancel
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
