function toNumber(v){ const n=Number(v); return Number.isFinite(n) ? n : null; }

function distanceKm(lat1, lon1, lat2, lon2){
  const a=toNumber(lat1), b=toNumber(lon1), c=toNumber(lat2), d=toNumber(lon2);
  if([a,b,c,d].some(v=>v===null)) return null;
  const R=6371;
  const p1=a*Math.PI/180, p2=c*Math.PI/180;
  const dp=(c-a)*Math.PI/180, dl=(d-b)*Math.PI/180;
  const x=Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

function isWithin(lat,lon,communityLat,communityLon,radiusKm=2){
  const distance=distanceKm(lat,lon,communityLat,communityLon);
  return {distanceKm: distance===null ? null : Number(distance.toFixed(2)), withinCommunity: distance!==null && distance <= Number(radiusKm||2)};
}

module.exports={distanceKm,isWithin};
