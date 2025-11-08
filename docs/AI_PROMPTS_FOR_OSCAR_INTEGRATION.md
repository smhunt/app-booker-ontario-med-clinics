# AI Assistant Prompts for OSCAR EMR Integration Project

This document contains two complete, optimized prompts for building the OSCAR EMR integration - one for ChatGPT and one for Claude. Each is tailored to the assistant's strengths.

---

## Prompt for ChatGPT (GPT-4)

**Optimization Notes**: ChatGPT excels at structured tasks, code generation, and following detailed specifications. This prompt provides explicit requirements and structured deliverables.

```
I need you to help me build an OSCAR EMR integration adapter for my Ontario online appointment booking system. This is a production healthcare system that must comply with PHIPA and handle PHI data securely.

# PROJECT CONTEXT

I have an existing appointment booking system with:
- Backend: TypeScript + Express + Prisma + PostgreSQL
- Adapter pattern already implemented (IPosAdapter interface)
- Mock adapter working for development
- Need to integrate with OSCAR EMR (open-source Canadian EMR)

OSCAR EMR Details:
- REST API: /ws/rest/schedule/* endpoints
- Java-based (Spring Framework)
- Uses providerNo (string) and demographicNo (integer) for IDs
- Single-character status codes ('t' = pending, 'C' = confirmed, 'c' = cancelled)
- MySQL database
- Repository: https://github.com/scoophealth/oscar

# EXISTING INTERFACE TO IMPLEMENT

```typescript
export interface IPosAdapter {
  getProviderAvailability(providerId: string, date: string): Promise<Slot[]>;
  createAppointment(booking: Booking): Promise<string>;
  updateAppointment(id: string, updates: Partial<Booking>): Promise<void>;
  cancelAppointment(id: string): Promise<void>;
  syncAppointmentStatus(bookingId: string): Promise<Booking>;
}

export interface Slot {
  providerId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  available: boolean;
}

export interface Booking {
  id?: string;
  providerId: string;
  patientId: string;
  appointmentTypeId: string;
  date: Date;
  time: string;
  modality: string;
  reason?: string;
  status: string;
}
```

# OSCAR API ENDPOINTS I NEED TO USE

GET /schedule/{providerNo}/day/{date} - Get appointments for a day
POST /schedule/add - Create appointment (Body: NewAppointmentTo1)
POST /schedule/updateAppointment - Update appointment
POST /schedule/appointment/{id}/updateStatus - Change status
POST /schedule/getAppointment - Get single appointment
GET /schedule/types - Get appointment types
GET /schedule/statuses - Get statuses

OSCAR Appointment Object:
```json
{
  "id": Integer,
  "providerNo": String,
  "demographicNo": Integer,
  "appointmentDate": Date,
  "startTime": Date,
  "endTime": Date,
  "duration": Integer,
  "type": String,
  "status": Character,
  "notes": String,
  "location": String
}
```

# WHAT I NEED YOU TO BUILD

Please create the following files in order, with complete, production-ready code:

## 1. OscarPosAdapter.ts
Location: backend/src/adapters/pos/OscarPosAdapter.ts

Requirements:
- Implement all 5 methods from IPosAdapter interface
- Use axios for HTTP requests
- Include proper error handling and logging
- Map between my UUID-based IDs and OSCAR's IDs
- Translate status codes between systems
- Environment variables: OSCAR_BASE_URL, OSCAR_API_TOKEN
- Include JSDoc comments for all public methods

## 2. OscarMappingService.ts
Location: backend/src/services/oscarMappingService.ts

Requirements:
- Service to map Provider IDs (my UUIDs → OSCAR providerNo strings)
- Service to map Patient IDs (my UUIDs → OSCAR demographicNo integers)
- Use Prisma to query mapping tables
- Cache mappings in-memory (Map) for performance
- Include reverse mapping methods

## 3. Prisma Schema Updates
Location: backend/prisma/schema.prisma

Add new models:
- OscarProviderMapping (oabProviderId, oscarProviderNo)
- OscarPatientMapping (oabPatientId, oscarDemographicNo)
- OscarAppointmentTypeMapping (oabTypeId, oscarTypeCode)

## 4. Update Factory
Location: backend/src/adapters/factory.ts

Add 'oscar' case to createPosAdapter() switch statement

## 5. Unit Tests
Location: backend/src/adapters/pos/__tests__/OscarPosAdapter.test.ts

Requirements:
- Mock axios requests
- Test all 5 interface methods
- Test error handling (network errors, 404s, 500s)
- Test ID mapping
- Test status code translation
- Achieve >80% code coverage

## 6. Integration Test Setup
Location: backend/src/adapters/pos/__tests__/OscarPosAdapter.integration.test.ts

Requirements:
- Tests that can run against local OSCAR Docker instance
- Use environment variable to enable/disable (OSCAR_INTEGRATION_TESTS=true)
- Test actual API calls with test data
- Clean up after tests

## 7. Configuration & Environment
- Add OSCAR_* environment variables to .env.example
- Add configuration documentation to README.md
- Update docker-compose.yml if needed

# IMPORTANT CONSTRAINTS

1. **Security**: All OSCAR API calls contain PHI - use HTTPS only, log with redaction
2. **Error Handling**: Must gracefully handle OSCAR downtime, network errors, invalid responses
3. **Performance**: Cache provider availability for 30-60 seconds to reduce API load
4. **Idempotency**: Make operations idempotent where possible
5. **Audit Trail**: Log all OSCAR interactions to audit log
6. **TypeScript**: Use strict types, no 'any' unless absolutely necessary
7. **Testing**: Follow existing test patterns in the codebase

# DEVELOPMENT APPROACH

1. Start with OscarPosAdapter skeleton with TODO comments
2. Implement getProviderAvailability() first (most complex)
3. Implement createAppointment() second
4. Then updateAppointment(), cancelAppointment(), syncAppointmentStatus()
5. Build OscarMappingService after adapter is working
6. Write unit tests as you go
7. Update schema and factory last

# DELIVERABLES

For each file:
1. Provide the complete code (no placeholders like "... rest of code")
2. Include imports and exports
3. Add comments explaining complex logic
4. Include error handling for each method
5. Add logging statements

After all files:
- Provide migration command to run
- Provide test commands
- List any additional npm packages needed (with versions)
- Include setup instructions

# QUESTIONS TO CLARIFY BEFORE STARTING

Before you begin coding, please ask me:
1. Do you have example OSCAR API responses I can see?
2. What's your preferred caching strategy (Redis vs in-memory)?
3. Should I include rate limiting for OSCAR API calls?
4. Do you want me to implement optimistic locking for appointment updates?
5. What's your retry policy for failed OSCAR API calls?

Please proceed step-by-step, showing me each file and waiting for my approval before moving to the next one.
```

---

## Prompt for Claude (Opus/Sonnet)

**Optimization Notes**: Claude excels at understanding context, architectural decisions, and iterative refinement. This prompt emphasizes the "why" and encourages architectural discussion.

```
I'm building an integration adapter to connect my Ontario healthcare appointment booking system with OSCAR EMR, and I need your expertise to architect and implement this correctly. This is production healthcare software handling PHI data under PHIPA regulations.

# The Big Picture

I've built an online appointment booking platform for Ontario Family Health Teams. Right now it works with mock data, but to be useful in production, it needs to integrate with the actual EMR systems that clinics use. OSCAR EMR is the #1 EMR in Ontario FHTs, so this integration is critical.

## My Current System

**Architecture**:
- TypeScript backend (Express + Prisma + PostgreSQL)
- React frontend
- Adapter pattern for EMR integrations (currently only MockPosAdapter exists)
- Already handles: patient booking, provider schedules, appointment types, audit logging

**The Adapter Pattern**:
I've defined an `IPosAdapter` interface that abstracts away EMR-specific details:

```typescript
interface IPosAdapter {
  getProviderAvailability(providerId: string, date: string): Promise<Slot[]>;
  createAppointment(booking: Booking): Promise<string>;
  updateAppointment(id: string, updates: Partial<Booking>): Promise<void>;
  cancelAppointment(id: string): Promise<void>;
  syncAppointmentStatus(bookingId: string): Promise<Booking>;
}
```

My system uses UUIDs for all entities (providers, patients, appointments).

## About OSCAR EMR

OSCAR is an open-source Java EMR (Spring Framework) used by thousands of Canadian physicians:
- REST API: `/ws/rest/schedule/*`
- Uses string `providerNo` (like "123" or "doctor1") instead of UUIDs
- Uses integer `demographicNo` for patients
- Single-character status codes ('t', 'C', 'c', 'H')
- Has appointment types as string codes
- MySQL database
- GitHub: https://github.com/scoophealth/oscar

**Key OSCAR Endpoints**:
- `GET /schedule/{providerNo}/day/{date}` - List appointments
- `POST /schedule/add` - Create appointment
- `POST /schedule/getAppointment` - Get one appointment
- `POST /schedule/updateAppointment` - Update appointment
- `POST /schedule/appointment/{id}/updateStatus` - Change status

**Authentication**: Bearer token in Authorization header

# The Challenge

The core challenge is the impedance mismatch between my system and OSCAR:
1. **ID Systems**: My UUIDs vs OSCAR's string/integer IDs
2. **Status Codes**: My descriptive strings vs OSCAR's single characters
3. **Data Models**: My normalized structure vs OSCAR's flat appointment object
4. **Availability**: I need to compute available slots from OSCAR's booked appointments
5. **Sync**: Changes in OSCAR need to be reflected in my system and vice versa

# What I Need Your Help With

I want you to help me design and implement the complete OSCAR integration. But I don't just want code - I want you to help me think through the architecture and make good decisions.

## Phase 1: Architecture & Design (Let's discuss first)

Before we write any code, help me think through:

1. **ID Mapping Strategy**: 
   - Should I store OSCAR IDs in my provider/patient tables directly?
   - Or create separate mapping tables?
   - What about caching these mappings?

2. **Availability Computation**:
   - OSCAR doesn't have a "get available slots" endpoint
   - I need to fetch all appointments for a day, then compute free slots
   - Should I cache this? For how long?
   - What about race conditions when two patients book the same slot?

3. **Sync Strategy**:
   - My system writes to OSCAR (push)
   - But changes can happen directly in OSCAR
   - Should I poll OSCAR periodically? Use webhooks? Both?
   - How do I handle conflicts?

4. **Error Handling**:
   - OSCAR might be down or slow
   - Network issues
   - Authentication failures
   - What's the right strategy for retries? Circuit breakers?

5. **Testing Strategy**:
   - How do I test against OSCAR without a production system?
   - Should I set up local OSCAR via Docker?
   - Mock responses for unit tests?

Please share your thoughts on these architectural questions first. What approach would you recommend and why?

## Phase 2: Implementation (After we agree on architecture)

Once we've aligned on the architecture, I'll need you to help me implement:

### Core Files Needed:

1. **OscarPosAdapter.ts** - The main adapter implementing IPosAdapter
2. **OscarMappingService.ts** - Handles ID translation
3. **OscarClient.ts** - Low-level HTTP client for OSCAR API
4. **Status/Type Mappers** - Translate between my codes and OSCAR's
5. **Prisma Schema Updates** - For mapping tables (if we decide to use them)
6. **Tests** - Unit and integration tests
7. **Documentation** - Setup instructions, troubleshooting guide

### What Makes Good Code Here:

- **Type Safety**: Strong TypeScript types, no shortcuts
- **Error Messages**: When something fails, the error should explain what and why
- **Logging**: Every OSCAR API call logged (with PHI redaction)
- **Testability**: Easy to test with mocked OSCAR responses
- **Maintainability**: Another developer should understand this in 6 months
- **Security**: PHI data handling compliant with PHIPA

## Phase 3: Production Readiness

Help me think through:
- What could go wrong in production?
- What monitoring do I need?
- What documentation do clinics need?
- How do I debug issues when OSCAR is a black box?

# My Constraints & Context

**Security**: 
- All PHI must be logged with redaction
- HTTPS only for OSCAR communication
- Credentials in environment variables, never in code

**Performance**:
- Target: <500ms for availability lookup
- Handle 100 concurrent users booking appointments
- Don't overload OSCAR servers with requests

**Reliability**:
- Graceful degradation if OSCAR is down
- No data loss (appointment bookings are critical)
- Idempotent operations where possible

**Existing Codebase**:
- TypeScript strict mode
- Jest for testing
- Prisma for database access
- Winston for logging
- Follows Airbnb style guide

# How I'd Like to Work Together

I prefer an iterative approach:

1. **Architecture Discussion**: Let's agree on the high-level design first
2. **Prototype**: Build a minimal working version of one method (maybe getProviderAvailability)
3. **Review & Refine**: I'll test it, we'll discuss what works and what doesn't
4. **Expand**: Build out the remaining methods
5. **Testing**: Comprehensive tests
6. **Production Prep**: Documentation, error handling, edge cases

At each step, I want to understand not just *what* you're building, but *why* you made specific design choices. Help me learn and make good decisions.

# Starting Point

To get us started, I'd love your thoughts on:

1. **What's your recommended architecture** for the ID mapping problem? Separate tables vs embedded fields vs in-memory-only?

2. **For availability computation**, what's the best approach given OSCAR's API limitations?

3. **What's the biggest risk** you see in this integration, and how should we mitigate it?

4. **If you were building this**, what would you build first to prove the concept works?

Let's start with your architectural recommendations, and then we can dive into implementation together.

---

**Context for Claude**: I'm a senior developer with strong TypeScript skills but new to healthcare integrations. I want to build this right - security, reliability, and maintainability matter more than speed. I'm open to refactoring my existing code if you spot issues. Push back if you think I'm making a mistake.
```

---

## Usage Instructions

### For ChatGPT:
1. Copy the ChatGPT prompt above
2. Paste into a new ChatGPT conversation
3. ChatGPT will ask clarifying questions - answer them based on your actual requirements
4. It will then generate code file-by-file, waiting for your approval
5. Review each file carefully before proceeding to the next

**Expected Flow**:
- ChatGPT asks 5 clarifying questions
- You answer them
- It generates OscarPosAdapter.ts with complete code
- You review and say "looks good, next file"
- It generates OscarMappingService.ts
- Continue until all files are done

### For Claude:
1. Copy the Claude prompt above
2. Paste into a new Claude conversation (preferably Claude Opus or Sonnet 3.5)
3. Claude will respond with architectural recommendations first
4. Discuss the architecture until you're aligned
5. Then ask it to start implementing
6. Iterate on the implementation

**Expected Flow**:
- Claude discusses architecture options (ID mapping, caching, etc.)
- You discuss tradeoffs together
- You agree on an approach
- Claude proposes a prototype implementation
- You test it and provide feedback
- Claude refines and expands
- Continue iteratively

---

## Key Differences Between the Prompts

| Aspect | ChatGPT Prompt | Claude Prompt |
|--------|---------------|---------------|
| **Style** | Structured, explicit | Conversational, exploratory |
| **Deliverables** | Complete files upfront | Iterative prototyping |
| **Focus** | Implementation details | Architectural decisions |
| **Code Generation** | Full files, no placeholders | Minimal examples, then expand |
| **Tone** | Directive ("build this") | Collaborative ("help me think") |
| **Testing** | Specified test cases | Discuss testing strategy first |
| **Interaction** | Linear progression | Iterative refinement |

---

## Tips for Success

### With ChatGPT:
- ✅ Be specific about requirements upfront
- ✅ Provide example data structures
- ✅ Ask for complete code (no "// rest of implementation")
- ✅ Review generated code for TypeScript errors before running
- ❌ Don't let it skip error handling
- ❌ Don't accept placeholder comments instead of code

### With Claude:
- ✅ Engage in the architectural discussion
- ✅ Challenge its recommendations if something feels wrong
- ✅ Ask "why" when it makes design choices
- ✅ Test prototypes before asking for full implementation
- ✅ Share error messages and logs for debugging
- ❌ Don't rush to implementation without design alignment
- ❌ Don't accept "this should work" - verify it actually works

---

## Post-Generation Checklist

After using either prompt, verify:

- [ ] All TypeScript files compile without errors
- [ ] Environment variables documented in .env.example
- [ ] Prisma migrations generated and tested
- [ ] Unit tests pass (npm run test)
- [ ] Integration tests documented (even if not run yet)
- [ ] Error handling covers network failures, 404s, 500s
- [ ] Logging includes PHI redaction
- [ ] README updated with OSCAR integration instructions
- [ ] Status code mapping is correct (cross-reference with OSCAR docs)
- [ ] ID mapping strategy is clear and documented

---

## Troubleshooting

### If ChatGPT generates incomplete code:
**Prompt**: "The code you provided for [filename] is incomplete. Please provide the full implementation of [missing method/section] with no placeholders."

### If Claude is too theoretical:
**Prompt**: "I understand the architectural tradeoffs. Let's move to implementation - can you provide the complete code for OscarPosAdapter.ts based on the architecture we agreed on?"

### If either generates code with errors:
**Prompt**: "I'm getting this TypeScript error: [paste error]. Can you fix the code? Here's the relevant section: [paste code]"

### If you need to restart with different requirements:
Start a new conversation - don't try to drastically pivot in an existing thread.

---

## Expected Timeline

### With ChatGPT:
- Clarifying questions: 10-15 minutes
- Code generation: 30-45 minutes
- Your review/testing: 2-4 hours
- Fixes/refinements: 30-60 minutes
- **Total: 4-6 hours** to working prototype

### With Claude:
- Architectural discussion: 30-60 minutes  
- Prototype implementation: 30-45 minutes
- Testing & feedback: 1-2 hours
- Iterative refinement: 1-3 hours
- **Total: 3-6 hours** to production-ready code

---

## Which Assistant Should You Use?

**Use ChatGPT if**:
- You know exactly what you need
- You want complete code quickly
- You prefer structured, directive instructions
- You're comfortable reviewing generated code for issues

**Use Claude if**:
- You want to discuss architecture first
- You value iterative refinement
- You want to understand *why* things are built a certain way
- You're less certain about the best approach

**Use Both**:
- Generate initial implementation with ChatGPT
- Use Claude to review and suggest improvements
- Best of both worlds: speed + thoughtfulness

---

## Support Resources

- OSCAR API Documentation: Code inspection at https://github.com/scoophealth/oscar
- Your existing codebase: `/backend/src/adapters/pos/MockPosAdapter.ts`
- Integration guide: `docs/OSCAR_EMR_INTEGRATION.md`
- Strategic context: `docs/STRATEGIC_VALUE_AND_OPPORTUNITIES.md`

Good luck with your OSCAR integration! 🚀
