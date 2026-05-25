# Database Setup (phpMyAdmin)

## 1) Import
1. Open phpMyAdmin.
2. Click **Import**.
3. Select: `clinic_system/database/clinic_system.sql`
4. Click **Go**.

This creates an empty `clinic_system_db` with the clinic tables:
- `patient`
- `appointment`
- `doctor`
- `bills`
- `medical_record`
- `prescription`
- `lab_result`
- `doctor_review`
- `patient_complaint`
- `patient_report`

To remove the old `doctor.status` column from an existing database, run:

```bash
npm run migrate:drop-doctor-status
```

## 2) Database behavior
- Doctor fee is in `doctor.consultation_fee`
- Doctor availability is in:
  - `doctor.available_days` (JSON array)
  - `doctor.available_times` (JSON array)
- Appointment pre-fee image proof is in:
  - `appointment.pre_fee_image`
  - `appointment.pre_fee_image_name`
- Prescription is now split from medical record into its own `prescription` table.

## 3) Backend connection
This project now includes an API server in `server/` (Express + MySQL).

Run:
1. `npm install`
2. Copy `.env.example` -> `.env` and set DB credentials
3. `npm run start:api`
4. In another terminal: `npm start`
