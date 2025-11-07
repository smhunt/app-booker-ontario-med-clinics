# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **production-ready "mid" version** of an Online Appointment Booking (OAB) system for Ontario medical clinics, specifically designed to comply with Ontario Health's Service Standard Version 2.0 (Spring 2024). The application enables patients and caregivers to self-book healthcare appointments electronically while meeting strict privacy, security, and accessibility requirements under Ontario's Personal Health Information Protection Act (PHIPA).

**Target Use Case**: Small rural Family Medicine clinic (inspired by Middlesex Centre/Ilderton site - Thames Valley Family Health Team, Western University teaching site). All data in this system is **fictional/synthetic only**.

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Fastify or Express
- **Database**: PostgreSQL with migrations
- **ORM**: Prisma or Knex
- **API Docs**: OpenAPI (Swagger) served at `/docs`
- **Validation**: Zod for input validation

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS or plain CSS
- **Accessibility**: WCAG 2.0 Level AA compliant components

### Infrastructure
- **Containerization**: Docker + docker-compose for full local stack
- **CI/CD**: GitHub Actions (lint, typecheck, unit tests, accessibility checks)
- **TLS**: Self-signed certificates for local dev

### Testing
- **Unit Tests**: Jest
- **E2E Tests**: Playwright or Cypress
- **Accessibility**: axe-core / Lighthouse CLI
- **Coverage**: Booking logic, audit logging, RBAC, PHI redaction

## Key Compliance Requirements

### Privacy & Security (Mandatory)
- **Data Residency**: ALL PHI/PI must be accessed from and hosted in Canada, including backups
- **Encryption**: Industry-standard cryptographic mechanisms for data in-transit and at-rest (NIST SP 800-22, FIPS 140-2)
- **Audit Logging**: Electronic audit trail of all PHI/PI access with timestamps, user IDs, and IP addresses
- **Privacy Impact Assessment**: PIA must be conducted following Ontario IPC guidelines
- **Security Certifications**: Must meet controls from ISO 27001, SOC 2 Type 2, HITRUST, or OntarioMD
- **Consent Management**: Capture patient/caregiver consent for CASL, PHIPA, and de-identified PHI use

### Accessibility (Mandatory)
- **WCAG 2.0 Level AA** compliance minimum for all web interfaces
- Must provide Accessibility Conformance Report or VPAT documentation
- Mobile and web interface must be device-agnostic

### Core Functional Requirements (Mandatory)

**Patient/Caregiver Features:**
- Select appointments for specific day/time with near real-time availability
- View appointment options (in-person, video, telephone)
- Receive automatic confirmation upon booking
- Schedule, modify, or cancel appointments
- Choose preferred notification channels (SMS, email, voice)
- Cancel appointments from reminder notifications

**Clinician/Admin Features:**
- Customize appointment types, durations, and modalities
- Open specific time blocks for online booking
- Set recurring day/time blocks (e.g., "Mon, Wed, Fri mornings")
- Configure booking based on patient enrollment status
- Approve/decline appointments before confirmation (optional workflow)
- Export reports on booking statistics

**Interoperability (Mandatory):**
- Two-way real-time integration with Point-of-Service (PoS) systems (EMRs, HIS, CIS)
- Future direction: HL7® FHIR® standard for appointments
- Sync calendars so provider updates reflect in OAB and vice versa

## Technical Architecture Considerations

### Data Standards
- Prepare for HL7® FHIR® interoperability standards for Ontario
- Support cross-provincial interoperability where applicable
- Design for integration with multiple EMR systems

### Notification System
- **Critical**: Never include PHI in unsecure notifications
- Support multiple channels: SMS, email, voice, app notifications
- Automatic reminders/confirmations without manual intervention
- Allow patients to customize notification preferences

### Security Architecture
- Implement role-based access controls (RBAC)
- Multi-factor authentication for clinical users
- Vulnerability scanning and penetration testing policies
- Security incident response procedures
- Business continuity and disaster recovery plans
- Anti-spam protection (CAPTCHA, reCAPTCHA, honeypot) for public forms

### Audit & Monitoring
- Log all login attempts (successful and failed)
- Track unauthorized activity at application server
- Include timestamp, user ID, originating IP, port/computer name
- Log external ODBC connections for SQL/data queries
- Synchronize system time with trusted source
- Protect audit logs from unauthorized modification

## Development Guidelines

### When Building Features

1. **Privacy by Design**: Always ask "Could this expose PHI inappropriately?" before implementing
2. **Security First**: Never skip input validation, always sanitize data, prevent XSS/SQL injection/command injection
3. **Accessibility Testing**: Test with screen readers and keyboard navigation
4. **Real-time Sync**: Appointment changes must reflect near-instantly between OAB and PoS
5. **Booking Rules**: Support complex rules (frequency limits, appointment type restrictions, enrollment-based access)

## PHI Protection Pattern: CANADA_PHIPA_READY Flag

**CRITICAL SECURITY PATTERN**: This system uses the `CANADA_PHIPA_READY` environment variable to enforce PHI handling guardrails.

### Default Behavior (CANADA_PHIPA_READY=false)
- Database seeds only contain **synthetic/fictional** data
- PHI fields are disabled or cleared
- Public booking API returns masked patient IDs and redacted contact fields
- System refuses to enable PHI storage without explicit human approval
- All logs automatically redact SSN, MRN, DOB, phone numbers, emails

### Production Mode (CANADA_PHIPA_READY=true)
- **Requires**: Manual checklist completion by privacy officer, clinical lead, and IT security
- **Requires**: Completed PIA, TRA, SOC2/ISO27001 certification
- **Requires**: Penetration testing report
- Admin endpoints show full patient details (with audit logging)
- Real notifications can be sent (still requires legal signoff)

### Middleware Enforcement
```typescript
// Example pattern - system must reject attempts to set real patient data
app.use((req, res, next) => {
  if (req.body?.patient?.isReal === true && process.env.CANADA_PHIPA_READY !== 'true') {
    return res.status(403).json({ error: 'PHI storage not enabled. Set CANADA_PHIPA_READY=true and complete security checklist.' });
  }
  next();
});
```

### Tests Must Assert
- Middleware blocks real PHI when flag is false
- Log redaction works for all PHI fields
- Mock adapters are used by default (no live gateway calls)

### Patient Data Handling

**Collect Only What's Necessary:**
- Minimum: Name, contact info, OHIP number, appointment reason, preferred notification method
- Optional: Demographics for intake forms (with explicit consent)

**Data Retention:**
- Follow CPSO medical records retention standards (typically 10 years for adults, longer for minors)
- Support healthcare organization-specific retention policies
- Automated data purging with audit trail

**De-identification:**
- If analytics/reporting uses de-identified data, must prevent re-identification
- Document de-identification methodology in PIA

## Seed Data Specifications

The system must be seeded with **25 fictional patients** and **6 fictional physicians** representing a small rural Family Medicine clinic.

### Clinic Entity
- **Name**: "Ilderton Family Health - Demo" (fictional)
- **Type**: Thames Valley Family Health Team teaching site
- **Hours**: Mon–Thu 9:00–16:00, Fri 9:00–15:30

### Physicians (6 total)
Each physician must have:
```json
{
  "id": "uuid",
  "name": "Dr. [Fictional Name]",
  "displayName": "string",
  "specialty": "Family Medicine",
  "team": "A" | "B" | "C",  // 3 teams, 2 physicians each
  "workingHours": {
    "mon": ["09:00", "16:00"],
    "tue": ["09:00", "16:00"],
    "wed": ["09:00", "16:00"],
    "thu": ["09:00", "16:00"],
    "fri": ["09:00", "15:30"]
  },
  "rosterStatus": "open" | "closed",
  "accepts_new_patients": false,  // Most should be false
  "bio": "Brief fictional bio"
}
```

**Team Structure**: 3 teams (A, B, C) with 2 physicians each. Each team should have:
- 1 RPN (Registered Practical Nurse) - mock data
- At least 1 resident - mock data
- Flags for interdisciplinary support: pharmacist, social worker, dietitian access

### Patients (25 total)

**Age Distribution:**
- 6 children (0–17 years)
- 10 adults (18–64 years)
- 9 seniors (65+ years)

**Demographics:**
- Gender: ~50% male, ~50% female, 1–2 nonbinary
- Rostered: ~80% rostered to a provider, 20% unrostered
- Languages: Primarily English, 2 patients with French preference

**Chronic Conditions Distribution:**
- Diabetes: 3 patients
- COPD/Asthma: 4 patients
- Hypertension: 6 patients
- Pregnancy: 1 patient
- No chronic conditions: remaining patients

**Notification Preferences:**
- Email: 60% (15 patients)
- SMS: 30% (7 patients)
- Voice: 10% (3 patients)

**Patient Object Schema:**
```json
{
  "id": "uuid",
  "name": "Fictional Name",
  "dob": "ISO date (calculate from age group)",
  "gender": "male" | "female" | "nonbinary",
  "fake_mrn": "TEST-XXXX",  // Prefix with TEST-
  "email": "masked_email@example.com",  // Masked in CI logs
  "sms_number": "+1-519-XXX-XXXX",  // Masked in CI logs
  "postal_code": "N0M 2A0",  // Ilderton-area postal code
  "rostered": true | false,
  "consent_notifications": true | false,
  "can_receive_sms": true | false,
  "notification_channel": "email" | "sms" | "voice",
  "languages": ["en"] | ["fr"] | ["en", "fr"],
  "chronic_conditions": ["diabetes", "hypertension", ...],
  "preferred_provider_id": "uuid | null"
}
```

### Appointment Types
Must include these predefined types:
- **New Patient Visit**: 30 minutes
- **Follow-up**: 15 minutes
- **Chronic Care**: 30 minutes
- **Immunization**: 10 minutes
- **Phone Triage**: 10 minutes

### Seed Files Location
- `seed/seedData.json` - Complete JSON with all 25 patients + 6 physicians
- `seed/seedData.csv` - Optional CSV format
- `prisma/seed.ts` or `knex/seeds/` - Executable seed script
- Default execution: `CANADA_PHIPA_READY=false` (synthetic data only)

## Adapter Pattern for External Integrations

To maintain testability and avoid accidental live gateway calls, all external integrations use an **adapter interface + mock implementation** pattern.

### PoS (EMR) Adapter
**Purpose**: Two-way near-real-time sync with Electronic Medical Record systems

**Interface**: `src/adapters/pos/IPosAdapter.ts`
```typescript
interface IPosAdapter {
  getProviderAvailability(providerId: string, date: string): Promise<Slot[]>;
  createAppointment(booking: Booking): Promise<string>;
  updateAppointment(id: string, updates: Partial<Booking>): Promise<void>;
  cancelAppointment(id: string): Promise<void>;
}
```

**Implementations**:
- `MockPosAdapter` (default, used in tests and local dev)
- `FhirPosAdapter` (future FHIR-based EMR integration - stub only)

**Configuration**: Set `POS_ADAPTER=mock` (default) or `POS_ADAPTER=fhir` (requires additional setup)

### Notification Adapter
**Purpose**: Send appointment confirmations and reminders via email/SMS/voice

**Interface**: `src/adapters/notifications/INotificationAdapter.ts`
```typescript
interface INotificationAdapter {
  sendEmail(to: string, template: string, data: object): Promise<void>;
  sendSMS(to: string, message: string): Promise<void>;
  sendVoice(to: string, script: string): Promise<void>;
}
```

**Implementations**:
- `MockNotificationAdapter` (default, logs to console/file)
- `TwilioAdapter` (future, requires API keys - stub only)
- `SendGridAdapter` (future, requires API keys - stub only)

**Configuration**: Set `NOTIFICATION_ADAPTER=mock` (default)

**CRITICAL**: Never include PHI in notification content. Use appointment IDs and secure links only.

### FHIR Adapter (Future)
**Purpose**: HL7 FHIR-compliant appointment booking

**Stub Location**: `src/adapters/fhir/adapter.ts`
**Documentation**: `docs/fhir-mapping.md` - maps FHIR Appointment/Slot/Schedule resources

**Mock Responses**: For testing, provide mock FHIR `GET /fhir/Appointment` responses

## API Endpoints (OpenAPI Spec Required)

All endpoints must be documented in OpenAPI/Swagger spec served at `/docs`.

### Public Endpoints (Patient-facing)
- `GET /providers` - List available providers
- `GET /availability?providerId={uuid}&date={YYYY-MM-DD}` - Get available slots
- `POST /bookings` - Create new appointment booking
- `PUT /bookings/:id` - Modify appointment (patient or admin)
- `DELETE /bookings/:id` - Cancel appointment
- `GET /bookings/:id/confirmation` - Get booking confirmation details

### Admin Endpoints (Protected by RBAC)
- `GET /admin/providers` - Manage providers
- `POST /admin/providers` - Add new provider
- `PUT /admin/providers/:id` - Update provider details
- `GET /admin/appointment-types` - Manage appointment types
- `POST /admin/oab-windows` - Open/close OAB time blocks
- `GET /admin/bookings?status={pending|confirmed|cancelled}` - Review bookings
- `PATCH /admin/bookings/:id/approve` - Approve pending booking
- `PATCH /admin/bookings/:id/decline` - Decline pending booking
- `GET /admin/reports/bookings` - Export booking statistics
- `GET /admin/audit-logs?userId={uuid}&action={string}&startDate={ISO}&endDate={ISO}` - Query audit logs

### Authentication & RBAC
- **Roles**: `admin`, `clinic_staff`, `patient`
- **Auth Method**: JWT with dev keys (rotate in production)
- **Protected Routes**: All `/admin/*` endpoints require `admin` or `clinic_staff` role
- **Rate Limiting**: Apply to public endpoints (e.g., 100 requests/hour per IP)

## Testing Requirements

### Unit Tests (Jest)
- Booking logic (create, update, cancel, validation)
- Audit logging (correct format, redaction, immutability)
- RBAC middleware (role enforcement)
- PHI redaction helper (assert all sensitive fields masked)
- Mock adapter behavior

### E2E Tests (Playwright or Cypress)
- **Happy Path**: Patient books appointment → receives confirmation → cancels appointment
- **Admin Flow**: Admin opens OAB window → reviews pending booking → approves booking
- **Accessibility**: Run axe-core on all pages, assert no violations

### CI Pipeline (GitHub Actions)
Must run on every PR:
1. `npm run lint` - ESLint checks
2. `npm run typecheck` - TypeScript compilation
3. `npm run test` - Jest unit tests
4. `npm run test:e2e` - Playwright/Cypress E2E tests
5. `npm run test:a11y` - Lighthouse accessibility audit (min score 90)
6. Fail PR if any step fails

### Coverage Thresholds
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## Common Use Cases

### Patient Booking Flow
1. Patient accesses OAB via clinic website (mobile/desktop)
2. If not registered, complete minimal registration with consent
3. Select provider, appointment type, date/time from available slots
4. Optionally enter reason for visit (free text or predefined reasons)
5. Confirm booking
6. Receive confirmation via preferred channel (email/SMS/app)
7. Receive reminder notification before appointment
8. Option to cancel/reschedule from reminder

### Provider Schedule Management
1. Clinician/admin updates schedule in EMR (or directly in OAB)
2. Changes sync to OAB near real-time
3. Set time blocks available for online booking vs. phone-only
4. Configure appointment types (e.g., "15-min follow-up", "30-min new patient")
5. Define modalities per slot (in-person/video/phone)
6. Optional: Approve pending booking requests before confirmation

### Administrative Reporting
1. Export booking statistics (unique bookings, no-show rates, cancellations)
2. Filter by date range, provider, appointment type
3. Track OAB adoption metrics (registered patients, hours available for OAB)

## Development Workflow & Git Conventions

### Branching Strategy
- `main` - Production-ready code only
- `feat/<short-description>` - New features
- `fix/<short-description>` - Bug fixes
- `chore/<short-description>` - Maintenance tasks

### Commit Message Format
Follow conventional commits pattern:

**Examples:**
```
feat: scaffold backend (express + typescript + prisma + docker)
feat(api): add GET /providers and GET /availability endpoints
feat(frontend): add booking page and confirmation flow
test(api): add unit tests for booking logic and audit logging
ci: add GitHub Actions (lint, test, typecheck, accessibility)
fix(auth): correct JWT validation middleware
chore(deps): upgrade prisma to v5.x
docs: update README with deployment instructions
```

**Rules:**
- Use lowercase for type and scope
- Keep first line under 72 characters
- Be specific about what changed
- Reference issue numbers when applicable

### Pull Request Process
1. Create feature branch from `main`
2. Make small, atomic commits with descriptive messages
3. Ensure all tests pass locally
4. Push branch and open PR named descriptively (e.g., `feat/mid-prod`)
5. Include in PR description:
   - **Acceptance checklist** of what was delivered
   - **Step-by-step instructions** for reviewer to run locally
   - **Screenshots** for UI changes
   - **curl examples** for API changes
6. PR must pass CI before merge
7. Require 1 approval from code owner

### TODO Comments for Human Review
Where legal/clinical/security signoff is required, add TODO comments:

```typescript
// TODO(privacy): Privacy officer must review PIA before enabling PHI storage
// TODO(security): Pen-test report required before production deployment
// TODO(clinical): Clinical lead must approve appointment type configurations
// TODO(legal): Review consent language with legal counsel
```

## Project Structure

```
app-booker-ontario-med-clinics/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI pipeline
├── docs/
│   ├── fhir-mapping.md              # FHIR resource mappings
│   └── api-examples.md              # curl examples for testing
├── docs-planning/                    # Original planning documents (read-only)
├── security/
│   ├── TO_DO.md                     # Required legal/security artifacts checklist
│   ├── REVIEW_REQUIRED.md           # Manual review steps before production
│   ├── artifacts/
│   │   ├── README.md                # How to obtain SOC2/ISO27001
│   │   ├── PIA_TEMPLATE.md          # Privacy Impact Assessment template
│   │   └── TRA_TEMPLATE.md          # Threat Risk Assessment template
│   └── log-redaction-rules.json     # PHI field redaction config
├── seed/
│   ├── seedData.json                # 25 patients + 6 physicians (fictional)
│   └── seedData.csv                 # Optional CSV format
├── src/
│   ├── adapters/
│   │   ├── pos/
│   │   │   ├── IPosAdapter.ts       # PoS interface
│   │   │   ├── MockPosAdapter.ts    # Mock EMR for testing
│   │   │   └── FhirPosAdapter.ts    # Future FHIR adapter (stub)
│   │   ├── notifications/
│   │   │   ├── INotificationAdapter.ts
│   │   │   ├── MockNotificationAdapter.ts
│   │   │   ├── TwilioAdapter.ts     # Stub for future
│   │   │   └── SendGridAdapter.ts   # Stub for future
│   │   └── fhir/
│   │       └── adapter.ts           # FHIR client stub
│   ├── middleware/
│   │   ├── auth.ts                  # JWT validation
│   │   ├── rbac.ts                  # Role-based access control
│   │   ├── phiGuard.ts              # CANADA_PHIPA_READY enforcement
│   │   ├── rateLimit.ts             # Rate limiting
│   │   └── logRedaction.ts          # Automatic PHI redaction in logs
│   ├── routes/
│   │   ├── public/                  # Patient-facing endpoints
│   │   └── admin/                   # Admin-only endpoints
│   ├── services/
│   │   ├── bookingService.ts        # Business logic for bookings
│   │   └── auditService.ts          # Audit logging service
│   ├── models/                      # Prisma schema or DB models
│   ├── utils/
│   │   └── redactor.ts              # PHI redaction helper with tests
│   ├── app.ts                       # Express/Fastify app setup
│   └── server.ts                    # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── BookingPage.tsx
│   │   │   ├── ConfirmationPage.tsx
│   │   │   └── AdminDashboard.tsx
│   │   ├── hooks/
│   │   └── utils/
│   ├── public/
│   └── vite.config.ts
├── prisma/ (or knex/)
│   ├── schema.prisma                # Database schema
│   ├── migrations/                  # DB migration files
│   └── seed.ts                      # Seed script (uses seed/seedData.json)
├── tests/
│   ├── unit/                        # Jest unit tests
│   ├── e2e/                         # Playwright/Cypress E2E tests
│   └── fixtures/                    # Test data
├── docker-compose.yml               # Full local stack (app + db)
├── Dockerfile                       # Container definition
├── .env.example                     # Environment variables template
├── README.md                        # Setup and run instructions
├── CLAUDE.md                        # This file
└── package.json
```

## Running the Application Locally

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development without Docker)

### Quick Start
```bash
# 1. Clone repository
git clone <repo-url>
cd app-booker-ontario-med-clinics

# 2. Copy environment variables
cp .env.example .env

# 3. Start services (backend + database)
docker-compose up --build

# 4. In another terminal, run migrations and seed
docker-compose exec app npm run migrate
docker-compose exec app npm run seed

# 5. Access application
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8080
# - API Docs: http://localhost:8080/docs
```

### Development Commands
```bash
# Run tests
npm run test                  # Unit tests
npm run test:e2e             # E2E tests
npm run test:a11y            # Accessibility audit
npm run test:coverage        # Coverage report

# Linting and type checking
npm run lint                  # ESLint
npm run typecheck            # TypeScript compiler
npm run format               # Prettier

# Database operations
npm run migrate              # Run migrations
npm run migrate:rollback     # Rollback last migration
npm run seed                 # Seed database with fictional data
npm run db:reset             # Drop, migrate, seed

# Build
npm run build                # Build for production
npm run start                # Start production server
```

### Environment Variables
```bash
# Application
NODE_ENV=development
PORT=8080
FRONTEND_PORT=3000

# Database
DATABASE_URL=postgresql://user:password@db:5432/oab_dev

# Security
CANADA_PHIPA_READY=false              # CRITICAL: Must be false by default
JWT_SECRET=dev_secret_change_in_prod  # Rotate in production

# Adapters
POS_ADAPTER=mock                      # mock | fhir
NOTIFICATION_ADAPTER=mock             # mock | twilio | sendgrid

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=3600000          # 1 hour

# Logging
LOG_LEVEL=info
LOG_REDACTION_ENABLED=true            # Auto-redact PHI in logs
```

## Security Documentation Requirements

### Required Files in `security/` Directory

**`security/TO_DO.md`** - Checklist of artifacts needed before production:
- [ ] Privacy Impact Assessment (PIA) completed by qualified professional
- [ ] Threat Risk Assessment (TRA) or SOC 2 Type 2 Audit Report
- [ ] Penetration testing report (annual requirement)
- [ ] ISO 27001, SOC 2, HITRUST, or OntarioMD certification
- [ ] Vulnerability assessment scan results
- [ ] Business continuity and disaster recovery plan
- [ ] Incident response procedures documented
- [ ] Data retention and destruction policy
- [ ] Third-party vendor agreements with privacy/security terms

**`security/REVIEW_REQUIRED.md`** - Manual signoff checklist:
- [ ] **Privacy Officer**: Review PIA, approve PHI handling procedures
- [ ] **Clinical Lead**: Approve appointment types, booking rules, clinical workflows
- [ ] **IT Security**: Review TRA, pen-test results, approve infrastructure security
- [ ] **Legal Counsel**: Review consent forms, privacy notices, vendor agreements
- [ ] **Compliance Officer**: Verify PHIPA, AODA, CASL compliance

**`security/artifacts/PIA_TEMPLATE.md`** - Privacy Impact Assessment template tailored to Ontario OAB system:
- References PHIPA and Canada data residency requirements
- Includes TODOs for privacy officer to complete
- Maps to 10 Fair Information Principles (CSA Model Code)
- Includes risk assessment table

**`security/artifacts/TRA_TEMPLATE.md`** - Threat Risk Assessment template:
- Industry-standard methodology (HTRA, NIST, OCTAVE)
- Risk table with likelihood/impact ratings
- Mitigation plans for identified risks
- TODOs for security officer to complete

## Regulatory Compliance Checklist

Before any production deployment, ensure:
- [ ] `CANADA_PHIPA_READY=true` only after completing all manual reviews
- [ ] Privacy notice published describing PHI/PI collection, use, disclosure
- [ ] Designated privacy officer contact publicly accessible
- [ ] Privacy Impact Assessment completed by qualified professional (2+ years experience with PHIPA)
- [ ] Threat Risk Assessment (TRA) or SOC 2 Type 2 Audit completed within last 2 years/1 year
- [ ] Vulnerability assessment and penetration testing policies documented
- [ ] Data hosting confirmed to be Canada-only (no cross-border data flows)
- [ ] Encryption standards validated (TLS 1.2+, AES-256 or equivalent)
- [ ] WCAG 2.0 AA compliance validated with VPAT
- [ ] Agreement framework with all third-party vendors includes privacy/security terms
- [ ] Audit logging operational and tamper-proof
- [ ] Incident response plan documented and tested
- [ ] All TODO(privacy/security/legal/clinical) comments resolved
- [ ] Mock adapters replaced with production adapters (with legal signoff)
- [ ] Rate limiting configured appropriately for production load
- [ ] JWT secrets rotated from dev keys
- [ ] Database backups configured and tested
- [ ] Monitoring and alerting configured for security events

## Interoperability Standards (Future)

Ontario Health is moving toward HL7® FHIR® for appointment booking. Design APIs with FHIR resource compatibility in mind:
- Use FHIR **Appointment** resource structure
- Support FHIR **Slot** resources for availability
- Implement FHIR **Schedule** resources for provider calendars
- Plan for FHIR RESTful API endpoints

## API Testing Examples (curl)

These examples demonstrate how to test the API locally. Full examples should be documented in `docs/api-examples.md`.

### Get Providers
```bash
curl http://localhost:8080/providers
```

### Get Availability
```bash
curl "http://localhost:8080/availability?providerId=<uuid>&date=2024-11-15"
```

### Create Booking
```bash
curl -X POST http://localhost:8080/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "<provider-uuid>",
    "patientId": "<patient-uuid>",
    "appointmentTypeId": "<type-uuid>",
    "date": "2024-11-15",
    "time": "10:00",
    "modality": "in-person",
    "reason": "Annual check-up"
  }'
```

### Cancel Booking
```bash
curl -X DELETE http://localhost:8080/bookings/<booking-uuid>
```

### Get Audit Logs (Admin)
```bash
curl http://localhost:8080/admin/audit-logs \
  -H "Authorization: Bearer <jwt-token>" \
  -G \
  --data-urlencode "startDate=2024-11-01T00:00:00Z" \
  --data-urlencode "endDate=2024-11-30T23:59:59Z"
```

### Get Booking Reports (Admin)
```bash
curl http://localhost:8080/admin/reports/bookings \
  -H "Authorization: Bearer <jwt-token>" \
  -G \
  --data-urlencode "startDate=2024-11-01" \
  --data-urlencode "endDate=2024-11-30"
```

## References

- Ontario Health OAB Service Standard v2.0 (Spring 2024): See `docs-planning/online-appointment-booking-service-standard.pdf`
- ChatGPT Technical Spec: See `docs-planning/rough-prompt-from-chatgpt.md`
- Ontario Health Digital Standards: ontariohealth.ca/system-planning/digital-standards
- PHIPA Legislation: ontario.ca/laws/statute/04p03
- WCAG 2.0 Guidelines: w3.org/WAI/WCAG20/quickref/
- HL7 FHIR Appointment: hl7.org/fhir/appointment.html
- Ontario Health EHR Security Toolkit: Referenced in OAB standard
- OntarioMD EMR Hosting Requirements: Referenced in OAB standard

## Language & Localization

- **Mandatory (Future)**: English and French user interfaces for patients
- **Recommended**: Support additional languages beyond English/French
- All patient-facing text must be translatable
- Clinical terminology should follow Ontario standards

## Key Implementation Notes

### Core Principles
1. **Conservative about PHI**: Default to `CANADA_PHIPA_READY=false`. Never expose real patient data without explicit legal approval.
2. **Synthetic Data Only**: All seed data is fictional. Never use real clinic names, staff, or patient information.
3. **Mock by Default**: All external integrations (EMR, SMS, email) use mock adapters in development and testing.
4. **Test Everything**: 80%+ coverage, E2E tests for critical paths, accessibility audits on every PR.
5. **Human Review Required**: Legal, clinical, and security decisions require TODO comments and manual signoff.

### Security Patterns
- **Log Redaction**: Automatically redact SSN, MRN, DOB, phone, email in all logs
- **Rate Limiting**: Protect public endpoints from abuse
- **RBAC**: Enforce role-based access on all admin endpoints
- **Audit Everything**: Log all create/update/delete operations with full context
- **Input Validation**: Use Zod schemas for all request payloads

### Integration Stubs
This mid-version includes **stubs** for future integrations:
- **FHIR Adapter**: Interface defined, mock responses provided, awaiting real EMR connection
- **Twilio/SendGrid**: Notification adapters stubbed, requires API keys and legal approval
- **Production PoS**: Mock adapter simulates EMR sync, needs real PoS vendor integration

### What's NOT Included (Human Required)
- Real PIA/TRA completion (templates provided, officer must complete)
- SOC 2 Type 2 audit or ISO 27001 certification (instructions provided)
- Live notification gateway setup (Twilio/SendGrid keys, legal approval needed)
- Production EMR integration (FHIR adapter stub ready, needs vendor credentials)
- VPAT accessibility report (system built to WCAG 2.0 AA, formal audit needed)
- Penetration testing (annual requirement, must be conducted by qualified firm)

### Delivery Scope: "Mid" Version
This is a **production-ready mid version**, meaning:
- ✅ Full TypeScript stack with Docker setup
- ✅ All core booking flows (create, update, cancel)
- ✅ Admin UI for managing providers and bookings
- ✅ Audit logging with PHI redaction
- ✅ RBAC with JWT auth
- ✅ OpenAPI documentation
- ✅ Unit + E2E + accessibility tests
- ✅ CI pipeline (GitHub Actions)
- ✅ Mock adapters for all external integrations
- ✅ Security templates (PIA, TRA)
- ⏳ Real EMR integration (stub ready, needs vendor)
- ⏳ Live notification gateways (stubs ready, needs legal approval)
- ⏳ Formal security audits (templates provided, must be completed)

### Development Priorities
When continuing development:
1. **Maintain CANADA_PHIPA_READY=false** until all legal artifacts are complete
2. **Add TODO comments** for any feature requiring legal/clinical/security review
3. **Use mock adapters** for all tests and local development
4. **Follow commit message conventions** (conventional commits)
5. **Keep coverage above 80%** for unit tests
6. **Run accessibility checks** on every UI change
7. **Update security/TO_DO.md** as artifacts are completed

## Notes on This Codebase

This repository implements a production-ready "mid" version of an Ontario-compliant Online Appointment Booking system. The planning documents in `docs-planning/` provide full regulatory context.

**Target Clinic**: Small rural Family Medicine clinic (Middlesex Centre/Ilderton-inspired), with 6 physicians and 25 fictional patients.

**Tech Stack Decisions**:
- **Backend**: TypeScript + Fastify/Express + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Infrastructure**: Docker + docker-compose + GitHub Actions CI
- **Testing**: Jest + Playwright/Cypress + axe-core

**Key Architectural Patterns**:
- **CANADA_PHIPA_READY Flag**: Environment-based PHI protection
- **Adapter Pattern**: Mock implementations for EMR, SMS, email (no live calls)
- **RBAC Middleware**: Role enforcement on all admin routes
- **Audit Service**: Immutable logs with automatic PHI redaction
- **Input Validation**: Zod schemas prevent malformed requests

**Priority Implementation Areas**:
1. **Security-first architecture** (Canadian hosting, encryption, audit logging)
2. **PHIPA compliance** (privacy by design, consent management, PIAs)
3. **Accessibility** (WCAG 2.0 AA from day one)
4. **PoS integration** (adapter pattern ready for real EMR sync)
5. **Testability** (80%+ coverage, E2E for critical flows, accessibility audits)

**Before Production Deployment**:
- Complete all items in `security/TO_DO.md`
- Resolve all `TODO(privacy/security/legal/clinical)` comments
- Replace mock adapters with production implementations (with legal approval)
- Set `CANADA_PHIPA_READY=true` only after manual review checklist is complete
- Conduct penetration testing and formal accessibility audit

**When in Doubt**:
- Privacy/security decisions → Consult Ontario Health EHR Security Toolkit, engage privacy/security professionals
- Clinical workflows → Consult clinical lead and review Ontario Health OAB v2.0 standard
- Legal questions → Engage legal counsel familiar with PHIPA and healthcare regulations
- Technical architecture → Follow adapter pattern, keep integrations testable and mock-first
