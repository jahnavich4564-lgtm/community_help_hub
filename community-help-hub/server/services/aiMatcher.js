function toCoord(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const a = toCoord(lat1), b = toCoord(lon1), c = toCoord(lat2), d = toCoord(lon2);
  if ([a, b, c, d].some(v => v === null)) return null;

  const R = 6371;
  const p1 = a * Math.PI / 180;
  const p2 = c * Math.PI / 180;
  const dp = (c - a) * Math.PI / 180;
  const dl = (d - b) * Math.PI / 180;
  const x = Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function skillScore(category, skills = "") {
  const c = String(category || "").toLowerCase();
  const list = String(skills)
    .toLowerCase()
    .split(/[,;|]/)
    .map(s => s.trim())
    .filter(Boolean);

  if (!list.length) return 30;
  if (list.some(s => c.includes(s) || s.includes(c))) return 100;

  const words = c.split(/\s+/).filter(w => w.length > 3);
  return words.some(w => list.some(s => s.includes(w))) ? 75 : 40;
}

function textSkillScore(text = "", skills = "") {
  const haystack = String(text).toLowerCase();
  const list = String(skills)
    .toLowerCase()
    .split(/[,;|]/)
    .map(s => s.trim())
    .filter(Boolean);

  if (!list.length) return 30;
  if (list.some(s => haystack.includes(s))) return 100;

  const words = haystack.split(/\s+/).filter(w => w.length > 3);
  return words.some(w => list.some(s => s.includes(w) || w.includes(s))) ? 75 : 40;
}

function analyzeUrgency(text = "", requested) {
  if (["Critical", "High", "Medium", "Normal"].includes(requested) && requested !== "Normal") {
    return {
      label: requested,
      score: { Critical: 95, High: 80, Medium: 60, Normal: 30 }[requested],
      reason: "User-selected urgency was respected."
    };
  }

  const t = String(text).toLowerCase();
  const critical = [
    "life threatening", "unconscious", "accident", "cardiac",
    "heart attack", "severe bleeding", "emergency", "ambulance",
    "not breathing", "fire", "trapped"
  ];
  const high = [
    "urgent", "immediately", "asap", "blood", "medicine",
    "elderly", "stranded", "danger", "tonight", "injured"
  ];

  if (critical.some(x => t.includes(x))) {
    return { label: "Critical", score: 95, reason: "Emergency language detected." };
  }
  if (high.some(x => t.includes(x))) {
    return { label: "High", score: 80, reason: "Time-sensitive language detected." };
  }
  return { label: "Normal", score: 30, reason: "No urgent keywords detected." };
}

const MAX_MATCH_DISTANCE_KM = 1.5;

function proximityScore(distance) {
  // Matching is intentionally local: only helpers inside the 1.5 km service
  // radius are eligible. Missing GPS cannot produce a proximity match.
  if (distance === null || distance > MAX_MATCH_DISTANCE_KM) return 0;
  if (distance <= 0.25) return 100;
  if (distance <= 0.5) return 96;
  if (distance <= 0.75) return 92;
  if (distance <= 1.0) return 88;
  if (distance <= 1.25) return 82;
  return 76;
}

function matchOne(request, volunteer) {
  const distance = distanceKm(
    request.latitude, request.longitude,
    volunteer.latitude, volunteer.longitude
  );

  const combinedText = `${request.title || ""} ${request.description || ""} ${request.voiceTranscript || ""}`;
  const skill = Math.max(
    skillScore(request.category, volunteer.skills),
    textSkillScore(combinedText, volunteer.skills)
  );
  const availability = volunteer.available ? 100 : 0;
  const trust = Math.min(100, Math.max(0, Number(volunteer.trustScore ?? 50)));
  const rating = Math.min(100, Math.max(0, Number(volunteer.rating ?? 5) * 20));
  const proximity = proximityScore(distance);
  const urgencyBonus =
    request.urgency === "Critical" || request.urgency === "High"
      ? trust * 0.1
      : 0;

  const score = Math.min(
    100,
    proximity * 0.25 +
    skill * 0.35 +
    availability * 0.15 +
    trust * 0.15 +
    rating * 0.10 +
    urgencyBonus
  );

  const reasons = [];
  if (skill >= 75) reasons.push("Strong skill match");
  else if (skill >= 40) reasons.push("Related skills");
  else reasons.push("General helper");

  if (distance === null) reasons.push("GPS distance unavailable");
  else if (distance <= 0.5) reasons.push("Very close");
  else if (distance <= 1.0) reasons.push("Nearby");
  else reasons.push("Inside local 1.5 km radius");

  if (trust >= 80) reasons.push("High trust");
  else reasons.push("Trust score considered");

  return {
    volunteer: {
      id: volunteer.id,
      name: volunteer.name,
      email: volunteer.email,
      phone: volunteer.phone,
      skills: volunteer.skills,
      rating: volunteer.rating,
      trustScore: volunteer.trustScore,
      location: volunteer.location,
      latitude: volunteer.latitude,
      longitude: volunteer.longitude
    },
    distanceKm: distance === null ? null : Number(distance.toFixed(2)),
    matchScore: Number(score.toFixed(1)),
    reasons
  };
}

function findBestMatches(request, volunteers, limit = 5) {
  return volunteers
    .filter(v => Number(v.id) !== Number(request.userId))
    .map(v => matchOne(request, v))
    .filter(m => m.distanceKm !== null && m.distanceKm <= MAX_MATCH_DISTANCE_KM)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

function findBestRequests(helper, requests, limit = 8) {
  return requests
    .filter(r => r.status === "Open" && Number(r.userId) !== Number(helper.id))
    .map(r => {
      const reverse = matchOne(r, {
        ...helper,
        available: true
      });
      return {
        request: {
          id: r.id,
          userId: r.userId,
          title: r.title,
          description: r.description,
          category: r.category,
          urgency: r.urgency,
          location: r.location,
          requesterName: r.requesterName,
          requesterPhone: r.requesterPhone,
          createdAt: r.createdAt
        },
        distanceKm: reverse.distanceKm,
        matchScore: reverse.matchScore,
        reasons: reverse.reasons
      };
    })
    .filter(m => m.distanceKm !== null && m.distanceKm <= MAX_MATCH_DISTANCE_KM)
    .sort((a, b) => {
      const urgencyWeight = { Critical: 3, High: 2, Medium: 1, Normal: 0 };
      const u = (urgencyWeight[b.request.urgency] || 0) - (urgencyWeight[a.request.urgency] || 0);
      return u || b.matchScore - a.matchScore;
    })
    .slice(0, limit);
}

module.exports = {
  findBestMatches,
  findBestRequests,
  analyzeUrgency,
  distanceKm,
  MAX_MATCH_DISTANCE_KM
};
