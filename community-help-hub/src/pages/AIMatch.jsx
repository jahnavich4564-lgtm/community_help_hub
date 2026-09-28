import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import GeoLocation from "../components/GeoLocation";
import { api, errorMessage } from "../api";
import { BrainCircuit, MapPin, Star, ShieldCheck, Phone, Navigation, Sparkles, LoaderCircle } from "lucide-react";

const categories = ["Medical", "Medicine Delivery", "Transportation", "Education", "Food", "Elder Care", "Emergency", "Home Repair", "Other"];

export default function AIMatch() {
  const [f, setF] = useState({ category: "Medical", title: "", description: "", location: "", urgency: "Normal", latitude: null, longitude: null });
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (f.latitude != null && f.longitude != null && !data) setMsg(""); }, [f.latitude, f.longitude, data]);

  const run = async e => {
    e.preventDefault();
    setMsg("");
    setData(null);
    if (f.latitude == null || f.longitude == null) { setMsg("Use your live GPS location first. Realistic AI distance cannot be estimated from a typed area name."); return; }
    setLoading(true);
    try {
      const r = await api.post("/help/match", f);
      setData(r.data);
    } catch (e) { setMsg(errorMessage(e)); }
    finally { setLoading(false); }
  };

  return <Layout><div className="max-w-6xl mx-auto space-y-6">
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-800 via-indigo-700 to-blue-700 text-white p-8 md:p-10 shadow-xl">
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10"/>
      <div className="relative flex flex-col md:flex-row md:items-center gap-5"><div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center"><BrainCircuit size={38}/></div><div><div className="inline-flex items-center gap-2 text-xs bg-white/15 rounded-full px-3 py-1"><Sparkles size={13}/> Live AI Matching</div><h1 className="text-4xl font-black mt-2">Find the right helper nearby</h1><p className="text-indigo-100 mt-2 max-w-3xl">AI ranks available helpers using skill relevance, urgency, trust, rating and real device GPS distance.</p></div></div>
    </section>

    <form onSubmit={run} className="bg-white rounded-3xl border shadow-sm p-6 md:p-7 space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="label">What do you need?</label><input className="field mt-1" placeholder="e.g. Need someone to deliver medicine" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></div>
        <div><label className="label">Category</label><select className="field mt-1" value={f.category} onChange={e=>setF({...f,category:e.target.value})}>{categories.map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="md:col-span-2"><label className="label">Details</label><textarea className="field mt-1 min-h-24" placeholder="Describe the need so AI can understand the skills required..." value={f.description} onChange={e=>setF({...f,description:e.target.value})}/></div>
        <div><label className="label">Urgency</label><select className="field mt-1" value={f.urgency} onChange={e=>setF({...f,urgency:e.target.value})}><option>Normal</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
        <div><label className="label">Area / landmark</label><input className="field mt-1" placeholder="Optional" value={f.location} onChange={e=>setF({...f,location:e.target.value})}/></div>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><GeoLocation value={f} onChange={x=>setF({...f,...x})}/></div>
      {msg && <div className="text-red-700 bg-red-50 border border-red-100 p-3 rounded-xl">{msg}</div>}
      <button disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">{loading ? <><LoaderCircle className="animate-spin" size={19}/> Calculating live matches...</> : <><Sparkles size={19}/> Find live AI matches</>}</button>
    </form>

    {data && <section className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3"><div className="bg-white rounded-2xl border p-4"><p className="text-xs text-gray-500">Urgency</p><b className="text-lg">{data.urgency.label}</b><p className="text-xs text-gray-500 mt-1">{data.urgency.score}% confidence</p></div><div className="bg-white rounded-2xl border p-4"><p className="text-xs text-gray-500">Available matches</p><b className="text-lg">{data.matches.length}</b><p className="text-xs text-gray-500 mt-1">Currently online/available</p></div><div className="bg-white rounded-2xl border p-4"><p className="text-xs text-gray-500">Distance method</p><b className="text-lg">GPS</b><p className="text-xs text-gray-500 mt-1">Real coordinates</p></div></div>
      <div className="bg-white rounded-3xl border shadow-sm p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-2xl font-bold">AI-ranked helpers</h2><p className="text-sm text-gray-500">{data.urgency.reason}</p></div><span className="inline-flex items-center gap-1 text-green-700 text-sm font-semibold"><Navigation size={16}/> Live distance</span></div>
        <div className="space-y-4 mt-5">{data.matches.map((m,i)=><div key={m.volunteer.id} className={`rounded-2xl border p-5 ${i===0?'border-blue-200 bg-blue-50/40':'bg-white'}`}><div className="flex flex-col md:flex-row md:items-center gap-4"><div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0"><ShieldCheck/></div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-bold">{m.volunteer.name}</h3>{i===0&&<span className="text-xs bg-blue-600 text-white rounded-full px-2 py-1">Best match</span>}</div><p className="text-gray-600 mt-1">{m.volunteer.skills||"General community help"}</p><div className="flex flex-wrap gap-4 text-sm mt-3"><span><Star className="inline text-amber-500" size={15}/> {m.volunteer.rating||5}</span><span>Trust {Math.round(m.volunteer.trustScore||50)}</span><span className="font-semibold text-blue-700"><MapPin className="inline" size={15}/> {m.distanceKm===null?'GPS unavailable':`${m.distanceKm} km away`}</span></div><p className="text-xs text-gray-500 mt-2">{m.reasons?.join(' • ')}</p></div><div className="md:text-right"><p className="text-2xl font-black text-blue-700">{m.matchScore}%</p><p className="text-xs text-gray-500">AI match</p><div className="flex gap-2 mt-3"><Link to="/chat" state={{helper:m.volunteer}} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">Chat</Link>{m.volunteer.phone&&<a href={`tel:${m.volunteer.phone}`} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Phone size={14} className="inline mr-1"/>Call</a>}</div></div></div></div>)}{!data.matches.length&&<div className="bg-amber-50 rounded-2xl p-5 text-amber-800">No suitable available helper was found right now. Keep your request open or try again later.</div>}</div>
      </div>
    </section>}
  </div></Layout>;
}
