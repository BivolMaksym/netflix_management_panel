const { BaseController } = require("./base.controller");
const { ApiError } = require("../utils/apiError");
const { Responder } = require("../utils/responder");
const { MediaService } = require("../services/media.service");

class MediaController extends BaseController {
  constructor() {
    super();
    this.svc = new MediaService();
    this.list = this.list.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.remove = this.remove.bind(this);
  }

  async list(req, res, next) {
    try {
      const rows = await this.svc.listCatalog();
      return Responder.send(req, res, rows, "media");
    } catch (e) {
      return next(new ApiError(500, "failed_to_fetch_media", "Could not load media catalog.", e.message));
    }
  }

  async create(req, res, next) {
    try {
      const { media_title, media_type, duration_seconds, media_description = null, release_date = null, genre = null, quality = null, age_rating = null } = req.body || {};

      if (!media_title) return next(new ApiError(400, "missing_media_title", "media_title is required."));
      if (!["movie","series","episode"].includes(String(media_type))) {
        return next(new ApiError(400, "invalid_media_type", "media_type must be movie|series|episode."));
      }
      const dur = Number(duration_seconds);
      if (!Number.isInteger(dur) || dur <= 0) {
        return next(new ApiError(400, "invalid_duration_seconds", "duration_seconds must be a positive integer."));
      }
      if (quality && !["SD","HD","UHD"].includes(String(quality).toUpperCase())) {
        return next(new ApiError(400, "invalid_quality", "quality must be SD|HD|UHD when provided."));
      }
      if (age_rating !== null && !Number.isInteger(Number(age_rating))) {
        return next(new ApiError(400, "invalid_age_rating", "age_rating must be an integer."));
      }

      const saved = await this.svc.upsertMedia({
        media_id: null,
        media_title,
        media_type,
        duration_seconds: dur,
        media_description,
        release_date,
        genre,
        quality: quality ? String(quality).toUpperCase() : null,
        age_rating: age_rating !== null ? Number(age_rating) : null
      });

      return Responder.send(req, res, { created: true, media_id: saved?.media_id }, "result");
    } catch (e) {
      return next(new ApiError(500, "failed_to_create_media", "Could not create media.", e.message));
    }
  }

  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return next(new ApiError(400, "invalid_media_id", "Valid media_id is required."));
      }

      const { media_title, media_type, duration_seconds, media_description = null, release_date = null, genre = null, quality = null, age_rating = null } = req.body || {};

      if (!media_title) return next(new ApiError(400, "missing_media_title", "media_title is required."));
      if (!["movie","series","episode"].includes(String(media_type))) {
        return next(new ApiError(400, "invalid_media_type", "media_type must be movie|series|episode."));
      }
      const dur = Number(duration_seconds);
      if (!Number.isInteger(dur) || dur <= 0) {
        return next(new ApiError(400, "invalid_duration_seconds", "duration_seconds must be a positive integer."));
      }
      if (quality && !["SD","HD","UHD"].includes(String(quality).toUpperCase())) {
        return next(new ApiError(400, "invalid_quality", "quality must be SD|HD|UHD when provided."));
      }
      if (age_rating !== null && !Number.isInteger(Number(age_rating))) {
        return next(new ApiError(400, "invalid_age_rating", "age_rating must be an integer."));
      }

      const saved = await this.svc.upsertMedia({
        media_id: id,
        media_title,
        media_type,
        duration_seconds: dur,
        media_description,
        release_date,
        genre,
        quality: quality ? String(quality).toUpperCase() : null,
        age_rating: age_rating !== null ? Number(age_rating) : null
      });

      return Responder.send(req, res, { updated: true, media_id: saved?.media_id || id }, "result");
    } catch (e) {
      return next(new ApiError(500, "failed_to_update_media", "Could not update media.", e.message));
    }
  }

  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return next(new ApiError(400, "invalid_media_id", "Valid media_id is required."));
      }

      const deleted = await this.svc.deleteMedia(id);
      if (!deleted) {
        return next(new ApiError(404, "media_not_found", "No media found with that ID."));
      }

      return res.status(200).json({ status: "success", deleted: true, media_id: id });
    } catch (e) {
      return next(new ApiError(500, "failed_to_delete_media", "Could not delete media.", e.message));
    }
  }
}
module.exports = { MediaController };
