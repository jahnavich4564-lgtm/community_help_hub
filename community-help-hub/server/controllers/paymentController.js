const db=require("../config/db");
exports.createPayment=(req,res)=>{
 const {bookingId,amount,paymentMethod="UPI"}=req.body;
 if(!bookingId||amount===undefined)return res.status(400).json({success:false,message:"Booking and amount are required."});
 db.get("SELECT * FROM bookings WHERE id=?",[bookingId],(err,b)=>{
  if(err)return res.status(500).json({success:false,message:err.message});
  if(!b)return res.status(404).json({success:false,message:"Booking not found."});
  if(b.requesterId!==req.user.id&&req.user.role!=="admin")return res.status(403).json({success:false,message:"Only the requester can pay."});
  const ref=`CHH-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  db.run(`INSERT INTO payments(bookingId,amount,paymentMethod,paymentStatus,transactionRef) VALUES(?,?,?,'Paid',?)`,
   [bookingId,Number(amount),paymentMethod,ref],function(e){
    if(e)return res.status(500).json({success:false,message:e.message});
    db.run("UPDATE bookings SET status='Confirmed' WHERE id=?",[bookingId]);
    db.run("INSERT INTO notifications(userId,type,title,message) VALUES(?,?,?,?)",[b.helperId,"Payment","Payment received",`Payment for booking #${bookingId} was completed.`]);
    res.status(201).json({success:true,paymentId:this.lastID,transactionRef:ref,message:"Payment successful."});
   });
 });
};
exports.getPayments=(req,res)=>{
 db.all(`SELECT p.*,b.service,b.requesterId,b.helperId FROM payments p JOIN bookings b ON b.id=p.bookingId
  WHERE b.requesterId=? OR b.helperId=? ORDER BY p.id DESC`,[req.user.id,req.user.id],(err,rows)=>{
   if(err)return res.status(500).json({success:false,message:err.message});res.json({success:true,payments:rows});
 });
};
