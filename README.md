# Clinic Management System

A full-stack web application for running a medical clinic: patients book appointments and view their records, doctors manage their schedule and patient files, and managers oversee doctors, patients, reviews and complaints.

Built solo as my Computer Science graduation project at the Lebanese International University (2026).

**Stack:** React 18 · Node.js · Express · MySQL · JWT · Google Sign-In · OpenAI API · Nodemailer

<!--
## Screenshots
Add 3–4 screenshots to docs/screenshots/ and uncomment:
![Patient dashboard](docs/screenshots/patient-dashboard.png)
![Doctor appointments](docs/screenshots/doctor-appointments.png)
![Manager dashboard](docs/screenshots/manager-dashboard.png)
-->

## Features

### Patients
- Register with email verification or sign in with Google
- Book appointments by doctor, specialty, date and time slot
- Track appointment status and get email updates when an appointment is confirmed or cancelled
- View medical records, prescriptions and lab results
- **AI specialty advice:** describe symptoms and get the clinic specialty that fits best
- **AI report explainer:** upload a lab report PDF and get its medical terms explained in plain language
- Rate and review doctors, send complaints, and see the clinic location and contact details

### Doctors
- Dashboard with appointment and patient statistics
- Confirm or cancel appointments; conflicting pending bookings for the same slot are cancelled automatically
- Manage patients, write medical records and prescriptions, and upload lab results
- Set consultation fee and weekly availability

### Managers
- Dashboard with clinic-wide statistics
- Add doctors (with email verification), edit or remove them, and manage fees and availability
- Manage patients, monitor all appointments, moderate doctor reviews and handle patient complaints

## Architecture

```
React SPA (port 3000)  ──REST/JSON──▶  Express API (port 3001)  ──▶  MySQL
                                              │
                                              ├──▶ OpenAI API      (specialty advice, PDF explanation)
                                              ├──▶ Google OAuth    (Sign-In token verification)
                                              └──▶ SMTP/Nodemailer (verification codes, appointment emails)
```

- **API:** 41 REST endpoints covering auth, profiles, doctors, patients, appointments, medical records, lab results, reviews and complaints
- **Database:** 10 relational tables linked by 19 foreign keys (`doctor`, `patient`, `appointment`, `medical_record`, `prescription`, `lab_result`, `bills`, `doctor_review`, `patient_complaint`, `patient_report`)
- **Security:** bcrypt password hashing, JWT authentication (7-day tokens), role-based access control for `patient`, `doctor` and `manager`, verification codes stored as SHA-256 hashes, and Google ID tokens verified server-side

## Project Structure

```
clinic_system/
├── database/            # SQL schema + migration scripts
├── server/
│   ├── index.js         # Express API (routes, email, AI features)
│   ├── db.js            # MySQL connection pool
│   └── middleware/
│       └── auth.js      # JWT verification + role checks
└── src/
    ├── components/
    │   ├── auth/        # Login, Register, Google Sign-In
    │   ├── common/      # Header, Sidebar, Profile, Spinner
    │   └── dashboards/  # Patient, Doctor and Manager dashboards
    ├── hooks/           # useAuth, useApi
    └── styles/
```

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL (e.g. via XAMPP / phpMyAdmin)

### Setup
1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/Bilalothman/clinic-system.git
   cd clinic-system
   npm install
   ```
2. Create the database: in phpMyAdmin, import `database/clinic_system.sql` (see [database/README.md](database/README.md)).
3. Copy `.env.example` to `.env` and fill in the values:

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Yes | MySQL connection |
   | `JWT_SECRET` | Yes | Signs login tokens. Use a long random string; the API will not start without it |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | For email | Verification codes and appointment emails |
   | `GOOGLE_CLIENT_ID`, `REACT_APP_GOOGLE_CLIENT_ID` | For Google Sign-In | OAuth client ID |
   | `OPENAI_API_KEY` | For AI features | Specialty advice and PDF explanation |
   | `CORS_ORIGIN` | No | Front-end origin (default `http://localhost:3000`) |

4. Start the front end and the API together:
   ```bash
   npm start
   ```
   - Web app: http://localhost:3000
   - API: http://localhost:3001 (health check: `/api/health`)

### Other scripts
| Command | Description |
| --- | --- |
| `npm run start:web` | Front end only |
| `npm run start:api` | API only |
| `npm run build` | Production build of the front end |
| `npm test` | Run tests |

## Disclaimer

The AI features give general guidance only and are not a medical diagnosis.

## Author

**Bilal Othman** — [LinkedIn](https://www.linkedin.com/in/bilal-othman-a6814431b) · [GitHub](https://github.com/Bilalothman)
