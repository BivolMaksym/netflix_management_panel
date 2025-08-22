const { BaseService } = require("./base.service");

class SubscriptionsService extends BaseService {
  async list({ account_id = null } = {}) {
    if (account_id) {
      const result = await this.pool.query(
        "CALL sp_get_active_subscriptions_by_account(?);",
        [account_id]
      );
      return this.unwrapCall(result);
    }
    const result = await this.pool.query("CALL sp_get_active_subscriptions();");
    return this.unwrapCall(result);
  }

  async create({ account_id, quality, trial_days = null }) {
    const result = await this.pool.query(
      "CALL sp_create_subscription(?, ?, ?, ?);",
      [Number(account_id), String(quality).toUpperCase(), null, trial_days]
    );
    return this.unwrapCall(result)?.[0]; 
  }

  async changeQuality({ subscription_id, quality }) {
    const result = await this.pool.query(
      "CALL sp_change_subscription_quality(?, ?);",
      [subscription_id, String(quality).toUpperCase()]
    );
    return this.unwrapCall(result)?.[0]; 
  }

  
  async cancel(subscription_id) {
    const result = await this.pool.query(
        "CALL sp_cancel_subscription(?, ?);",
        [subscription_id, null] // end_date defaults to NOW() in the SP
    );
    const [rows, meta] = result;
    const first = rows?.[0]?.[0];
    if (first && (first.cancelled === 1 || first.affected_rows === 1)) return true;
    const affected = Array.isArray(meta)
        ? meta.reduce((s, p) => s + (p?.affectedRows || 0), 0)
        : 0;
    return affected > 0;
    }

}

module.exports = { SubscriptionsService };
