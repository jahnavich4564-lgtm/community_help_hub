const db = require("../config/db");
const {isWithin}=require("../services/geo");

const notify=(userId,title,message,type="Community")=>db.run(
  `INSERT INTO notifications(userId,type,title,message) VALUES(?,?,?,?)`,
  [userId,type,title,message]
);

exports.createCommunity=(req,res)=>{
  const {name,category="General",description="",location="",latitude=null,longitude=null,radiusKm=2}=req.body;
  if(!name?.trim()||!description?.trim()||!location?.trim()) return res.status(400).json({success:false,message:"Name, description and live location are required."});
  db.run(`INSERT INTO communities(name,category,description,location,adminId,latitude,longitude,radiusKm) VALUES(?,?,?,?,?,?,?,?)`,
    [name.trim(),category,description.trim(),location.trim(),req.user.id,latitude,longitude,Number(radiusKm)||2],function(err){
      if(err)return res.status(500).json({success:false,message:err.message});
      const id=this.lastID;
      db.run(`INSERT OR IGNORE INTO community_members(communityId,userId,role) VALUES(?,?,?)`,[id,req.user.id,"admin"],()=>{
        notify(req.user.id,"Community created",`${name.trim()} is ready for your members.`);
        res.status(201).json({success:true,communityId:id,message:"Community created successfully."});
      });
    });
};

exports.getCommunities=(req,res)=>{
  const userId=req.user?.id||0;
  db.all(`SELECT c.*,u.name adminName,
    (SELECT COUNT(*) FROM community_members cm WHERE cm.communityId=c.id) memberCount,
    EXISTS(SELECT 1 FROM community_members cm2 WHERE cm2.communityId=c.id AND cm2.userId=?) isMember,
    (SELECT status FROM community_join_requests jr WHERE jr.communityId=c.id AND jr.userId=? ORDER BY jr.id DESC LIMIT 1) joinStatus
    FROM communities c LEFT JOIN users u ON u.id=c.adminId ORDER BY c.id DESC`,[userId,userId],(err,rows)=>{
      if(err)return res.status(500).json({success:false,message:err.message});
      res.json({success:true,communities:rows,total:rows.length});
    });
};

exports.getCommunity=(req,res)=>{
  const id=req.params.id,userId=req.user?.id||0;
  db.get(`SELECT c.*,u.name adminName,u.email adminEmail,
    (SELECT COUNT(*) FROM community_members cm WHERE cm.communityId=c.id) memberCount,
    EXISTS(SELECT 1 FROM community_members cm2 WHERE cm2.communityId=c.id AND cm2.userId=?) isMember,
    (SELECT status FROM community_join_requests jr WHERE jr.communityId=c.id AND jr.userId=? ORDER BY jr.id DESC LIMIT 1) joinStatus
    FROM communities c LEFT JOIN users u ON u.id=c.adminId WHERE c.id=?`,[userId,userId,id],(err,row)=>{
      if(err)return res.status(500).json({success:false,message:err.message});
      if(!row)return res.status(404).json({success:false,message:"Community not found."});
      db.all(`SELECT a.*,u.name adminName FROM announcements a JOIN users u ON u.id=a.adminId WHERE a.communityId=? ORDER BY a.id DESC LIMIT 10`,[id],(e,announcements)=>{
        if(e)return res.status(500).json({success:false,message:e.message});
        res.json({success:true,community:row,announcements});
      });
    });
};

exports.updateCommunity=(req,res)=>{
  const id=req.params.id;
  db.get("SELECT * FROM communities WHERE id=?",[id],(err,c)=>{
    if(err)return res.status(500).json({success:false,message:err.message});
    if(!c)return res.status(404).json({success:false,message:"Community not found."});
    if(c.adminId!==req.user.id&&req.user.role!=="admin")return res.status(403).json({success:false,message:"Only the community admin can update it."});
    const {name,category,description,location,status,latitude=null,longitude=null,radiusKm=c.radiusKm||2}=req.body;
    db.run(`UPDATE communities SET name=?,category=?,description=?,location=?,status=?,latitude=?,longitude=?,radiusKm=? WHERE id=?`,
      [name,category,description,location,status||"Active",latitude,longitude,Number(radiusKm)||2,id],e=>{
        if(e)return res.status(500).json({success:false,message:e.message});res.json({success:true,message:"Community updated."});
      });
  });
};
exports.deleteCommunity=(req,res)=>{
  db.get("SELECT adminId FROM communities WHERE id=?",[req.params.id],(err,c)=>{
    if(err)return res.status(500).json({success:false,message:err.message});
    if(!c)return res.status(404).json({success:false,message:"Community not found."});
    if(c.adminId!==req.user.id&&req.user.role!=="admin")return res.status(403).json({success:false,message:"Only the community admin can delete it."});
    db.run("DELETE FROM communities WHERE id=?",[req.params.id],e=>e?res.status(500).json({success:false,message:e.message}):res.json({success:true,message:"Community deleted."}));
  });
};

exports.joinCommunity=(req,res)=>{
  const communityId=req.params.id,userId=req.user.id;
  db.get("SELECT * FROM communities WHERE id=?",[communityId],(err,c)=>{
    if(err)return res.status(500).json({success:false,message:err.message});
    if(!c)return res.status(404).json({success:false,message:"Community not found."});
    const check=isWithin(req.user.latitude,req.user.longitude,c.latitude,c.longitude,c.radiusKm||2);
    db.get("SELECT 1 FROM community_members WHERE communityId=? AND userId=?",[communityId,userId],(e,m)=>{
      if(e)return res.status(500).json({success:false,message:e.message});
      if(m)return res.json({success:true,message:"You are already a member.",status:"Member",...check});
      if(check.distanceKm===null) return res.status(400).json({success:false,message:"Live GPS location is required before requesting to join this community. Please update your profile location."});
      db.get("SELECT * FROM community_join_requests WHERE communityId=? AND userId=? ORDER BY id DESC LIMIT 1",[communityId,userId],(e2,existing)=>{
        const done=err2=>{
          if(err2)return res.status(500).json({success:false,message:err2.message});
          db.get("SELECT adminId,name FROM communities WHERE id=?",[communityId],(e3,community)=>{
            if(!e3&&community?.adminId) notify(community.adminId,"New community join request",`${req.user.name} requested to join ${community.name}. Distance: ${check.distanceKm} km. Skills: ${req.user.skills||"Not provided"}.`);
          });
          res.json({success:true,message:"Join request sent. The admin will review your GPS location and skills.",status:"Pending",...check});
        };
        if(existing) return db.run("UPDATE community_join_requests SET status='Pending',requestedAt=CURRENT_TIMESTAMP,userLatitude=?,userLongitude=?,userLocation=? WHERE id=?",[req.user.latitude,req.user.longitude,req.user.location||"",existing.id,],done);
        db.run("INSERT INTO community_join_requests(communityId,userId,status,userLatitude,userLongitude,userLocation) VALUES(?,?, 'Pending',?,?,?)",[communityId,userId,req.user.latitude,req.user.longitude,req.user.location||""],done);
      });
    });
  });
};

exports.leaveCommunity=(req,res)=>db.run("DELETE FROM community_members WHERE communityId=? AND userId=?",[req.params.id,req.user.id],function(err){
  if(err)return res.status(500).json({success:false,message:err.message});res.json({success:true,message:"You left the community."});
});

exports.getMembers=(req,res)=>{
  db.get("SELECT * FROM communities WHERE id=?",[req.params.id],(err,c)=>{
    if(err)return res.status(500).json({success:false,message:err.message});if(!c)return res.status(404).json({success:false,message:"Community not found."});
    db.all(`SELECT cm.id,cm.role,cm.joinedAt,u.id userId,u.name,u.email,u.phone,u.skills,u.available,u.rating,u.trustScore,u.location,u.latitude,u.longitude
      FROM community_members cm JOIN users u ON u.id=cm.userId WHERE cm.communityId=? ORDER BY cm.joinedAt`,[req.params.id],(e,rows)=>{
      if(e)return res.status(500).json({success:false,message:e.message});
      rows=rows.map(r=>({...r,...isWithin(r.latitude,r.longitude,c.latitude,c.longitude,c.radiusKm||2)}));
      res.json({success:true,members:rows,total:rows.length});
    });
  });
};

exports.getPendingRequests=(req,res)=>{
  db.get("SELECT * FROM communities WHERE id=?",[req.params.id],(err,c)=>{
    if(err)return res.status(500).json({success:false,message:err.message});
    if(!c)return res.status(404).json({success:false,message:"Community not found."});
    if(c.adminId!==req.user.id&&req.user.role!=="admin")return res.status(403).json({success:false,message:"Admin access required."});
    db.all(`SELECT jr.*,u.name,u.email,u.phone,u.skills,u.location,u.latitude,u.longitude,u.rating,u.trustScore
      FROM community_join_requests jr JOIN users u ON u.id=jr.userId WHERE jr.communityId=? AND jr.status='Pending' ORDER BY jr.requestedAt DESC`,[req.params.id],(e,rows)=>{
      if(e)return res.status(500).json({success:false,message:e.message});
      rows=rows.map(r=>({...r,...isWithin(r.userLatitude??r.latitude,r.userLongitude??r.longitude,c.latitude,c.longitude,c.radiusKm||2)}));
      res.json({success:true,community:{id:c.id,name:c.name,location:c.location,latitude:c.latitude,longitude:c.longitude,radiusKm:c.radiusKm||2},requests:rows,total:rows.length});
    });
  });
};

exports.approveRequest=(req,res)=>{
  db.get(`SELECT jr.*,c.adminId,c.name communityName FROM community_join_requests jr JOIN communities c ON c.id=jr.communityId WHERE jr.id=?`,[req.params.requestId],(err,r)=>{
    if(err)return res.status(500).json({success:false,message:err.message});if(!r)return res.status(404).json({success:false,message:"Join request not found."});
    if(r.adminId!==req.user.id&&req.user.role!=="admin")return res.status(403).json({success:false,message:"Admin access required."});
    db.get("SELECT * FROM users WHERE id=?",[r.userId],(e,u)=>{
      if(e)return res.status(500).json({success:false,message:e.message});
      db.get("SELECT * FROM communities WHERE id=?",[r.communityId],(e2,c)=>{
        if(e2)return res.status(500).json({success:false,message:e2.message});
        const check=isWithin(r.userLatitude??u.latitude,r.userLongitude??u.longitude,c.latitude,c.longitude,c.radiusKm||2);
        db.serialize(()=>{
          db.run("UPDATE community_join_requests SET status='Approved' WHERE id=?",[req.params.requestId]);
          db.run("INSERT OR IGNORE INTO community_members(communityId,userId,role) VALUES(?,?,?)",[r.communityId,r.userId,"member"],e3=>{
            if(e3)return res.status(500).json({success:false,message:e3.message});
            notify(r.userId,"Community request approved",`You are now a member of ${r.communityName}.`);
            res.json({success:true,message:"Member approved.",withinCommunity:check.withinCommunity,distanceKm:check.distanceKm});
          });
        });
      });
    });
  });
};
exports.rejectRequest=(req,res)=>{
  db.get(`SELECT jr.*,c.adminId FROM community_join_requests jr JOIN communities c ON c.id=jr.communityId WHERE jr.id=?`,[req.params.requestId],(err,r)=>{
    if(err)return res.status(500).json({success:false,message:err.message});if(!r)return res.status(404).json({success:false,message:"Request not found."});
    if(r.adminId!==req.user.id&&req.user.role!=="admin")return res.status(403).json({success:false,message:"Admin access required."});
    db.run("UPDATE community_join_requests SET status='Rejected' WHERE id=?",[req.params.requestId],e=>{
      if(e)return res.status(500).json({success:false,message:e.message});notify(r.userId,"Community request rejected","Your community join request was not approved.");res.json({success:true,message:"Request rejected."});
    });
  });
};
exports.communityStats=(req,res)=>{
  const id=req.params.id;db.get(`SELECT (SELECT COUNT(*) FROM community_members WHERE communityId=?) totalMembers,(SELECT COUNT(*) FROM community_join_requests WHERE communityId=? AND status='Pending') pendingRequests,(SELECT COUNT(*) FROM help_requests WHERE communityId=?) helpRequests,(SELECT COUNT(*) FROM help_requests WHERE communityId=? AND status='Completed') completedRequests`,[id,id,id,id],(err,stats)=>err?res.status(500).json({success:false,message:err.message}):res.json({success:true,stats}));
};
exports.createAnnouncement=(req,res)=>{
  const {title,message}=req.body,communityId=req.params.id;if(!title?.trim()||!message?.trim())return res.status(400).json({success:false,message:"Title and message are required."});
  db.get("SELECT adminId FROM communities WHERE id=?",[communityId],(err,c)=>{
    if(err)return res.status(500).json({success:false,message:err.message});if(!c)return res.status(404).json({success:false,message:"Community not found."});if(c.adminId!==req.user.id&&req.user.role!=="admin")return res.status(403).json({success:false,message:"Admin access required."});
    db.run("INSERT INTO announcements(communityId,adminId,title,message) VALUES(?,?,?,?)",[communityId,req.user.id,title.trim(),message.trim()],function(e){
      if(e)return res.status(500).json({success:false,message:e.message});db.all("SELECT userId FROM community_members WHERE communityId=?",[communityId],(e2,members)=>{if(!e2)members.forEach(m=>notify(m.userId,title.trim(),message.trim()));res.status(201).json({success:true,id:this.lastID,message:"Announcement published."});});
    });
  });
};
