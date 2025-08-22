import api from "./api";

export const MediaAPI = {
  async list() {
    const res = await api.get("/api/media");
    return res.data.media || res.data.data || res.data || [];
  },
  async create(payload) {
    const res = await api.post("/api/media", payload);
    return res.data;
  },
  async update(id, payload) {
    const res = await api.put(`/api/media/${id}`, payload);
    return res.data;
  },
  async remove(id) {
    const res = await api.delete(`/api/media/${id}`);
    return res.data;
  },
};
