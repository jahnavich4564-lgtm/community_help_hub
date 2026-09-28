import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Send, X, HeartHandshake, MapPin, LoaderCircle, Phone, MessageCircle, Sparkles, CheckCircle, ArrowRight } from "lucide-react";
import { api, errorMessage, isLoggedIn } from "../api";

const getGPS = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error("Your browser does not provide GPS."));
  navigator.geolocation.getCurrentPosition(
    p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
    () => reject(new Error("Please allow location access. HelpHub uses your live location only to find eligible nearby helpers.")),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
});

const detectCategory = q => {
  if (/medicine|doctor|hospital|blood|medical|tablet|pharmacy|health/i.test(q)) return "Medical";
  if (/teach|tutor|study|student|exam|math|notes|learn/i.test(q)) return "Education";
  if (/food|meal|grocery|ration/i.test(q)) return "Food";
  if (/ride|transport|pickup|drop|travel/i.test(q)) return "Transportation";
  if (/repair|electric|plumb|fix/i.test(q)) return "Home Repair";
  if (/elder|senior|old age/i.test(q)) return "Elder Care";
  return "Other";
};

const detectUrgency = q =>
  /life threatening|unconscious|not breathing|heart attack|severe bleeding|accident|ambulance|emergency/i.test(q)
    ? "Critical"
    : /urgent|immediately|asap|today|medicine|injured|danger/i.test(q)
      ? "High"
      : "Normal";

export default function FloatingAIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [preview, setPreview] = useState(null);
  const [posted, setPosted] = useState(null);
  const nav = useNavigate();

  const openAssistant = () => {
    setOpen(true);
    if (!messages.length) {
      setMessages([{
        sender: "ai",
        text: "Hi! I’m HelpHub AI. Tell me what you need, for example “I need medicine pickup” or “I need a maths tutor”. I’ll check your live location, show the best eligible helper, and let you send a real connection request."
      }]);
    }
  };

  const addAI = text => setMessages(m => [...m, { sender: "ai", text }]);

  const createRequest = async (query, gps, category, urgency, match) => {
    const form = new FormData();
    form.append("title", query);
    form.append("description", query);
    form.append("category", category);
    form.append("urgency", urgency);
    form.append("latitude", gps.latitude);
    form.append("longitude", gps.longitude);
    const r = await api.post("/help", form);
    const data = r.data;
    setPosted(data);
    setPreview(null);

    if (data.connection?.helper) {
      const h = data.connection.helper;
      addAI(`Your request is now live. ${h.name} has been selected as the current AI candidate at ${data.connection.distanceKm?.toFixed?.(2) ?? data.connection.distanceKm} km. Booking ${data.booking?.bookingCode || "will be shown when the connection is confirmed"}.`);
    } else {
      addAI("Your request is now live in the community. I couldn’t find an available helper inside the 1.5 km radius at this moment, so I did not invent a match. Nearby eligible helpers will see this request in their AI Connection Center.");
    }
    return data;
  };

  const ask = async text => {
    const q = (text || input).trim();
    if (!q || busy) return;
    setMessages(m => [...m, { sender: "user", text: q }]);
    setInput("");
    setPreview(null);
    setPosted(null);

    if (!isLoggedIn()) {
      addAI("Please log in first. Once you are logged in, I can use your live GPS and create a real connection request.");
      return;
    }

    setBusy(true);
    try {
      const gps = await getGPS();
      const category = detectCategory(q);
      const urgency = detectUrgency(q);
      const r = await api.post("/help/match", {
        category, title: q, description: q, urgency, ...gps
      });
      const top = r.data.matches?.[0];

      if (top) {
        setPreview({ top, gps, category, urgency, query: q });
        addAI(`I found ${top.volunteer.name}, ${top.distanceKm} km away, with a ${top.matchScore}% AI match. I have not created a booking yet. Choose “Send connection request” if you want me to post this request and notify the helper.`);
      } else {
        setPreview({ top: null, gps, category, urgency, query: q });
        addAI(`I checked your live location and there is no currently eligible helper within 1.5 km. I can still post this as a live community request so nearby available helpers can see it and accept or decline.`);
      }
    } catch (e) {
      addAI(errorMessage(e, "I couldn't check the live matching service. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const sendConnection = async () => {
    if (!preview || busy) return;
    setBusy(true);
    try {
      await createRequest(preview.query, preview.gps, preview.category, preview.urgency, preview.top);
    } catch (e) {
      addAI(errorMessage(e, "I couldn't create the connection request. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return <>
    {!open && <button onClick={openAssistant} className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-2xl z-50" aria-label="Open HelpHub AI"><Bot size={28}/></button>}
    {open && <div className="fixed bottom-6 right-6 w-[430px] max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-2xl border z-50 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex justify-between items-center">
        <div><div className="font-black flex items-center gap-2"><Sparkles size={17}/> HelpHub AI</div><p className="text-xs text-blue-100">Interactive local connection assistant</p></div>
        <button onClick={() => setOpen(false)} aria-label="Close AI"><X/></button>
      </div>

      <div className="h-[390px] overflow-y-auto p-4 bg-gray-50">
        {messages.map((m,i)=><div key={i} className={`mb-3 ${m.sender === "user" ? "text-right" : "text-left"}`}><span className={`inline-block px-3 py-2.5 rounded-2xl max-w-[90%] text-sm ${m.sender === "user" ? "bg-blue-600 text-white" : "bg-white shadow-sm text-gray-800"}`}>{m.text}</span></div>)}
        {busy && <div className="text-xs text-blue-700 flex items-center gap-2 mb-3"><LoaderCircle size={14} className="animate-spin"/> Checking your live location and matching service…</div>}

        {preview && !posted && <div className="rounded-2xl border-2 border-blue-200 bg-white p-4 shadow-sm">
          {preview.top ? <>
            <p className="text-xs uppercase font-black text-blue-700">AI found a candidate</p>
            <div className="flex items-center gap-3 mt-2"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><HeartHandshake className="text-blue-600" size={19}/></div><div className="flex-1"><b>{preview.top.volunteer.name}</b><p className="text-xs text-gray-500">{preview.top.volunteer.skills || "Community support"}</p></div><b className="text-blue-700">{preview.top.matchScore}%</b></div>
            <div className="text-xs text-gray-500 mt-3"><MapPin size={13} className="inline mr-1"/>{preview.top.distanceKm} km away • {preview.category} • {preview.urgency}</div>
            <div className="grid grid-cols-2 gap-2 mt-4"><button disabled={busy} onClick={sendConnection} className="bg-blue-600 disabled:opacity-50 text-white rounded-xl py-2.5 font-bold flex items-center justify-center gap-1"><ArrowRight size={15}/> Send connection request</button><button onClick={()=>nav("/request-help")} className="border rounded-xl py-2.5 font-semibold">Add files / voice</button></div>
          </> : <>
            <p className="text-xs uppercase font-black text-amber-700">No current local match</p>
            <p className="text-sm text-gray-700 mt-2">No available helper is inside 1.5 km right now. You can still post this request so eligible community helpers see it immediately.</p>
            <button disabled={busy} onClick={sendConnection} className="mt-4 w-full bg-blue-600 disabled:opacity-50 text-white rounded-xl py-2.5 font-bold flex items-center justify-center gap-2"><HeartHandshake size={16}/> Post request to nearby helpers</button>
          </>}
        </div>}

        {posted && <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 text-green-800 font-black"><CheckCircle size={18}/> Request is live</div>
          <p className="text-sm text-green-900 mt-2">Request #{posted.request?.id} is stored in the live matching system.</p>
          {posted.booking?.bookingCode && <p className="text-lg font-black text-green-800 mt-2">Booking ID: {posted.booking.bookingCode}</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={()=>nav("/request-help")} className="bg-green-700 text-white px-3 py-2 rounded-xl font-semibold">Open connection center</button>
            <button onClick={()=>setPosted(null)} className="border px-3 py-2 rounded-xl">Ask something else</button>
          </div>
        </div>}
      </div>

      <div className="p-3 border-t">
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => ask("I need medicine pickup")} className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-full">Medicine pickup</button>
          <button onClick={() => ask("I need a tutor for mathematics")} className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-full">Find a tutor</button>
          <button onClick={() => ask("I need local food support")} className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-full">Food support</button>
        </div>
        <div className="flex gap-2"><input className="field" disabled={busy} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()} placeholder="Tell me what you need…"/><button disabled={busy||!input.trim()} onClick={()=>ask()} className="bg-blue-600 disabled:opacity-50 text-white p-3 rounded-xl"><Send size={18}/></button></div>
      </div>
      <button onClick={() => nav("/request-help")} className="w-full bg-blue-50 text-blue-700 py-2.5 text-sm font-semibold"><HeartHandshake className="inline mr-1" size={15}/> Open full Request Help</button>
    </div>}
  </>;
}
