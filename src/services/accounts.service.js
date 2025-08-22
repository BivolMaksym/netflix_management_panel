const { BaseService } = require("./base.service");

class AccountsService extends BaseService {
  async getByEmail(email) {
    const result = await this.pool.query("CALL sp_mgmt_get_account_for_login(?);", [email]);
    const rows = this.unwrapCall(result);
    return rows[0] || null;
  }

  async recordLoginAttempt(email, success) {
    await this.pool.query("CALL sp_mgmt_record_login_attempt(?, ?);", [email, !!success]);
  }
}

module.exports = { AccountsService };
