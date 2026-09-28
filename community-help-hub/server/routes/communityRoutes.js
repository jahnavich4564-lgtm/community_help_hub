const express=require("express");const router=express.Router();
const auth=require("../middleware/authMiddleware");const {optionalAuth}=auth;const c=require("../controllers/communityController");
router.get("/",optionalAuth,c.getCommunities);router.get("/:id",optionalAuth,c.getCommunity);router.post("/",auth,c.createCommunity);
router.put("/:id",auth,c.updateCommunity);router.delete("/:id",auth,c.deleteCommunity);
router.post("/:id/join",auth,c.joinCommunity);router.delete("/:id/leave",auth,c.leaveCommunity);
router.get("/:id/members",auth,c.getMembers);router.get("/:id/pending",auth,c.getPendingRequests);
router.put("/approve/:requestId",auth,c.approveRequest);router.put("/reject/:requestId",auth,c.rejectRequest);
router.get("/:id/stats",auth,c.communityStats);router.post("/:id/announcements",auth,c.createAnnouncement);
module.exports=router;