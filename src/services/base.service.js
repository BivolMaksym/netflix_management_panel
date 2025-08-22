const { pool } = require("../../db");

class BaseService {
  get pool() {
    return pool;
  }

  unwrapCall(result) {
    const [sets] = result;
    return sets?.[0] || [];
  }
}

module.exports = { BaseService };
