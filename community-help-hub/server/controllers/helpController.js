const db = require("../config/db");
const {
  findBestMatches,
  findBestRequests,
  analyzeUrgency,
  MAX_MATCH_DISTANCE_KM,
  distanceKm
} = require("../services/aiMatcher");

const notify = (userId, title, message, type = "Community") =>
  db.run(
    "INSERT INTO notifications(userId,type,title,message) VALUES(?,?,?,?)",
    [userId, type, title, message]
  );

const parseFiles = files =>
  (files || []).map(file => ({
    name: file.originalname,
    filename: file.filename,
    url: `/uploads/help/${file.filename}`,
    mimeType: file.mimetype,
    size: file.size
  }));

const bookingView = b => b ? ({
  id: b.id,
  bookingCode: `CHH-${String(b.id).padStart(6, "0")}`,
  status: b.status,
  requesterId: b.requesterId,
  helperId: b.helperId,
  helpRequestId: b.helpRequestId,
  service: b.service,
  bookingDate: b.bookingDate,
  bookingTime: b.bookingTime,
  notes: b.notes,
  amount: b.amount,
  createdAt: b.createdAt
}) : null;

// A matched help request always gets exactly one linked booking.
// If an older database contains a match without a booking, the connection endpoint
// repairs it automatically instead of leaving the requester without a booking ID.
const ensureBooking = (request, helperId, callback) => {
  db.get(
    "SELECT * FROM bookings WHERE helpRequestId=? ORDER BY id DESC LIMIT 1",
    [request.id],
    (findErr, existing) => {
      if (findErr) return callback(findErr);
      if (existing) {
        if (helperId && Number(existing.helperId) !== Number(helperId)) {
          db.run("UPDATE bookings SET helperId=? WHERE id=?", [helperId, existing.id], updateErr => {
            if (updateErr) return callback(updateErr);
            db.get("SELECT * FROM bookings WHERE id=?", [existing.id], (getErr, updated) => {
              if (getErr) return callback(getErr);
              callback(null, bookingView(updated));
            });
          });
        } else {
          callback(null, bookingView(existing));
        }
        return;
      }

      const now = new Date();
      const pad = n => String(n).padStart(2, "0");
      const bookingDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const bookingTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const serviceName = `Community Help: ${String(request.title).trim().slice(0, 120)}`;

      db.run(
        `INSERT INTO bookings
          (requesterId,helperId,helpRequestId,service,bookingDate,bookingTime,notes,amount,status)
         VALUES(?,?,?,?,?,?,?,0,'Pending')`,
        [
          request.userId,
          helperId,
          request.id,
          serviceName,
          bookingDate,
          bookingTime,
          request.location ? `Help location: ${request.location}` : "AI-matched community help request"
        ],
        function (insertErr) {
          if (insertErr) return callback(insertErr);
          db.get("SELECT * FROM bookings WHERE id=?", [this.lastID], (getErr, row) => {
            if (getErr) return callback(getErr);
            callback(null, bookingView(row));
          });
        }
      );
    }
  );
};

const connectionPayload = (request, helper, booking) => ({
  request: {
    id: request.id,
    userId: request.userId,
    title: request.title,
    description: request.description,
    category: request.category,
    urgency: request.urgency,
    location: request.location,
    latitude: request.latitude,
    longitude: request.longitude,
    status: request.status,
    adminStatus: request.adminStatus || "Pending",
    helperId: request.helperId,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    attachments: (() => { try { return JSON.parse(request.attachments || "[]"); } catch { return []; } })(),
    voiceTranscript: request.voiceTranscript || ""
  },
  helper: helper ? {
    id: helper.id,
    name: helper.name,
    phone: helper.phone,
    email: helper.email,
    skills: helper.skills,
    rating: helper.rating,
    trustScore: helper.trustScore,
    location: helper.location,
    latitude: helper.latitude,
    longitude: helper.longitude,
    available: Boolean(helper.available)
  } : null,
  booking,
  distanceKm: helper ? distanceKm(request.latitude, request.longitude, helper.latitude, helper.longitude) : null,
  connected: request.status === "Accepted",
  waitingForHelper: request.status === "Matched"
});

exports.createHelp = (req, res) => {
  const {
    title,
    description,
    category,
    location = "",
    urgency = "Normal",
    communityId = null,
    latitude = null,
    longitude = null,
    voiceTranscript = ""
  } = req.body;

  if (!title?.trim() || !description?.trim() || !category) {
    return res.status(400).json({ success: false, message: "Title, description and category are required." });
  }
  if (latitude === null || longitude === null || latitude === "" || longitude === "") {
    return res.status(400).json({ success: false, message: "Live GPS is required so AI can calculate a real distance." });
  }

  const detected = analyzeUrgency(`${title} ${description} ${voiceTranscript}`, urgency);
  const attachments = JSON.stringify(parseFiles(req.files));

  db.run(
    `INSERT INTO help_requests
      (userId,communityId,title,description,category,location,latitude,longitude,urgency,status,trustScore,attachments,voiceTranscript)
     VALUES(?,?,?,?,?,?,?,?,?,'Open',?,?,?)`,
    [req.user.id, communityId || null, title.trim(), description.trim(), category, location,
      latitude, longitude, detected.label, req.user.trustScore || 50, attachments, voiceTranscript || ""],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      const requestId = this.lastID;

      db.get("SELECT * FROM help_requests WHERE id=?", [requestId], (getErr, request) => {
        if (getErr) return res.status(500).json({ success: false, message: getErr.message });

        db.all("SELECT * FROM users WHERE available=1 AND id<>?", [req.user.id], (e, volunteers) => {
          if (e) return res.status(500).json({ success: false, message: e.message });

          const matches = findBestMatches({
            userId: req.user.id,
            title,
            description,
            voiceTranscript,
            category,
            location,
            latitude: Number(latitude),
            longitude: Number(longitude),
            urgency: detected.label
          }, volunteers, 5);

          const best = matches[0];
          if (!best) {
            return res.status(201).json({
              success: true,
              message: `Request created. No eligible helper is currently available inside the ${MAX_MATCH_DISTANCE_KM} km local radius.`,
              request: { ...request, attachments: JSON.parse(attachments), voiceTranscript },
              urgency: detected,
              matchingRadiusKm: MAX_MATCH_DISTANCE_KM,
              matches: [],
              booking: null,
              connection: null
            });
          }

          db.run(
            "UPDATE help_requests SET helperId=?,status='Matched',updatedAt=CURRENT_TIMESTAMP WHERE id=?",
            [best.volunteer.id, requestId],
            updateErr => {
              if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });

              db.get("SELECT * FROM help_requests WHERE id=?", [requestId], (requestErr, matchedRequest) => {
                if (requestErr) return res.status(500).json({ success: false, message: requestErr.message });

                // Create the connection immediately, but generate the booking only when a helper actually accepts.
                // This makes the booking ID represent a confirmed connection rather than a speculative match.
                matches.forEach(match => {
                  notify(
                    match.volunteer.id,
                    "New AI help request nearby",
                    `${req.user.name} needs help with ${title}. You are ${match.matchScore}% matched and ${match.distanceKm} km away. Open Offer Help to Accept or Decline.`,
                    "AI Match"
                  );
                });
                notify(req.user.id, "AI helper found", `${best.volunteer.name} is the current best nearby candidate. The helper has been notified. Waiting for confirmation.`, "AI Match");

                res.status(201).json({
                  success: true,
                  message: `AI matched ${best.volunteer.name}. Waiting for helper confirmation.`,
                  request: {
                    ...matchedRequest,
                    attachments: JSON.parse(attachments),
                    voiceTranscript
                  },
                  urgency: detected,
                  matchingRadiusKm: MAX_MATCH_DISTANCE_KM,
                  matches,
                  booking: null,
                  connection: connectionPayload(matchedRequest, best.volunteer, null)
                });
              });
            }
          );
        });
      });
    }
  );
};

const list = (where, args, req, res) => {
  db.all(
    `SELECT h.*,u.name requesterName,u.phone requesterPhone,hu.name helperName,c.name communityName
     FROM help_requests h
     JOIN users u ON u.id=h.userId
     LEFT JOIN users hu ON hu.id=h.helperId
     LEFT JOIN communities c ON c.id=h.communityId
     ${where} ORDER BY h.id DESC`,
    args,
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      rows = rows.map(row => ({
        ...row,
        attachments: (() => { try { return JSON.parse(row.attachments || "[]"); } catch { return []; } })()
      }));
      res.json({ success: true, requests: rows });
    }
  );
};

exports.getAllHelp = (req, res) => list("", [], req, res);
exports.getOpenHelp = (req, res) => list("WHERE h.status='Open'", [], req, res);
exports.getMyHelp = (req, res) => list("WHERE h.userId=? OR h.helperId=?", [req.user.id, req.user.id], req, res);

// Persistent connection endpoint. The requester and matched helper can refresh this
// record independently, so the connection does not depend on a temporary modal.
exports.getConnection = (req, res) => {
  const requestId = Number(req.params.id);
  if (!requestId) return res.status(400).json({ success: false, message: "Invalid help request ID." });

  db.get("SELECT * FROM help_requests WHERE id=?", [requestId], (err, request) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!request) return res.status(404).json({ success: false, message: "Help request not found." });
    if (request.userId !== req.user.id && request.helperId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "You are not part of this help connection." });
    }

    const loadHelperAndBooking = () => {
      db.get("SELECT * FROM users WHERE id=?", [request.helperId], (helperErr, helper) => {
        if (helperErr) return res.status(500).json({ success: false, message: helperErr.message });
        if (!helper) return res.json({ success: true, connection: connectionPayload(request, null, null) });

        if (request.status === "Accepted") {
          ensureBooking(request, request.helperId, (bookingErr, booking) => {
            if (bookingErr) return res.status(500).json({ success: false, message: bookingErr.message });
            res.json({ success: true, connection: connectionPayload(request, helper, booking) });
          });
        } else {
          res.json({ success: true, connection: connectionPayload(request, helper, null) });
        }
      });
    };

    if (request.helperId && request.status === "Matched") return loadHelperAndBooking();
    if (request.helperId && request.status === "Accepted") return loadHelperAndBooking();
    res.json({ success: true, connection: connectionPayload(request, null, null) });
  });
};

exports.getRecommendedForHelper = (req, res) => {
  const helper = req.user;
  if (!helper.available) return res.json({ success: true, available: false, message: "Turn on 'Available to help' to receive AI recommendations.", requests: [] });

  db.all(`SELECT h.*,u.name requesterName,u.phone requesterPhone FROM help_requests h JOIN users u ON u.id=h.userId WHERE h.status='Open' AND h.userId<>? ORDER BY h.id DESC`, [helper.id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, available: true, requests: findBestRequests(helper, rows, 10) });
  });
};

exports.getMatchedForHelper = (req, res) => {
  const helper = req.user;
  if (!helper.available) {
    return res.json({ success: true, available: false, requests: [] });
  }

  // AI-matched requests are visible to every eligible helper inside the local
  // radius. The first ranked helper is the preferred match, but other helpers
  // can see and accept it if the preferred helper declines or is unavailable.
  db.all(`
    SELECT h.*,u.name requesterName,u.phone requesterPhone,u.location requesterLocation,
           u.latitude requesterLatitude,u.longitude requesterLongitude,
           b.id bookingId,b.status bookingStatus
    FROM help_requests h
    JOIN users u ON u.id=h.userId
    LEFT JOIN bookings b ON b.helpRequestId=h.id
    WHERE h.userId<>?
      AND COALESCE(h.adminStatus,'Pending') <> 'Rejected'
      AND h.status IN ('Matched','Accepted','Open')
      AND (h.status<>'Accepted' OR h.helperId=?)
      AND NOT EXISTS (
        SELECT 1 FROM ai_match_decisions d
        WHERE d.helpRequestId=h.id AND d.helperId=? AND d.decision='Declined'
      )
    ORDER BY CASE WHEN h.status='Matched' THEN 0 WHEN h.status='Open' THEN 1 ELSE 2 END,
             h.updatedAt DESC,h.id DESC
  `, [helper.id, helper.id, helper.id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    const requests = rows.map(r => {
      const distance = distanceKm(r.latitude, r.longitude, helper.latitude, helper.longitude);
      return {
        request: {
          id: r.id, userId: r.userId, title: r.title, description: r.description,
          category: r.category, urgency: r.urgency, location: r.location,
          requesterName: r.requesterName, requesterPhone: r.requesterPhone,
          requesterLocation: r.requesterLocation,
          requesterLatitude: r.requesterLatitude, requesterLongitude: r.requesterLongitude,
          status: r.status, assignedToMe: Number(r.helperId) === Number(helper.id),
          createdAt: r.createdAt, updatedAt: r.updatedAt,
          attachments: (() => { try { return JSON.parse(r.attachments || "[]"); } catch { return []; } })(),
          voiceTranscript: r.voiceTranscript || ""
        },
        bookingId: r.bookingId || null,
        bookingCode: r.bookingId ? `CHH-${String(r.bookingId).padStart(6, "0")}` : null,
        bookingStatus: r.bookingStatus || null,
        distanceKm: distance === null ? null : Number(distance.toFixed(2)),
        eligible: distance !== null && distance <= MAX_MATCH_DISTANCE_KM,
        connectionStatus: r.status === "Accepted" ? "Connected" : "Waiting for helper response"
      };
    }).filter(x => x.eligible);

    res.json({ success: true, available: true, requests });
  });
};

exports.acceptHelp = (req, res) => {
  db.get("SELECT * FROM help_requests WHERE id=?", [req.params.id], (err, request) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!request) return res.status(404).json({ success: false, message: "Request not found." });
    if (String(request.adminStatus || "Pending") === "Rejected") return res.status(409).json({ success: false, message: "This request was rejected by the administrator." });
    const aiVisibleMatch = request.status === "Matched";
    if (request.status !== "Open" && !aiVisibleMatch) return res.status(409).json({ success: false, message: "Request is no longer available for this helper." });
    if (request.userId === req.user.id) return res.status(400).json({ success: false, message: "You cannot accept your own request." });

    const liveDistance = distanceKm(req.user.latitude, req.user.longitude, request.latitude, request.longitude);
    if (liveDistance === null || liveDistance > MAX_MATCH_DISTANCE_KM) {
      return res.status(409).json({ success: false, message: `You are no longer within the ${MAX_MATCH_DISTANCE_KM} km local matching radius. Refresh your GPS and try again.` });
    }

    db.run(
      "UPDATE help_requests SET status='Accepted',helperId=?,updatedAt=CURRENT_TIMESTAMP WHERE id=? AND (status='Open' OR status='Matched')",
      [req.user.id, req.params.id],
      function (updateErr) {
        if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });
        if (!this.changes) return res.status(409).json({ success: false, message: "Request was just accepted by another helper." });

        db.get("SELECT * FROM help_requests WHERE id=?", [request.id], (requestErr, updatedRequest) => {
          if (requestErr) return res.status(500).json({ success: false, message: requestErr.message });
          ensureBooking(updatedRequest, req.user.id, (bookingErr, booking) => {
            if (bookingErr) return res.status(500).json({ success: false, message: bookingErr.message });
            db.run("UPDATE bookings SET status='Confirmed' WHERE id=?", [booking.id], updateBookingErr => {
              if (updateBookingErr) return res.status(500).json({ success:false, message:updateBookingErr.message });
              const confirmedBooking = { ...booking, status: "Confirmed" };
              notify(request.userId, "Helper connected", `${req.user.name} accepted your request. Booking ${confirmedBooking.bookingCode} is confirmed.`, "AI Match");
              notify(req.user.id, "Connection confirmed", `You are now connected to ${request.title}. Booking ${confirmedBooking.bookingCode} is confirmed.`, "AI Match");
              res.json({ success: true, message: "Connected! The requester can now contact you. Booking confirmed.", helperId: req.user.id, requestId: Number(req.params.id), booking: confirmedBooking });
            });
          });
        });
      }
    );
  });
};

exports.declineHelp = (req, res) => {
  const requestId = Number(req.params.id);
  const reason = String(req.body?.reason || "Helper is unavailable").slice(0, 300);

  db.get("SELECT * FROM help_requests WHERE id=?", [requestId], (err, request) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!request) return res.status(404).json({ success: false, message: "Request not found." });
    if (request.userId === req.user.id) return res.status(400).json({ success: false, message: "The requester cannot decline their own request." });
    if (!["Matched", "Open"].includes(request.status)) return res.status(409).json({ success: false, message: "This AI connection is already confirmed or completed." });

    const distance = distanceKm(req.user.latitude, req.user.longitude, request.latitude, request.longitude);
    if (distance === null || distance > MAX_MATCH_DISTANCE_KM) {
      return res.status(409).json({ success: false, message: `You are outside the ${MAX_MATCH_DISTANCE_KM} km local matching radius.` });
    }

    db.run(
      `INSERT INTO ai_match_decisions(helpRequestId,helperId,decision,reason)
       VALUES(?,?,?,?)
       ON CONFLICT(helpRequestId,helperId) DO UPDATE SET decision=excluded.decision,reason=excluded.reason,createdAt=CURRENT_TIMESTAMP`,
      [requestId, req.user.id, "Declined", reason],
      insertErr => {
        if (insertErr) return res.status(500).json({ success: false, message: insertErr.message });

        db.all(
          "SELECT * FROM users WHERE available=1 AND id<>? AND id<>? AND NOT EXISTS (SELECT 1 FROM ai_match_decisions d WHERE d.helpRequestId=? AND d.helperId=users.id AND d.decision='Declined')",
          [request.userId, req.user.id, requestId],
          (volErr, volunteers) => {
            if (volErr) return res.status(500).json({ success: false, message: volErr.message });

            const matches = findBestMatches(request, volunteers, 5);
            const next = matches[0];

            if (!next) {
              db.run("UPDATE help_requests SET status='Open',helperId=NULL,updatedAt=CURRENT_TIMESTAMP WHERE id=?", [requestId], updateErr => {
                if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });
                notify(request.userId, "Helper declined", `${req.user.name} could not take your request. It is now visible to other nearby helpers.`, "AI Match");
                return res.json({ success: true, message: "Declined. The request is now available to other nearby helpers.", nextMatch: null });
              });
              return;
            }

            db.run("UPDATE help_requests SET status='Matched',helperId=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?", [next.volunteer.id, requestId], updateErr => {
              if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });

              notify(next.volunteer.id, "AI connection available", `${request.title} is now available for you. Review it in Offer Help and accept or decline.`, "AI Match");
              notify(request.userId, "New AI helper candidate", `${next.volunteer.name} is now the next nearby candidate for your request.`, "AI Match");
              res.json({
                success: true,
                message: `Declined. AI offered the request to ${next.volunteer.name}.`,
                nextMatch: next,
                booking: null
              });
            });
          }
        );
      }
    );
  });
};

exports.adminApproveHelp = (req, res) => {
  const requestId = Number(req.params.id);
  db.get("SELECT * FROM help_requests WHERE id=?", [requestId], (err, request) => {
    if (err) return res.status(500).json({ success:false, message:err.message });
    if (!request) return res.status(404).json({ success:false, message:"Help request not found." });
    db.run("UPDATE help_requests SET adminStatus='Approved', updatedAt=CURRENT_TIMESTAMP WHERE id=?", [requestId], function(updateErr) {
      if (updateErr) return res.status(500).json({success:false,message:updateErr.message});
      notify(request.userId, "Request approved", `Your help request "${request.title}" has been approved by the administrator and remains active for local AI matching.`, "Admin");
      if (request.helperId) notify(request.helperId, "Request approved", `The administrator approved "${request.title}". You can continue the AI connection.`, "Admin");
      res.json({success:true,message:"Help request approved.",requestId,adminStatus:"Approved"});
    });
  });
};

exports.adminRejectHelp = (req, res) => {
  const requestId = Number(req.params.id);
  const reason = String(req.body?.reason || "Request rejected by administrator.").slice(0,300);
  db.get("SELECT * FROM help_requests WHERE id=?", [requestId], (err, request) => {
    if (err) return res.status(500).json({success:false,message:err.message});
    if (!request) return res.status(404).json({success:false,message:"Help request not found."});
    const oldHelperId = request.helperId;
    db.run("UPDATE help_requests SET adminStatus='Rejected', status='Rejected', helperId=NULL, updatedAt=CURRENT_TIMESTAMP WHERE id=?", [requestId], function(updateErr) {
      if (updateErr) return res.status(500).json({success:false,message:updateErr.message});
      db.run("UPDATE bookings SET status='Cancelled', notes=COALESCE(notes,'') || ? WHERE helpRequestId=? AND status<>'Completed'", [`\nAdmin decision: ${reason}`, requestId]);
      notify(request.userId, "Request rejected", `Your help request "${request.title}" was rejected by the administrator. Reason: ${reason}`, "Admin");
      if (oldHelperId) notify(oldHelperId, "Request closed", `The help request "${request.title}" was rejected by the administrator.`, "Admin");
      res.json({success:true,message:"Help request rejected and closed.",requestId,adminStatus:"Rejected"});
    });
  });
};

exports.resolveHelp = (req, res) => {
  db.get("SELECT * FROM help_requests WHERE id=?", [req.params.id], (err, r) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!r) return res.status(404).json({ success: false, message: "Help request not found." });
    if (r.userId !== req.user.id && r.helperId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ success: false, message: "You cannot resolve this request." });
    db.run("UPDATE help_requests SET status='Completed',updatedAt=CURRENT_TIMESTAMP WHERE id=?", [r.id], e => {
      if (e) return res.status(500).json({ success: false, message: e.message });
      const other = r.userId === req.user.id ? r.helperId : r.userId;
      if (other) notify(other, "Help request completed", `The request "${r.title}" has been marked completed.`);
      res.json({ success: true, message: "Help request completed." });
    });
  });
};

exports.match = (req, res) => {
  const { category, title = "", description = "", location = "", latitude = null, longitude = null, urgency = "Normal" } = req.body;
  if (latitude === null || longitude === null || latitude === "" || longitude === "") return res.status(400).json({ success: false, message: "Live GPS location is required for realistic AI distance matching." });
  db.all("SELECT * FROM users WHERE available=1 AND id<>?", [req.user.id], (err, volunteers) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, matchingRadiusKm: MAX_MATCH_DISTANCE_KM, urgency: analyzeUrgency(`${title} ${description} ${category} ${urgency}`, urgency), matches: findBestMatches({ userId: req.user.id, title, description, category, location, latitude, longitude, urgency }, volunteers, 10) });
  });
};
