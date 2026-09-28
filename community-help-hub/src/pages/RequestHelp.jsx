import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import GeoLocation from "../components/GeoLocation";
import { api, API_URL, errorMessage } from "../api";
import {
  CheckCircle, MapPin, Paperclip, Mic, Square, Phone, FileText,
  LoaderCircle, Sparkles, ShieldCheck, Navigation, Zap, Clock3,
  Copy, CalendarCheck, MessageCircle, Link2, RefreshCw, X
} from "lucide-react";

const categories = ["Medical", "Medicine Delivery", "Transportation", "Education", "Food", "Elder Care", "Emergency", "Home Repair", "Other"];
const stages = ["Reading your request", "Understanding urgency and skills", "Calculating real GPS distance", "Connecting to the best local helper"];
const STORAGE_KEY = "chh_active_connection";

export default function RequestHelp() {
  const [f, setF] = useState({ title: "", description: "", category: "Medical", location: "", urgency: "Normal", communityId: "", latitude: null, longitude: null, voiceTranscript: "" });
  const [communities, setCommunities] = useState([]);
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [connection, setConnection] = useState(null);
  const [msg, setMsg] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState(true);
  const [matching, setMatching] = useState(false);
  const [stage, setStage] = useState(0);
  const [copyDone, setCopyDone] = useState(false);
  const [showConnectionOverlay, setShowConnectionOverlay] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recognition = useRef(null);
  const stageTimer = useRef(null);

  useEffect(() => {
    api.get("/communities").then(r => setCommunities(r.data.communities || [])).catch(e => setMsg(errorMessage(e)));
    setRecordingSupported(Boolean(navigator.mediaDevices?.getUserMedia));

    // Restore the connection after refresh/navigation. The connection is a real
    // database record, not a temporary popup.
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.requestId) syncConnection(parsed.requestId, true);
      } catch { localStorage.removeItem(STORAGE_KEY); }
    }
    return () => clearInterval(stageTimer.current);
  }, []);

  const syncConnection = async (requestId, silent = false) => {
    if (!requestId) return;
    try {
      const r = await api.get(`/help/connection/${requestId}`);
      const c = r.data.connection;
      if (c) {
        setConnection(c);
        setResult(prev => prev ? { ...prev, request: c.request, booking: c.booking, connection: c } : {
          success: true, request: c.request, booking: c.booking, connection: c, matches: c.helper ? [{ volunteer: c.helper, distanceKm: c.distanceKm, matchScore: null, reasons: [] }] : []
        });
        if (c.request?.status === "Completed") {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ requestId: c.request.id }));
        }
      }
    } catch (e) {
      if (!silent) setMsg(errorMessage(e, "Could not refresh the AI connection."));
    }
  };

  useEffect(() => {
    const requestId = connection?.request?.id || result?.request?.id;
    if (!requestId) return;
    syncConnection(requestId, true);
    const timer = setInterval(() => syncConnection(requestId, true), 2500);
    return () => clearInterval(timer);
  }, [connection?.request?.id, result?.request?.id]);

  const update = patch => setF(prev => ({ ...prev, ...patch }));

  const startVoice = async () => {
    setMsg("");
    if (!navigator.mediaDevices?.getUserMedia) return setMsg("Voice recording is not supported by this browser.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size) audioChunks.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(audioChunks.current, { type: recorder.mimeType || "audio/webm" });
        setFiles(prev => [...prev, new File([blob], `voice-${Date.now()}.webm`, { type: blob.type })].slice(0, 5));
      };
      recorder.start();
      setRecording(true);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const r = new SpeechRecognition();
        recognition.current = r;
        r.lang = "en-IN";
        r.continuous = true;
        r.interimResults = false;
        r.onresult = event => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) transcript += `${event.results[i][0].transcript} `;
          transcript = transcript.trim();
          if (transcript) setF(prev => ({ ...prev, voiceTranscript: `${prev.voiceTranscript} ${transcript}`.trim(), description: `${prev.description}${prev.description ? " " : ""}${transcript}` }));
        };
        r.onerror = () => setTranscribing(false);
        r.onend = () => setTranscribing(false);
        r.start();
        setTranscribing(true);
      }
    } catch (e) { setMsg(e?.message || "Microphone permission was not granted."); }
  };

  const stopVoice = () => {
    if (mediaRecorder.current?.state !== "inactive") mediaRecorder.current?.stop();
    if (recognition.current) { try { recognition.current.stop(); } catch {} recognition.current = null; }
    setRecording(false);
    setTranscribing(false);
  };

  const submit = async e => {
    e.preventDefault();
    setMsg("");
    if (f.latitude == null || f.longitude == null) return setMsg("Live GPS is required so the AI can calculate a genuine distance. Use Refresh GPS and try again.");
    if (!f.title.trim() || !f.description.trim()) return setMsg("Please enter what help you need and describe the situation.");

    setMatching(true);
    setStage(0);
    stageTimer.current = setInterval(() => setStage(s => Math.min(s + 1, stages.length - 1)), 550);

    try {
      const form = new FormData();
      Object.entries(f).forEach(([key, value]) => { if (value !== null && value !== undefined) form.append(key, value); });
      files.forEach(file => form.append("attachments", file));
      const r = await api.post("/help", form);
      const data = r.data;
      setResult(data);
      setConnection(data.connection || null);
      setShowConnectionOverlay(true);
      setFiles([]);
      if (data.request?.id) localStorage.setItem(STORAGE_KEY, JSON.stringify({ requestId: data.request.id }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      clearInterval(stageTimer.current);
      setMatching(false);
    }
  };

  const best = connection?.helper || result?.matches?.[0]?.volunteer;
  const booking = connection?.booking || result?.booking;
  const distance = connection?.distanceKm ?? result?.matches?.[0]?.distanceKm;
  const status = connection?.request?.status || result?.request?.status;

  const copyBooking = async () => {
    if (!booking?.bookingCode) return;
    try { await navigator.clipboard.writeText(booking.bookingCode); setCopyDone(true); setTimeout(() => setCopyDone(false), 1500); } catch {}
  };

  const renderConnectionOverlay = () => {
    if (!showConnectionOverlay || !result?.request?.id) return null;
    const helper = connection?.helper || result?.matches?.[0]?.volunteer;
    const b = connection?.booking || result?.booking;
    const s = connection?.request?.status || result?.request?.status || "Open";
    const adminStatus = connection?.request?.adminStatus || result?.request?.adminStatus || "Pending";
    const connected = s === "Accepted";
    const rejected = s === "Rejected" || adminStatus === "Rejected";
    const waiting = !connected && !rejected;
    return (
      <section className="rounded-3xl border-2 border-blue-200 bg-white shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white p-6 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase font-black tracking-widest text-blue-100">Live AI Connection Center</p>
              <h2 className="text-2xl md:text-3xl font-black mt-1">
                {connected ? "You are connected to a helper" : rejected ? "Request closed by admin" : helper ? "AI found a nearby helper" : "Your request is live — waiting for a nearby helper"}
              </h2>
              <p className="text-blue-100 text-sm mt-2 max-w-3xl">
                {connected ? "The helper accepted your request. Chat or call them and use the booking ID for tracking." : rejected ? "This request is no longer available for AI matching." : "This panel stays here. The requester can watch the connection while eligible helpers see the same request in Offer Help and can Accept & Connect or Decline."}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 text-sm font-bold">
              <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-300" : rejected ? "bg-red-300" : "bg-yellow-300 animate-pulse"}`} />
              {connected ? "Connected" : rejected ? "Closed" : "Live matching"}
            </div>
          </div>
        </div>
        <div className="p-5 md:p-7">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs text-gray-500">Request</p><b>#{result.request.id}</b><p className="text-xs text-gray-500 mt-1 truncate">{result.request.title}</p></div>
            <div className="rounded-2xl bg-green-50 p-4"><p className="text-xs text-gray-500">Booking ID</p><b className="text-green-800 text-lg">{b?.bookingCode || (connected ? "Creating…" : "Generated when helper connects")}</b></div>
            <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs text-gray-500">AI status</p><b>{connected ? "Helper accepted" : helper ? "Waiting for helper" : "Searching local helpers"}</b></div>
            <div className="rounded-2xl bg-purple-50 p-4"><p className="text-xs text-gray-500">Admin review</p><b className={adminStatus === "Rejected" ? "text-red-700" : adminStatus === "Approved" ? "text-green-700" : "text-purple-700"}>{adminStatus}</b></div>
          </div>

          <div className="grid md:grid-cols-4 gap-3 mt-5">
            {[["1","Request saved","Your details, files and voice transcript are stored."],["2","AI analyzed","Skills, urgency, trust and real GPS were checked."],["3","Helpers notified","Eligible helpers inside 1.5 km can see this request now."],["4","Connect","A helper accepts or declines; the next eligible helper can then respond."]].map(([n,t,d],i)=><div key={n} className={`rounded-2xl p-4 border ${connected && i===3 ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"}`}><div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center font-black text-blue-700">{n}</div><b className="block mt-3">{t}</b><p className="text-xs text-gray-500 mt-1">{d}</p></div>)}
          </div>

          {helper && <div className="mt-5 rounded-2xl border-2 border-cyan-100 bg-cyan-50 p-5">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center"><ShieldCheck size={27}/></div>
              <div className="flex-1"><p className="text-xs uppercase font-black text-blue-700">Current AI candidate</p><h3 className="text-xl font-black mt-1">{helper.name}</h3><p className="text-sm text-gray-600">{helper.skills || "Community support"}</p></div>
              <div className="text-left md:text-right"><b className="text-blue-700 text-lg">{distance == null ? "GPS unavailable" : `${Number(distance).toFixed(2)} km`}</b><p className="text-xs text-gray-500">real GPS distance</p></div>
            </div>
            <div className="flex flex-wrap gap-3 mt-5">
              {connected && <Link to="/chat" state={{helper}} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2"><MessageCircle size={17}/> Chat helper</Link>}
              {helper.phone && <a href={`tel:${helper.phone}`} className="bg-green-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2"><Phone size={17}/> Call helper</a>}
              {b?.bookingCode && <button type="button" onClick={copyBooking} className="border border-green-300 bg-white text-green-700 px-5 py-3 rounded-xl font-bold flex items-center gap-2"><Copy size={16}/>{copyDone ? "Copied" : `Booking ${b.bookingCode}`}</button>}
            </div>
          </div>}

          {waiting && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-start gap-3"><Clock3 className="text-amber-700 shrink-0"/><div><h3 className="font-black text-amber-900">Waiting for the helper to respond</h3><p className="text-sm text-amber-800 mt-1">The requester does not need to do anything else. The helper sees this request in Offer Help and can Accept & Connect or Decline. If they decline, AI offers it to the next eligible helper.</p></div></div></div>}
          {rejected && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"><b>This request was rejected by an administrator.</b><p className="text-sm mt-1">Create a new request if you still need help.</p></div>}
          <p className="text-xs text-gray-500 mt-5 flex items-center gap-2"><RefreshCw size={14}/> Connection status is saved in SQLite and refreshed automatically every 2.5 seconds.</p>
        </div>
      </section>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white p-7 md:p-9 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center"><Sparkles size={29}/></div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold"><Link2 size={15}/> Live AI connection</p>
              <h1 className="text-3xl md:text-4xl font-black mt-3">Request help and connect automatically</h1>
              <p className="text-blue-100 mt-2 max-w-3xl">Submit once. HelpHub AI finds an eligible helper inside the local service radius, creates the linked booking, and keeps the connection visible until the helper accepts.</p>
            </div>
          </div>
        </section>

        {matching && <section className="rounded-3xl border border-blue-200 bg-white p-5 shadow-lg">
          <div className="flex items-center gap-3"><LoaderCircle className="animate-spin text-blue-600"/><div><b className="text-lg">AI is matching your request…</b><p className="text-sm text-gray-500">{stages[stage]}</p></div></div>
          <div className="grid grid-cols-4 gap-2 mt-4">{stages.map((s,i)=><div key={s} className={`h-2 rounded-full ${i <= stage ? "bg-blue-600" : "bg-gray-200"}`}/>)}</div>
        </section>}

        {connection && <section className={`rounded-3xl border-2 p-6 md:p-7 shadow-xl ${connection.connected ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}`}>
          <div className="flex flex-col lg:flex-row lg:items-start gap-5">
            <div className="flex-1">
              <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${connection.connected ? "bg-green-500" : "bg-blue-500 animate-pulse"}`}/><p className="text-xs uppercase tracking-wide font-black text-blue-700">AI Connection Center</p></div>
              <h2 className="text-2xl md:text-3xl font-black mt-2">{connection.connected ? "Helper connected" : "Helper found — waiting for confirmation"}</h2>
              <p className="text-sm text-gray-600 mt-2">This panel stays on the page and refreshes automatically. You can close the browser and return to Request Help to restore it.</p>
            </div>
            <button type="button" onClick={() => syncConnection(connection.request.id)} className="border bg-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2"><RefreshCw size={16}/> Refresh connection</button>
          </div>

          {best && <div className="grid lg:grid-cols-[1fr_auto] gap-5 mt-6">
            <div className="bg-white rounded-2xl border p-5">
              <div className="flex items-start gap-4"><div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center"><ShieldCheck size={27}/></div><div className="flex-1"><p className="text-xs uppercase font-bold text-blue-700">Your matched helper</p><h3 className="text-xl font-black mt-1">{best.name}</h3><p className="text-sm text-gray-600 mt-1">{best.skills || "Community support"}</p></div></div>
              <div className="grid sm:grid-cols-3 gap-3 mt-5"><div className="rounded-xl bg-blue-50 p-3"><p className="text-xs text-gray-500">Distance</p><b className="text-blue-700">{distance == null ? "GPS unavailable" : `${Number(distance).toFixed(2)} km`}</b></div><div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">AI match</p><b>{result?.matches?.[0]?.matchScore ? `${result.matches[0].matchScore}%` : "Connected"}</b></div><div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">Request status</p><b>{status}</b></div></div>
              <div className="flex flex-wrap gap-3 mt-5"><Link to="/chat" state={{helper: best}} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2"><MessageCircle size={17}/> Open Chat</Link>{best.phone && <a href={`tel:${best.phone}`} className="bg-green-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2"><Phone size={17}/> Call Helper</a>}</div>
            </div>

            {booking && <div className="lg:w-80 bg-white rounded-2xl border-2 border-green-200 p-5">
              <div className="flex items-center gap-2 text-green-800 font-bold"><CalendarCheck size={19}/> Booking ready</div>
              <p className="text-xs text-gray-500 mt-4">Booking ID</p>
              <p className="text-3xl font-black tracking-wide text-green-700 mt-1">{booking.bookingCode}</p>
              <p className="text-xs text-gray-500 mt-2">Status: <b>{booking.status}</b></p>
              <button type="button" onClick={copyBooking} className="mt-4 w-full border border-green-200 text-green-700 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2"><Copy size={15}/>{copyDone ? "Copied" : "Copy Booking ID"}</button>
              <Link to="/booking" className="mt-2 block w-full text-center bg-green-700 text-white py-2.5 rounded-xl font-semibold">Open Booking</Link>
            </div>}
          </div>}
        </section>}

        <div className="grid lg:grid-cols-[1.45fr_.8fr] gap-6">
          <section className="bg-white rounded-3xl shadow-sm border p-6 md:p-8">
            <div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-blue-50 text-blue-700"><Zap/></div><div><h2 className="text-2xl font-black">What do you need?</h2><p className="text-gray-500 text-sm">Give AI enough detail to find the right local helper.</p></div></div>
            <form onSubmit={submit} className="grid md:grid-cols-2 gap-5 mt-7">
              <div><label className="label">Short request</label><input className="field mt-1" required placeholder="e.g. Need someone to deliver medicine" value={f.title} onChange={e=>update({title:e.target.value})}/></div>
              <div><label className="label">Category</label><select className="field mt-1" value={f.category} onChange={e=>update({category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
              <div className="md:col-span-2"><label className="label">Describe the situation</label><textarea className="field mt-1 min-h-32" required placeholder="Explain what you need, when you need it and any important details..." value={f.description} onChange={e=>update({description:e.target.value})}/></div>

              <div className="md:col-span-2 rounded-2xl border border-purple-100 bg-purple-50 p-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p className="font-bold text-purple-900 flex items-center gap-2"><Mic size={17}/> Voice + NLP</p><p className="text-xs text-purple-700 mt-1">Speak naturally. The transcript is included in AI urgency and skill matching.</p></div><button type="button" onClick={recording?stopVoice:startVoice} disabled={!recordingSupported} className={`${recording?"bg-red-600":"bg-purple-600"} text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-semibold`}>{recording?<Square size={17}/>:<Mic size={17}/>} {recording?"Stop recording":"Speak request"}</button></div>{transcribing&&<p className="mt-3 text-sm text-purple-700 flex items-center gap-2"><LoaderCircle className="animate-spin" size={15}/> Listening and transcribing…</p>}{f.voiceTranscript&&<div className="mt-3 p-3 bg-white border rounded-xl text-sm"><b>Transcript:</b> {f.voiceTranscript}</div>}</div>

              <div><label className="label">Urgency</label><select className="field mt-1" value={f.urgency} onChange={e=>update({urgency:e.target.value})}><option>Normal</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
              <div><label className="label">Area / landmark</label><input className="field mt-1" placeholder="Optional landmark" value={f.location} onChange={e=>update({location:e.target.value})}/></div>
              <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50 p-4"><GeoLocation value={f} onChange={x=>update(x)}/></div>
              <div className="md:col-span-2"><label className="label">Community <span className="font-normal text-gray-400">(optional)</span></label><select className="field mt-1" value={f.communityId} onChange={e=>update({communityId:e.target.value})}><option value="">No specific community</option>{communities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>

              <div className="md:col-span-2 rounded-2xl border-2 border-dashed border-gray-200 p-5"><div className="flex gap-3"><Paperclip size={18}/><div><p className="font-bold">Supporting files</p><p className="text-xs text-gray-500">Images, PDF, documents or audio • up to 5 files • 10 MB each.</p></div></div><input className="mt-4 w-full text-sm" type="file" multiple accept="image/*,.pdf,.txt,.doc,.docx,audio/*" onChange={e=>setFiles(prev=>[...prev,...Array.from(e.target.files||[])].slice(0,5))}/>{files.length>0&&<div className="mt-3 space-y-2">{files.map((file,i)=><div key={`${file.name}-${i}`} className="flex items-center justify-between bg-gray-50 rounded-xl p-2.5"><span className="text-sm flex items-center gap-2 truncate"><FileText size={15}/>{file.name}</span><button type="button" onClick={()=>setFiles(prev=>prev.filter((_,x)=>x!==i))}><X size={16}/></button></div>)}</div>}</div>

              {msg&&<div className="md:col-span-2 text-red-700 bg-red-50 border border-red-100 p-3 rounded-xl">{msg}</div>}
              <button disabled={matching} className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2">{matching?<><LoaderCircle className="animate-spin" size={19}/> {stages[stage]}…</>:<><Zap size={19}/> Submit & Connect Me to a Helper</>}</button>
            </form>
          </section>

          <aside className="space-y-5">
            {result ? <>
              <div className="bg-white rounded-3xl border shadow-sm p-6"><div className="flex items-center gap-2 text-green-700 font-bold"><CheckCircle size={21}/> Request saved</div><p className="text-sm text-gray-500 mt-2">Request #{result.request?.id} is in the live matching system.</p><div className="grid grid-cols-2 gap-3 mt-5"><div className="rounded-2xl bg-gray-50 p-3"><Clock3 size={16}/><p className="text-xs text-gray-500 mt-2">AI urgency</p><b>{result.urgency?.label}</b></div><div className="rounded-2xl bg-blue-50 p-3"><Navigation size={16} className="text-blue-600"/><p className="text-xs text-blue-600 mt-2">GPS</p><b>Verified</b></div></div></div>
              {booking&&<div className="bg-green-50 border-2 border-green-200 rounded-3xl p-6"><p className="text-xs uppercase font-black text-green-700">Your booking ID</p><p className="text-3xl font-black text-green-800 mt-1">{booking.bookingCode}</p><p className="text-sm text-green-700 mt-2">This ID is permanently linked to request #{result.request?.id}.</p></div>}
              {result.request?.attachments?.length>0&&<div className="bg-white rounded-3xl border p-5"><p className="font-bold">Saved files</p>{result.request.attachments.map(file=><a key={file.filename} target="_blank" rel="noreferrer" href={`${API_URL.replace(/\/api$/,"/")}${file.url.replace(/^\//,"")}`} className="block text-xs text-blue-600 underline truncate mt-2">{file.name}</a>)}</div>}
            </> : <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 p-6"><div className="flex items-center gap-2 text-indigo-700"><Sparkles/><b>How the connection works</b></div><div className="space-y-4 mt-5">{[["01","Submit","Your request and voice/files are saved."],["02","Match","AI checks skills, trust, availability and real GPS."],["03","Connect","The helper sees the requester and gets Connect & Accept."],["04","Track","Chat, call and the booking ID stay available until completion."]].map(([n,t,d])=><div key={n} className="flex gap-3"><div className="w-8 h-8 rounded-full bg-white text-blue-700 flex items-center justify-center text-xs font-bold shadow-sm">{n}</div><div><b>{t}</b><p className="text-sm text-gray-500">{d}</p></div></div>)}</div><div className="mt-5 p-3 rounded-2xl bg-white/70 text-xs text-gray-600 flex gap-2"><MapPin size={16} className="text-blue-600 shrink-0"/> Only helpers with valid GPS inside the 1.5 km local matching radius can be selected.</div></div>}
          </aside>
        </div>
      </div>
      {renderConnectionOverlay()}
    </Layout>
  );
}
