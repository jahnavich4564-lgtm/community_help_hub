const db=require("../config/db");
const notify=(uid,title,message,type="Community")=>db.run("INSERT INTO notifications(userId,type,title,message) VALUES(?,?,?,?)",[uid,type,title,message]);

exports.createBooking=(req,res)=>{
 const {helperId,serviceName,serviceId,bookingDate,bookingTime="10:00",notes="",amount=0}=req.body;
 if(!helperId||!serviceName||!bookingDate)return res.status(400).json({success:false,message:"Helper, service and date are required."});
 db.get("SELECT id,name FROM users WHERE id=?",[helperId],(err,h)=>{
  if(err)return res.status(500).json({success:false,message:err.message});
  if(!h)return res.status(404).json({success:false,message:"Service provider not found."});
  db.run(`INSERT INTO bookings(requesterId,helperId,service,bookingDate,bookingTime,notes,amount,status) VALUES(?,?,?,?,?,?,?,'Pending')`,
   [req.user.id,helperId,serviceName,bookingDate,bookingTime,notes,Number(amount)||0],function(e){
    if(e)return res.status(500).json({success:false,message:e.message});
    notify(helperId,"New service booking",`${req.user.name} booked ${serviceName} for ${bookingDate}.`,"Community");
    const id=this.lastID; res.status(201).json({success:true,bookingId:id,bookingCode:`CHH-${String(id).padStart(6,"0")}`,message:"Booking created."});
   });
 });
};
exports.getBookings=(req,res)=>{
 db.all(`SELECT b.*,r.name requesterName,h.name helperName FROM bookings b JOIN users r ON r.id=b.requesterId JOIN users h ON h.id=b.helperId
  WHERE b.requesterId=? OR b.helperId=? ORDER BY b.id DESC`,[req.user.id,req.user.id],(err,rows)=>{
  if(err)return res.status(500).json({success:false,message:err.message});res.json({success:true,bookings:rows.map(b=>({...b,bookingCode:`CHH-${String(b.id).padStart(6,"0")}`}))});
 });
};
exports.updateBooking=(req,res)=>{
 const {status}=req.body;
 if(!["Pending","Confirmed","Completed","Cancelled"].includes(status))return res.status(400).json({success:false,message:"Invalid booking status."});
 db.get("SELECT * FROM bookings WHERE id=?",[req.params.id],(err,b)=>{
  if(err)return res.status(500).json({success:false,message:err.message});
  if(!b)return res.status(404).json({success:false,message:"Booking not found."});
  if(b.requesterId!==req.user.id&&b.helperId!==req.user.id&&req.user.role!=="admin")return res.status(403).json({success:false,message:"Not authorized."});
  db.run("UPDATE bookings SET status=? WHERE id=?",[status,b.id],e=>{
   if(e)return res.status(500).json({success:false,message:e.message});
   const other=b.requesterId===req.user.id?b.helperId:b.requesterId;notify(other,"Booking updated",`Booking #${b.id} is now ${status}.`);
   res.json({success:true,message:"Booking updated."});
  });
 });
};
