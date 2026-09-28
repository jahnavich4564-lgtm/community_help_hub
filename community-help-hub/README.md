# AI Powered Community Help Hub

A full-stack community assistance platform built with React + Vite, Node.js + Express and SQLite.

## Submission-ready features

### AI Help Matching
- Request Help creates a real SQLite help request.
- AI detects urgency from typed text and voice transcript.
- AI ranks available helpers by skill relevance, availability, trust, rating and **real GPS distance**.
- AI helper matching uses real GPS coordinates and only considers eligible helpers within the 1.5 km operational radius. GPS is never fabricated.
- Offer Help has an AI recommendation feed for open requests and lets helpers accept a request.

### Request Help
- Live browser GPS capture.
- Optional community selection.
- File upload: up to 5 attachments, 10 MB each.
- Image/PDF/document/audio support.
- Browser microphone recording.
- Browser speech recognition (`SpeechRecognition`/`webkitSpeechRecognition`) converts spoken requests into text.
- The resulting transcript is included in AI urgency detection and matching.
- Uploaded files are stored under `server/uploads/help`.

### Communities
- Create and browse communities.
- Join requests use the applicant's GPS location.
- Community admins can review pending members.
- Approve/reject actions persist to SQLite.
- Approved members are added to `community_members`.
- Notifications are generated for decisions.

### Chat & calling
- Persistent two-way SQLite chat.
- Contact list is based on conversations, shared communities and available helpers.
- Messages refresh automatically.
- Direct `tel:` call button appears whenever a phone number is available.

### Admin Control Center
- Live statistics.
- Newcomer/community join approval queue.
- GPS distance and radius verification.
- Approve/reject controls.
- Help request monitoring and resolution.
- Users, bookings and payments monitoring.

## Run locally

### 1. Frontend
```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

### 2. Backend
Open a second terminal:
```bash
cd server
npm install
npm start
```

Backend:
- `http://localhost:5000`
- `http://localhost:5000/health`

If PowerShell blocks `npm.ps1`, use:
```powershell
npm.cmd install
npm.cmd run dev
```

## Demo accounts

- Admin: `admin@communityhub.local` / `Admin@12345`
- User/helper: `user@communityhub.local` / `User@12345`

Change these passwords before public deployment.

## Important browser permissions

The Request Help and Offer Help flows use device GPS. Request Help voice recording uses the browser microphone. Allow both permissions when prompted.

Speech recognition support depends on the browser. The microphone recording itself still works where `MediaRecorder` is supported.

## Project structure

- `src/` - React frontend
- `src/pages/` - application pages
- `src/components/` - reusable UI and GPS components
- `server/` - Express API
- `server/controllers/` - business logic
- `server/services/aiMatcher.js` - AI-style matching and urgency logic
- `server/services/geo.js` - Haversine GPS distance calculations
- `server/config/db.js` - SQLite schema, migrations and demo seed
- `server/uploads/help/` - uploaded help attachments
- `server/community_help_hub.db` - local SQLite database

## API highlights

- `POST /api/help` - authenticated multipart help request + AI matching
- `GET /api/help/recommended` - AI recommendations for an available helper
- `POST /api/help/match` - live helper matching
- `PUT /api/help/accept/:id` - accept a help request
- `POST /api/communities/:id/join` - request community membership
- `PUT /api/communities/approve/:requestId` - approve newcomer
- `PUT /api/communities/reject/:requestId` - reject newcomer
- `GET /api/messages/:userId` - chat history
- `POST /api/messages/:userId` - send chat message
- `GET /api/admin/*` - admin dashboard APIs

## Submission verification

Backend JavaScript syntax was checked after the final modifications. The supplied review environment could not run a fresh `npm install` because its package registry did not contain the project's ESLint package, so run `npm install` on the submission machine before final demonstration.


---

For the final submission flow, see `FINAL_SUBMISSION_GUIDE.md`.
