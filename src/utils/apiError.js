class ApiError extends Error {
  constructor(status = 500, error = "server_error", message = "Unexpected error", details) {
    super(message);
    this.status = status;
    this.code = error;
    this.details = details;
  }
}
const errorMiddleware = (err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    status,
    error: err.code || "server_error",
    message: err.message || "Unexpected error",
    ...(err.details !== undefined ? { details: err.details } : {})
  });
};
module.exports = { ApiError, errorMiddleware };
