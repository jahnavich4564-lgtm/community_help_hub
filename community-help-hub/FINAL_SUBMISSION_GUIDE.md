# Community Help Hub — Final Submission Build

## Final user flow

1. Login as a requester.
2. Open **Request Help**.
3. Enter the need, optional voice/files, and allow live GPS.
4. Submit **Submit & Connect Me to a Helper**.
5. AI immediately ranks eligible helpers within the **1.5 km local radius**.
6. If a helper is found, the system creates one linked booking and shows the persistent **AI Connection Center** on the Request Help page.
7. The requester can **Open Chat** or **Call Helper**. The connection survives refresh because the request ID is stored locally and the database is polled every 2 seconds.
8. The helper opens **Offer Help** and sees the requester in **AI Connection Center**.
9. The helper chooses **Connect & Accept**. The help request becomes `Accepted` and the linked booking becomes `Confirmed`.
10. The booking code is shown in the connection card, the booking page, and History as `CHH-XXXXXX`.

## Distance rules

- Matching requires valid requester and helper GPS coordinates.
- Maximum AI matching distance is **1.5 km**.
- No artificial 50 km fallback is used.
- If GPS is missing, the person is not eligible for an AI distance match.

## AI chatbot

The floating HelpHub AI starts with no misleading placeholder/upload message. It asks for the user's real need, obtains live GPS, checks the backend matcher, and offers Chat/Call or a full persistent request.

## Server

```powershell
cd server
npm.cmd install
npm.cmd start
```

Expected backend:

`http://localhost:5000`

## Frontend

Open a second terminal:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the Vite URL shown in the terminal.

## Existing database

The ZIP contains the preserved `server/community_help_hub.db`. Do not replace it after extraction.

## Demo accounts

If they exist in the preserved database:

- Admin: `admin@communityhub.local` / `Admin@12345`
- Demo helper: `user@communityhub.local` / `User@12345`

For the most realistic demo, create or edit a second user with:

- Available to help: ON
- Live GPS: ON
- Relevant skills

Then create a request from another account within 1.5 km.
