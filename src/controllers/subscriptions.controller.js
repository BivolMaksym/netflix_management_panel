const { BaseController } = require("./base.controller");
const { ApiError } = require("../utils/apiError");
const { Responder } = require("../utils/responder");
const { SubscriptionsService } = require("../services/subscriptions.service");

class SubscriptionsController extends BaseController {
  constructor() {
    super();
    this.svc = new SubscriptionsService();

    this.list = this.list.bind(this);
    this.create = this.create.bind(this);
    this.changeQualityBody = this.changeQualityBody.bind(this);
    this.cancel = this.cancel.bind(this);
  }

  async list(req, res, next) {
    try {
      const account_id = req.query.account_id ? Number(req.query.account_id) : null;
      if (req.query.account_id && (!Number.isInteger(account_id) || account_id <= 0)) {
        return next(
          new ApiError(400, "invalid_account_id", "account_id must be a positive integer")
        );
      }
      const rows = await this.svc.list({ account_id });
      return Responder.send(
        req,
        res,
        { status: "success", subscriptions: rows },
        "subscriptions"
      );
    } catch (e) {
      return next(
        new ApiError(
          500,
          "failed_to_fetch_subscriptions",
          "Could not load subscriptions.",
          e.message
        )
      );
    }
  }

  async create(req, res, next) {
    try {
      const { account_id, quality, trial_days } = req.body || {};
      if (!account_id || !quality) {
        return next(
          new ApiError(
            400,
            "invalid_request",
            "account_id and quality are required."
          )
        );
      }

      const row = await this.svc.create({ account_id, quality, trial_days });
      return Responder.send(
        req,
        res,
        { status: "success", created: true, subscription_id: row?.subscription_id },
        "subscription",
        201
      );
    } catch (e) {
      const msg = e?.sqlMessage || e?.message;
      if (msg === "account_not_found") {
        return next(new ApiError(404, "account_not_found", "Account not found."));
      }
      if (msg === "invalid_quality") {
        return next(new ApiError(400, "invalid_quality", "Invalid subscription quality."));
      }
      if (msg === "active_subscription_exists") {
        return next(new ApiError(400, "active_subscription_exists", "Account already has an active subscription."));
      }
      return next(
        new ApiError(
          500,
          "failed_to_create_subscription",
          "Could not create subscription.",
          msg
        )
      );
    }
  }

  async changeQualityBody(req, res, next) {
  try {
    const { subscription_id, quality } = req.body || {};

    // validate presence
    if (subscription_id === undefined || quality === undefined) {
      return next(new ApiError(400, "invalid_request", "subscription_id and quality are required."));
    }

    // validate types/values
    const id = Number(subscription_id);
    if (!Number.isInteger(id) || id <= 0) {
      return next(new ApiError(400, "invalid_subscription_id", "subscription_id must be a positive integer."));
    }
    const q = String(quality).toUpperCase();
    if (!["SD", "HD", "UHD"].includes(q)) {
      return next(new ApiError(400, "invalid_quality", "quality must be SD|HD|UHD."));
    }

    const row = await this.svc.changeQuality({ subscription_id: id, quality: q });
    if (!row || Number(row.affected_rows || 0) === 0) {
      return next(new ApiError(404, "subscription_not_found", "No subscription found with that ID."));
    }

    return Responder.send(
      req,
      res,
      { status: "success", updated: true, subscription_id: id },
      "subscription"
    );
  } catch (e) {
    const msg = e?.sqlMessage || e?.message;
    if (msg === "invalid_quality") {
      return next(new ApiError(400, "invalid_quality", "Invalid subscription quality."));
    }
    if (msg === "subscription_not_found") {
      return next(new ApiError(404, "subscription_not_found", "No subscription found with that ID."));
    }
    return next(new ApiError(500, "failed_to_update_subscription", "Could not update subscription.", msg));
  }
}


  async cancel(req, res, next) {
    try {
      const subscription_id = Number(req.params.id);
      const ok = await this.svc.cancel(subscription_id);
      if (!ok) {
        return next(new ApiError(404, "subscription_not_found", "No subscription found with that ID."));
      }
      return Responder.send(
        req,
        res,
        { status: "success", cancelled: true, subscription_id },
        "subscription"
      );
    } catch (e) {
      return next(
        new ApiError(
          500,
          "failed_to_cancel_subscription",
          "Could not cancel subscription.",
          e.message
        )
      );
    }
  }
}

module.exports = { SubscriptionsController };
