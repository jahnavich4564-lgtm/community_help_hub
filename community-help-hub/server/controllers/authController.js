const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const publicUser = (user) => ({
  id: user.id, name: user.name, email: user.email, phone: user.phone,
  location: user.location, role: user.role, skills: user.skills || "",
  available: Boolean(user.available), latitude: user.latitude, longitude: user.longitude,
  rating: user.rating ?? 5, trustScore: user.trustScore ?? 50,
  createdAt: user.createdAt
});

const tokenFor = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET || "community-help-hub-development-secret",
  { expiresIn: "7d" }
);

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone = "", location = "", skills = "", latitude = null, longitude = null } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required." });
    }
    if (password.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    if (latitude === null || longitude === null) return res.status(400).json({ success: false, message: "Live GPS location is required for registration." });
    db.get("SELECT id FROM users WHERE lower(email)=lower(?)", [email.trim()], async (err, existing) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (existing) return res.status(409).json({ success: false, message: "Email already registered." });
      const hash = await bcrypt.hash(password, 10);
      db.run(
        `INSERT INTO users(name,email,password,phone,location,skills,available,latitude,longitude,trustScore,locationUpdatedAt)
         VALUES(?,?,?,?,?,?,0,?,?,50,CURRENT_TIMESTAMP)`,
        [name.trim(), email.trim().toLowerCase(), hash, phone.trim(), location.trim(), skills.trim(), latitude, longitude],
        function (insertErr) {
          if (insertErr) return res.status(500).json({ success: false, message: insertErr.message });
          db.get("SELECT * FROM users WHERE id=?", [this.lastID], (e, user) => {
            if (e) return res.status(500).json({ success: false, message: e.message });
            res.status(201).json({ success: true, token: tokenFor(user), user: publicUser(user), message: "Registration successful." });
          });
        }
      );
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required." });
  db.get("SELECT * FROM users WHERE lower(email)=lower(?)", [email.trim()], async (err, user) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password." });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid email or password." });
    res.json({ success: true, token: tokenFor(user), user: publicUser(user), message: "Login successful." });
  });
};

exports.me = (req, res) => res.json({ success: true, user: publicUser(req.user) });
