# Security & Compliance TODO

**Required artifacts before production deployment**

This checklist must be completed before setting `CANADA_PHIPA_READY=true`.

## Legal & Compliance Artifacts

- [ ] **Privacy Impact Assessment (PIA)**
  - Must be completed by qualified professional (2+ years PHIPA experience)
  - Use template in `security/artifacts/PIA_TEMPLATE.md`
  - Must be reviewed within last 3 years
  - Status: ⏳ Template provided, awaiting completion

- [ ] **Threat Risk Assessment (TRA) OR SOC 2 Type 2 Audit**
  - TRA: Must be completed within last 2 years
  - SOC 2: Must be completed within last year
  - Use template in `security/artifacts/TRA_TEMPLATE.md` or obtain SOC 2 report
  - Status: ⏳ TRA template provided, awaiting completion

- [ ] **Security Certifications**
  - Obtain ONE of: ISO 27001, SOC 2 Type 2, HITRUST, or OntarioMD certification
  - See `security/artifacts/README.md` for guidance
  - Status: ⏳ Awaiting certification

- [ ] **Penetration Testing Report**
  - Annual requirement
  - Must cover application and infrastructure
  - Must be conducted by qualified firm
  - Status: ⏳ Not started

- [ ] **Vulnerability Assessment Scan**
  - Includes application and infrastructure
  - Must document scan policy and frequency
  - Status: ⏳ Not started

## Operational Documentation

- [ ] **Business Continuity & Disaster Recovery Plan**
  - Document backup procedures
  - Document recovery time objectives (RTO)
  - Document recovery point objectives (RPO)
  - Test restore procedures
  - Status: ⏳ Not documented

- [ ] **Incident Response Procedures**
  - Document security incident response process
  - Define escalation paths
  - Test incident response plan
  - Status: ⏳ Not documented

- [ ] **Data Retention & Destruction Policy**
  - Follow CPSO standards (10 years for adults, longer for minors)
  - Document automated purging procedures
  - Ensure audit trail for deletions
  - Status: ⏳ Not documented

## Third-Party Agreements

- [ ] **Vendor Agreements**
  - Database hosting provider (must be Canada-only)
  - Notification provider (Twilio/SendGrid)
  - EMR vendor (for PoS integration)
  - All agreements must include privacy/security language
  - Status: ⏳ Awaiting vendor selection

- [ ] **Data Processing Agreements**
  - Ensure compliance with PHIPA
  - Confirm Canada-only data residency
  - Document data flows
  - Status: ⏳ Not complete

## Infrastructure Security

- [ ] **TLS Certificates**
  - Replace self-signed certificates with production certificates
  - Configure automated renewal
  - Status: ⏳ Self-signed only (dev)

- [ ] **Database Encryption**
  - Verify encryption at rest (AES-256 or equivalent)
  - Verify encryption in transit (TLS 1.2+)
  - Status: ✅ Configured for PostgreSQL

- [ ] **Secrets Management**
  - Rotate all JWT secrets from dev keys
  - Use secret management service (AWS Secrets Manager, Azure Key Vault, etc.)
  - Never commit secrets to git
  - Status: ⏳ Dev keys only

- [ ] **Database Backups**
  - Configure automated backups
  - Test restore procedures
  - Document backup retention policy
  - Status: ⏳ Not configured

- [ ] **Monitoring & Alerting**
  - Configure security event monitoring
  - Set up alerts for failed auth attempts
  - Monitor audit log integrity
  - Status: ⏳ Not configured

## Code Review

- [ ] **Resolve All TODO Comments**
  - Search codebase for `TODO(privacy)`
  - Search codebase for `TODO(security)`
  - Search codebase for `TODO(legal)`
  - Search codebase for `TODO(clinical)`
  - Status: ⏳ Multiple TODOs present

- [ ] **Replace Mock Adapters**
  - Replace MockPosAdapter with production implementation
  - Replace MockNotificationAdapter with production implementation
  - Obtain legal approval for live notifications
  - Status: ⏳ Using mocks

- [ ] **Security Code Review**
  - Review authentication implementation
  - Review authorization (RBAC) implementation
  - Review input validation (Zod schemas)
  - Review PHI redaction logic
  - Status: ⏳ Not reviewed

## Accessibility

- [ ] **WCAG 2.0 Level AA Compliance**
  - Run automated accessibility tests (axe-core)
  - Conduct manual screen reader testing
  - Obtain formal VPAT report
  - Status: ⏳ Automated tests only

## Deployment Checklist

- [ ] **Environment Configuration**
  - Set `CANADA_PHIPA_READY=false` initially
  - Configure production DATABASE_URL (Canada-only)
  - Set secure JWT_SECRET
  - Configure rate limiting for production load
  - Status: ⏳ Dev configuration only

- [ ] **CI/CD Pipeline**
  - GitHub Actions configured
  - All tests passing
  - Accessibility checks passing
  - Status: ✅ Basic pipeline configured

## Sign-Off Required

Before setting `CANADA_PHIPA_READY=true`, obtain sign-off from:

- [ ] Privacy Officer
- [ ] Clinical Lead
- [ ] IT Security Officer
- [ ] Legal Counsel
- [ ] Compliance Officer

See `security/REVIEW_REQUIRED.md` for detailed sign-off procedures.

---

**CRITICAL**: Do not deploy to production or enable PHI storage without completing this checklist.

Last Updated: 2024-11-07
