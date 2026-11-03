# SAMAY judge demo runbook

This walkthrough uses a deterministic **demo proxy**. It is designed to show the product flow when government APIs and DigiLocker credentials are unavailable. The UI labels the proxy result so the demo does not claim to perform a live government verification.

## Start

```bash
cd server && npm install && npm run dev:mem
# in another terminal
cd client && npm install && npm run dev
```

Open the Vite URL, choose **Sign in**, and use **Instant Demo Access**. The chooser is populated from `server/data/demoUsers.json` and includes citizens from the four supplied specimens, officers across four states, and commission users.

## Citizen path (recommended 90-second walkthrough)

The Citizen screen opens with a four-step explanation and a curated specimen chooser. The **Tamil Nadu · start here** receipt is the best first example because its application date is 2 November 2026 and its expected date is 17 November 2026.

1. Set the **Demo date** in the top simulation bar to **3 November 2026**. This makes the countdown begin before the expected date, regardless of the computer’s clock.
2. Choose **Tamil Nadu · start here** in the Citizen walkthrough. The clearly labelled demo proxy returns the Community Certificate details for Arun Prakash. Point out the applicant-facing fact check and leave the acknowledgement fields visible.
3. Tick the confirmation that the fields match the slip, then start the clock. Explain that SAMAY is tracking the deadline and does not submit or alter the original application.
4. Click **Simulate delay** in the date bar. The demo date advances by 15 days. The tracked application becomes late and the appeal action becomes available.
5. Open the appeal draft. Explain that SAMAY prepares a reviewable draft; the citizen must check it and choose whether to copy, print, or use the demo dispatch action.
6. For the “wow” negative case, choose **Invalid example**. The proxy rejects this fixture and no clock is created. This is an intentional test verdict, not real identity verification.

If you want judges to see a physical receipt, upload the supplied Tamil Nadu image `WhatsAppImage2026-11-02at15.22.23.jpeg` instead of using the curated chooser. For a second valid example, use the Gujarat receipt `WhatsAppImage2026-11-02at15.24.32.jpeg`; use the invalid supplied specimen `Screenshotfrom2026-11-0214-40-20.png` to show fail-closed behavior. The page itself states the demo proxy limitation so it is not mistaken for a live government integration.

## Officer and commission paths

Use an officer from the main Gujarat Ahmedabad office. The Officer Radar contains a dense 15-application demo docket plus offices in Maharashtra, Tamil Nadu, Gujarat, and Uttar Pradesh. Use the office filter, search by acknowledgement number, tag a bottleneck reason, and mark a file done.

Use a commission account to open **Accountability & service recovery**. Start with a department card, then open the Ahmedabad demo office. In the drill-down, show masked delayed application references, service names, due dates, recorded bottleneck reasons, and synthetic officer profiles. Ask the Improvement Copilot for a reason-based recovery plan; with no provider key, its deterministic demo fallback still gives a useful suggestion. Choose **Prepare follow-up** to open an editable, copyable message draft. Explain that it is not transmitted because the repository has no verified officer contact directory or government messaging integration. The drill-down returns no citizen names and refuses small cohorts below k=5.

## What is real and what is mocked

The clock, appeal fact guard, audit chain, registry gate, UI flows, seeded demo data, and tests run locally. The four uploaded-slip extraction results and verification verdicts are deterministic demo fixtures. In demo mode, any file not matching a supplied fixture fails closed as an unverified specimen. Outside demo mode, the existing live-reader/local-OCR fallback remains available and must not be described as government-verified.
