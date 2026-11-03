# SAMAY demo feature handoff

Copy the bundle contents into the repository root, preserving paths, and replace existing files where listed. It includes the earlier Citizen/demo/Copilot integration plus the expanded Commission oversight console.

## Add these files
- `docs/JUDGE_DEMO.md` (updated judge walkthrough)
- `docs/demo-rules-sources.md`
- `server/data/demoUsers.json`
- `server/src/commission.test.js`
- `server/src/services/copilot.js` (if not already present)
- `server/src/services/copilot.test.js` (if not already present)

## Replace/update these files
- `README.md`
- `client/src/App.jsx`
- `client/src/api.js`
- `client/src/ocr.js`
- `client/src/pages/AuthPage.jsx`
- `client/src/pages/Citizen.jsx`
- `client/src/pages/Commission.jsx`
- `client/src/pages/Landing.jsx`
- `client/src/styles.css`
- `server/.env.example`
- `server/data/registry.json`
- `server/db/seedData.js`
- `server/src/app.js`
- `server/src/index.js`
- `server/src/services/demoSlipBank.js`
- `server/src/services/slipParser.js`

## Delete
None.

## Commission feature behavior
- Clickable department filters and office cards/table drill-down.
- Office-level department summaries, delayed/at-risk application list, masked reference IDs, due dates and recorded delay reasons.
- Assigned officer names/IDs are explicitly synthetic. No citizen names or personal officer phone/email details are exposed.
- Reason-specific improvement suggestions plus an “Ask AI” action. Without model credentials it uses a deterministic demo Copilot fallback.
- Editable, copyable follow-up message drafts. No live email/phone/WhatsApp or government dispatch is connected and no message is sent.
- Server enforces the k-anonymity threshold before returning case-level office detail; cohorts below 5 are suppressed.

## Verification
Server tests: 41 passed, including new Commission endpoint/privacy tests. Client tests: 5 passed. Server smoke checks passed. Client production build passed. Demo records and officer profiles are synthetic; do not present them as official department performance or real staff/contact information.
