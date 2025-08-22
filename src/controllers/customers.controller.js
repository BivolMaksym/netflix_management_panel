const bcrypt = require("bcrypt");
const { BaseController } = require("./base.controller");
const { ApiError } = require("../utils/apiError");
const { CustomersService } = require("../services/customers.service");

class CustomersController extends BaseController {
  constructor() {
    super();
    this.svc = new CustomersService();

    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
  }

  async create(req, res, next) {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return next(new ApiError(400, "invalid_request", "email and password are required."));
      }
      const hash = await bcrypt.hash(String(password), 10);
      const row = await this.svc.createAccount(String(email), hash);
      return res.status(201).json({ status: "success", created: true, account_id: row?.account_id });
    } catch (e) {
      return next(new ApiError(500, "failed_to_create_account", "Could not create account.", e.message));
    }
  }

  async update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return next(new ApiError(400, "invalid_account_id", "Valid account_id is required."));
    }

    const { email = null, password = null } = req.body || {};
    if (email === null && (password === null || password === undefined)) {
      return next(new ApiError(400, "invalid_request", "Provide at least one of: email, password."));
    }

    let hash = null;
    if (password !== null && password !== undefined) {
      hash = await require("bcrypt").hash(String(password), 10);
    }

    const row = await this.svc.updateAccount({
      account_id: id,
      email: email !== null ? String(email) : null,
      password_hash: hash
    });

    const updated = Number(row?.affected_rows || 0) > 0;
    return res.status(200).json({ status: "success", updated, account_id: row?.account_id || id });

  } catch (e) {
 
    const isSignal = e && (e.code === "ER_SIGNAL_EXCEPTION" || e.errno === 1644);
    const msg = (e && e.sqlMessage ? e.sqlMessage : "").toLowerCase();

    if (isSignal) {
      if (msg.includes("account_not_found")) {
        return next(new ApiError(404, "account_not_found", "No account found with that ID."));
      }
      if (msg.includes("email_already_in_use")) {
        return next(new ApiError(400, "email_already_in_use", "That email is already used by another account."));
      }

    }

    return next(new ApiError(500, "failed_to_update_account", "Could not update account.", e.message));
  }
}


  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return next(new ApiError(400, "invalid_account_id", "Valid account_id is required."));
      }

      const ok = await this.svc.deleteAccount(id);
      if (!ok) {
        return next(new ApiError(404, "account_not_found", "No account found with that ID."));
      }
      return res.status(200).json({ status: "success", deleted: true, account_id: id });
    } catch (e) {
      return next(new ApiError(500, "failed_to_delete_account", "Could not delete account.", e.message));
    }
  }
}

module.exports = { CustomersController };
