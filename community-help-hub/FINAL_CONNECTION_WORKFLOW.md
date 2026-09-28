# FINAL CONNECTION WORKFLOW

## Requester
1. Log in.
2. Open Request Help.
3. Capture live GPS.
4. Submit the request.
5. HelpHub AI immediately opens a persistent Connection Center.
6. The best eligible helper is shown when available.
7. Booking ID is created and shown with the AI match.
8. The connection stays active and is refreshed from SQLite.
9. When a helper accepts, the requester sees Connected and can Chat/Call.

## Helper
1. Open Offer Help.
2. Set skills, live GPS and Available to help.
3. AI-matched requests inside 1.5 km appear automatically in AI Connection Center.
4. Helper sees requester name, request details, urgency, distance, voice transcript/files and booking.
5. Helper can Accept & Connect or Decline.
6. If declined, AI selects the next eligible helper; if none exists, the request becomes Open and remains visible to nearby helpers.
7. Accepting confirms the booking and reassigns the booking to the accepting helper.

## Floating HelpHub AI
The chatbot is interactive:
- It asks for the user's need.
- It checks live GPS and previews a real match.
- If a helper is found, the user can explicitly Send connection request.
- If none is available, the user can Post request to nearby helpers.
- It does not invent a helper or repeatedly show a generic "no helper" statement.
- The full Request Help page remains available for file uploads and voice/NLP.

## Matching rules
- Real GPS coordinates only.
- Maximum matching radius: 1.5 km.
- No fake 50 km fallback.
- Skill relevance, urgency, availability, trust, rating and proximity are scored.
