# Ontario Online Appointment Booking System

**Production-Ready "Mid" Version** - Ontario Health OAB v2.0 Compliant

A secure, accessible appointment booking system for Ontario medical clinics that complies with PHIPA, WCAG 2.0 AA, and Ontario Health standards.

## 🚀 Quick Start

```bash
# 1. Clone and navigate to directory
cd app-booker-ontario-med-clinics

# 2. Copy environment variables
cp .env.example .env

# 3. Start full stack with Docker
docker-compose up --build

# 4. In another terminal, run migrations and seed
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed

# 5. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# API Docs: http://localhost:8080/docs
```

## 🔑 Default Credentials

```
Admin: admin@ildertonhealth-demo.ca / Admin123!
Staff: staff@ildertonhealth-demo.ca / Staff123!
```

## 📋 Features

### Patient-Facing (Public)
- ✅ Browse available providers
- ✅ View appointment availability in real-time
- ✅ Book appointments (in-person, video, or phone)
- ✅ Cancel/reschedule appointments
- ✅ Receive automated confirmations (email/SMS/voice)

### Admin Features
- ✅ Manage providers and appointment types
- ✅ Approve/decline pending bookings
- ✅ View booking reports and statistics
- ✅ Query audit logs (admin only)
- ✅ Configure OAB time windows

### Security & Compliance
- ✅ PHIPA-compliant with CANADA_PHIPA_READY flag
- ✅ Automatic PHI redaction in logs
- ✅ Role-based access control (RBAC)
- ✅ Immutable audit logging
- ✅ Rate limiting on public endpoints
- ✅ JWT authentication
- ✅ Mock adapters for safe development

## 🏗️ Architecture

### Tech Stack
- **Backend**: TypeScript + Express + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **Infrastructure**: Docker + docker-compose
- **Testing**: Jest + Playwright
- **CI/CD**: GitHub Actions

### Adapter Pattern
All external integrations use mock adapters by default:
- **PoS (EMR) Adapter**: `MockPosAdapter` (ready for FHIR)
- **Notification Adapter**: `MockNotificationAdapter` (ready for Twilio/SendGrid)

## 📦 Development Commands

### Root Commands (Workspace)
```bash
npm run dev              # Start all services
npm run test             # Run all tests
npm run lint             # Lint all workspaces
npm run typecheck        # Type-check all workspaces
npm run build            # Build all workspaces
```

### Backend Commands
```bash
cd backend
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm run migrate          # Run database migrations
npm run seed             # Seed with fictional data
npm run db:reset         # Reset database
npm run test             # Run unit tests
npm run test:coverage    # Test coverage report
```

### Frontend Commands
```bash
cd frontend
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run test:e2e         # Run Playwright E2E tests
```

## 🔒 Security: CANADA_PHIPA_READY Flag

**CRITICAL**: This system uses `CANADA_PHIPA_READY` to enforce PHI handling:

### Safe Mode (Default: CANADA_PHIPA_READY=false)
- ✅ Synthetic data only
- ✅ PHI redaction in logs
- ✅ Mock adapters (no live API calls)
- ✅ Safe for development and testing

### Production Mode (CANADA_PHIPA_READY=true)
- ⚠️ Requires completed security checklist
- ⚠️ Requires PIA, TRA, and SOC2/ISO27001
- ⚠️ Requires penetration testing
- ⚠️ See `security/REVIEW_REQUIRED.md`

**Never set CANADA_PHIPA_READY=true without legal approval!**

## 📊 Seed Data

The system includes **25 fictional patients** and **6 fictional physicians**:

### Patients
- 6 children (0-17 years)
- 10 adults (18-64 years)
- 9 seniors (65+ years)
- 80% rostered, 20% unrostered
- Chronic conditions: diabetes (3), COPD/asthma (4), hypertension (6), pregnancy (1)

### Providers
- 6 family physicians across 3 teams (A, B, C)
- Clinic: "Ilderton Family Health - Demo"
- Hours: Mon-Thu 9:00-16:00, Fri 9:00-15:30

## 📝 API Endpoints

### Public Endpoints
```bash
GET  /providers              # List providers
GET  /availability           # Get available slots
POST /bookings               # Create booking
GET  /bookings/:id           # Get booking details
DELETE /bookings/:id         # Cancel booking
```

### Admin Endpoints (Requires Auth)
```bash
POST   /auth/login                     # Login
GET    /admin/bookings                 # List all bookings
PATCH  /admin/bookings/:id/approve     # Approve booking
PATCH  /admin/bookings/:id/decline     # Decline booking
GET    /admin/reports/bookings         # Booking statistics
GET    /admin/audit-logs               # Query audit logs (admin only)
```

### API Documentation
Interactive Swagger docs: http://localhost:8080/docs

## 🧪 Testing

### Unit Tests
```bash
cd backend
npm run test
npm run test:coverage
```

### E2E Tests
```bash
cd frontend
npm run test:e2e
```

### Coverage Thresholds
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## 🔐 Security Documentation

Before production deployment, complete:

1. **`security/TO_DO.md`** - Required artifacts checklist
2. **`security/REVIEW_REQUIRED.md`** - Manual signoff checklist
3. **`security/artifacts/PIA_TEMPLATE.md`** - Privacy Impact Assessment
4. **`security/artifacts/TRA_TEMPLATE.md`** - Threat Risk Assessment

## 🌐 Environment Variables

```bash
# Application
NODE_ENV=development
PORT=8080
FRONTEND_PORT=3000

# Database
DATABASE_URL=postgresql://oab_user:oab_password@db:5432/oab_dev

# Security (CRITICAL)
CANADA_PHIPA_READY=false              # Must be false by default

# JWT (ROTATE IN PRODUCTION)
JWT_SECRET=dev_secret_change_in_prod
JWT_EXPIRES_IN=24h

# Adapters
POS_ADAPTER=mock                      # mock | fhir
NOTIFICATION_ADAPTER=mock             # mock | twilio | sendgrid

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=3600000          # 1 hour

# Logging
LOG_LEVEL=info
LOG_REDACTION_ENABLED=true
```

## 🔄 CI/CD

GitHub Actions pipeline runs on every PR:
1. ✅ Lint (ESLint)
2. ✅ Type-check (TypeScript)
3. ✅ Unit tests (Jest)
4. ✅ E2E tests (Playwright)
5. ✅ Accessibility audit (Lighthouse - min 90)

## 📚 Documentation

- **CLAUDE.md**: Comprehensive guide for Claude Code instances
- **docs-planning/**: Ontario Health OAB v2.0 standard and requirements
- **docs/fhir-mapping.md**: FHIR resource mappings (future)
- **security/**: Privacy and security documentation

## ⚠️ Important Notes

### What's Included (✅)
- Full TypeScript backend with Express + Prisma
- React frontend with Vite
- Docker setup for local development
- Audit logging with PHI redaction
- RBAC middleware
- Mock adapters for PoS and notifications
- Seed data (25 patients, 6 physicians)
- Security templates (PIA, TRA)

### What Requires Human Completion (⏳)
- Real PIA/TRA completion (templates provided)
- SOC 2 Type 2 audit or ISO 27001 certification
- Live notification setup (Twilio/SendGrid keys + legal approval)
- Production EMR integration (FHIR adapter stub ready)
- Formal VPAT accessibility report
- Penetration testing (annual requirement)

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# Reset database
docker-compose down -v
docker-compose up -d db
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed
```

### Port Already in Use
```bash
# Change ports in .env
PORT=8081
FRONTEND_PORT=3001
```

### Clear Docker Volumes
```bash
docker-compose down -v
```

## 📞 Support

For issues and questions:
- Review `CLAUDE.md` for implementation guidance
- Check `security/REVIEW_REQUIRED.md` for compliance questions
- Consult Ontario Health OAB v2.0 standard in `docs-planning/`

## 📄 License

UNLICENSED - For demonstration and evaluation purposes only.

## 🎯 Next Steps for Production

1. Complete `security/TO_DO.md` checklist
2. Resolve all `TODO(privacy/security/legal/clinical)` comments
3. Replace mock adapters with production implementations
4. Obtain legal approval for PHI storage
5. Set `CANADA_PHIPA_READY=true` only after checklist complete
6. Conduct penetration testing
7. Obtain formal accessibility audit (VPAT)
8. Configure production database backups
9. Set up monitoring and alerting
10. Rotate all JWT secrets

**Never deploy to production without completing the security checklist!**
