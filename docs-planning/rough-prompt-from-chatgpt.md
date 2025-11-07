SYSTEM:
You are an expert full-stack engineer and secure health-IT developer. You will act as an autonomous developer agent producing a production-quality "mid" version of an Ontario Online Appointment Booking (OAB) system that matches Ontario Health OAB v2.0 expectations and PHIPA best practices. You must be conservative about PHI — never output or store real patient data. Work iteratively, create a Git repo scaffold, meaningful commits, feature branches, and an initial PR `feat/mid-prod` that contains the mid-version deliverable. Always create TODOs and human-review checkpoints for legal/security items you cannot complete automatically.

USER (TASK):
Goal: Build a **production-ready mid version** of an Online Appointment Booking system targeted at a small rural Family Medicine clinic like the Middlesex Centre / Ilderton site. Use **only fictional/synthetic** patient and clinician data. Seed DB with **25 patients** and **6 physicians** matching the local clinic composition. Deliver a runnable repo (Docker + docker-compose), TypeScript stack, tests, CI, OpenAPI, admin UI, audit logs, RBAC, and documentation for compliance artifacts (PIA/TRA/SOC2 placeholders). Do not attempt to deploy live or call external production services.

Context used to shape realism: public clinic info indicates this site is a Thames Valley Family Health Team location, a Western University teaching site, staffed by six family physicians and interdisciplinary allied health supports; serve a small/rural population. Use this as inspiration only — all data must be fictional. (Reference: Middlesex Centre / Ilderton clinic public listings.) :contentReference[oaicite:1]{index=1}

ACCEPTANCE CRITERIA (deliver these in PR `feat/mid-prod`):
1. Repo + scaffold
   - TypeScript backend (Node + Fastify or Express) with OpenAPI (Swagger) served at `/docs`.
   - React + TypeScript frontend (Vite) with accessible UI components and Tailwind or plain CSS.
   - Docker + docker-compose for full local stack (app, db, migrations).
   - DB: PostgreSQL with migrations (Prisma or Knex).
   - CI: GitHub Actions that run lint, typecheck, unit tests, and basic accessibility check (axe/lighthouse CLI).
2. Core features (mid version)
   - Public booking UI: provider list, appointment types, pick date/time, modality (in-person / video / phone), confirm booking, show confirmation page.
   - Admin UI: manage providers, appointment types/durations, open/close OAB windows, approve/decline bookings, basic reporting (bookings count, cancellations).
   - Real-time availability: implement a **PoS adapter interface** and a **mock PoS adapter** for local testing (no real EMR calls). Provide hooks for future FHIR adapter. Two-way near-real-time sync must be simulated for MVP (mocked).
   - Notifications system: templated confirmations & reminders, outbound queue with **adapter interface** (mock email and mock SMS); DO NOT call live gateways.
   - Audit logging: persist create / update / cancel actions with userId (or null), action, payload (redacted), IP, userAgent, timestamp.
   - RBAC & auth: admin and clinic_staff roles; JWT dev keys; protect admin endpoints.
3. Data residency & PHI guardrails
   - The app must refuse to enable PHI storage unless ENV `CANADA_PHIPA_READY=true` **and** a human sets it. Default is false. If false, DB seeds only contain synthetic data and PHI fields are disabled/cleared.
   - Provide `security/TO_DO.md` listing legal artifacts required (PIA, TRA, SOC2, pen-test report) and instructions for human signoff.
4. Testing
   - Unit tests (Jest) covering booking logic and audit logging.
   - E2E tests (Playwright or Cypress) for the booking happy path and cancel flow.
   - CI runs tests and fails PR if tests fail.
5. Docs & developer ergonomics
   - README: local dev steps, env variables, migrations, seed script, running tests, running E2E.
   - `seed/seedData.json` with 6 fictional physicians and 25 fictional patients (see seed spec below).
   - OpenAPI spec with at least: `GET /providers`, `GET /availability?providerId&date`, `POST /bookings`, `PUT /bookings/:id`, `GET /audit-logs`.
   - PR description includes an acceptance checklist and step-by-step instructions for a human reviewer to validate and run the system locally.
6. Security / compliance automation
   - TLS in docker (self-signed) for local dev.
   - Input validation (Zod) on critical endpoints.
   - Rate limiting on public endpoints.
   - Log redaction helper: automatically redact `ssn`, `mrn`, `dob` from logs and show how to toggle redaction rules; add tests asserting redaction.
   - `security/artifacts/README.md` explaining how to obtain SOC2/ISO27001 and how to surface pen-test results in repo.
7. Developer workflow rules (must be followed)
   - Branching: `feat/<short>`, `fix/<short>`, `chore/<short>`.
   - Small, atomic commits with descriptive messages (examples below).
   - Create PR `feat/mid-prod` containing the mid-version; include acceptance checklist and run commands.
   - Add TODO comments where human review/legal signoff is required.
   - All changes must be reproducible via `docker-compose up --build`.
8. Data & seed spec (REQUIRED STRUCTURE)
   - **Clinic / Providers**
     - 1 clinic entity: fictional name "Ilderton Family Health - Demo" (do not use real staff names).
     - 6 physicians (fictional) with specialties = Family Medicine, each with:
       - id (uuid), displayName, team (A/B/C), workingHours (Mon-Fri ranges), rosterStatus (open/closed).
   - **Patients**: 25 fictional patients; distribution:
     - Age groups: 6 children (0–17), 10 adults (18–64), 9 seniors (65+).
     - Gender mix ~50/50 M/F with 1–2 nonbinary.
     - Mix of chronic conditions: diabetes (3), COPD/asthma (4), hypertension (6), pregnancy (1), no chronic conditions (rest).
     - Preferred notification channel: email(60%), sms(30%), voice(10%).
     - Rostered flag: ~80% rostered, 20% unrostered (simulate those seeking care).
     - Languages: primarily English; include 2 patients with French preference.
     - Contact fields: name, fake_mrn (prefix TEST-), email, sms_number, postal_code (Ilderton-like N0M 2A0), consent_notifications boolean, can_receive_sms boolean.
   - **Appointment Types**
     - Examples: "New Patient Visit" (30m), "Follow-up" (15m), "Chronic Care" (30m), "Immunization" (10m), "Phone Triage" (10m).
   - Provide CSV and JSON seed files and a `prisma/seed.ts` or `knex` seed script that runs under `CANADA_PHIPA_READY=false` by default.
9. Realism guidance (how to generate the seed data)
   - Use plausible rural clinic hours (Mon–Thu 9:00–16:00, Fri 9:00–15:30), on-call flow simulated.
   - Teams: split 6 physicians into 3 teams (A,B,C) with 2 physicians each. Each team has an RPN and at least one resident in the mock data.
   - Interdisciplinary support: include flags indicating access to pharmacist, social worker, dietitian (true/false) — used by UI to render availability for special clinics.
10. Privacy guardrails (hard rules)
    - Never log raw contact fields in CI logs. Mask phone numbers & emails in any console output in CI.
    - No real world APIs for SMS/email; use mock adapters. Provide instructions to plug in Twilio/SendGrid in docs but do not include keys.
    - Provide a `PIA_TEMPLATE.md` and `TRA_TEMPLATE.md` with language tailored to an OAB system built for Ontario that references PHIPA and Canada data residency. Put TODOs for a human privacy officer to complete.
11. FHIR & Interop
    - Provide a `fhir/adapter.ts` stub implementing the interface for future EMR integration; include mock responses for `GET /fhir/Appointment` in test mode. Document expected FHIR resources and mapping in `docs/fhir-mapping.md`.
12. Deliverable packaging
    - After scaffold and code are created, produce:
      - File tree snapshot in PR.
      - `git commit` examples used (show first 6 commit messages).
      - `curl` examples demonstrating booking and audit log retrieval.
      - A short runbook for a human to run acceptance tests and verify PIA/TRA placeholders.

SEED DATA DETAILS (25 patients + 6 physicians — exact fields to generate):
- Patient object fields: { id: uuid, name: string, dob: ISOdate, gender: 'male'|'female'|'nonbinary', fake_mrn: 'TEST-XXXX', email: masked_email, sms_number: '+1-519-XXX-XXXX (masked in logs)', postal_code: 'N0M 2A0' or similar, rostered: boolean, consent_notifications: boolean, notification_channel: 'email'|'sms'|'voice', languages: ['en'|'fr'], chronic_conditions: [strings], preferred_provider_id: uuid|null }
- Provider object fields: { id: uuid, name: string, displayName, team: 'A'|'B'|'C', workingHours: {mon:['09:00','16:00'], ...}, rosterStatus: 'closed'|'open', accepts_new_patients: boolean (for seeds set most to false), bio: string (brief) }

DEV NOTES / CONSTRAINTS (must appear in the repo)
- Top-level `README.md` includes `CANADA_PHIPA_READY` instructions and a clear manual signoff step before turning on any PHI features.
- Add `security/REVIEW_REQUIRED.md` listing mandatory manual checks and who must approve (privacy officer, clinical lead, IT security).
- Add explicit TODO comments in code where human review is required (e.g., "TODO: privacy officer must confirm PIA before enabling sendNotifications").
- Make the default dev environment explicitly non-PHI: `CANADA_PHIPA_READY=false`.

EXAMPLES OF ACCEPTABLE COMMIT MESSAGES (enforce in prompt)
- `feat: scaffold backend (express + typescript + prisma + docker)`
- `feat(api): add GET /providers and GET /availability`
- `feat(frontend): add booking page and confirmation flow`
- `test(api): add unit tests for booking logic and audit logging`
- `ci: add GH Actions (lint, test, typecheck, accessibility)`

OUTPUT FORMAT (what Claude must return in the first reply)
1. A short file-tree snapshot of the scaffold created.
2. The first commit message and a short list of the first 6 commits (or expected commits if you’re generating).
3. Clear instructions to run locally (`docker-compose up --build`, seed step, run tests).
4. A short checklist of human review steps (PIA, TRA, pen-test, SOC2) that block production.
5. The seed data JSON file (`seed/seedData.json`) or a downloadable snippet in the repo.

IMPORTANT SAFEGUARDS (enforce programmatically)
- If `CANADA_PHIPA_READY` != 'true', the booking API returns synthetic patient ids and masks contact fields when requested via public endpoints; admin endpoints show full details only in local dev with `CANADA_PHIPA_READY=true` and a manual checklist completed.
- Add a middleware that rejects requests that attempt to set `patient.isReal=true` unless the environment flag allows it.
- Add tests that assert the middleware behavior.

FINAL NOTE:
- This is a mid-level production system — it should be secure, test-covered, and ready for a human security/privacy review. The agent may scaffold integrations (SMS, EMR) as adapters but must use **mock adapters** in tests. Where legal or clinical signoff is required, create TODOs and DO NOT proceed automatically.

Start now: produce the repo scaffold, initial commit, Docker compose, TypeScript backend with `GET /providers` and `GET /availability` returning mock data from `seed/seedData.json`, React frontend booking page (no real gateway calls), basic unit tests, and the first PR named `feat/mid-prod`. After scaffolding, output a file tree and the first commit message.
