# SAMAY: progress log

Last updated: 27 Oct 2026. Team: Gryffindor (Divyank Richhariya, Deepika Kumari, Anushka Yadav, Athar Yadav).
Event: Build for Bharat 2026, Track 1 Software, PS 3 Open Innovation.

This file has four parts: **A. what we did** (in order, with reasons), **B. verification status** of every fact and test,
**C. gaps between the submitted deck and the current build**, **D. everything left to do** (prioritised, with acceptance criteria).

---

## A. What we did, in detail

### Phase 0: choosing the idea (research and elimination)
Goal: find a winning idea for Track 1 (government digital services for the next billion citizens).

| Idea | What it was | Why it was dropped or kept |
|---|---|---|
| Multilingual voice scheme chatbot | Voice assistant for schemes in Indian languages | Dropped. Crowded: Bhashini reports 800+ government sites and 24M+ AI inferences a day, and VoicERA (open-source voice AI stack) launched Feb 2026. Matches the "decorative chatbot" the PS warns against. |
| Nyaya-Patha | "Why was I rejected and what do I do?" document-mismatch engine (Aadhaar name/DOB mismatch, rule engine, fix plan) | Liked, not chosen. Evidence: Lok Sabha figure of 2,08,903 failed Aadhaar validations in Maharashtra student data. |
| CONTEST-ALLOC | Neuro-symbolic eligibility with counterfactual recourse, audit trace, contestation; Layer 2 participatory budgeting | Reviewed in a 15-page dossier. Strong core, but scope too wide, Layer 2 weak, several citations unverified (Karusala, TALAAN, VoiceSetu, IJCAI/LLMRule papers) and design flaws found (counterfactual could encourage falsification; self-generated hash trace proves little). |
| SETU | Life-event orchestration with contestability, motivated by Haryana PPP failures | Researched and redesigned. Verified Haryana Assembly figures (9,60,235 yellow cards discontinued, 1,30,068 re-issued, 21,034 pensions withheld). Found: the comparison was off-target (Haryana harms were removals, SETU mainly added benefits), life events can be forged (fake death certificate case), LLM role was thin. Redesigned with an Event Trust Gate and adverse-action circuit breaker. Idea briefs produced. |
| "Digital arrest" shield | Real-time protection against government-impersonation fraud | Kept as a backup. Large scale (241,537 cases 2022-25, INR 3,012 crore) but real-time analysis of WhatsApp calls cannot be demoed honestly. |
| **SAMAY** | Service-guarantee engine: legal clocks, one-tap appeals, officer radar, Commission view; "UPI for service promises" | **Chosen.** Best evidence (CAG audit-grade), least competition, demoable, feasible on PERN, clear AI role that is not decorative. |

### Phase 1: researching SAMAY and checking facts
Searches and reads done: Right to Service laws across states, CAG Maharashtra audit, Karnataka Sakala, Delhi e-SLA, Rajasthan and Kerala enforcement,
existing citizen tools (Aaple Sarkar, Sakala app, e-SLA), NeGD/NCeG material, penalty provisions.
Result: a 4-page idea brief with problem, scale, impact ladder, architecture, a judge's scorecard and risks (`SAMAY_Idea_Brief.pdf`).
Important finding: Karnataka's Sakala dashboard blocks automated access (robots rule), so the project must not depend on scraping. Design uses public documents, published aggregates, synthetic data.

### Phase 2: deck review and submission fields
Reviewed the submitted deck (`SAMAY_finaLBWB.pdf`) and wrote the idea title and abstract. Raised three deck fixes (see section C).

### Phase 3: build, foundation (server)
- **Clock engine** (`server/src/clock/clockEngine.js`): pure functions. `computeDueDate` (Nth counting day after receipt, day 0 = receipt date), `elapsedCountingDays`, `clockStatus` (ON_TIME, AT_RISK in the final third, BREACHED, COMPLETED_ON_TIME, COMPLETED_LATE). Supports calendar or working days, weekends, holidays, and legal pauses (open pauses stop the clock). `asOf` is mandatory so tests are deterministic. Dates are UTC ISO strings to avoid timezone bugs.
- **Schema** (`server/db/schema.sql`): services (rules), offices, applications, clock_pauses, appeals, audit_log. Dates stored as text on purpose (node-pg would otherwise shift DATE values by timezone).
- **Rule registry seed**: three Maharashtra services from a public district notified list: Income Certificate (15 days; Nayab Tahsildar; Tahsildar; Sub Divisional Officer), Agriculturist Certificate (7; Tahsildar; Sub Divisional Officer; Additional Collector), Landless Labour Certificate (15; Tahsildar; SDO; Additional Collector); final appeal to the State Commission. One Karnataka stub left as a draft the clock refuses.
- **Audit chain** (`auditChain.js`): SHA-256 over previous hash, event type, timestamp and canonicalised payload; `verifyChain` detects edits.
- **Appeal drafter** (`appealDrafter.js`): template-first (English and Hindi), pulls every legal fact from the rule and the clock; `assertFacts` guard rejects text missing the application number, days, due date or addressee (so a later LLM rewrite cannot drop them). `nextAppealTarget` walks level 1, 2, Commission and skips levels with no authority on record.
- **Slip parser** (`slipParser.js`): turns OCR text into ack number, date (three formats) and service (unique match only).
- **API** (`server/src/app.js`): registry, applications, pause/resume, dispose, reason codes, appeals (blocked before breach), mock send, radar (sorted by risk), Commission aggregates (k-anonymity, k=5), audit verification, demo time travel via `x-demo-date`.
- **Synthetic data** (`db/seedData.js`): deterministic generator on **fictional** offices (A low late rate, B medium, C high) so a map is readable without defaming a real office.
- **Dev ergonomics**: `dev:mem` (in-memory Postgres emulator, no install), `smoke.js` (end-to-end API test), Docker compose for real Postgres.

### Phase 4: build, client
React (Vite) app with four tabs: Citizen/Helper (slip to clock, ring, rights panel, pause/resume, one-tap appeal, print, audit badge), Officer radar (risk sorted, reason codes, mark decided), Commission map (ranked table with late-rate bars), Rights Compiler (see Phase 5). Header has demo-date time travel.

### Phase 5: Rights Compiler (the main AI component)
- **Providers** (`compiler/providers.js`): `heuristic` (offline pipe-table reader, also the test baseline) and `anthropic` (Messages API with a strict system prompt: extract only what is written, null if absent, copy source lines verbatim). `parseJsonArray` strips code fences.
- **Validator in code** (`compiler/validate.js`): finds the source line for each row (hard reject if none: hallucination guard); flags days not in the source, day type assumed, authorities not in the source line, unknown authorities (controlled vocabulary), missing final authority, duplicates. State defaults (Act name, final authority) come from `states.json`.
- **Human gate** (`routes/compilerRoutes.js`): run compiler writes **drafts only**; approved rules are never overwritten; edit recomputes flags against the stored source line; approval needs `verifiedBy`; flagged rules need `acknowledgeFlags`; a rule without days, officer, first appellate or source can never be approved.
- **Eval** (`compiler/eval.js`, `runEval.js`): field-level precision and recall for days, officer, appellate 1 and 2 against a gold file. Baseline on the 6-row fixture: heuristic days precision 100%, recall 83% (misses "thirty"), authorities 100%.
- **Review screen** (`client/src/pages/Compiler.jsx`): source line beside editable fields, flag badges, save/approve/reject.
- **Second state "live"**: compile a Karnataka list, approve, start a clock on the same engine. Smoke-tested with fixture text labelled KA.

### Phase 6: Hindi, voice, PWA, offline (this session)
- **i18n** (`client/src/i18n.js`): full English and Hindi strings for the citizen screen, global language toggle (remembered). A unit test enforces key parity between languages. `clockSummary` builds the sentence used for read-aloud.
- **Voice** (`voice.js`): read-aloud through the browser speech engine (refuses to read Hindi with an English voice; shows a message if no Hindi voice exists) and speech input for dictating slip text (feature-detected).
- **PWA** (`vite.config.js`): manifest, icons (192, 512, maskable), Workbox service worker with app-shell precache and NetworkFirst caching for registry/applications/audit GETs.
- **Offline queue** (`offlineQueue.js`): new applications made offline are saved in localStorage and replayed when online. Each carries an explicit `receivedOn`, so a late sync does not move the deadline. Server now returns `409 duplicate:true` for the same ack number and service, which makes replays idempotent. Online/offline indicator in the header.

### Phase 7: documentation
`README.md` (this repo's full guide and setup), `PROGRESS.md` (this file), `BUILD_PLAN.md` (team workflow, timeline, demo script).

---

## B. Verification status

### B1. Tests (as of this log)
| Suite | Result | Notes |
|---|---|---|
| Server unit tests (`npm test`) | 27 pass | clock 9, appeal drafter 3, slip parser 4, compiler 11 |
| API smoke test (`npm run smoke`) | 19 checks pass | runs on **pg-mem, not real PostgreSQL** |
| Client unit tests (`npm test`) | 5 pass | i18n parity, summaries, offline queue |
| Client build (`npm run build`) | passes | service worker, manifest and icons generated |
| Real PostgreSQL run | **not done** | schema and queries were only exercised on the emulator |
| Browser click-through | **not done** | nobody has run the UI in a browser |
| Offline/PWA behaviour in a browser | **not done** | only build artifacts checked |
| LLM extractor against the real API | **not done** | plumbing tested with an injected fake fetch |
| Photo OCR (tesseract.js) | **not done** | needs network for language data |
| Hindi text review by a native speaker | **not done** | strings written by an AI assistant |

### B2. Facts used in the pitch
| Fact | Status | Source |
|---|---|---|
| Maharashtra: 788.11 lakh applications 2016-17 to 2020-21; 32.85 lakh pending Nov 2021; 23.31 lakh pending over a year | Verified (via CAG report text in search results) | CAG Report No. 1 of 2023 |
| 212.55 lakh (28.14%) disposed after notified time, in the audited services | Verified | same |
| Citizen awareness of the right was poor; portal lacked information on offline applications | Verified (wording from audit text) | same |
| About 30 states have RTS Acts, 7 have Commissions | Verified (NCeG slide, Sept 2024). Other sources say "20+": use "about 30" with the source, or "20+" if you cannot cite | NCeG presentation; RGICS |
| Karnataka: 1,249 notified services across 107 institutions (Oct 2024) | Verified | NeGD Sakala directory |
| Karnataka dashboard: about 5.5 crore within due date, about 33 lakh after, 2,002 compensation appeals | **Snapshot, undated. Verify before quoting** | Sakala dashboard (search snippet) |
| Rajasthan 5.81 crore complaints, just over Rs 23,000 penalties | Verified but **old (about 2018)** | India Legal |
| Kerala: no record of penalties | Verified (2024) | South First |
| Delhi e-SLA: 65.02% in time, 26.73% beyond | Verified from the live page at time of search; may have changed | esla.delhi.gov.in |
| Income certificate: 15 days, Nayab Tahsildar, Tahsildar, SDO | Verified from a public district list | district RTS page |
| Penalty up to Rs 5,000 per case (Maharashtra); up to Rs 250 per day (Odisha) | From district pages and an Act summary. **Check the Act text** | Maharashtra RTS pages; Odisha RTPS Act summary |
| Calendar vs working days for each service | **Unknown. Seed rows assume calendar** | needs the Act and rules |
| "63% of citizens surveyed did not know their rights" (deck slide 2) | **Not verified by us** | deck cites CAG paras 2.8, 2.9 |
| "89% of applications come through Seva Kendras" (deck slide 5) | **Not verified by us** | deck cites paras 2.7, 2.8.6 |
| "Late disposals fell to about 5% by 2020-21", "7.63 lakh late in 2020-21", "53 of 506 notified services" (deck) | **Not verified by us** | deck cites CAG |

---

## C. Gaps between the submitted deck and the current build
A judge may probe each of these. Fix the build or reword the slide.

| Deck says | Reality now | Action |
|---|---|---|
| Day 10: "Citizen gets a calm update" | No notification feature. The status only changes colour in the UI | Build a mock notification outbox (D, P1-1) or reword |
| "Second appeal is pre-drafted" | The second appeal is drafted on request after a breach, not in advance | Pre-generate the next-level draft when level 1 is sent (D, P1-2) or reword |
| "Commission's map" | A ranked table, not a map | Build simple tile/heat view or call it "accountability view" |
| "Appeal drafter (AI): Template + AI, checked against the rule" | Template only. No LLM involved | Add an optional LLM polish/translate step that must pass `assertFacts`, or label it "template" |
| "Accuracy (to report): compiler [X%] / slip OCR [Y%]" | Compiler baseline exists on a 6-row fixture. No OCR evaluation exists | Hand-label gold set (D, P0-4) and build OCR eval (D, P1-3) |
| "Runs offline" | The in-memory API runs without internet. PWA offline is built but untested. LLM compiler and first-time photo OCR need internet | Test offline end to end; state precisely what works offline |
| "Maharashtra, Karnataka: building now"; "Second state added live" | The mechanism works, but no real Karnataka list is compiled | Compile and verify a real Karnataka list (D, P0-5) |
| Chart labels "1.0 2.0 3.0" and "7600.0" (slide 5) | Slide formatting | Change to 1% / 5% / 10% and 7,600 |
| "20+ states" (slide 5) vs about 30 | Inconsistent with the NCeG figure | Pick one and cite |
| "2.12 crore" decided late (slide 2) | CAG figure is 212.55 lakh = 2.1255 crore. 2.12 truncates; rounding gives 2.13. Also state the scope: audited services only | Write "2.13 crore" or "212.55 lakh" and add "in 53 audited services" if that is the scope |

---

## D. Everything left to do

Roles from `BUILD_PLAN.md`: **R1** backend/clock, **R2** rules and AI, **R3** frontend, **R4** research and pitch. Hours are rough estimates.

### P0: must be done before the demo
| ID | Task | Owner | Est. | Done when |
|---|---|---|---|---|
| P0-1 | Ask organisers about pre-built starter code (originality rule). Decide commit vs rebuild | R4 | 0.5h | Written answer saved; decision recorded |
| P0-2 | Browser QA of every screen using the checklist in README section 10 | R3 | 2h | All 7 checklist items pass; bugs ticketed |
| P0-3 | Verify clock semantics from the Act and rules: calendar vs working days; whether day 0 is the receipt date; which events pause the clock; appeal time windows | R1 + R4 | 3h | A short note per demo service, `day_type` corrected, edge tests added |
| P0-4 | Hand-label a **gold set of 30-50 real services** from public lists; replace `data/fixtures/` | R2 | 4h | `npm run eval:compiler` prints real numbers |
| P0-5 | Compile a **real Karnataka list** (from a source you may use), fill KA final authority in `states.json`, approve rules | R2 | 3h | Karnataka clock runs; scenario B works live |
| P0-6 | Run the LLM extractor with a real key; compare with heuristic on the gold set | R2 | 2h | Accuracy table for both providers |
| P0-7 | Hindi review by a native speaker (UI strings and the Hindi appeal template) | R3 | 1h | Corrections merged |
| P0-8 | Run on **real PostgreSQL** (Docker) and confirm the same smoke flow | R1 | 1.5h | Smoke equivalent passes on Postgres; fix any pg-mem vs Postgres differences |
| P0-9 | Fix deck items in section C (chart labels, unverified 63% and 89%, "building now", state count) and fill accuracy numbers | R4 | 2h | Every slide number has a source or is removed |
| P0-10 | Dry runs with a timer (two clean runs), backup screen recording, final `demo-safe` tag | all | 3h | Two clean 9-minute runs |

### P1: should do (raises scores)
| ID | Task | Owner | Est. | Done when |
|---|---|---|---|---|
| P1-1 | Notification outbox: day-10 amber message and breach message (mock SMS/WhatsApp text, stored and shown in a citizen inbox and officer "nudge sent" view) | R1 + R3 | 4h | At the risk threshold a message appears; test added |
| P1-2 | Pre-generate the next-level appeal draft when a level is sent; show as "ready" | R1 | 2h | Slide claim true; test added |
| P1-3 | Slip OCR evaluation: 20 photographed or printed slips with labelled fields; script reports field accuracy | R2 | 3h | OCR accuracy number for the deck |
| P1-4 | Authentication and roles (citizen/helper, officer, compiler reviewer, commission) with JWT; protect approve, dispose, reason, commission endpoints; stop exposing `x-demo-date` outside demo | R1 | 5h | Unauthorised calls get 401/403; tests added |
| P1-5 | Optional LLM polish/translation for appeals that must pass `assertFacts` | R2 | 3h | Fallback to template if the guard fails |
| P1-6 | Commission view: tile or heat visual, bottleneck chart, export CSV | R3 | 3h | Visual works with 3+ offices |
| P1-7 | Replace N+1 loops in radar/commission with SQL joins; add pagination | R1 | 3h | Fast with 5,000 synthetic rows |
| P1-8 | Holiday calendars per state (only 3 national dates now) | R4 | 2h | Source-cited lists for MH and KA |
| P1-9 | Host tesseract traineddata locally so photo OCR works offline; or document the warm-up step | R3 | 2h | Photo OCR works in airplane mode after warm-up |
| P1-10 | Service names in Hindi (add `name_hi` to the registry) so read-aloud and Hindi UI are fully Hindi | R2 + R3 | 2h | No English service names in Hindi mode |

### P2: nice to have / roadmap
- Offline queue for more actions (pause, dispose, appeals), with conflict handling.
- Demo caveat fix: include `x-demo-date` in the service worker cache key (or bypass caching in demo mode).
- Voice-driven full flow in Hindi; additional languages (Marathi, Kannada).
- Accessibility audit (contrast, keyboard, screen reader, large text).
- HTTP-level automated tests against a real Postgres in CI; GitHub Actions running `npm test`, `npm run smoke`, `npm run build`.
- Dockerfiles for server and client; one-command deployment.
- Integration with official status pages or APIs where a state permits; helper pilot with a CSC or Seva Kendra.
- Rate limiting, input schema validation (for example zod), tighter CORS, security review.
- Data protection review for any pilot (DPDP Act, consent, retention); remove `DEMO_MODE`.
- Compiler: PDF text extraction, Hindi/Marathi/Kannada source lists, confidence scores, side-by-side diff for edited fields.

---

## E. Known limitations of the current build
- **No authentication.** Any caller can approve rules, mark applications decided, or set reason codes. Do not expose publicly.
- **Pause logic is minimal:** one reason (`QUERY_TO_APPLICANT`), no cap on pause length, legal basis unverified per state.
- **Holiday list is minimal** (3 national dates). Working-day clocks are unreliable until state holidays are added.
- **Day semantics unverified** (calendar vs working, receipt-day counting).
- **Offline scope is narrow:** only new applications are queued. Audit timestamps for queued items reflect the sync time (the clock itself uses the slip date).
- **Dedupe key** is ack number plus service. Two offices could in principle issue the same ack number.
- **Service worker caches API GETs by URL**, so demo time travel can look stale in a production build.
- **pg-mem is not PostgreSQL.** Behaviour may differ (types, constraints, performance).
- **Commission aggregates** are per-office only; no geography, no time series.
- **Hindi** strings are unreviewed; service names stay English in Hindi mode.
- **Voice** depends on device voices and browser support; Hindi TTS is often missing on desktops.
- **LLM extractor** sends pasted text to a third-party API. Do not paste anything sensitive.
- **Scale:** radar and commission endpoints query per application (fine for hundreds, slow for thousands).

## F. Open questions
1. Is pre-event starter code allowed by the organisers?
2. Are statutory days calendar or working for each demo service, and does day 0 count?
3. Which real Karnataka (or second-state) list can we legally use as source, and what is its final appeal authority?
4. Who is the native Hindi reviewer?
5. Will the demo machine have a Hindi voice, network, and a camera? (Decide the fallbacks accordingly.)
6. Slide and speech must use the same number and the same scope as the CAG text (audited services, 2016-17 to 2020-21). Re-read paras 2.8 and 2.9 and match the wording exactly.

## G. How to re-verify everything quickly
```bash
cd server && npm install && npm test && npm run smoke && npm run eval:compiler
cd ../client && npm install && npm test && npm run build
```
Expected: 27 unit pass, 19 smoke checks pass, compiler table prints (days recall 83% on the fixture), 5 client tests pass, build succeeds with a service worker.
