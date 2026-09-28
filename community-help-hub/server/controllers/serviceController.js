const db=require("../config/db");
exports.list=(req,res)=>{
 const type=req.query.type;
 const where=type?"WHERE s.serviceType=?":"";
 db.all(`SELECT s.*,u.name providerName,u.phone providerPhone,u.location providerLocation,u.trustScore FROM services s LEFT JOIN users u ON u.id=s.providerId ${where} ORDER BY s.id DESC`,
  type?[type]:[],(e,rows)=>e?res.status(500).json({success:false,message:e.message}):res.json({success:true,services:rows}));
};
exports.create=(req,res)=>{
 const {name,category,description="",price=0,serviceType="paid"}=req.body;
 if(!name||!category)return res.status(400).json({success:false,message:"Service name and category are required."});
 db.run("INSERT INTO services(name,category,description,price,serviceType,providerId) VALUES(?,?,?,?,?,?)",[name,category,description,Number(price)||0,serviceType,req.user.id],function(e){
  if(e)return res.status(500).json({success:false,message:e.message});res.status(201).json({success:true,id:this.lastID});
 });
};
