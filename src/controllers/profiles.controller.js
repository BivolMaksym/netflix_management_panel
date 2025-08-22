const { BaseController } = require("./base.controller");
const { ApiError } = require("../utils/apiError");
const { Responder } = require("../utils/responder");
const { ProfilesService } = require("../services/profiles.service");

class ProfilesController extends BaseController {
  constructor() {
    super();
    this.svc = new ProfilesService();

    this.list = this.list.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
  }

  async list(req, res, next) {
    try {
      const rows = await this.svc.listProfiles();
      return Responder.send(req, res, { status: "success", profiles: rows }, "profiles");
    } catch (e) {
      return next(new ApiError(500, "failed_to_fetch_profiles", "Could not load profiles.", e.message));
    }
  }

  async create(req, res, next) {
  try {
    const { account_id, name, age, language = "EN", profile_photo = null } = req.body || {};
    if (!account_id || !name || age === undefined) {
      return next(new ApiError(400, "invalid_request", "account_id, name and age are required."));
    }
    if (!Number.isInteger(Number(age)) || Number(age) < 0) {
      return next(new ApiError(400, "invalid_age", "age must be a non-negative integer."));
    }

    const saved = await this.svc.createProfile({
      account_id: Number(account_id),
      name: String(name),
      age: Number(age),
      language: String(language),
      profile_photo: profile_photo ? String(profile_photo) : null
    });

    return res.status(201).json({ status: "success", created: true, profile_id: saved?.profile_id });
  } catch (e) {
    return next(new ApiError(500, "failed_to_create_profile", "Could not create profile.", e.message));
  }
}

async update(req, res, next) {
  try {
    const profile_id = Number(req.params.id);
    if (!Number.isInteger(profile_id) || profile_id <= 0) {
      return next(new ApiError(400, "invalid_profile_id", "Valid profile_id is required."));
    }

    const { name, age, language = "EN", profile_photo = null } = req.body || {};
    if (!name || age === undefined) {
      return next(new ApiError(400, "invalid_request", "name and age are required."));
    }
    if (!Number.isInteger(Number(age)) || Number(age) < 0) {
      return next(new ApiError(400, "invalid_age", "age must be a non-negative integer."));
    }

    const saved = await this.svc.updateProfile({
      profile_id,
      name: String(name),
      age: Number(age),
      language: String(language),
      profile_photo: profile_photo ? String(profile_photo) : null
    });

    return res.status(200).json({ status: "success", updated: true, profile_id: saved?.profile_id || profile_id });
  } catch (e) {
    return next(new ApiError(500, "failed_to_update_profile", "Could not update profile.", e.message));
  }
}

  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return next(new ApiError(400, "invalid_profile_id", "Valid profile_id is required."));
      }

      const deleted = await this.svc.deleteProfile(id);
      if (!deleted) {
        return next(new ApiError(404, "profile_not_found", "No profile found with that ID."));
      }

      return res.status(200).json({ status: "success", deleted: true, profile_id: id });
    } catch (e) {
      return next(new ApiError(500, "failed_to_delete_profile", "Could not delete profile.", e.message));
    }
  }
}

module.exports = { ProfilesController };
