const db=require("../config/db");
exports.getProfile=(req,res)=>{const {password,...user}=req.user;res.json({success:true,user});};
exports.updateProfile=(req,res)=>{
 const {name,phone,location,skills,available,latitude,longitude}=req.body;
 db.run(`UPDATE users SET name=?,phone=?,location=?,skills=?,available=?,latitude=?,longitude=?,locationUpdatedAt=CURRENT_TIMESTAMP WHERE id=?`,
  [name?.trim()||req.user.name,phone||"",location||"",skills||"",available?1:0,latitude??null,longitude??null,req.user.id],function(err){
   if(err)return res.status(500).json({success:false,message:err.message});
   db.get("SELECT * FROM users WHERE id=?",[req.user.id],(e,u)=>{if(e)return res.status(500).json({success:false,message:e.message});res.json({success:true,user:u,message:"Profile updated."});});
 });
};
exports.getHelpers=(req,res)=>{
 db.all(`SELECT id,name,phone,location,skills,available,rating,trustScore,latitude,longitude FROM users WHERE id<>? AND available=1 ORDER BY trustScore DESC,rating DESC`,[req.user.id],(err,rows)=>{
  if(err)return res.status(500).json({success:false,message:err.message});res.json({success:true,helpers:rows});
 });
};
exports.getChatContacts=(req,res)=>{
 db.all(`SELECT u.id,u.name,u.email,u.phone,u.location,u.skills,u.available,u.rating,u.trustScore,u.latitude,u.longitude,
   EXISTS(SELECT 1 FROM messages m WHERE (m.senderId=? AND m.receiverId=u.id) OR (m.senderId=u.id AND m.receiverId=?)) hasConversation,
   (SELECT COUNT(*) FROM community_members cm JOIN community_members me ON me.communityId=cm.communityId WHERE cm.userId=u.id AND me.userId=?) sharedCommunity
   FROM users u WHERE u.id<>? AND (u.available=1 OR EXISTS(SELECT 1 FROM messages m2 WHERE (m2.senderId=? AND m2.receiverId=u.id) OR (m2.senderId=u.id AND m2.receiverId=?)) OR EXISTS(SELECT 1 FROM community_members cm2 JOIN community_members me2 ON me2.communityId=cm2.communityId WHERE cm2.userId=u.id AND me2.userId=?))
   ORDER BY hasConversation DESC,sharedCommunity DESC,u.name COLLATE NOCASE`,
   [req.user.id,req.user.id,req.user.id,req.user.id,req.user.id,req.user.id,req.user.id],(err,rows)=>{
    if(err)return res.status(500).json({success:false,message:err.message});res.json({success:true,contacts:rows});
   });
};
exports.review=(req,res)=>{
 const {bookingId,rating,comment=""}=req.body; const revieweeId=Number(req.params.userId);
 if(Number(rating)<1||Number(rating)>5)return res.status(400).json({success:false,message:"Rating must be 1 to 5."});
 db.run("INSERT INTO reviews(bookingId,reviewerId,revieweeId,rating,comment) VALUES(?,?,?,?,?)",[bookingId||null,req.user.id,revieweeId,rating,comment],function(err){
  if(err)return res.status(500).json({success:false,message:err.message});db.get("SELECT AVG(rating) rating,COUNT(*) count FROM reviews WHERE revieweeId=?",[revieweeId],(e,s)=>{if(e)return res.status(500).json({success:false,message:e.message});db.run("UPDATE users SET rating=?,trustScore=MIN(100,MAX(0,trustScore + (? - 3)*5)) WHERE id=?",[Number(s.rating||5).toFixed(2),Number(rating)-3,revieweeId]);res.status(201).json({success:true,message:"Review submitted."});});
 });
};
