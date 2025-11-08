# OSCAR EMR Integration Research & Development Opportunities

## Executive Summary

OSCAR (Open Source Clinical Application & Resource) is one of Canada's leading EMR systems, developed by McMaster University's Department of Family Medicine. Thames Valley Family Health Team and many Ontario FHTs use OSCAR EMR.

**Key Finding**: Your booking system is well-architected with the adapter pattern, but OSCAR integration requires implementing REST API endpoints rather than pure FHIR, as OSCAR's FHIR support is limited.

---

## About OSCAR EMR

### Overview
- **Origin**: Created by Dr. David Chan at McMaster University
- **License**: Open Source (GPL)
- **Technology**: Java-based web application (Spring Framework, JAX-RS)
- **Market**: One of top EMRs in Canada
- **Users**: McMaster, Queens, McGill, UBC, thousands of physicians across Canada
- **Repository**: https://github.com/scoophealth/oscar (40 stars, 22 forks, active development)

### Architecture
- **Language**: Java
- **Framework**: Spring, Apache CXF for web services
- **APIs**: 
  - SOAP Web Services (`@WebService`)
  - REST API (`@Path("/schedule")`, `@Path("/app")`)
  - Limited FHIR support
- **Database**: MySQL/MariaDB
- **Authentication**: Session-based, OAuth2 for integrations

---

## OSCAR's Appointment & Scheduling APIs

### Core Components

#### 1. **ScheduleManager** (Business Logic)
Location: `org.oscarehr.managers.ScheduleManager`

Key Methods:
```java
// Get day's schedule with availability
public DayWorkSchedule getDayWorkSchedule(String providerNo, Calendar date)

// Get appointments for a provider on a date
public List<Appointment> getDayAppointments(LoggedInInfo loggedInInfo, String providerNo, Calendar date)

// Get appointment types
public List<AppointmentType> getAppointmentTypes()

// Add new appointment
public void addAppointment(LoggedInInfo loggedInInfo, Security security, Appointment appointment)

// Update appointment
public void updateAppointment(LoggedInInfo loggedInInfo, Appointment appointment)

// Get appointments in date range
public List<Appointment> getAppointmentsForDateRangeAndProvider(LoggedInInfo loggedInInfo, Date startTime, Date endTime, String providerNo)
```

#### 2. **REST API: ScheduleService**
Location: `org.oscarehr.ws.rest.ScheduleService`

**Base Path**: `/ws/rest/schedule`

**Key Endpoints**:

```java
// Get appointments for a day
GET /schedule/{providerNo}/day/{date}
GET /schedule/me/day/today  // shortcuts supported

// Get appointments by date range
GET /schedule/fetchDays/{sDate}/{eDate}/{providers}
GET /schedule/fetchProviderAppts/{providerNo}/{sDate}/{eDate}

// Get monthly data
GET /schedule/fetchMonthly/{providerNo}/{year}/{month}

// Get appointment types
GET /schedule/types

// Get appointment statuses
GET /schedule/statuses

// Get schedule template codes
GET /schedule/codes

// Add appointment
POST /schedule/add
Content-Type: application/json
Body: NewAppointmentTo1

// Update appointment
POST /schedule/updateAppointment
Body: AppointmentTo1

// Update appointment status
POST /schedule/appointment/{id}/updateStatus
Body: AppointmentTo1

// Delete appointment
POST /schedule/deleteAppointment
Body: AppointmentTo1

// Get single appointment
POST /schedule/getAppointment
Body: {id: appointmentId}

// Patient appointment history
POST /schedule/{demographicNo}/appointmentHistory
```

#### 3. **SOAP Web Services: ScheduleWs & BookingWs**
Location: `org.oscarehr.ws.ScheduleWs`, `org.oscarehr.ws.BookingWs`

```java
// Legacy SOAP endpoints (still supported)
getAppointmentsForProvider2(String providerNo, Calendar date, boolean useGMTTime)
getAppointmentsForPatient2(Integer demographicId, int startIndex, int itemsToReturn, boolean useGMTTime)
addAppointment(AppointmentTransfer appointmentTransfer)
updateAppointment(AppointmentTransfer appointmentTransfer)

// Booking-specific
BookingWs.findAppointment(Integer demographicNo, String appointmentTypeStr, Calendar startDate)
BookingWs.bookAppointment(String encryptedAppointmentTimeSlot, String appointmentNotes)
```

---

## Data Models

### Appointment Object
```java
{
  "id": Integer,
  "providerNo": String,
  "demographicNo": Integer,  // patient ID
  "appointmentDate": Date,
  "startTime": Date,
  "endTime": Date,
  "duration": Integer,
  "type": String,           // appointment type code
  "status": Character,      // 't' = to be confirmed, 'H' = here, etc.
  "notes": String,
  "location": String,
  "resources": String,
  "urgency": String,
  "reason": String
}
```

### Key Fields
- **providerNo**: OSCAR's provider identifier (string, not UUID)
- **demographicNo**: Patient identifier (integer)
- **appointmentDate**: Date of appointment
- **startTime/endTime**: Actual time slots
- **status codes**: Single character codes (different from your system)

---

## Integration Architecture Recommendations

### Option 1: Direct REST API Integration (Recommended)

**Pros**:
- OSCAR's REST API is stable and well-used
- No FHIR complexity
- Direct mapping to your needs
- Good documentation from code inspection

**Implementation**:

Create `OscarPosAdapter.ts`:

```typescript
import { IPosAdapter, Slot, Booking } from './IPosAdapter';
import axios from 'axios';
import logger from '../../utils/logger';

export class OscarPosAdapter implements IPosAdapter {
  private baseUrl: string;
  private authToken: string;

  constructor() {
    this.baseUrl = process.env.OSCAR_BASE_URL || 'https://oscar.example.com/ws/rest';
    this.authToken = process.env.OSCAR_API_TOKEN || '';
  }

  async getProviderAvailability(providerId: string, date: string): Promise<Slot[]> {
    try {
      // Map your UUID provider ID to OSCAR's providerNo
      const oscarProviderNo = await this.mapProviderIdToOscarNo(providerId);
      
      // Get all appointments for the day
      const response = await axios.get(
        `${this.baseUrl}/schedule/${oscarProviderNo}/day/${date}`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Get provider's schedule template
      const scheduleResponse = await axios.get(
        `${this.baseUrl}/schedule/fetchProviderAppts/${oscarProviderNo}/${date}/${date}`
      );

      // Generate available slots by subtracting booked appointments
      return this.generateAvailableSlots(scheduleResponse.data, response.data, date);
    } catch (error) {
      logger.error('OSCAR API error', { error, providerId, date });
      throw error;
    }
  }

  async createAppointment(booking: Booking): Promise<string> {
    const oscarProviderNo = await this.mapProviderIdToOscarNo(booking.providerId);
    const oscarDemographicNo = await this.mapPatientIdToOscarNo(booking.patientId);

    const oscarAppointment = {
      providerNo: oscarProviderNo,
      demographicNo: oscarDemographicNo,
      appointmentDate: booking.date,
      startTime: this.convertToOscarTime(booking.time),
      duration: 15, // or get from appointment type
      type: await this.mapAppointmentTypeToOscar(booking.appointmentTypeId),
      status: 't', // 't' = to be confirmed
      notes: booking.reason || '',
      location: booking.modality
    };

    const response = await axios.post(
      `${this.baseUrl}/schedule/add`,
      oscarAppointment,
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.appointment.id.toString();
  }

  async updateAppointment(id: string, updates: Partial<Booking>): Promise<void> {
    // Get current appointment
    const current = await axios.post(
      `${this.baseUrl}/schedule/getAppointment`,
      { id: parseInt(id) }
    );

    // Merge updates
    const updated = { ...current.data.appointment, ...this.mapUpdatesToOscar(updates) };

    // Send update
    await axios.post(
      `${this.baseUrl}/schedule/updateAppointment`,
      updated,
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  async cancelAppointment(id: string): Promise<void> {
    await axios.post(
      `${this.baseUrl}/schedule/appointment/${id}/updateStatus`,
      { status: 'C' }, // 'C' = cancelled
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  async syncAppointmentStatus(bookingId: string): Promise<Booking> {
    const response = await axios.post(
      `${this.baseUrl}/schedule/getAppointment`,
      { id: parseInt(bookingId) },
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return this.mapOscarAppointmentToBooking(response.data.appointment);
  }

  // Helper methods
  private async mapProviderIdToOscarNo(providerId: string): Promise<string> {
    // Query your database for OSCAR provider mapping
    // Or use a lookup table
  }

  private async mapPatientIdToOscarNo(patientId: string): Promise<number> {
    // Map your patient UUID to OSCAR's demographicNo
  }

  private generateAvailableSlots(schedule: any, appointments: any[], date: string): Slot[] {
    // Implement slot generation logic based on schedule template
    // Subtract booked appointments
  }
}
```

### Option 2: FHIR Bridge (Limited Support)

OSCAR has partial FHIR support. You could:
1. Use OSCAR's FHIR endpoints where available
2. Fall back to REST API for missing functionality
3. Build a FHIR-to-OSCAR translation layer

**Note**: This is more complex and OSCAR's FHIR coverage is incomplete.

---

## Development Opportunities

### 1. **Hybrid Adapter Strategy**
Create both adapters:
- `OscarPosAdapter` - Direct REST integration (production)
- `FhirPosAdapter` - For FHIR-compliant EMRs
- `MockPosAdapter` - Development/testing (current)

Update factory.ts:
```typescript
export function createPosAdapter(): IPosAdapter {
  const adapterType = process.env.POS_ADAPTER || 'mock';

  switch (adapterType.toLowerCase()) {
    case 'oscar':
      return new OscarPosAdapter();
    case 'fhir':
      return new FhirPosAdapter();
    case 'mock':
    default:
      return new MockPosAdapter();
  }
}
```

### 2. **ID Mapping Service**
Create a mapping service to translate between your UUIDs and OSCAR's IDs:

```typescript
// backend/src/services/oscarMappingService.ts
export class OscarMappingService {
  async mapProviderId(oabProviderId: string): Promise<string> {
    // Query mapping table or provider metadata
  }
  
  async mapPatientId(oabPatientId: string): Promise<number> {
    // Query mapping table or patient metadata
  }
}
```

### 3. **Appointment Type Synchronization**
OSCAR uses string codes for appointment types. You'll need:
- Sync OSCAR's appointment types to your database
- Map your `appointmentTypeId` to OSCAR's type codes

### 4. **Status Code Translation**
Map between your status system and OSCAR's:

```typescript
const statusMap = {
  'pending': 't',    // to be confirmed
  'confirmed': 'C',  // confirmed (uppercase C)
  'cancelled': 'c',  // cancelled (lowercase c)
  'completed': 'H'   // Here/completed
};
```

### 5. **Webhook/Polling for Sync**
Implement two-way sync:
- **Push**: Your booking → OSCAR (via REST API)
- **Pull**: Poll OSCAR for changes made directly in EMR
  - Use `fetchProviderAppts` with date ranges
  - Track last sync timestamp
  - Update your database with changes

```typescript
async syncFromOscar(): Promise<void> {
  const lastSync = await getLastSyncTime();
  const endDate = new Date();
  
  // Get all appointments changed since last sync
  const providers = await getAllProviders();
  
  for (const provider of providers) {
    const oscarAppts = await this.getAppointmentsInRange(
      provider.oscarProviderNo,
      lastSync,
      endDate
    );
    
    // Update your database
    await this.updateLocalAppointments(oscarAppts);
  }
  
  await setLastSyncTime(endDate);
}
```

### 6. **Testing Strategy**
- **Unit Tests**: Mock OSCAR API responses
- **Integration Tests**: Use OSCAR demo server (if available)
- **Staging Environment**: Set up local OSCAR instance using Docker
  - Docker repo: https://github.com/dermatologist/oscar-latest-docker

---

## OSCAR Deployment for Testing

### Local OSCAR Instance
Use the community Docker deployment:

```bash
git clone https://github.com/dermatologist/oscar-latest-docker
cd oscar-latest-docker
docker-compose up -d
```

Access at: http://localhost:8080/oscar

### Alternative: Open-OSP
For modern deployment:
```bash
git clone https://github.com/open-osp/open-osp
# Follow deployment instructions
```

---

## Security Considerations

### Authentication
OSCAR supports:
1. **Session-based auth** (web UI)
2. **API tokens** (for integrations)
3. **OAuth2** (for external apps)

You'll need:
- OSCAR admin to create API credentials
- Secure storage of credentials (environment variables, secrets manager)
- Token refresh logic

### PHI Protection
- All OSCAR API calls contain PHI
- Must use HTTPS only
- Follow same PHIPA requirements as your system
- Log all EMR interactions in audit trail

### Network Security
- OSCAR typically on private network (VPN required)
- Firewall rules needed
- mTLS recommended for production

---

## Implementation Roadmap

### Phase 1: Research & Setup (2 weeks)
- [ ] Contact TVFHT IT to get OSCAR access details
- [ ] Request API documentation from OSCAR vendor/support
- [ ] Set up local OSCAR test instance
- [ ] Create test provider and patient accounts
- [ ] Get API credentials

### Phase 2: Basic Integration (3-4 weeks)
- [ ] Implement `OscarPosAdapter` skeleton
- [ ] Build ID mapping service
- [ ] Implement `getProviderAvailability()`
- [ ] Implement `createAppointment()`
- [ ] Unit tests with mocked responses

### Phase 3: Full CRUD (2-3 weeks)
- [ ] Implement `updateAppointment()`
- [ ] Implement `cancelAppointment()`
- [ ] Implement `syncAppointmentStatus()`
- [ ] Status code mapping
- [ ] Error handling and retries

### Phase 4: Sync & Production (3-4 weeks)
- [ ] Implement polling sync mechanism
- [ ] Handle conflict resolution
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing
- [ ] Production deployment

**Total Estimated Time**: 10-14 weeks (2.5-3.5 months)

---

## Questions to Ask TVFHT

1. **OSCAR Version**: What version of OSCAR are you running?
2. **API Access**: Do you have REST API enabled? SOAP web services?
3. **Authentication**: What authentication method do you support for integrations?
4. **Network Access**: How do we connect? VPN? Direct access?
5. **Test Environment**: Do you have a test/staging OSCAR instance?
6. **Provider IDs**: What format are your provider identifiers?
7. **Appointment Types**: What are your appointment type codes?
8. **Existing Integrations**: Do you have other systems integrated with OSCAR?
9. **Support**: Who supports OSCAR integration questions?
10. **Documentation**: Do you have custom API documentation?

---

## Additional Resources

### OSCAR Resources
- **Main Repo**: https://github.com/scoophealth/oscar
- **Docker Deploy**: https://github.com/dermatologist/oscar-latest-docker
- **Modern Ops**: https://github.com/open-osp/open-osp
- **FHIR Export Tool**: https://github.com/dermatologist/goscar-export
- **McMaster OSCAR**: https://fammed.mcmaster.ca/oscar-emr/

### Development Tools
- **API Client**: Postman/Insomnia for testing endpoints
- **Java Decompiler**: To inspect OSCAR classes if needed
- **MySQL Workbench**: To inspect OSCAR database schema

### Ontario Health Standards
- OntarioMD specifications for EMR integrations
- HL7 FHIR profiles for Canadian implementations
- Ontario Health Data Standards

---

## Conclusion

Your system's adapter pattern is well-suited for OSCAR integration. The main work involves:

1. **Implementing REST API calls** to OSCAR's `/ws/rest/schedule` endpoints
2. **ID mapping** between your UUIDs and OSCAR's string/integer IDs  
3. **Status/type code translation** between systems
4. **Two-way sync** to keep both systems updated
5. **Security** to protect PHI in transit

OSCAR is mature, well-documented (via code), and actively used in Ontario. Direct REST API integration is recommended over FHIR due to OSCAR's limited FHIR support.

**Next Step**: Contact Thames Valley FHT IT department to discuss integration requirements and get API access for testing.
