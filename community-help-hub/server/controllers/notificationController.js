const db=require("../config/db");
exports.list=(req,res)=>db.all("SELECT * FROM notifications WHERE userId=? ORDER BY id DESC",[req.user.id],(e,rows)=>e?res.status(500).json({success:false,message:e.message}):res.json({success:true,notifications:rows}));
exports.read=(req,res)=>db.run("UPDATE notifications SET isRead=1 WHERE id=? AND userId=?",[req.params.id,req.user.id],function(e){if(e)return res.status(500).json({success:false,message:e.message});res.json({success:true})});
exports.readAll=(req,res)=>db.run("UPDATE notifications SET isRead=1 WHERE userId=?",[req.user.id],e=>e?res.status(500).json({success:false,message:e.message}):res.json({success:true}));
