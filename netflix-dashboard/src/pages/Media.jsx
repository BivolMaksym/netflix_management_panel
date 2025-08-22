import React, { useEffect, useMemo, useState } from "react";
import { MediaAPI } from "../services/media";

export default function MediaPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");


  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null); // null => create, number => edit
  const emptyForm = {
    media_title: "",
    media_type: "movie",
    duration_seconds: "",
    media_description: "",
    release_date: "",
    genre: "",
    quality: "",
    age_rating: "",
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await MediaAPI.list();
      setItems(Array.isArray(data) ? data : data.media || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load media");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(row) {
    setEditId(row.media_id);
    setForm({
      media_title: row.media_title ?? "",
      media_type: row.media_type ?? "movie",
      duration_seconds: row.duration_seconds ?? "",
      media_description: row.media_description ?? "",
      release_date: row.release_date ? String(row.release_date).slice(0,10) : "",
      genre: row.genre ?? "",
      quality: (row.quality || "").toUpperCase(),
      age_rating: row.age_rating ?? "",
    });
    setFormOpen(true);
  }

  async function onDelete(id) {
    if (!confirm("Delete this media item?")) return;
    try {
      await MediaAPI.remove(id);
      setItems((prev) => prev.filter((x) => x.media_id !== id));
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Delete failed");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const payload = {
      media_title: form.media_title.trim(),
      media_type: form.media_type,
      duration_seconds: Number(form.duration_seconds) || 0,
      media_description: form.media_description.trim(),
      release_date: form.release_date || null,
      genre: form.genre,
      quality: String(form.quality || "").toUpperCase(),
      age_rating: form.age_rating === "" ? null : Number(form.age_rating),
    };

    if (!payload.quality || !["SD","HD","UHD"].includes(payload.quality)) {
      alert("Quality must be SD, HD, or UHD.");
      return;
    }

    try {
      if (editId) {
        await MediaAPI.update(editId, payload);
      } else {
        await MediaAPI.create(payload);
      }
      await load();
      setFormOpen(false);
      setEditId(null);
      setForm(emptyForm);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || (editId ? "Update failed" : "Create failed"));
    }
  }

  const rows = useMemo(() => items || [], [items]);

  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Media Catalog</h2>
        <button onClick={openCreate}>{formOpen && !editId ? "Close" : "Add Media"}</button>
      </header>

      {formOpen && (
        <form onSubmit={onSubmit} style={{ marginTop: 16, padding: 16, border: "1px solid #e5e7eb", borderRadius: 8, display: "grid", gap: 8 }}>
          <h3 style={{ margin: 0 }}>{editId ? `Edit #${editId}` : "Create media"}</h3>
          <div>
            <label>Title</label>
            <input
              value={form.media_title}
              onChange={(e) => setForm({ ...form, media_title: e.target.value })}
              required
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label>Type</label>
              <select
                value={form.media_type}
                onChange={(e) => setForm({ ...form, media_type: e.target.value })}
                style={{ width: "100%", padding: 8 }}
              >
                <option value="movie">movie</option>
                <option value="series">series</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Duration (sec)</label>
              <input
                type="number"
                value={form.duration_seconds}
                onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })}
                style={{ width: "100%", padding: 8 }}
                min="0"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Age rating</label>
              <input
                type="number"
                value={form.age_rating}
                onChange={(e) => setForm({ ...form, age_rating: e.target.value })}
                style={{ width: "100%", padding: 8 }}
                min="0"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label>Release date</label>
              <input
                type="date"
                value={form.release_date}
                onChange={(e) => setForm({ ...form, release_date: e.target.value })}
                style={{ width: "100%", padding: 8 }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label>Genre</label>
              <select
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                style={{ width: "100%", padding: 8 }}
              >
                <option value="">-- Select genre --</option>
                <option value="Action">Action</option>
                <option value="Comedy">Comedy</option>
                <option value="Drama">Drama</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Thriller">Thriller</option>
                <option value="Horror">Horror</option>
                <option value="Romance">Romance</option>
                <option value="Animation">Animation</option>
                <option value="Documentary">Documentary</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label>Quality</label>
              <select
                value={form.quality}
                onChange={(e) => setForm({ ...form, quality: e.target.value })}
                required
                style={{ width: "100%", padding: 8 }}
              >
                <option value="">-- Select quality --</option>
                <option value="SD">SD</option>
                <option value="HD">HD</option>
                <option value="UHD">UHD</option>
              </select>
            </div>
          </div>

          <div>
            <label>Description</label>
            <textarea
              value={form.media_description}
              onChange={(e) => setForm({ ...form, media_description: e.target.value })}
              rows={3}
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { setFormOpen(false); setEditId(null); }}>Cancel</button>
            <button type="submit">{editId ? "Save changes" : "Create"}</button>
          </div>
        </form>
      )}

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <div>Loading…</div>
        ) : err ? (
          <div style={{ color: "crimson" }}>{err}</div>
        ) : rows.length === 0 ? (
          <div>No media yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: 8 }}>ID</th>
                <th style={{ padding: 8 }}>Title</th>
                <th style={{ padding: 8 }}>Type</th>
                <th style={{ padding: 8 }}>Quality</th>
                <th style={{ padding: 8 }}>Age</th>
                <th style={{ padding: 8 }}>Release</th>
                <th style={{ padding: 8 }}>Genre</th>
                <th style={{ padding: 8, maxWidth: 280 }}>Description</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.media_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 8 }}>{m.media_id}</td>
                  <td style={{ padding: 8 }}>{m.media_title}</td>
                  <td style={{ padding: 8 }}>{m.media_type}</td>
                  <td style={{ padding: 8 }}>{m.quality}</td>
                  <td style={{ padding: 8 }}>{m.age_rating}</td>
                  <td style={{ padding: 8 }}>{m.release_date?.slice?.(0,10) || ""}</td>
                  <td style={{ padding: 8 }}>{m.genre}</td>
                  <td style={{ padding: 8, maxWidth: 280, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.media_description || ""}
                  </td>
                  <td style={{ padding: 8, display: "flex", gap: 8 }}>
                    <button onClick={() => openEdit(m)}>Edit</button>
                    <button onClick={() => onDelete(m.media_id)} style={{ color: "crimson" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
