const { BaseService } = require("./base.service");

class ProfilesService extends BaseService {
  async listProfiles() {
    const result = await this.pool.query("CALL sp_get_account_profiles();");
    return this.unwrapCall(result);
  }

  async createProfile({ account_id, name, age, language, profile_photo }) {
    const result = await this.pool.query("CALL sp_create_profile(?,?,?,?,?);", [
      account_id,
      name,
      age,
      language,
      profile_photo
    ]);
    return this.unwrapCall(result)?.[0];
  }

  async updateProfile({ profile_id, name, age, language, profile_photo }) {
    const result = await this.pool.query("CALL sp_update_profile(?,?,?,?,?);", [
      profile_id,
      name,
      age,
      language,
      profile_photo
    ]);
    return this.unwrapCall(result)?.[0];
  }

  async deleteProfile(profile_id) {
    const result = await this.pool.query("CALL sp_delete_profile(?);", [profile_id]);
    const [rows, meta] = result;
    const first = rows?.[0]?.[0];
    if (first && (first.deleted === 1 || first.affected_rows === 1)) return true;
    const affected = Array.isArray(meta)
      ? meta.reduce((sum, pkt) => sum + (pkt?.affectedRows || 0), 0)
      : 0;
    return affected > 0;
  }
}

module.exports = { ProfilesService };
