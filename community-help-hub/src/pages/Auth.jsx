import {useState} from "react";
import {useNavigate,Link} from "react-router-dom";
import {api,setAuth,errorMessage} from "../api";
import {LogIn,UserPlus,ShieldCheck} from "lucide-react";
import GeoLocation from "../components/GeoLocation";

export default function Auth(){
 const nav=useNavigate();const [mode,setMode]=useState("login");
 const [form,setForm]=useState({name:"",email:"",password:"",phone:"",location:"",skills:"",latitude:null,longitude:null,accuracy:null});
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const change=e=>setForm({...form,[e.target.name]:e.target.value});
 const submit=async e=>{e.preventDefault();setBusy(true);setMsg("");
  try{
   if(mode==="register"&&!Number.isFinite(Number(form.latitude))) throw new Error("Please allow GPS location before creating your account.");
   const {data}=await api.post(`/auth/${mode==="login"?"login":"register"}`,form);setAuth(data);nav("/dashboard");
  }catch(e){setMsg(errorMessage(e));}finally{setBusy(false);}
 };
 return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-6">
  <div className="w-full max-w-5xl grid md:grid-cols-2 bg-white rounded-3xl shadow-xl overflow-hidden">
   <div className="bg-gradient-to-br from-blue-700 to-cyan-500 text-white p-10 flex flex-col justify-center"><ShieldCheck size={44}/><h1 className="text-4xl font-bold mt-5">Community Help Hub</h1><p className="mt-4 text-blue-100">A trusted local network for requesting help, volunteering skills and finding verified services with AI assistance.</p><Link to="/" className="mt-8 text-white underline">Back to home</Link></div>
   <form onSubmit={submit} className="p-8 md:p-10 space-y-4 max-h-[90vh] overflow-y-auto">
    <div className="flex gap-2 mb-5"><button type="button" onClick={()=>setMode("login")} className={`flex-1 py-3 rounded-xl ${mode==="login"?"bg-blue-600 text-white":"bg-gray-100"}`}><LogIn className="inline mr-2" size={18}/>Login</button><button type="button" onClick={()=>setMode("register")} className={`flex-1 py-3 rounded-xl ${mode==="register"?"bg-blue-600 text-white":"bg-gray-100"}`}><UserPlus className="inline mr-2" size={18}/>Register</button></div>
    {mode==="register"&&<>
      <input required name="name" value={form.name} onChange={change} placeholder="Full name" className="field"/><input name="phone" value={form.phone} onChange={change} placeholder="Phone" className="field"/><input name="skills" value={form.skills} onChange={change} placeholder="Skills (comma separated)" className="field"/>
      <GeoLocation value={form} onChange={x=>setForm({...form,...x})}/>
    </>}
    <input required type="email" name="email" value={form.email} onChange={change} placeholder="Email" className="field"/><input required type="password" name="password" value={form.password} onChange={change} placeholder="Password (6+ characters)" className="field"/>
    {msg&&<div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{msg}</div>}
    <button disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold">{busy?"Please wait...":mode==="login"?"Login":"Create account"}</button>
    {mode==="login"&&<p className="text-xs text-gray-500 mt-4">Evaluation accounts: admin@communityhub.local / Admin@12345 and user@communityhub.local / User@12345</p>}
   </form>
  </div>
 </div>
}
