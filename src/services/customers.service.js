const { BaseService } = require("./base.service");

class CustomersService extends BaseService {
  async createAccount(email, password_hash) {
    const result = await this.pool.query("CALL sp_create_account(?, ?);", [email, password_hash]);
    const rows = this.unwrapCall(result);
    return rows?.[0] || null; 
  }

async updateAccount({ account_id, email, password_hash }) {
  const result = await this.pool.query("CALL sp_update_account(?, ?, ?);", [
    account_id,
    email,
    password_hash
  ]);
  const rows = this.unwrapCall(result);
  return rows?.[0] || null; 
}

  async deleteAccount(account_id) {
    const result = await this.pool.query("CALL sp_delete_account(?);", [account_id]);
    const [rows, meta] = result;
    const first = rows?.[0]?.[0];
    if (first && (first.deleted === 1 || first.affected_rows === 1)) return true;
    const affected = Array.isArray(meta)
      ? meta.reduce((sum, pkt) => sum + (pkt?.affectedRows || 0), 0)
      : 0;
    return affected > 0;
  }
}

module.exports = { CustomersService };
