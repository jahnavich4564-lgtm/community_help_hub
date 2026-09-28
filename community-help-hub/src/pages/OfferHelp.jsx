import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { api, errorMessage } from "../api";
import { HeartHandshake, Save, BrainCircuit, MapPin, Phone, HandHeart, Link2, Clock3, UserRound, CheckCircle, MessageCircle, RefreshCw, XCircle } from "lucide-react";
import GeoLocation from "../components/GeoLocation";

export default function OfferHelp() {
  const [f, setF] = useState({ skills: "", location: "", available: false, latitude: null, longitude: null });
  const [recommendations, setRecommendations] = useState([]);
  const [matchedRequests, setMatchedRequests] = useState([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(null);

  const load = async () => {
    try { const r = await api.get("/users/profile"); const u = r.data.user; setF({skills:u.skills||"",location:u.location||"",available:Boolean(u.available),latitude:u.latitude,longitude:u.longitude}); localStorage.setItem("chh_user",JSON.stringify(u)); } catch(e) { setMsg(errorMessage(e)); }
  };
  const loadRecommendations = () => api.get("/help/recommended").then(r=>setRecommendations(r.data.requests||[])).catch(()=>{});
  const loadMatched = () => api.get("/help/matched").then(r=>setMatchedRequests(r.data.requests||[])).catch(()=>{});

  useEffect(() => { load(); loadRecommendations(); loadMatched(); const timer=setInterval(()=>{loadRecommendations();loadMatched()},2000); return()=>clearInterval(timer); },[]);
  useEffect(() => { if(f.available){loadRecommendations();loadMatched();} else {setRecommendations([]);setMatchedRequests([]);} },[f.available,f.latitude,f.longitude]);

  const save = async e => { e.preventDefault(); setMsg(""); setSaving(true); try { if(f.latitude==null||f.longitude==null) throw new Error("Capture your live GPS location before offering help."); const r=await api.put("/users/profile",f); localStorage.setItem("chh_user",JSON.stringify(r.data.user)); setMsg("Helper profile active. AI is now watching for local connection requests."); await Promise.all([loadRecommendations(),loadMatched()]); } catch(e){setMsg(errorMessage(e));} finally{setSaving(false);} };
  const accept = async id => { setConnecting(id); try { const r=await api.put(`/help/accept/${id}`); setMsg(r.data.message||"Connected to the requester."); await Promise.all([loadRecommendations(),loadMatched()]); } catch(e){setMsg(errorMessage(e));} finally{setConnecting(null);} };
  const decline = async id => {
    setConnecting(id);
    try {
      const r = await api.put(`/help/decline/${id}`, { reason: "Helper declined this request." });
      setMsg(r.data.message || "Declined. AI is looking for another nearby helper.");
      await Promise.all([loadRecommendations(), loadMatched()]);
    } catch(e) { setMsg(errorMessage(e)); }
    finally { setConnecting(null); }
  };

  return <Layout><div className="max-w-7xl mx-auto grid lg:grid-cols-[.85fr_1.15fr] gap-6">
    <section className="bg-white rounded-3xl shadow-sm border p-7 md:p-8"><div className="flex gap-3 items-center"><HeartHandshake className="text-green-600" size={35}/><div><h1 className="text-3xl font-black">Offer Help</h1><p className="text-gray-500">Set your skills and live location. AI will connect you to eligible nearby requests.</p></div></div><form onSubmit={save} className="space-y-4 mt-7"><textarea className="field min-h-32" placeholder="Skills: medicine delivery, tutoring, transport, food support…" value={f.skills} onChange={e=>setF({...f,skills:e.target.value})}/><input className="field" placeholder="Area / landmark" value={f.location} onChange={e=>setF({...f,location:e.target.value})}/><GeoLocation value={f} onChange={x=>setF({...f,...x})}/><label className="flex items-center gap-3 p-4 bg-green-50 rounded-xl"><input type="checkbox" checked={f.available} onChange={e=>setF({...f,available:e.target.checked})}/><span><b>I am currently available to help</b><br/><small className="text-gray-600">Only real-GPS requests inside the 1.5 km local AI radius are eligible.</small></span></label>{msg&&<p className="text-green-700 bg-green-50 p-3 rounded-xl">{msg}</p>}<button disabled={saving} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold"><Save className="inline mr-2" size={18}/>{saving?"Saving…":"Save Helper Profile"}</button></form></section>

    <section className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-950 to-blue-950 text-white rounded-3xl shadow p-7"><div className="flex items-center gap-2"><Link2 className="text-cyan-300"/><h2 className="text-2xl font-black">AI Connection Center</h2></div><p className="text-blue-100 text-sm mt-1">Matched requests stay here until you connect with the requester.</p><div className="space-y-4 mt-5">
        {!f.available&&<div className="bg-white/10 rounded-2xl p-4 text-sm text-blue-100">Turn on <b>Available to help</b> to receive live AI connections.</div>}
        {f.available&&matchedRequests.map(m=><div key={m.request.id} className="bg-white text-gray-900 rounded-2xl p-5 border-2 border-cyan-200 shadow-sm"><div className="flex items-start gap-3"><div className="w-11 h-11 rounded-full bg-cyan-100 flex items-center justify-center"><UserRound className="text-cyan-700"/></div><div className="flex-1"><p className="text-xs uppercase font-bold text-cyan-700">Requester needs your help</p><h3 className="font-black text-lg mt-1">{m.request.requesterName}</h3><p className="text-sm text-gray-600 mt-1">{m.request.title}</p></div><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${m.request.status==="Accepted"?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}`}>{m.connectionStatus}</span></div><div className="mt-4 grid sm:grid-cols-3 gap-2 text-xs"><div className="bg-gray-50 rounded-xl p-3"><MapPin size={13} className="inline mr-1"/> {m.distanceKm==null?"GPS unavailable":`${Number(m.distanceKm).toFixed(2)} km away`}</div><div className="bg-gray-50 rounded-xl p-3">{m.request.category}</div><div className="bg-gray-50 rounded-xl p-3 font-semibold">{m.request.urgency}</div></div><p className="text-sm text-gray-700 mt-4">{m.request.description}</p>{m.request.voiceTranscript&&<p className="text-xs bg-purple-50 text-purple-800 rounded-xl p-3 mt-3"><b>Voice/NLP:</b> {m.request.voiceTranscript}</p>}<div className="flex flex-wrap gap-2 mt-4">{m.request.status!=="Accepted"&&<><button disabled={connecting===m.request.id} onClick={()=>accept(m.request.id)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold disabled:opacity-60"><HandHeart size={16}/>{connecting===m.request.id?"Connecting…":"Accept & Connect"}</button><button disabled={connecting===m.request.id} onClick={()=>decline(m.request.id)} className="border border-red-200 text-red-700 px-4 py-2.5 rounded-xl flex items-center gap-2 font-semibold disabled:opacity-60"><XCircle size={16}/>Decline</button></>}<Link to="/chat" state={{helper:{id:m.request.userId,name:m.request.requesterName,phone:m.request.requesterPhone}}} className="border px-4 py-2.5 rounded-xl font-semibold flex items-center gap-1"><MessageCircle size={15}/> Chat</Link>{m.request.requesterPhone&&<a href={`tel:${m.request.requesterPhone}`} className="border px-4 py-2.5 rounded-xl text-green-700 font-semibold"><Phone size={15} className="inline mr-1"/>Call</a>}</div>{m.bookingCode&&<div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 text-sm"><b className="text-green-800">Booking {m.bookingCode}</b><span className="text-green-700"> • {m.bookingStatus}</span></div>}</div>)}
        {f.available&&!matchedRequests.length&&<div className="bg-white/10 rounded-2xl p-5 text-sm text-blue-100 flex gap-3"><Clock3 size={20} className="shrink-0"/>AI requests inside your local radius appear here automatically. You can review the requester, then Accept & Connect or Decline.</div>}
      </div></div>

      <div className="bg-white rounded-3xl shadow-sm border p-7"><div className="flex items-center gap-2"><BrainCircuit className="text-purple-600"/><h2 className="text-2xl font-black">Nearby AI Recommendations</h2><button onClick={()=>{loadRecommendations();loadMatched()}} className="ml-auto border rounded-xl p-2"><RefreshCw size={16}/></button></div><p className="text-sm text-gray-500 mt-1">Only requests inside the 1.5 km radius with genuine GPS are shown.</p><div className="space-y-3 mt-5">{recommendations.map(m=><div key={m.request.id} className="border rounded-2xl p-4"><div className="flex justify-between gap-3"><div><b>{m.request.title}</b><p className="text-sm text-gray-600 mt-1">{m.request.description}</p></div><span className="text-xs font-bold text-purple-700 whitespace-nowrap">{m.matchScore}% match</span></div><div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-3"><span><MapPin className="inline" size={13}/> {m.distanceKm} km</span><span>{m.request.category}</span><span>{m.request.urgency}</span><span>{m.request.requesterName}</span></div><p className="text-xs text-gray-500 mt-2">{m.reasons?.join(" • ")}</p><div className="flex gap-2 mt-3"><button onClick={()=>accept(m.request.id)} className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-1"><HandHeart size={15}/> Accept & Connect</button><Link to="/chat" state={{helper:{id:m.request.userId,name:m.request.requesterName,phone:m.request.requesterPhone}}} className="border px-3 py-2 rounded-lg">Chat</Link></div></div>)}{f.available&&!recommendations.length&&<p className="text-gray-500 bg-gray-50 rounded-xl p-4">No additional nearby requests right now.</p>}</div></div>
    </section>
  </div></Layout>;
}
