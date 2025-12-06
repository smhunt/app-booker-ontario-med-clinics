# Port Registry

Standard port assignments for this monorepo. **Do not change these without updating this file.**

## Medical Clinic
| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3001 | React Vite dev server |
| Backend | 3080 | Express API server |
| Database | 5433 | PostgreSQL (mapped from 5432) |

## Veterinary Clinic
| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3002 | React Vite dev server |
| Backend | 3081 | Express API server |
| Database | 5434 | PostgreSQL (mapped from 5432) |

## URLs (Development)

### Localhost
- Medical Frontend: http://localhost:3001
- Medical Backend: http://localhost:3080
- Vet Frontend: http://localhost:3002
- Vet Backend: http://localhost:3081

### LAN Access (replace with your IP)
- Medical Frontend: http://YOUR_LAN_IP:3001
- Medical Backend: http://YOUR_LAN_IP:3080
- Vet Frontend: http://YOUR_LAN_IP:3002
- Vet Backend: http://YOUR_LAN_IP:3081

## Demo Credentials

### Medical Clinic
- **Admin**: admin@ildertonhealth-demo.ca / Admin123
- **Staff**: staff@ildertonhealth-demo.ca / Staff123

### Veterinary Clinic
- **Admin**: admin@vetclinic-demo.ca / Admin123!
- **Staff**: staff@vetclinic-demo.ca / Staff123!

## Port Range Convention
- 3000-3099: Frontend and backend applications
- 5432-5499: PostgreSQL databases
