# SAMAY: end-to-end build plan and workflow

## 0. Read this first: the "built during the hackathon" rule
The event rules say solutions must be **original and built during the hackathon**. The code in this repo was generated ahead of time as a
**reference scaffold**. Before you push any of it to your team repo, ask the organisers in writing whether pre-event boilerplate/AI-generated
starter code is allowed. If the answer is no or unclear, **do not commit this scaffold**: use it as a design reference and write your own code
during the build window (the plan below still works; the architecture, schema, API contract and tests are the valuable part). Be ready to
explain exactly what you built at the event.

## 1. Status: what exists and what does not
(Detailed log, deck-vs-build gaps and the full to-do list are in `PROGRESS.md`; setup is in `README.md`.)
| Piece | Status |
|---|---|
| Clock engine (calendar/working days, holidays, legal pauses, traffic-light states) | Built, 9 unit tests pass |
| Postgres schema, rule registry seed (3 Maharashtra services), audit hash chain | Built, tested |
| API: registry, applications, pause/resume, dispose, appeals (blocked before breach, escalates L1>L2>Commission), radar, commission map (k-anonymity), audit verify | Built, smoke-tested end to end on an in-memory Postgres emulator (not on real Postgres) |
| Appeal drafter (English, Hindi), fact guard | Built, tested |
| Slip text parser | Built, tested; **photo OCR (tesseract.js) is wired but NOT tested here** (needs network for language data) |
| React client: Citizen/Helper, Officer radar, Commission map, Rights Compiler review screen, demo time-travel | Built, compiles; **not browser-tested** |
| **Rights Compiler**: heuristic extractor, Anthropic LLM extractor, code validator (source-line check, flags, hallucination reject), draft/approve/edit/reject API, review screen, field-level eval script | Built. Heuristic path tested (27 tests + smoke). **LLM path tested only with an injected fake fetch: run it once with your real API key** (`LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=... npm run eval:compiler`) |
| Gold set for the accuracy number | Only a 6-row FIXTURE (3 real-mirrored + 3 fictional rows). **Team must hand-label 30-50 real services** and replace `data/fixtures/` |
| Second-state "add live" demo | Mechanism built and smoke-tested with fixture text as KA. **Real Karnataka list not compiled**; `states.json` KA final authority left null on purpose |
| Hindi/English citizen UI, read-aloud, speech input, PWA (installable, cached shell), offline queue for new applications | Built, unit-tested where pure (i18n parity, summaries, queue); **not browser-tested** |
| WhatsApp/SMS mock and day-10 notifications | NOT built (deck mentions a day-10 update; see PROGRESS.md section C) |
| Auth/roles, real Postgres run, deployment | NOT built (demo uses open endpoints). See PROGRESS.md section D for the full remaining list |

## 2. Architecture and data flow
```
 Public notified lists (PDF/HTML)            Paper slip photo
        |                                         |
  [Rights Compiler: LLM + validator]        [OCR -> slipParser -> user confirms]
        |  draft rows                             |
  [Human approval UI] --approved--> services <----+--- (service, ack no, date)
                                       |                    |
                                  [Clock engine: deterministic] <-- holidays, pauses
                                       |
   applications + audit_log (hash chain)  --->  Citizen screen (ring, rights, one-tap appeal)
                                       |------>  Officer radar (sorted by risk, reason codes)
                                       |------>  Commission map (aggregates, k>=5)
```
Principles: the LLM never computes a deadline or decides routing; unapproved rules cannot start a clock; appeals only after a real breach;
every state change is hash-chained; synthetic data only, fictional office names.

## 3. Quickstart: see README.md
## 4. Team workflow
**Roles (file ownership avoids merge conflicts)**
| Person | Owns | First deliverable |
|---|---|---|
| 1 Backend/clock | `server/src/clock`, `server/src/app.js`, schema | API contract frozen by hour 4; clock edge cases from section 7 verified |
| 2 Rules and AI | `server/src/compiler/` (new), `server/data`, OCR accuracy | Gold set of labelled services by hour 6; compiler v1 by hour 14 |
| 3 Frontend | `client/` | Three screens usable by hour 14; Hindi + voice by hour 26 |
| 4 Research and pitch | `docs/`, demo data, slides, evidence | Verified source table by hour 6; demo script rehearsed by hour 33 |

**Git:** `main` always runs. Branch per task (`feat/compiler`, `feat/hindi-ui`), small PRs, another person reviews, squash merge. Tag `demo-safe` at every
working checkpoint so you can always roll back. Commit messages say what and why. No force pushes.
**Rhythm:** 10-minute standup every 4 hours; one shared list of blockers; integration build at hours 12, 24, 30.

## 5. Timeline (36 hours)
| Hours | Goal | Done means |
|---|---|---|
| 0-4 | Setup, scope freeze, API contract, verify rules (section 7) | Everyone runs the app locally; gold set started |
| 4-12 | Citizen flow end to end with real rules | Scenario A (slip -> clock -> breach -> appeal) works |
| 12-20 | Rights Compiler v1 + approval UI; officer radar polish | Compiler produces valid draft rows from 2 public lists |
| 20-26 | Second state compiled live; Hindi UI/voice; commission map | Scenario B (add Karnataka live) works |
| 26-30 | Accuracy numbers, OCR test, offline run, README | Metrics table filled, offline demo passes |
| 30 | **Feature freeze.** Bug fixes only | Tag `demo-final` |
| 30-36 | Dry runs with timer, backup video, Q and A drills | Two clean full dry runs |

## 6. The Rights Compiler (build this: it is your AI centrepiece)
1. **Input:** text of a notified-service list (copy from PDF/HTML you are allowed to use; do not scrape portals that disallow it).
2. **Extraction:** call an LLM with a strict JSON schema: `service name, department, days, day_type, designated_officer, appellate_1, appellate_2, final_authority, penalty_note, source_doc, source_clause`.
   Prompt rules: extract only what is in the text; use null if absent; never guess numbers; return one object per service.
3. **Validation (code, not LLM):** days is an integer 1-365 or null; officer names must come from a controlled vocabulary per state; reject rows missing a source;
   flag duplicates; flag any value not found verbatim in the source text.
4. **Draft rows** are inserted as `status='draft'`. The existing `/api/registry/services/:id/approve` endpoint is the human gate; add a small review screen that shows
   the source snippet beside each field with Approve / Edit / Reject.
5. **Accuracy test (your reportable number):** hand-label 30-50 services from two public lists (the gold set). Report field-level precision/recall for `days`, `officer`, `appellate_1`, `appellate_2`. Also report how many rows the validator caught.
6. **Offline demo:** run the compiler live only if network is allowed; otherwise show a recorded run and load precompiled registry JSON.
Interface suggestion: `compile(text, state) -> rows[]` behind a provider switch (`LLM_PROVIDER=anthropic|openai|mock`) so the demo works with a mock if the API is down.

## 7. Facts to verify before you trust the clock (do not skip)
- Are statutory days **calendar or working** days for each service (set `day_type` accordingly; the three Maharashtra rows are currently `calendar` unverified).
- Does day 0 count as the receipt date or the next day? (Engine: day 0 = receipt date.)
- Which legal events pause the clock (query to applicant, document deficiency) and who may declare them. (Engine supports pauses; the API allows only `QUERY_TO_APPLICANT`.)
- State holiday lists (only 3 national dates are in `holidays.json`).
- Appeal time windows and where/how each appeal is filed (the drafter does not assert section numbers; add them only from the Act text).
- Penalty provisions per state (Maharashtra: up to Rs 5,000 per case per district RTS pages; Odisha: up to Rs 250 per day per the Act summary).

## 8. Demo script (9 minutes) and exact clicks
Server `DEMO_MODE=1`, demo date starts **2026-10-05**.
1. (1:00) Evidence slide: Maharashtra CAG figures; the story of the farmer's daughter.
2. (2:30) Citizen tab: "Use sample slip" -> Read slip -> confirm -> start clock. Show ring (15 days), rights panel (officer, appeal chain, source).
3. Header: set date to **2026-10-15** -> ring turns amber. Open Officer radar in a second tab: the application appears at the top with days left.
4. Set date **2026-10-21** -> breached (1 day late). Back to Citizen: "One tap: draft appeal" -> English, then switch to Hindi -> Send (mock). Point at the tamper-evident log "chain valid".
5. (5:30) Commission tab: fictional offices ranked by late rate, bottleneck reasons (vacancy, verification).
6. (6:30) Scenario B: compile a second state's list live (or recorded) -> approve -> start a clock. "Two states, one engine."
7. (8:00) Numbers: compiler accuracy, OCR accuracy, tests passing. Limitations and path. (9:00) Close.
Backup: screen recording of steps 2-5; run from `dev:mem` so no database is needed on stage.

## 9. Test and evaluation plan
- `npm test` (clock, drafter, parser) and `npm run smoke` must pass before every merge to main.
- Add clock tests for every service you demo (holiday edge cases, pause cases).
- Compiler accuracy (section 6) and slip OCR accuracy on 20 photographed or printed slips (field-level accuracy).
- Usability: 3-5 people outside the team complete "start a clock and draft an appeal"; record time and where they stalled.

## 10. Risks and fallbacks
| Risk | Fallback |
|---|---|
| LLM API unavailable | `LLM_PROVIDER=mock` with precompiled registry; recorded compiler run |
| Photo OCR fails or is offline | Paste-text box and sample slip (already in UI) |
| Wrong rule shown | Approval gate + visible source; verify demo services against the notified list the night before |
| Browser/network issues on stage | Run `dev:mem` locally, backup video |
| Scope creep | Freeze at hour 30; anything not done is a roadmap slide |
| Rules question from a judge | Show section 7 list: you know exactly what is verified and what is not |

## 11. Ethics and data rules
Synthetic applications on fictional offices only. Never attach performance numbers to real named offices. No scraping of portals that disallow automated access
(Karnataka's Sakala site does). No real names or Aadhaar numbers anywhere. State clearly that drafts are a drafting aid, not legal advice.
