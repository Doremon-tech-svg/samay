-- SAMAY schema. Dates are stored as ISO text (YYYY-MM-DD) on purpose: node-pg converts DATE columns to
-- JS Date objects in the server's timezone, which silently shifts deadlines. Text keeps the clock deterministic.
CREATE TABLE services (
  id text PRIMARY KEY,
  state_code text NOT NULL,
  service_key text NOT NULL,
  name text NOT NULL,
  department text,
  act_name text,
  days integer,                          -- NULL until a human fills it from the notified list
  day_type text NOT NULL DEFAULT 'calendar',   -- 'calendar' | 'working' (verify per Act/rules)
  status text NOT NULL DEFAULT 'draft',        -- 'draft' | 'approved' (clock refuses unapproved rules)
  designated_officer text,
  appellate_1 text,
  appellate_2 text,
  appeal_final text,
  penalty_note text,
  source_doc text,
  source_note text,
  verified_by text,
  verified_at text,
  source_snippet text,                   -- the exact source line the rule was compiled from
  flags text                             -- JSON array of validator flags; human must acknowledge before approval
);
CREATE TABLE offices (
  id text PRIMARY KEY, state_code text NOT NULL, district text, name text NOT NULL, level text
);
CREATE TABLE applications (
  id text PRIMARY KEY,
  ack_no text NOT NULL,
  service_id text NOT NULL REFERENCES services(id),
  office_id text NOT NULL REFERENCES offices(id),
  received_on text NOT NULL,
  channel text NOT NULL DEFAULT 'paper',
  applicant_alias text,                  -- no real names or Aadhaar numbers: minimal data by design
  language text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'PENDING',     -- 'PENDING' | 'DISPOSED'
  disposed_on text,
  reason_code text,
  created_at text NOT NULL
);
CREATE TABLE clock_pauses (
  id text PRIMARY KEY, application_id text NOT NULL REFERENCES applications(id),
  start_date text NOT NULL, end_date text, reason text NOT NULL
);
CREATE TABLE appeals (
  id text PRIMARY KEY, application_id text NOT NULL REFERENCES applications(id),
  level integer NOT NULL, addressed_to text NOT NULL, lang text NOT NULL, body text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT', created_at text NOT NULL, sent_at text
);
CREATE TABLE audit_log (
  id serial PRIMARY KEY, application_id text NOT NULL, event_type text NOT NULL,
  payload jsonb, prev_hash text NOT NULL, hash text NOT NULL, created_at text NOT NULL
);
CREATE INDEX idx_apps_office ON applications(office_id);
CREATE INDEX idx_audit_app ON audit_log(application_id);
