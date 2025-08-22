const jwt = require("jsonwebtoken");

class Auth {
  static sign(user) {
    return jwt.sign(
      { id: user.management_account_id, email: user.email },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn: "1h" }
    );
  }

  static middleware(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({
        status: 401,
        error: "missing_authorization",
        message: "Authorization header 'Bearer <token>' is required."
      });
    }
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
      next();
    } catch {
      return res.status(401).json({
        status: 401,
        error: "invalid_or_expired_token",
        message: "The provided token is invalid or has expired."
      });
    }
  }
}

module.exports = { Auth };
