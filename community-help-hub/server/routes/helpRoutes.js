const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const c = require("../controllers/helpController");
const auth = require("../middleware/authMiddleware");

const uploadDir = path.join(__dirname, "../uploads/help");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4"
    ];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith("audio/")) cb(null, true);
    else cb(new Error("Unsupported attachment type."));
  }
});

router.post("/", auth, upload.array("attachments", 5), c.createHelp);
router.get("/", c.getAllHelp);
router.get("/open", c.getOpenHelp);
router.get("/mine", auth, c.getMyHelp);
router.get("/connection/:id", auth, c.getConnection);
router.get("/recommended", auth, c.getRecommendedForHelper);
router.get("/matched", auth, c.getMatchedForHelper);
router.post("/match", auth, c.match);
router.put("/accept/:id", auth, c.acceptHelp);
router.put("/decline/:id", auth, c.declineHelp);
router.put("/resolve/:id", auth, c.resolveHelp);

module.exports = router;
