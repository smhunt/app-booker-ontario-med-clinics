# Manual Review & Sign-Off Checklist

**Required approvals before production deployment**

This document outlines the manual review steps and sign-off procedures required before enabling PHI storage (`CANADA_PHIPA_READY=true`).

## Privacy Officer Review

### Responsibilities
- Review Privacy Impact Assessment (PIA)
- Approve PHI handling procedures
- Verify consent mechanisms
- Confirm PHIPA compliance

### Checklist
- [ ] PIA completed and approved
- [ ] Privacy notice published and accessible
- [ ] Consent forms reviewed and approved
- [ ] PHI redaction mechanisms tested
- [ ] Data retention policy approved
- [ ] Patient rights procedures documented (access, correction, deletion)
- [ ] Privacy breach response plan reviewed

### Sign-Off
```
Privacy Officer Name: _______________________________
Date: _______________
Signature: __________________________________________
```

---

## Clinical Lead Review

### Responsibilities
- Approve appointment types and booking rules
- Validate clinical workflows
- Review patient safety considerations

### Checklist
- [ ] Appointment types appropriate for clinic
- [ ] Appointment durations validated
- [ ] Booking rules align with clinical practice
- [ ] Provider availability configuration reviewed
- [ ] Patient notification templates reviewed
- [ ] Emergency booking procedures documented
- [ ] Workflow integration with existing processes validated

### Sign-Off
```
Clinical Lead Name: _______________________________
Date: _______________
Signature: __________________________________________
```

---

## IT Security Officer Review

### Responsibilities
- Review Threat Risk Assessment (TRA) or SOC 2 audit
- Approve infrastructure security
- Validate penetration testing results

### Checklist
- [ ] TRA or SOC 2 Type 2 audit reviewed
- [ ] Penetration testing completed and vulnerabilities addressed
- [ ] Vulnerability assessment scans completed
- [ ] Security certifications obtained (ISO 27001, SOC 2, HITRUST, or OntarioMD)
- [ ] Encryption standards validated (TLS 1.2+, AES-256)
- [ ] Access controls tested (RBAC)
- [ ] Audit logging verified and tamper-proof
- [ ] Rate limiting configured appropriately
- [ ] Database backups configured and tested
- [ ] Incident response procedures tested
- [ ] Monitoring and alerting configured

### Sign-Off
```
IT Security Officer Name: _______________________________
Date: _______________
Signature: __________________________________________
```

---

## Legal Counsel Review

### Responsibilities
- Review consent forms and privacy notices
- Verify compliance with PHIPA and other legislation
- Approve vendor agreements

### Checklist
- [ ] Consent language legally compliant
- [ ] Privacy notice meets PHIPA requirements
- [ ] Vendor agreements include appropriate privacy/security terms
- [ ] Data processing agreements completed
- [ ] Canada-only data residency confirmed
- [ ] Terms of service and privacy policy reviewed
- [ ] Liability and indemnification clauses reviewed
- [ ] CASL compliance verified (for notifications)
- [ ] AODA compliance verified (accessibility)

### Sign-Off
```
Legal Counsel Name: _______________________________
Date: _______________
Signature: __________________________________________
```

---

## Compliance Officer Review

### Responsibilities
- Verify overall compliance with regulations
- Coordinate between departments
- Final approval before production

### Checklist
- [ ] PHIPA compliance verified
- [ ] AODA compliance verified
- [ ] CASL compliance verified
- [ ] Ontario Health OAB v2.0 standard compliance verified
- [ ] All required artifacts obtained (PIA, TRA, pen-test, certifications)
- [ ] All sign-offs obtained from other officers
- [ ] Documentation complete and accessible
- [ ] Training completed for staff using the system
- [ ] Audit procedures documented

### Sign-Off
```
Compliance Officer Name: _______________________________
Date: _______________
Signature: __________________________________________
```

---

## Final Deployment Approval

Once all sign-offs above are obtained:

1. Update `CANADA_PHIPA_READY=false` to `CANADA_PHIPA_READY=true`
2. Deploy to production environment
3. Monitor closely for first 48 hours
4. Schedule post-deployment security review (30 days)
5. Schedule annual compliance review

### Deployment Authorization

```
Authorized By: _______________________________
Role: ________________________________________
Date: _______________
Signature: __________________________________________
```

---

## Ongoing Compliance

### Annual Requirements
- [ ] Privacy Impact Assessment review (every 3 years or when changes occur)
- [ ] Threat Risk Assessment refresh (every 3 years or when changes occur)
- [ ] SOC 2 Type 2 audit (if applicable, annually)
- [ ] Penetration testing (annually)
- [ ] Vulnerability assessments (quarterly minimum)
- [ ] Staff training refresh
- [ ] Incident response plan test
- [ ] Disaster recovery plan test

### Trigger Events Requiring Re-Review
- Major software updates or feature additions
- Changes to data flows or storage
- New third-party vendor integration
- Security incident occurrence
- Legislative changes
- Organizational changes

---

**CRITICAL**: This document must be completed and all sign-offs obtained before enabling PHI storage in production.

Store completed and signed version in secure location with restricted access.

Last Updated: 2024-11-07
