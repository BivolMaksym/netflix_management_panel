const { ViewsService } = require("../services/views.service");
const { Responder } = require("../utils/responder");
const { ApiError } = require("../utils/apiError");
const { BaseController } = require("./base.controller");

class ViewsController extends BaseController {
  constructor() {
    super();
    this.svc = new ViewsService();

    this.getPreferencesAnon = this.getPreferencesAnon.bind(this);
    this.getWatchStats = this.getWatchStats.bind(this);
  }

  async getPreferencesAnon(req, res, next) {
    try {
      const data = await this.svc.getPreferencesAnon();
      return Responder.send(req, res, { status: "success", data }, "preferences_anon");
    } catch (e) {
      return next(new ApiError(500, "failed_to_fetch_preferences_anon", "Could not fetch preferences_anon view.", e.message));
    }
  }

  async getWatchStats(req, res, next) {
    try {
      const data = await this.svc.getWatchStats();
      return Responder.send(req, res, { status: "success", data }, "watch_stats");
    } catch (e) {
      return next(new ApiError(500, "failed_to_fetch_watch_stats", "Could not fetch watch stats view.", e.message));
    }
  }
}

module.exports = { ViewsController };
