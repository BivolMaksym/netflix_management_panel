// src/services/profiles.js
import api from "./api";

export const ProfilesAPI = {
  async list() {
    const res = await api.get("/api/profiles");
    const payload = res?.data;
    return (
      (Array.isArray(payload) && payload) ||
      payload?.profiles ||
      payload?.data ||
      payload?.rows ||
      payload?.result ||
      []
    );
  },

  // expects backend PUT /api/profiles/:id  (body can include name, age, language)
  async update(profile_id, data) {
    const res = await api.put(`/api/profiles/${profile_id}`, data);
    return res.data;
  },

  // expects backend DELETE /api/profiles/:id
  async remove(profile_id) {
    const res = await api.delete(`/api/profiles/${profile_id}`);
    return res.data;
  },
};
