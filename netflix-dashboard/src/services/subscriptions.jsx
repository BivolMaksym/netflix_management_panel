import api from "./api";

export const SubscriptionsAPI = {
  async list(account_id) {
    const res = await api.get(
      account_id ? `/api/subscriptions?account_id=${account_id}` : "/api/subscriptions",
      { suppressToast: true }
    );
    const payload = res?.data;
    return (
      (Array.isArray(payload) && payload) ||
      payload?.subscriptions ||
      payload?.data ||
      payload?.rows ||
      []
    );
  },


  async create(data) {
    const body = {
      account_id: Number(data.account_id),
      quality: String(data.quality || "").toUpperCase(),
      trial_days: data.trial_days === "" ? null : Number(data.trial_days),
    };
    return (await api.post("/api/subscriptions", body)).data;
  },

  async changeQuality(subscription_id, quality) {
    const body = {
      subscription_id: Number(subscription_id),
      quality: String(quality || "").toUpperCase(),
    };
    return (await api.put("/api/subscriptions/quality", body)).data;
  },

  // cancel: DELETE /api/subscriptions/:id
  async cancel(subscription_id) {
    return (await api.delete(`/api/subscriptions/${subscription_id}`)).data;
  },
};
