const express=require("express");const r=express.Router();const c=require("../controllers/userController");const auth=require("../middleware/authMiddleware");
r.get("/profile",auth,c.getProfile);r.put("/profile",auth,c.updateProfile);r.get("/helpers",auth,c.getHelpers);r.get("/chat-contacts",auth,c.getChatContacts);r.post("/review/:userId",auth,c.review);module.exports=r;
