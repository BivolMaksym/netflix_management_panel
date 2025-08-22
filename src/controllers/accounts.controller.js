const bcrypt = require("bcrypt");
const { BaseController } = require("./base.controller");
const { ApiError } = require("../utils/apiError");
const { Auth } = require("../utils/auth");
const { AccountsService } = require("../services/accounts.service");

class AccountsController extends BaseController {
  constructor() {
    super();
    this.svc = new AccountsService();
    this.login = this.login.bind(this);
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return next(new ApiError(400, "invalid_request", "Email and password are required."));
      }

      const acct = await this.svc.getByEmail(email);
      if (!acct) {
        await this.svc.recordLoginAttempt(email, false);
        return next(new ApiError(401, "invalid_credentials", "Invalid email or password."));
      }

      if (!acct.is_active) {
        return next(new ApiError(403, "account_disabled", "This account is disabled."));
      }
      if (acct.lock_until && new Date(acct.lock_until) > new Date()) {
        return next(new ApiError(403, "account_locked", "Account temporarily locked due to failed attempts."));
      }

      const ok = await bcrypt.compare(password, acct.password_hash.toString());
      if (!ok) {
        await this.svc.recordLoginAttempt(email, false);
        return next(new ApiError(401, "invalid_credentials", "Invalid email or password."));
      }

      await this.svc.recordLoginAttempt(email, true);

      const token = Auth.sign({
        management_account_id: acct.management_account_id,
        email: acct.email
      });

      return this.ok(res, {
        status: "success",
        token,
        token_type: "Bearer",
        expires_in: 3600,
        user: { id: acct.management_account_id, email: acct.email }
      });
    } catch (err) {
      return next(new ApiError(500, "login_failed", "Unable to complete login.", err.message));
    }
  }
}

module.exports = { AccountsController };
