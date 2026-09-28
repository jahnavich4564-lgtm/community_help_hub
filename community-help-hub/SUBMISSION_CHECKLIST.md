# Submission Checklist

## Core flows
- [x] Login/register -> JWT -> authenticated API
- [x] Communities -> SQLite
- [x] Community join request -> admin approve/reject -> membership + notification
- [x] Request Help -> SQLite + urgency NLP + AI matching
- [x] Request Help -> real GPS distance
- [x] Request Help -> attachments
- [x] Request Help -> microphone recording
- [x] Request Help -> browser speech-to-text transcript
- [x] Offer Help -> skills + availability + live GPS
- [x] Offer Help -> AI recommended open requests
- [x] Offer Help -> accept request
- [x] Chat -> persistent two-way SQLite messages
- [x] Chat -> direct call option when phone is available
- [x] Notifications -> SQLite
- [x] Services -> SQLite
- [x] Booking -> SQLite
- [x] Payment -> SQLite
- [x] History -> live data
- [x] Profile -> live user data
- [x] Admin -> live statistics + newcomer approvals + request monitoring

## Distance correctness
- [x] Haversine calculation
- [x] No fabricated 50 km value
- [x] Missing GPS returns `null` instead of a fake distance
- [x] UI clearly labels unavailable GPS distance

## Final local verification
1. Run `npm install` in the project root.
2. Run `npm install` inside `server`.
3. Start backend on port 5000.
4. Start frontend with Vite.
5. Allow GPS and microphone permissions.
6. Test Request Help with text + attachment + voice.
7. Test AI match result and accept flow.
8. Test Offer Help availability and AI recommendations.
9. Create a community, join it from another account, then approve/reject from Admin.
10. Test Chat and the Call button.
11. Test booking/payment/history flows.
