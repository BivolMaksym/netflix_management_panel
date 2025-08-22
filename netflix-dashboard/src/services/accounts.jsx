import api from "./api";

export const AccountsAPI = {
  async update(account_id, data) {
    const res = await api.put(`/api/customers/${account_id}`, data);
    return res.data;
  },
};
