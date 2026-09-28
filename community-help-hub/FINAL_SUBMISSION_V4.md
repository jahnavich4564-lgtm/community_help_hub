# Community Help Hub — Final Submission V4

## Final workflow

1. Seeker opens **Request Help** and submits text, optional files, and voice/NLP transcript with live GPS.
2. AI immediately analyzes urgency, skills, trust, availability, and real GPS distance.
3. Only helpers within **1.5 km** are eligible.
4. The seeker sees a **persistent Live AI Connection Center** immediately. It does not disappear after the matching animation.
5. The current best candidate is shown to the seeker while **all eligible available helpers** can see the request in **Offer Help → AI Connection Center**.
6. Helpers can **Accept & Connect** or **Decline**. A decline is recorded and AI offers the request to the next eligible helper.
7. A booking ID is generated **when a helper actually accepts**, and the booking becomes **Confirmed**.
8. The requester sees the same booking ID and can Chat or Call the connected helper.
9. The admin dashboard continuously refreshes help requests and provides **Approve** and **Reject** controls. Rejecting closes the request and cancels any linked booking; approving marks the request as administrator-approved.
10. Community Feed has functional **Open my connection / Open in AI matching** actions instead of a non-functional status-only control.

## Admin demo account

The backend seeds this account if it is missing:

- Email: `admin@communityhub.local`
- Password: `Admin@12345`

## Helper demo account

- Email: `user@communityhub.local`
- Password: `User@12345`

## Important

Keep the existing SQLite database when moving the project. The server performs migrations automatically, including the `adminStatus` field for older databases.
