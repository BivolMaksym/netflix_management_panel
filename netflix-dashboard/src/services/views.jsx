// src/services/views.js
import api from "./api";

export const ViewsAPI = {
  async getPreferencesAnon() {
    const res = await api.get("/api/views/preferences-anon", { suppressToast: true });
    const payload = res?.data;
    // normalize common shapes
    return (
      (Array.isArray(payload) && payload) ||
      payload?.data ||
      payload?.rows ||
      payload?.preferences ||
      []
    );
  },
};
