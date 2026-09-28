const db=require("../config/db");
exports.list=(req,res)=>{
 const other=Number(req.params.userId);
 db.all(`SELECT m.*,s.name senderName,r.name receiverName FROM messages m JOIN users s ON s.id=m.senderId JOIN users r ON r.id=m.receiverId
  WHERE (m.senderId=? AND m.receiverId=?) OR (m.senderId=? AND m.receiverId=?) ORDER BY m.id`,
  [req.user.id,other,other,req.user.id],(e,rows)=>e?res.status(500).json({success:false,message:e.message}):res.json({success:true,messages:rows}));
};
exports.send=(req,res)=>{
 const receiverId=Number(req.params.userId),message=req.body.message?.trim();
 if(!message)return res.status(400).json({success:false,message:"Message cannot be empty."});
 db.get("SELECT id FROM users WHERE id=?",[receiverId],(e,u)=>{
  if(e)return res.status(500).json({success:false,message:e.message});if(!u)return res.status(404).json({success:false,message:"User not found."});
  db.run("INSERT INTO messages(senderId,receiverId,message,attachment) VALUES(?,?,?,?)",[req.user.id,receiverId,message,req.body.attachment||null],function(err){
   if(err)return res.status(500).json({success:false,message:err.message});
   db.run("INSERT INTO notifications(userId,type,title,message) VALUES(?,?,?,?)",[receiverId,"Community",`New message from ${req.user.name}`,message]);
   res.status(201).json({success:true,id:this.lastID});
  });
 });
};
