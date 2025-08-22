import React, { useEffect, useMemo, useState } from "react";
import { ViewsAPI } from "../services/views";
import { notify } from "../services/notify";

export default function PreferencesAnon() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await ViewsAPI.getPreferencesAnon();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Failed to load preferences";
        setErr(String(msg));
        notify.err(e, "Failed to load preferences");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const normalized = useMemo(() => {
    return rows.map((r, i) => {

      return {
        id: r.preferences_id || r.profile_id || i + 1, // anonymous 
        ageGroup: r.age_group || r.age_bracket || r.age_band || "",
        films: r.interested_in_films,
        series: r.interested_in_series,
        genres: r.preferred_genres || "",
        minAge: r.minimum_age,
      };
    });
  }, [rows]);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (err) return <div style={{ padding: 24, color: "crimson" }}>{err}</div>;
  if (!normalized.length) return <div style={{ padding: 24 }}>No preference data.</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Preferences (Anonymous)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: 8 }}>#</th>
            <th style={{ padding: 8 }}>Age Group</th>
            <th style={{ padding: 8 }}>Interested in Films</th>
            <th style={{ padding: 8 }}>Interested in Series</th>
            <th style={{ padding: 8 }}>Preferred Genres</th>
            <th style={{ padding: 8 }}>Minimum Age</th>
          </tr>
        </thead>
        <tbody>
          {normalized.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 8 }}>{r.id}</td>
              <td style={{ padding: 8 }}>{r.ageGroup}</td>
              <td style={{ padding: 8 }}>{Number(r.films) ? "Yes" : "No"}</td>
              <td style={{ padding: 8 }}>{Number(r.series) ? "Yes" : "No"}</td>
              <td style={{ padding: 8 }}>{r.genres}</td>
              <td style={{ padding: 8 }}>{r.minAge ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
