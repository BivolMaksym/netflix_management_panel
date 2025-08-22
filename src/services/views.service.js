const { BaseService } = require("./base.service");

class ViewsService extends BaseService {
  async getPreferencesAnon() {
    const result = await this.pool.query("CALL sp_get_preferences_anon();");
    return this.unwrapCall(result);
  }

  async getWatchStats() {
    const result = await this.pool.query("CALL sp_get_watch_stats();");
    return this.unwrapCall(result);
  }
}

module.exports = { ViewsService };
