const jwt = require("jsonwebtoken");
const db = require("../config/db");

const verifyToken = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return res.status(401).json({ success:false, message:"Please login first." });
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET || "community-help-hub-development-secret");
    db.get("SELECT * FROM users WHERE id=?", [decoded.id], (err, user) => {
      if (err) return res.status(500).json({ success:false, message:err.message });
      if (!user) return res.status(401).json({ success:false, message:"User account not found." });
      req.user = user;
      next();
    });
  } catch {
    return res.status(401).json({ success:false, message:"Invalid or expired login session." });
  }
};

const optionalAuth = (req,res,next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next();
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET || "community-help-hub-development-secret");
    db.get("SELECT * FROM users WHERE id=?", [decoded.id], (err,user) => {
      if (!err && user) req.user = user;
      next();
    });
  } catch { next(); }
};

const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ success:false, message:"Admin access only." });
  next();
};

module.exports = verifyToken;
module.exports.verifyAdmin = verifyAdmin;

module.exports.optionalAuth = optionalAuth;
