const db=require("../config/db");
const {isWithin}=require("../services/geo");
exports.getDashboardStats=(req,res)=>{
 const q={},queries=[
  ["totalUsers","SELECT COUNT(*) n FROM users"],["totalCommunities","SELECT COUNT(*) n FROM communities"],["totalVolunteers","SELECT COUNT(*) n FROM users WHERE available=1"],["totalHelpRequests","SELECT COUNT(*) n FROM help_requests"],
  ["totalOpenRequests","SELECT COUNT(*) n FROM help_requests WHERE status='Open'"],["totalEmergencies","SELECT COUNT(*) n FROM help_requests WHERE urgency IN ('High','Critical') AND status<>'Completed'"],["totalBookings","SELECT COUNT(*) n FROM bookings"],["totalPayments","SELECT COALESCE(SUM(amount),0) n FROM payments WHERE paymentStatus='Paid'"],["pendingMembers","SELECT COUNT(*) n FROM community_join_requests WHERE status='Pending'"]
 ];let i=0;const next=()=>{if(i===queries.length)return res.json({success:true,stats:q});const[k,sql]=queries[i++];db.get(sql,[],(e,r)=>{if(e)return res.status(500).json({success:false,message:e.message});q[k]=r.n;next();});};next();
};
exports.getRecentRequests=(req,res)=>db.all(`SELECT h.*,COALESCE(h.adminStatus,'Pending') adminStatus,u.name requesterName,hu.name helperName,c.name communityName FROM help_requests h JOIN users u ON u.id=h.userId LEFT JOIN users hu ON hu.id=h.helperId LEFT JOIN communities c ON c.id=h.communityId ORDER BY h.id DESC LIMIT 20`,[],(e,r)=>e?res.status(500).json({success:false,message:e.message}):res.json({success:true,requests:r}));
exports.getRecentBookings=(req,res)=>db.all(`SELECT b.*,r.name requesterName,h.name helperName FROM bookings b JOIN users r ON r.id=b.requesterId JOIN users h ON h.id=b.helperId ORDER BY b.id DESC LIMIT 20`,[],(e,r)=>e?res.status(500).json({success:false,message:e.message}):res.json({success:true,bookings:r}));
exports.getRecentPayments=(req,res)=>db.all(`SELECT p.*,b.service FROM payments p JOIN bookings b ON b.id=p.bookingId ORDER BY p.id DESC LIMIT 20`,[],(e,r)=>e?res.status(500).json({success:false,message:e.message}):res.json({success:true,payments:r}));
exports.getUsers=(req,res)=>db.all(`SELECT id,name,email,phone,role,location,skills,available,rating,trustScore,latitude,longitude,locationUpdatedAt,createdAt FROM users ORDER BY id DESC`,[],(e,r)=>e?res.status(500).json({success:false,message:e.message}):res.json({success:true,users:r}));
exports.getJoinRequests=(req,res)=>db.all(`SELECT jr.*,u.name,u.email,u.phone,u.skills,u.location,u.latitude,u.longitude,u.rating,u.trustScore,c.name communityName,c.location communityLocation,c.latitude communityLatitude,c.longitude communityLongitude,c.radiusKm,c.adminId
 FROM community_join_requests jr JOIN users u ON u.id=jr.userId JOIN communities c ON c.id=jr.communityId WHERE jr.status='Pending' ORDER BY jr.requestedAt DESC`,[],(e,rows)=>{
  if(e)return res.status(500).json({success:false,message:e.message});rows=rows.map(r=>({...r,...isWithin(r.userLatitude??r.latitude,r.userLongitude??r.longitude,r.communityLatitude,r.communityLongitude,r.radiusKm||2)}));res.json({success:true,requests:rows});
});
