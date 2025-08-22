import toast from "react-hot-toast";

export const notify = {
  ok: (msg) => toast.success(msg),
  err: (e, fallback = "Something went wrong") => {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      fallback;
    toast.error(String(msg));
  },
  info: (msg) => toast(msg),
};
