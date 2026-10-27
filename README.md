# SAMAY: UPI for service promises

> "The law promised her 15 days. Nobody told her."

SAMAY turns the **Right to Public Services** deadlines that about 30 Indian states have already legislated into working software:
a legal clock on every application, an automatic and correctly addressed appeal when the deadline slips, an early-warning radar
for the officer, and an accountability view for the State Commission. The burden of enforcing the right moves from the citizen to the system.

Built for **Build for Bharat 2026, Track 1 Software, PS 3 Open Innovation** (team Gryffindor).

**Status:** working prototype scaffold. See [`PROGRESS.md`](./PROGRESS.md) for exactly what is done and what is left, and
[`BUILD_PLAN.md`](./BUILD_PLAN.md) for the team workflow and demo script.

> **Read first: hackathon originality rule.** The event rules say solutions must be *built during the hackathon*. This scaffold was
> generated before the build window. Ask the organisers in writing whether pre-event starter code is allowed before you commit it to
> your team repository. If not allowed, use it as a design reference and rebuild during the event.

---

## Table of contents
1. [The problem and the idea](#1-the-problem-and-the-idea)
2. [What is in the box](#2-what-is-in-the-box)
3. [Architecture and design principles](#3-architecture-and-design-principles)
4. [Setup](#4-setup)
5. [Configuration reference](#5-configuration-reference)
6. [Using the app](#6-using-the-app)
7. [The Rights Compiler](#7-the-rights-compiler)
8. [API reference](#8-api-reference)
9. [Data model](#9-data-model)
10. [Testing and QA](#10-testing-and-qa)
11. [Troubleshooting](#11-troubleshooting)
12. [Project structure](#12-project-structure)
13. [Data, ethics and legal notes](#13-data-ethics-and-legal-notes)
14. [Team workflow](#14-team-workflow)

---

## 1. The problem and the idea

About 30 states have Right to Service laws that promise services (an income certificate, for example) within fixed days, with penalties
for delay. Enforcement depends on a citizen who must notice the delay, know the law, find the right appellate officer and file by hand.
Evidence from Maharashtra's CAG audit (Report No. 1 of 2023): of the audited services, 28.14% of decided applications were decided after the deadline in
2016-17 to 2020-21, 32.85 lakh applications were still pending in Nov 2021, and citizen awareness of the right was poor.

SAMAY standardises the **service promise** (service, deadline, officer, appeal path, penalty) as a machine-readable record, then:

| User | Gets |
|---|---|
| Citizen or helper (Seva Kendra, CSC) | Photo or text of the acknowledgement slip starts a legally computed countdown. At breach, one tap drafts an appeal to the right officer (English or Hindi). Works for paper applications. |
| Designated officer | A deadline radar sorted by legal risk, with reason codes that expose bottlenecks such as vacancies. |
| Commission / administrator | Office-level late rates and bottleneck reasons (aggregates only, small counts hidden). |

**Core rule:** the deadline is computed by deterministic code, never by an LLM. AI is used where it genuinely helps: compiling messy
notified-service lists into records (always human-approved) and reading slips.

## 2. What is in the box

| Capability | Where | State |
|---|---|---|
| Clock engine: calendar or working days, holidays, legal pauses, traffic-light states | `server/src/clock/` | Built, unit-tested |
| Rule registry with provenance, draft/approved gate | `server/data/registry.json`, `services` table | Built |
| Rights Compiler: heuristic + LLM extractors, code validator, flags, review screen, accuracy eval | `server/src/compiler/`, `client/src/pages/Compiler.jsx` | Built; LLM path not yet run against the real API |
| Slip parser (OCR text to fields) and optional browser OCR | `server/src/services/slipParser.js`, `client/src/ocr.js` | Parser tested; photo OCR untested |
| Appeals: blocked before breach, escalates level 1, 2, Commission; English and Hindi templates with a fact guard | `server/src/services/appealDrafter.js` | Built, tested |
| Tamper-evident audit log (SHA-256 hash chain) | `server/src/services/auditChain.js` | Built, tested |
| Officer radar, Commission map (k-anonymity, k=5) | `server/src/app.js`, `client/src/pages/` | Built (map is a ranked table, not a geographic map) |
| Hindi/English UI for the citizen screen, read-aloud, speech input | `client/src/i18n.js`, `voice.js` | Built; Hindi text needs native review; voice depends on device |
| PWA (installable, app shell cached) and offline queue for new applications | `client/vite.config.js`, `offlineQueue.js` | Built; not browser-tested |
| Demo time travel (`x-demo-date`) | server `DEMO_MODE=1`, header date picker | Built |
| Synthetic demo data on fictional offices | `server/db/seedData.js` | Built |

## 3. Architecture and design principles

```
 Public notified lists (text)               Paper slip (photo or text)
        |                                          |
  [Rights Compiler]                         [OCR -> slip parser -> user confirms]
  LLM or heuristic extract                         |
  -> code validator (flags)                        |
  -> DRAFT rows                                    |
        |                                          |
  [Human review screen: approve / edit / reject]   |
        |  approved rules only                     v
        +--------------> services ----------> [Clock engine (pure code)] <- holidays, pauses
                                                   |
                          applications + audit_log (hash chain)
                                                   |
              +------------------+-----------------+------------------+
        Citizen/Helper       Officer radar      Commission map       Appeals
        (EN/HI, voice,       (risk-sorted,      (aggregates,         (draft -> send,
         offline queue)       reason codes)      k >= 5)              L1 -> L2 -> Commission)
```

Principles enforced in code:
1. **No AI in the deadline.** `clockEngine.js` has no I/O and no model calls. `asOf` must be passed explicitly.
2. **Human gate.** A rule starts as `draft`. Only `approved` rules can start a clock. Flagged rules need an explicit acknowledgement; a rule without days, officer or first appeal authority can never be approved.
3. **Source on every rule.** The exact source line is stored with the rule and shown beside the fields during review.
4. **Appeals only after a real breach**, addressed to the next officer in the notified chain, with a guard that the text contains the application number, deadline, days and addressee.
5. **Tamper-evident, not tamper-proof.** The hash chain detects later edits. It does not prove the facts were true.
6. **Privacy by minimisation.** No names or Aadhaar numbers. Commission view hides offices with fewer than 5 applications.

Stack: PostgreSQL, Express (Node 20+), React 18 with Vite, `pg`, `vite-plugin-pwa`, optional `tesseract.js` for slip photos.

## 4. Setup

### 4.0 Prerequisites
- **Node.js 20 or newer** (developed and tested on Node 22) and npm. Check with `node -v`.
- **Git**.
- Optional, only for a real database: **Docker Desktop**, or a native PostgreSQL 14+ install.
- Optional, only for the LLM extractor: an Anthropic API key.
- A modern Chrome or Edge is recommended for voice features and PWA testing.

Get the code (zip or repository) and open a terminal in the project root (the folder containing `server/` and `client/`).

### 4.1 Fastest path: no Docker, no database install (recommended for development and for the stage demo)
This uses an in-memory PostgreSQL emulator (pg-mem) seeded with the real schema, the rule registry and synthetic data. **Data resets on every restart.**

Terminal 1 (API):
```bash
cd server
npm install
npm run dev:mem          # API on http://localhost:4000, demo mode ON
```
Terminal 2 (UI):
```bash
cd client
npm install
npm run dev              # UI on http://localhost:5173 (proxies /api to :4000)
```
Open http://localhost:5173.

### 4.2 With a real PostgreSQL via Docker
```bash
docker compose up -d                       # starts postgres:16 on port 5432 (user/pass/db: samay)
cd server
cp .env.example .env                       # Windows PowerShell: copy .env.example .env
npm install
npm run db:init -- --synthetic             # creates tables, loads rules, adds synthetic demo data
npm run dev                                # API on :4000 (reads DATABASE_URL from .env)
```
> **Warning: `npm run db:init` runs `DROP SCHEMA public CASCADE`. It permanently deletes every table and row in the target database.**
> Point `DATABASE_URL` only at a database you are happy to wipe. Omit `--synthetic` to load rules and offices without demo applications.

Then start the client as in 4.1.

### 4.3 With a native PostgreSQL install (no Docker)
Create a role and database, then set `DATABASE_URL`:
```sql
CREATE USER samay WITH PASSWORD 'samay';
CREATE DATABASE samay OWNER samay;
```
```
DATABASE_URL=postgres://samay:samay@localhost:5432/samay
```
Continue from the `db:init` step in 4.2.

### 4.4 Production build and PWA / offline testing
The service worker is only active in a production build, not in `npm run dev`.
```bash
cd client
npm run build
npm run preview          # serves dist/ on http://localhost:4173 (proxy to :4000 is inherited from vite config)
```
Offline test: open the preview URL, let it load once, then in Chrome DevTools go to Application > Service Workers and tick **Offline** (or use Network > Offline).
Reload: the shell should still open. See the checklist in section 10.

### 4.5 Enable the LLM extractor for the Rights Compiler
In `server/.env`:
```
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=a-model-id-your-account-can-use
```
Restart the API. In the Compiler tab choose "LLM". Test from the terminal and get the accuracy table:
```bash
cd server
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=... npm run eval:compiler
```
Never commit `.env`. It is already in `.gitignore`.

### 4.6 Verify the install
```bash
cd server && npm test          # 27 unit tests
cd server && npm run smoke     # 19 end-to-end API checks on in-memory Postgres
cd client && npm test          # 5 unit tests (i18n parity, summaries, offline queue)
cd client && npm run build     # compiles the UI and generates the service worker
```
All four should pass. If they do, the install is good.

## 5. Configuration reference

| Variable | Where | Default | Meaning |
|---|---|---|---|
| `DATABASE_URL` | server `.env` | none (required for `npm run dev`, `db:init`) | PostgreSQL connection string. Not used by `dev:mem` or `smoke`. |
| `PORT` | server | `4000` | API port. If you change it, update the proxy in `client/vite.config.js`. |
| `DEMO_MODE` | server | `0` (`dev:mem` forces it on) | `1` lets the client send `x-demo-date` to simulate "today". **Never enable for a real pilot.** |
| `LLM_PROVIDER` | server | `heuristic` | Default extractor for the Compiler: `heuristic` or `anthropic`. |
| `ANTHROPIC_API_KEY` | server | none | Needed for the `anthropic` provider. |
| `ANTHROPIC_MODEL` | server | `claude-sonnet-5-5` | Model id sent to the API. Set it to one your account can use. |

Data files in `server/data/`:
`registry.json` (rules and offices), `states.json` (Act name and default final appeal authority per state), `vocab.json` (known authorities per state),
`holidays.json` (**only 3 national dates; add each state's gazetted holidays**), `fixtures/` (compiler test list and gold labels).

## 6. Using the app

**Header:** language toggle (EN / हिन्दी, remembered), online/offline indicator, and the **demo date** picker with +1 and +5 day buttons (time travel).

**Citizen / Helper tab**
1. Use the sample slip, paste slip text, take a photo (OCR), or dictate (mic button, browser-dependent).
2. Click **Read slip**, check the service, application number, date and office, then **Confirm and start legal clock**.
3. The right panel shows the ring (days left or late), due date, legal basis, who decides, the appeal chain and the rule source.
4. **Office raised a query** pauses the clock; **answered** resumes it. (Only the `QUERY_TO_APPLICANT` pause is allowed. Confirm the legal basis for pauses per state.)
5. When breached, **One tap: draft appeal** creates the next-level appeal. Print or "Send (mock)".
6. **Read aloud** speaks the status in English or Hindi if the device has a voice for it.
7. Offline: new applications are saved on the device and sync when back online (shown with a dashed "offline" tag). Duplicates are ignored by the server.

**Officer radar tab:** open applications sorted by risk. Pick a reason code (awaiting verification, vacancy, file movement, documents) or mark decided.

**Commission map tab:** offices ranked by late rate with bottleneck reasons. Demo offices are fictional and performance numbers are synthetic.

**Rights Compiler tab:** paste a notified-service list, choose state and extractor, compile, review drafts against their source lines, approve.

**Demo script (9 minutes):** see `BUILD_PLAN.md` section 8. Start the demo date at **2026-10-05**, use the sample slip, then jump to 10-15 (amber), 10-21 (breached), draft the appeal in English then Hindi.

## 7. The Rights Compiler

Flow: paste text, extractor returns raw rows, the validator (code) builds **draft** rows with flags, a human approves.

**Rows rejected outright:** `EMPTY_NAME`, `NOT_FOUND_IN_SOURCE` (no source line contains the service name: hallucination guard).

**Flags (a human must acknowledge before approval):**

| Flag | Meaning |
|---|---|
| `DAYS_MISSING` | No day count extracted. Cannot be approved until a number is entered. |
| `DAYS_INVALID(n)` | Not an integer from 1 to 365. Value cleared. |
| `DAYS_NOT_IN_SOURCE_AS_DIGITS` | The number does not appear as digits in the source line (for example "thirty"). Check by eye. |
| `DAY_TYPE_ASSUMED_VERIFY` | Source line does not say calendar or working. Defaulted to calendar. Verify from the Act. |
| `DESIGNATED_OFFICER_NOT_IN_SOURCE`, `APPELLATE_1_...`, `APPELLATE_2_...`, `APPEAL_FINAL_...` | That authority text is not in the source line. |
| `UNKNOWN_AUTHORITY(x)` | Authority is not in the state's controlled vocabulary. Extend `vocab.json` if legitimate. |
| `APPEAL_FINAL_MISSING` | No final authority and no state default. Fill it in (the KA default is intentionally empty). |
| `DUPLICATE_IN_BATCH` | Same service name twice in one paste. |

**Heuristic extractor** reads pipe tables with headers like `Service | Days | Designated Officer | First Appellate | Second Appellate`. It is an offline fallback and baseline, not a general parser.
**Accuracy:** `npm run eval:compiler` compares against `server/data/fixtures/lists.gold.json`. The shipped gold file is a 6-row **fixture**. For a number you can quote, hand-label 30-50 real services and replace it.

## 8. API reference

All paths are under `/api`. JSON in and out. With `DEMO_MODE=1`, send `x-demo-date: YYYY-MM-DD` to override today.

| Method and path | Purpose |
|---|---|
| `GET /health` | Liveness |
| `GET /registry/services?state=&status=` | List rules (`status=approved` or `draft`), flags parsed |
| `GET /registry/offices` | List offices |
| `POST /compiler/run` `{text, state, provider?}` | Compile into draft rules. Never overwrites approved rules. Returns created, updated, skipped, rejected |
| `PATCH /registry/services/:id` | Edit a draft; flags recomputed against the stored source line |
| `DELETE /registry/services/:id` | Reject (delete) a draft |
| `POST /registry/services/:id/approve` `{verifiedBy, acknowledgeFlags?}` | The human gate. 422 if flags unacknowledged or rule incomplete |
| `POST /ocr/slip` `{text}` | Parse slip text into `{fields, missing}` |
| `POST /applications` | Start a clock. 422 if the rule is not approved. 409 with `duplicate:true` if same ack no. and service exist |
| `GET /applications`, `GET /applications/:id` | List, or detail with computed clock, appeals, next appeal target |
| `POST /applications/:id/pause`, `/resume` | Legal pause on or off |
| `POST /applications/:id/dispose` | Mark decided |
| `PATCH /applications/:id/reason` `{reasonCode}` | Officer bottleneck reason |
| `POST /applications/:id/appeals` `{lang?}` | Draft the next appeal. 409 unless breached |
| `POST /appeals/:id/send` | Mock dispatch, written to the audit log |
| `GET /radar?officeId=` | Open applications by risk |
| `GET /commission/offices` | Per-office aggregates with suppression |
| `GET /audit/:applicationId` | Events plus hash-chain verification |

There is **no authentication yet** (see PROGRESS.md). Do not expose this API publicly.

## 9. Data model

`services` (rules: days, day_type, officers, appeal chain, penalty note, source doc and snippet, flags, status, verified_by),
`offices`, `applications` (ack no., service, office, received_on, channel, status, disposed_on, reason_code),
`clock_pauses`, `appeals` (level, addressed_to, body, status), `audit_log` (hash chain per application).
Dates are stored as ISO text (`YYYY-MM-DD`) on purpose: node-pg converts `DATE` columns to JavaScript Date objects in the server timezone, which can silently shift deadlines.
Full DDL: `server/db/schema.sql`.

## 10. Testing and QA

**Automated** (run before every merge to main)
- `cd server && npm test`: 27 unit tests (clock engine 9, appeal drafter 3, slip parser 4, compiler 11).
- `cd server && npm run smoke`: 19 end-to-end API checks including tamper detection, the compiler approval gate, second-state clock, duplicate handling.
- `cd client && npm test`: 5 tests (Hindi/English key parity, summaries, offline queue).
- `cd client && npm run build`.

**Manual browser QA (not yet done; do this once, then before every demo)**
1. Fresh start with `dev:mem`. Sample slip, Read slip, start clock: ring shows 15 days.
2. Set demo date to 2026-10-15: amber. 2026-10-21: breached, "1 day late". Draft appeal; switch to हिन्दी; draft again; Hindi text appears.
3. Officer tab shows the application near the top. Commission tab ranks Office C highest.
4. Compiler tab: Load sample list, compile as KA, see 6 drafts with flags. Approve one with the checkbox; confirm another with missing days cannot be approved. Start a clock on the approved KA rule.
5. Hindi UI: toggle language, check no clipped text. Click Read aloud in both languages; note whether a Hindi voice exists on the demo laptop (if not, you will see the "no voice" message).
6. Offline: after `npm run build && npm run preview`, load once, set DevTools to Offline, reload (shell opens), start a clock (appears as queued), go online (it syncs, no duplicate).
7. Print the appeal to PDF.

## 11. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `DATABASE_URL is not set` | You ran `npm run dev` without `.env`. Use `npm run dev:mem` or create `.env` (section 4.2). |
| UI loads but shows "HTTP 500" or fetch errors | API not running on :4000, or port changed. Start the API; update the proxy in `vite.config.js` if you changed `PORT`. |
| `ECONNREFUSED 5432` | Postgres not running. `docker compose up -d` and wait a few seconds. |
| "this rule is not human-approved yet" | By design. Approve the rule in the Compiler tab. |
| "no breach yet" when drafting an appeal | By design. Move the demo date past the due date. |
| Clock looks stale after changing the demo date in the production build | The service worker caches API GETs by URL, not by `x-demo-date`. Hard-refresh, or test time travel with `npm run dev` (no service worker). |
| Photo OCR fails | tesseract.js downloads language data on first use and needs network. Paste the slip text instead; for offline, host the traineddata locally. |
| No Hindi voice | Device lacks a Hindi TTS voice (common on desktop). Install one in OS speech settings, or demo on a phone. |
| Speech input does nothing | Browser lacks SpeechRecognition (Firefox) or needs network (Chrome). Use text. |
| `npm test` says "Could not find src/" | Use the provided script (it uses a glob): `npm test`. |
| Compiler returns 502 | LLM call failed. Read the message (missing key, wrong model id, no network). Use the heuristic extractor as fallback. |

## 12. Project structure

```
samay/
  README.md  PROGRESS.md  BUILD_PLAN.md  docker-compose.yml  .gitignore
  server/
    package.json  .env.example
    db/        schema.sql  seedData.js  init.js  devMem.js  smoke.js
    data/      registry.json  states.json  vocab.json  holidays.json  fixtures/
    src/
      index.js  app.js  db.js
      clock/       clockEngine.js (+ test)
      compiler/    providers.js  validate.js  compile.js  eval.js  runEval.js (+ test)
      routes/      compilerRoutes.js
      services/    auditChain.js  appealDrafter.js  slipParser.js (+ tests)
  client/
    package.json  vite.config.js  index.html
    public/    icons (png, svg)
    src/       main.jsx  App.jsx  api.js  i18n.js  voice.js  offlineQueue.js  ocr.js  ui.jsx  styles.css  i18n.test.js
      pages/   Citizen.jsx  Officer.jsx  Commission.jsx  Compiler.jsx
```

## 13. Data, ethics and legal notes
- **Synthetic data only**, on **fictional** offices ("Demo Tahsil Office A"). Never attach synthetic performance numbers to real named offices.
- **No scraping** of portals that disallow automated access (Karnataka's Sakala site disallows it). Use public documents you may copy, published aggregates, and synthetic applications.
- **No real names or Aadhaar numbers** are stored. Applicant alias only.
- Appeals are **drafts, not legal advice.** The UI says so. A human reviews before sending.
- Statutory facts used in the seed rules (timelines, officers) come from a public district notified list; **whether days are calendar or working is unverified**. Verify before the demo.
- Penalty figures quoted in documents are from public pages and summaries (Maharashtra up to Rs 5,000 per case; Odisha up to Rs 250 per day). Check the Act text.
- Any real pilot needs authentication, consent and DPDP Act review, and `DEMO_MODE` off.

## 14. Team workflow
`main` always runs. One branch per task (`feat/...`), small pull requests, a second person reviews, squash merge. Tag `demo-safe` at every good checkpoint.
`npm test`, `npm run smoke` and `npm run build` must pass before merging. File ownership and the 36-hour timeline are in `BUILD_PLAN.md`.
