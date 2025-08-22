const { BaseService } = require("./base.service");

class MediaService extends BaseService {
  async listCatalog() {
    const result = await this.pool.query("CALL sp_get_media_catalog();");
    return this.unwrapCall(result);
  }

  async upsertMedia(payload) {
    const args = [
      payload.media_id,
      payload.media_title,
      payload.media_type,
      payload.duration_seconds,
      payload.media_description,
      payload.release_date,
      payload.genre,
      payload.quality,    // SD|HD|UHD or null
      payload.age_rating
    ];
    const result = await this.pool.query("CALL sp_upsert_media(?, ?, ?, ?, ?, ?, ?, ?, ?);", args);
    const rows = this.unwrapCall(result);
    return rows?.[0] || null; 
  }

  async deleteMedia(media_id) {
  const result = await this.pool.query("CALL sp_delete_media(?);", [media_id]);
  const rows = this.unwrapCall(result);
  // convention: return true if proc affected a row
  return rows?.affected_rows > 0 || rows?.[0]?.deleted === 1 || false;
}

}

module.exports = { MediaService };
