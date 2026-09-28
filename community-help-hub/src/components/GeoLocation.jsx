import { useEffect, useState } from "react";
import { MapPin, LocateFixed, LoaderCircle, CheckCircle2 } from "lucide-react";

async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("Reverse geocoding failed");
    const d = await r.json();
    return d.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }
}

export default function GeoLocation({ value, onChange, auto = true, label = "Live GPS location", compact = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const locate = () => {
    if (!navigator.geolocation) { setError("GPS is not supported by this browser."); return; }
    setBusy(true); setError("");
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      const location = await reverseGeocode(latitude, longitude);
      onChange({ location, latitude, longitude, accuracy, updatedAt: new Date().toISOString() });
      setBusy(false);
    }, err => {
      setBusy(false);
      setError(err.code === 1 ? "Location permission was denied. Allow location access in the browser." : "Unable to read your live GPS location.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  useEffect(() => {
    if (auto && value?.latitude == null && value?.longitude == null) locate();
    // Intentionally only runs on first mount: the user controls subsequent refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = value?.latitude != null && value?.longitude != null;

  return <div className={compact ? "space-y-2" : "space-y-3"}>
    <div className="flex items-center justify-between gap-3">
      <div><p className="font-semibold flex items-center gap-2"><MapPin size={17} className="text-blue-600"/>{label}</p><p className="text-xs text-gray-500">Used for genuine distance matching. Your typed landmark is not used as GPS.</p></div>
      <button type="button" onClick={locate} disabled={busy} className="shrink-0 border border-blue-200 text-blue-700 px-3 py-2 rounded-xl text-sm bg-white hover:bg-blue-50 disabled:opacity-60">{busy ? <LoaderCircle size={16} className="inline animate-spin mr-1"/> : <LocateFixed size={16} className="inline mr-1"/>}{busy ? "Locating..." : ready ? "Refresh GPS" : "Use my location"}</button>
    </div>
    <div className={`border rounded-xl p-3 text-sm ${ready ? "bg-green-50 border-green-100" : "bg-gray-50"}`}>
      <div className="flex items-center gap-2"><b>{value?.location || "Waiting for device GPS..."}</b>{ready && <CheckCircle2 size={16} className="text-green-600 shrink-0"/>}</div>
      {ready && <span className="block text-xs text-gray-500 mt-1">{Number(value.latitude).toFixed(6)}, {Number(value.longitude).toFixed(6)} {value.accuracy ? `• ±${Math.round(value.accuracy)}m` : ""}</span>}
    </div>
    {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}
  </div>;
}
