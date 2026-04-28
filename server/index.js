require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('./db');
const { requireAuth, requireRoles } = require('./middleware/auth');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const startedAt = new Date().toISOString();
let startupDbStatus = { ok: false, checkedAt: null, error: null };
const defaultDoctorTimeSlots = [
  '08:00 AM',
  '08:15 AM',
  '08:30 AM',
  '08:45 AM',
  '09:00 AM',
  '09:15 AM',
  '09:30 AM',
  '09:45 AM',
  '10:00 AM',
  '10:15 AM',
  '10:30 AM',
  '10:45 AM',
  '11:00 AM',
  '11:15 AM',
  '11:30 AM',
  '11:45 AM',
  '12:00 PM',
  '12:15 PM',
  '12:30 PM',
  '12:45 PM',
  '01:00 PM',
  '01:15 PM',
  '01:30 PM',
  '01:45 PM',
  '02:00 PM',
  '02:15 PM',
  '02:30 PM',
  '02:45 PM',
  '03:00 PM',
];

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json({ limit: '20mb' }));

// Forward async route errors to Express instead of repeating try/catch in every handler.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Doctor availability is stored as JSON in MySQL, so normalize it into plain arrays.
const parseJsonArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const parseDuration = (value) => {
  return 15;
};

// Keep date formatting centralized because charts and forms depend on consistent YYYY-MM-DD values.
const toIsoDate = (value) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDateValue = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateOnlyString = (value) => {
  if (!value) {
    return value || null;
  }

  return String(value).slice(0, 10);
};

// Used before creating or updating appointments to avoid double-booking the same slot.
const hasBookedAppointment = async ({ doctorId, date, time, excludeAppointmentId = null }) => {
  const params = [Number(doctorId), date, time];
  let sql = `
    SELECT appointment_id
    FROM appointment
    WHERE doctor_id = ?
      AND appointment_date = ?
      AND appointment_time = ?
      AND status IN ('pending', 'confirmed')`;

  if (excludeAppointmentId !== null && excludeAppointmentId !== undefined) {
    sql += ' AND appointment_id <> ?';
    params.push(Number(excludeAppointmentId));
  }

  sql += ' LIMIT 1';
  const rows = await query(sql, params);
  return Boolean(rows[0]);
};

// These formatters convert database column names into the shape the frontend expects.
const formatDoctor = (row) => ({
  id: row.doctor_id,
  name: row.full_name,
  specialty: row.specialty,
  phone: row.phone,
  email: row.email,
  password: row.password,
  status: row.status,
  fee: Number(row.consultation_fee || 0),
  availableDays: parseJsonArray(row.available_days),
  availableTimes: parseJsonArray(row.available_times),
  role: row.role,
  address: row.address,
  dob: toDateOnlyString(row.dob),
  gender: row.gender,
  profileImage: row.profile_image || '',
  profileImageName: row.profile_image_name || '',
  avgRating: Number(row.avg_rating || 0),
  reviewsCount: Number(row.reviews_count || 0),
});

const formatDoctorReview = (row) => ({
  id: row.doctor_review_id,
  doctorId: row.doctor_id,
  patientId: row.patient_id,
  patientName: row.patient_name || 'Patient',
  patientProfileImage: row.patient_profile_image || '',
  patientProfileImageName: row.patient_profile_image_name || '',
  rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
  comment: row.comment || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const formatPatientComplaint = (row) => ({
  id: row.patient_complaint_id,
  patientId: row.patient_id,
  patientName: row.patient_name || 'Patient',
  patientEmail: row.patient_email || '',
  subject: row.subject || '',
  message: row.message || '',
  status: row.status || 'new',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const formatPatient = (row) => ({
  id: row.patient_id,
  name: row.full_name,
  email: row.email,
  phone: row.phone,
  address: row.address,
  dob: toDateOnlyString(row.dob),
  gender: row.gender,
  age: row.age,
  assignedDoctorId: row.assigned_doctor_id,
  doctor: row.doctor_name || '',
  lastVisit: row.last_visit || 'N/A',
  notes: row.notes || '',
  status: row.status,
  condition: row.latest_diagnosis || 'No diagnosis yet',
  nextVisit: row.next_visit || row.last_visit || 'TBD',
  profileImage: row.profile_image || '',
  profileImageName: row.profile_image_name || '',
});

const formatAppointment = (row) => ({
  id: row.appointment_id,
  patientId: String(row.patient_id),
  patient: row.patient_name,
  doctorId: row.doctor_id,
  doctor: row.doctor_name,
  specialty: row.specialty,
  date: row.appointment_date,
  time: row.appointment_time,
  status: row.status,
  duration: `${row.duration_minutes}min`,
  reason: row.reason,
  doctorFee: row.doctor_fee !== null ? Number(row.doctor_fee) : null,
  preFeeImage: row.pre_fee_image || '',
  preFeeImageName: row.pre_fee_image_name || '',
});

// Support both hashed passwords and older plain-text seed data during login.
const passwordMatches = async (plain, stored) => {
  if (!stored) {
    return false;
  }

  if (plain === stored) {
    return true;
  }

  try {
    return await bcrypt.compare(plain, stored);
  } catch (error) {
    return false;
  }
};

const isStrongPatientPassword = (value) => {
  const password = String(value || '');
  return /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
};

const signToken = (role, userId) => jwt.sign(
  { role, userId: String(userId) },
  process.env.JWT_SECRET || 'clinic-dev-secret',
  { expiresIn: '7d' }
);

const doctorById = async (doctorId) => {
  const rows = await query('SELECT * FROM doctor WHERE doctor_id = ?', [doctorId]);
  return rows[0] || null;
};

const patientById = async (patientId) => {
  const rows = await query('SELECT * FROM patient WHERE patient_id = ?', [patientId]);
  return rows[0] || null;
};

// Reviews are only allowed when the patient has an appointment with that doctor.
const patientHasDoctorAppointment = async (patientId, doctorId) => {
  const rows = await query(
    `SELECT appointment_id
     FROM appointment
     WHERE patient_id = ?
       AND doctor_id = ?
     LIMIT 1`,
    [Number(patientId), Number(doctorId)]
  );

  return Boolean(rows[0]);
};

// Some flows create appointments before a patient record exists, so this helper guarantees one.
const ensurePatient = async ({ patientId, patientName }) => {
  if (patientId) {
    const existing = await patientById(patientId);
    if (existing) {
      return existing;
    }
  }

  if (patientName) {
    const byName = await query(
      'SELECT * FROM patient WHERE LOWER(full_name) = LOWER(?) ORDER BY patient_id LIMIT 1',
      [patientName.trim()]
    );

    if (byName[0]) {
      return byName[0];
    }
  }

  const safeName = patientName?.trim() || `Patient ${Date.now()}`;
  const generatedEmail = `patient.${Date.now()}@local.demo`;

  const result = await query(
    `INSERT INTO patient
      (full_name, email, password, phone, address, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [safeName, generatedEmail, 'patient123', '-', 'Auto-generated from appointment']
  );

  return patientById(result.insertId);
};

const buildProfile = async (role, userId) => {
  if (role === 'patient') {
    const patient = await patientById(userId);
    if (!patient) {
      return null;
    }

    return {
      name: patient.full_name,
      email: patient.email,
      phone: patient.phone,
      address: patient.address,
      dob: toDateOnlyString(patient.dob),
      gender: patient.gender,
      avatar: patient.profile_image || '',
      avatarName: patient.profile_image_name || '',
    };
  }

  const doctor = await doctorById(userId);
  if (!doctor) {
    return null;
  }

  return {
    name: doctor.full_name,
    email: doctor.email,
    phone: doctor.phone,
    address: doctor.address,
    dob: toDateOnlyString(doctor.dob),
    gender: doctor.gender,
    avatar: doctor.profile_image || '',
    avatarName: doctor.profile_image_name || '',
  };
};

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'clinic-system-api',
    startedAt,
    db: startupDbStatus,
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'clinic-system-api',
    startedAt,
    db: startupDbStatus,
  });
});

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  const doctorRows = await query('SELECT * FROM doctor WHERE email = ? LIMIT 1', [email]);
  if (doctorRows[0]) {
    const doctor = doctorRows[0];
    const isValid = await passwordMatches(password, doctor.password);

    if (!isValid) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const role = doctor.role === 'manager' ? 'manager' : 'doctor';
    const token = signToken(role, doctor.doctor_id);
    const profile = await buildProfile(role, doctor.doctor_id);

    res.json({ token, role, userId: String(doctor.doctor_id), profile });
    return;
  }

  const patientRows = await query('SELECT * FROM patient WHERE email = ? LIMIT 1', [email]);
  if (!patientRows[0]) {
    res.status(401).json({ message: 'Invalid credentials.' });
    return;
  }

  const patient = patientRows[0];
  const isValid = await passwordMatches(password, patient.password);

  if (!isValid) {
    res.status(401).json({ message: 'Invalid credentials.' });
    return;
  }

  const token = signToken('patient', patient.patient_id);
  const profile = await buildProfile('patient', patient.patient_id);

  res.json({ token, role: 'patient', userId: String(patient.patient_id), profile });
}));

app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { name, email, password, phone, address, dob, gender } = req.body || {};

  if (!name || !email || !password || !phone || !address || !dob || !gender) {
    res.status(400).json({ message: 'All registration fields are required.' });
    return;
  }

  if (!isStrongPatientPassword(password)) {
    res.status(400).json({
      message: 'Password must include at least one uppercase letter, one number, and one symbol.',
    });
    return;
  }

  const existingDoctor = await query('SELECT doctor_id FROM doctor WHERE email = ? LIMIT 1', [email]);
  const existingPatient = await query('SELECT patient_id FROM patient WHERE email = ? LIMIT 1', [email]);

  if (existingDoctor[0] || existingPatient[0]) {
    res.status(409).json({ message: 'Email already exists.' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const insert = await query(
    `INSERT INTO patient
      (full_name, email, password, phone, address, dob, gender, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [name.trim(), email.trim(), hashedPassword, phone.trim(), address.trim(), dob, gender]
  );

  const profile = await buildProfile('patient', insert.insertId);
  const token = signToken('patient', insert.insertId);

  res.status(201).json({ token, role: 'patient', userId: String(insert.insertId), profile });
}));

app.get('/api/auth/me', requireAuth, asyncHandler(async (req, res) => {
  const profile = await buildProfile(req.user.role, req.user.userId);
  if (!profile) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  res.json({ role: req.user.role, userId: String(req.user.userId), profile });
}));

app.patch('/api/profile', requireAuth, asyncHandler(async (req, res) => {
  const { name, email, phone, address, dob, gender, avatar, avatarName } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : null;

  if (req.user.role === 'patient') {
    const existing = await patientById(req.user.userId);

    if (!existing) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (normalizedEmail && normalizedEmail !== String(existing.email || '').trim().toLowerCase()) {
      const doctorEmailMatch = await query('SELECT doctor_id FROM doctor WHERE LOWER(email) = LOWER(?) LIMIT 1', [normalizedEmail]);
      const patientEmailMatch = await query(
        'SELECT patient_id FROM patient WHERE LOWER(email) = LOWER(?) AND patient_id <> ? LIMIT 1',
        [normalizedEmail, Number(req.user.userId)]
      );

      if (doctorEmailMatch[0] || patientEmailMatch[0]) {
        res.status(409).json({ message: 'Email already exists.' });
        return;
      }
    }

    await query(
      `UPDATE patient
       SET full_name = ?, email = ?, phone = ?, address = ?, dob = ?, gender = ?,
           profile_image = ?, profile_image_name = ?
       WHERE patient_id = ?`,
      [
        name !== undefined ? String(name).trim() : existing.full_name,
        email !== undefined ? String(email).trim() : existing.email,
        phone !== undefined ? String(phone).trim() : existing.phone,
        address !== undefined ? String(address).trim() : existing.address,
        dob !== undefined ? dob : existing.dob,
        gender !== undefined ? String(gender).trim() : existing.gender,
        avatar !== undefined ? (avatar || null) : existing.profile_image,
        avatarName !== undefined ? (avatarName || null) : existing.profile_image_name,
        Number(req.user.userId),
      ]
    );

    const profile = await buildProfile(req.user.role, req.user.userId);
    res.json({ profile });
    return;
  }

  const existing = await doctorById(req.user.userId);

  if (!existing) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  if (normalizedEmail && normalizedEmail !== String(existing.email || '').trim().toLowerCase()) {
    const doctorEmailMatch = await query(
      'SELECT doctor_id FROM doctor WHERE LOWER(email) = LOWER(?) AND doctor_id <> ? LIMIT 1',
      [normalizedEmail, Number(req.user.userId)]
    );
    const patientEmailMatch = await query('SELECT patient_id FROM patient WHERE LOWER(email) = LOWER(?) LIMIT 1', [normalizedEmail]);

    if (doctorEmailMatch[0] || patientEmailMatch[0]) {
      res.status(409).json({ message: 'Email already exists.' });
      return;
    }
  }

  await query(
    `UPDATE doctor
     SET full_name = ?, email = ?, phone = ?, address = ?, dob = ?, gender = ?,
         profile_image = ?, profile_image_name = ?
     WHERE doctor_id = ?`,
    [
      name !== undefined ? String(name).trim() : existing.full_name,
      email !== undefined ? String(email).trim() : existing.email,
      phone !== undefined ? String(phone).trim() : existing.phone,
      address !== undefined ? String(address).trim() : existing.address,
      dob !== undefined ? dob : existing.dob,
      gender !== undefined ? String(gender).trim() : existing.gender,
      avatar !== undefined ? (avatar || null) : existing.profile_image,
      avatarName !== undefined ? (avatarName || null) : existing.profile_image_name,
      Number(req.user.userId),
    ]
  );

  const profile = await buildProfile(req.user.role, req.user.userId);
  res.json({ profile });
}));

app.get('/api/doctors', requireAuth, asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT
      d.*,
      COALESCE(AVG(dr.rating), 0) AS avg_rating,
      COUNT(dr.rating) AS reviews_count
     FROM doctor d
     LEFT JOIN doctor_review dr ON dr.doctor_id = d.doctor_id
     WHERE d.role = ?
     GROUP BY d.doctor_id
     ORDER BY d.full_name ASC`,
    ['doctor']
  );
  res.json(rows.map(formatDoctor));
}));

app.get('/api/doctor-dashboard/stats', requireAuth, asyncHandler(async (req, res) => {
  const requestedDays = Number(req.query?.days || 7);
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(Math.round(requestedDays), 1), 30) : 7;
  const requestedDoctorId = req.query?.doctorId ? Number(req.query.doctorId) : null;
  const requestedAnchorDate = typeof req.query?.anchorDate === 'string' ? req.query.anchorDate : '';

  let doctorId = Number(req.user.userId);
  if (req.user.role === 'manager' && Number.isFinite(requestedDoctorId) && requestedDoctorId > 0) {
    doctorId = requestedDoctorId;
  }

  if (req.user.role !== 'doctor' && req.user.role !== 'manager') {
    res.status(403).json({ message: 'Not allowed.' });
    return;
  }

  const [latestAppointmentRows, latestRecordRows, latestLabRows] = await Promise.all([
    query(
      `SELECT MAX(appointment_date) AS latest_date
       FROM appointment
       WHERE doctor_id = ?
         AND status IN ('pending', 'confirmed')`,
      [doctorId]
    ),
    query(
      `SELECT MAX(record_date) AS latest_date
       FROM medical_record
       WHERE doctor_id = ?`,
      [doctorId]
    ),
    query(
      `SELECT MAX(result_date) AS latest_date
       FROM lab_result
       WHERE doctor_id = ?`,
      [doctorId]
    ),
  ]);

  const latestDates = [
    toDateValue(latestAppointmentRows[0]?.latest_date),
    toDateValue(latestRecordRows[0]?.latest_date),
    toDateValue(latestLabRows[0]?.latest_date),
  ].filter(Boolean);

  const anchorDate = toDateValue(requestedAnchorDate);
  const endDate = anchorDate || (latestDates.length
    ? latestDates.reduce((maxDate, current) => (current > maxDate ? current : maxDate))
    : new Date());
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (days - 1));
  const startIso = toIsoDate(startDate);
  const endIso = toIsoDate(endDate);

  const [appointmentAggRows, recordsAggRows, labAggRows] = await Promise.all([
    query(
      `SELECT
        DATE_FORMAT(appointment_date, '%Y-%m-%d') AS day,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS appointments_count,
        COUNT(DISTINCT patient_id) AS patients_count
       FROM appointment
       WHERE doctor_id = ?
         AND appointment_date BETWEEN ? AND ?
         AND status IN ('pending', 'confirmed')
       GROUP BY appointment_date`,
      [doctorId, startIso, endIso]
    ),
    query(
      `SELECT
        DATE_FORMAT(record_date, '%Y-%m-%d') AS day,
        COUNT(*) AS records_count
       FROM medical_record
       WHERE doctor_id = ?
         AND record_date BETWEEN ? AND ?
       GROUP BY record_date`,
      [doctorId, startIso, endIso]
    ),
    query(
      `SELECT
        DATE_FORMAT(result_date, '%Y-%m-%d') AS day,
        COUNT(*) AS lab_results_count
       FROM lab_result
       WHERE doctor_id = ?
         AND result_date BETWEEN ? AND ?
       GROUP BY result_date`,
      [doctorId, startIso, endIso]
    ),
  ]);

  const [appointmentsTotalRows, patientsTotalRows, recordsTotalRows, labResultsTotalRows] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total
       FROM appointment
       WHERE doctor_id = ?
         AND status IN ('pending', 'confirmed')`,
      [doctorId]
    ),
    query(
      `SELECT COUNT(DISTINCT patient_id) AS total
       FROM appointment
       WHERE doctor_id = ?`,
      [doctorId]
    ),
    query(
      `SELECT COUNT(*) AS total
       FROM medical_record
       WHERE doctor_id = ?`,
      [doctorId]
    ),
    query(
      `SELECT COUNT(*) AS total
       FROM lab_result
       WHERE doctor_id = ?`,
      [doctorId]
    ),
  ]);

  const appointmentByDay = {};
  appointmentAggRows.forEach((row) => {
    appointmentByDay[row.day] = {
      appointments: Number(row.appointments_count || 0),
      patients: Number(row.patients_count || 0),
    };
  });

  const recordsByDay = {};
  recordsAggRows.forEach((row) => {
    recordsByDay[row.day] = Number(row.records_count || 0);
  });
  const labResultsByDay = {};
  labAggRows.forEach((row) => {
    labResultsByDay[row.day] = Number(row.lab_results_count || 0);
  });

  const timeline = [];
  const metricAppointments = [];
  const metricPatients = [];
  const metricRecords = [];
  const metricLabResults = [];

  for (let offset = 0; offset < days; offset += 1) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + offset);
    const dayIso = toIsoDate(dayDate);
    timeline.push(dayIso);
    metricAppointments.push(appointmentByDay[dayIso]?.appointments || 0);
    metricPatients.push(appointmentByDay[dayIso]?.patients || 0);
    metricRecords.push(recordsByDay[dayIso] || 0);
    metricLabResults.push(labResultsByDay[dayIso] || 0);
  }

  res.json({
    doctorId,
    from: startIso,
    to: endIso,
    days: timeline,
    metrics: {
      appointments: metricAppointments,
      patients: metricPatients,
      records: metricRecords,
      labResults: metricLabResults,
    },
    totals: {
      appointments: Number(appointmentsTotalRows[0]?.total || 0),
      patients: Number(patientsTotalRows[0]?.total || 0),
      records: Number(recordsTotalRows[0]?.total || 0),
      labResults: Number(labResultsTotalRows[0]?.total || 0),
    },
  });
}));

app.get('/api/manager-dashboard/stats', requireAuth, requireRoles('manager'), asyncHandler(async (req, res) => {
  const requestedDays = Number(req.query?.days || 7);
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(Math.round(requestedDays), 1), 30) : 7;

  const [latestDoctorRows, latestPatientRows, latestAppointmentRows, latestRevenueRows] = await Promise.all([
    query(
      `SELECT CURRENT_DATE() AS latest_date`,
      []
    ),
    query(
      `SELECT MAX(appointment_date) AS latest_date
       FROM appointment
       WHERE status IN ('pending', 'confirmed')`,
      []
    ),
    query(
      `SELECT MAX(appointment_date) AS latest_date
       FROM appointment
       WHERE status IN ('pending', 'confirmed')`,
      []
    ),
    query(
      `SELECT MAX(COALESCE(paid_date, issued_date)) AS latest_date
       FROM bills
       WHERE bill_status = 'paid'`,
      []
    ),
  ]);

  const latestDates = [
    toDateValue(latestDoctorRows[0]?.latest_date),
    toDateValue(latestPatientRows[0]?.latest_date),
    toDateValue(latestAppointmentRows[0]?.latest_date),
    toDateValue(latestRevenueRows[0]?.latest_date),
  ].filter(Boolean);

  const today = toDateValue(new Date());
  const endDate = today || (latestDates.length
    ? latestDates.reduce((maxDate, current) => (current > maxDate ? current : maxDate))
    : new Date());
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (days - 1));
  const startIso = toIsoDate(startDate);
  const endIso = toIsoDate(endDate);

  const [doctorAvailabilityRows, patientAggRows, appointmentAggRows, revenueAggRows] = await Promise.all([
    query(
      `SELECT available_days
       FROM doctor
       WHERE role = 'doctor'`,
      []
    ),
    query(
      `SELECT
        DATE_FORMAT(appointment_date, '%Y-%m-%d') AS day,
        COUNT(DISTINCT patient_id) AS patients_count
       FROM appointment
       WHERE appointment_date BETWEEN ? AND ?
         AND status IN ('pending', 'confirmed')
       GROUP BY appointment_date`,
      [startIso, endIso]
    ),
    query(
      `SELECT
        DATE_FORMAT(appointment_date, '%Y-%m-%d') AS day,
        COUNT(*) AS appointments_count
       FROM appointment
       WHERE appointment_date BETWEEN ? AND ?
         AND status = 'confirmed'
       GROUP BY appointment_date`,
      [startIso, endIso]
    ),
    query(
      `SELECT
        DATE_FORMAT(COALESCE(paid_date, issued_date), '%Y-%m-%d') AS day,
        SUM(amount * 0.20) AS revenue_total
       FROM bills
       WHERE bill_status = 'paid'
         AND COALESCE(paid_date, issued_date) BETWEEN ? AND ?
       GROUP BY COALESCE(paid_date, issued_date)`,
      [startIso, endIso]
    ),
  ]);

  const [doctorsTotalRows, patientsTotalRows, appointmentsTotalRows, revenueTotalRows] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total
       FROM doctor
       WHERE role = 'doctor'`,
      []
    ),
    query(
      `SELECT COUNT(DISTINCT patient_id) AS total
       FROM appointment
       WHERE status IN ('pending', 'confirmed')`,
      []
    ),
    query(
      `SELECT COUNT(*) AS total
       FROM appointment
       WHERE status = 'confirmed'`,
      []
    ),
    query(
      `SELECT COALESCE(SUM(amount * 0.20), 0) AS total
       FROM bills
       WHERE bill_status = 'paid'`,
      []
    ),
  ]);

  const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const doctorsByWeekday = weekdayLabels.reduce((accumulator, day) => ({
    ...accumulator,
    [day]: 0,
  }), {});

  doctorAvailabilityRows.forEach((row) => {
    const availableDays = parseJsonArray(row.available_days);
    availableDays.forEach((day) => {
      if (Object.prototype.hasOwnProperty.call(doctorsByWeekday, day)) {
        doctorsByWeekday[day] += 1;
      }
    });
  });

  const patientsByDay = {};
  patientAggRows.forEach((row) => {
    patientsByDay[row.day] = Number(row.patients_count || 0);
  });

  const appointmentsByDay = {};
  appointmentAggRows.forEach((row) => {
    appointmentsByDay[row.day] = Number(row.appointments_count || 0);
  });

  const revenueByDay = {};
  revenueAggRows.forEach((row) => {
    revenueByDay[row.day] = Number(row.revenue_total || 0);
  });

  const timeline = [];
  const metricDoctors = [];
  const metricPatients = [];
  const metricAppointments = [];
  const metricRevenue = [];

  for (let offset = 0; offset < days; offset += 1) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + offset);
    const dayIso = toIsoDate(dayDate);
    const weekdayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
    timeline.push(dayIso);
    metricDoctors.push(doctorsByWeekday[weekdayName] || 0);
    metricPatients.push(patientsByDay[dayIso] || 0);
    metricAppointments.push(appointmentsByDay[dayIso] || 0);
    metricRevenue.push(revenueByDay[dayIso] || 0);
  }

  res.json({
    from: startIso,
    to: endIso,
    days: timeline,
    metrics: {
      doctors: metricDoctors,
      patients: metricPatients,
      appointments: metricAppointments,
      revenue: metricRevenue,
    },
    totals: {
      doctors: Number(doctorsTotalRows[0]?.total || 0),
      patients: Number(patientsTotalRows[0]?.total || 0),
      appointments: Number(appointmentsTotalRows[0]?.total || 0),
      revenue: Number(revenueTotalRows[0]?.total || 0),
    },
  });
}));

app.get('/api/doctor-reviews', requireAuth, asyncHandler(async (req, res) => {
  const doctorId = req.query?.doctorId ? Number(req.query.doctorId) : null;
  const params = [];
  let whereSql = '';

  if (doctorId) {
    whereSql = 'WHERE dr.doctor_id = ?';
    params.push(doctorId);
  }

  const rows = await query(
    `SELECT
      dr.*,
      p.full_name AS patient_name,
      p.profile_image AS patient_profile_image,
      p.profile_image_name AS patient_profile_image_name
     FROM doctor_review dr
     INNER JOIN patient p ON p.patient_id = dr.patient_id
     ${whereSql}
     ORDER BY dr.updated_at DESC, dr.doctor_review_id DESC`,
    params
  );

  res.json(rows.map(formatDoctorReview));
}));

app.post('/api/doctors/:id/reviews', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'patient') {
    res.status(403).json({ message: 'Only patients can submit doctor reviews.' });
    return;
  }

  const doctorId = Number(req.params.id);
  const hasRating = req.body?.rating !== undefined && req.body?.rating !== null && String(req.body.rating).trim() !== '';
  const rating = hasRating ? Number(req.body.rating) : null;
  const comment = String(req.body?.comment || '').trim();

  if (!Number.isFinite(doctorId) || doctorId <= 0) {
    res.status(400).json({ message: 'Invalid doctor.' });
    return;
  }

  if (hasRating && (!Number.isFinite(rating) || rating < 1 || rating > 5)) {
    res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    return;
  }

  if (!hasRating && !comment) {
    res.status(400).json({ message: 'Please provide a rating or a comment.' });
    return;
  }

  const doctor = await doctorById(doctorId);
  if (!doctor || doctor.role !== 'doctor') {
    res.status(404).json({ message: 'Doctor not found.' });
    return;
  }

  const canReviewDoctor = await patientHasDoctorAppointment(req.user.userId, doctorId);
  if (!canReviewDoctor) {
    res.status(403).json({ message: 'You can only review doctors you have booked with.' });
    return;
  }

  let reviewId = null;

  if (hasRating && !comment) {
    const existingRatingRows = await query(
      `SELECT doctor_review_id
       FROM doctor_review
       WHERE doctor_id = ?
         AND patient_id = ?
         AND rating IS NOT NULL
       ORDER BY updated_at DESC, doctor_review_id DESC
       LIMIT 1`,
      [doctorId, Number(req.user.userId)]
    );

    if (existingRatingRows[0]) {
      reviewId = Number(existingRatingRows[0].doctor_review_id);
      await query(
        `UPDATE doctor_review
         SET rating = ?, updated_at = CURRENT_TIMESTAMP
         WHERE doctor_review_id = ?`,
        [Math.round(rating), reviewId]
      );
    } else {
      const insert = await query(
        `INSERT INTO doctor_review
          (doctor_id, patient_id, rating, comment)
         VALUES (?, ?, ?, ?)`,
        [doctorId, Number(req.user.userId), Math.round(rating), null]
      );
      reviewId = Number(insert.insertId);
    }
  } else {
    const insert = await query(
      `INSERT INTO doctor_review
        (doctor_id, patient_id, rating, comment)
       VALUES (?, ?, ?, ?)`,
      [doctorId, Number(req.user.userId), hasRating ? Math.round(rating) : null, comment || null]
    );
    reviewId = Number(insert.insertId);
  }

  const rows = await query(
    `SELECT
     dr.*,
      p.full_name AS patient_name
     FROM doctor_review dr
     INNER JOIN patient p ON p.patient_id = dr.patient_id
     WHERE dr.doctor_review_id = ?
     LIMIT 1`,
    [reviewId]
  );

  res.status(201).json(formatDoctorReview(rows[0]));
}));

app.patch('/api/doctor-reviews/:id', requireAuth, requireRoles('patient'), asyncHandler(async (req, res) => {
  const reviewId = Number(req.params.id);
  const comment = String(req.body?.comment || '').trim();

  if (!Number.isFinite(reviewId) || reviewId <= 0) {
    res.status(400).json({ message: 'Invalid comment.' });
    return;
  }

  if (!comment) {
    res.status(400).json({ message: 'Please write a comment before saving it.' });
    return;
  }

  const existingRows = await query(
    `SELECT doctor_review_id
     FROM doctor_review
     WHERE doctor_review_id = ?
       AND patient_id = ?
       AND comment IS NOT NULL
     LIMIT 1`,
    [reviewId, Number(req.user.userId)]
  );

  if (!existingRows[0]) {
    res.status(404).json({ message: 'Comment not found.' });
    return;
  }

  await query(
    `UPDATE doctor_review
     SET comment = ?, updated_at = CURRENT_TIMESTAMP
     WHERE doctor_review_id = ?`,
    [comment, reviewId]
  );

  const rows = await query(
    `SELECT
      dr.*,
      p.full_name AS patient_name
     FROM doctor_review dr
     INNER JOIN patient p ON p.patient_id = dr.patient_id
     WHERE dr.doctor_review_id = ?
     LIMIT 1`,
    [reviewId]
  );

  res.json(formatDoctorReview(rows[0]));
}));

app.delete('/api/doctor-reviews/:id', requireAuth, asyncHandler(async (req, res) => {
  const reviewId = Number(req.params.id);

  if (req.user.role !== 'patient' && req.user.role !== 'manager') {
    res.status(403).json({ message: 'Not allowed.' });
    return;
  }

  if (!Number.isFinite(reviewId) || reviewId <= 0) {
    res.status(400).json({ message: 'Invalid comment.' });
    return;
  }

  const ownershipSql = req.user.role === 'patient' ? 'AND patient_id = ?' : '';
  const params = req.user.role === 'patient'
    ? [reviewId, Number(req.user.userId)]
    : [reviewId];
  const existingRows = await query(
    `SELECT doctor_review_id
     FROM doctor_review
     WHERE doctor_review_id = ?
       ${ownershipSql}
       AND comment IS NOT NULL
     LIMIT 1`,
    params
  );

  if (!existingRows[0]) {
    res.status(404).json({ message: 'Comment not found.' });
    return;
  }

  await query('DELETE FROM doctor_review WHERE doctor_review_id = ?', [reviewId]);
  res.json({ success: true, id: reviewId });
}));

app.get('/api/patient-complaints', requireAuth, requireRoles('manager'), asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT
      pc.*,
      p.full_name AS patient_name,
      p.email AS patient_email
     FROM patient_complaint pc
     INNER JOIN patient p ON p.patient_id = pc.patient_id
     ORDER BY pc.created_at DESC, pc.patient_complaint_id DESC`,
    []
  );

  res.json(rows.map(formatPatientComplaint));
}));

app.post('/api/patient-complaints', requireAuth, requireRoles('patient'), asyncHandler(async (req, res) => {
  const subject = String(req.body?.subject || '').trim();
  const message = String(req.body?.message || '').trim();

  if (!subject) {
    res.status(400).json({ message: 'Please enter a subject.' });
    return;
  }

  if (!message) {
    res.status(400).json({ message: 'Please write your message.' });
    return;
  }

  if (subject.length > 180) {
    res.status(400).json({ message: 'Subject must be 180 characters or fewer.' });
    return;
  }

  const insert = await query(
    `INSERT INTO patient_complaint (patient_id, subject, message)
     VALUES (?, ?, ?)`,
    [Number(req.user.userId), subject, message]
  );

  const rows = await query(
    `SELECT
      pc.*,
      p.full_name AS patient_name,
      p.email AS patient_email
     FROM patient_complaint pc
     INNER JOIN patient p ON p.patient_id = pc.patient_id
     WHERE pc.patient_complaint_id = ?
     LIMIT 1`,
    [insert.insertId]
  );

  res.status(201).json(formatPatientComplaint(rows[0]));
}));

app.post('/api/doctors', requireAuth, requireRoles('manager'), asyncHandler(async (req, res) => {
  const { name, specialty, phone, email, password, status = 'active', fee = 0 } = req.body || {};

  if (!name || !specialty || !phone || !email || !password) {
    res.status(400).json({ message: 'Missing required doctor fields.' });
    return;
  }

  const exists = await query('SELECT doctor_id FROM doctor WHERE email = ? LIMIT 1', [email]);
  if (exists[0]) {
    res.status(409).json({ message: 'Doctor email already exists.' });
    return;
  }

  const insert = await query(
    `INSERT INTO doctor
      (role, full_name, specialty, phone, email, password, status, consultation_fee, available_days, available_times)
     VALUES ('doctor', ?, ?, ?, ?, ?, ?, ?, JSON_ARRAY(), ?)`,
    [name, specialty, phone, email, password, status, Number(fee) || 0, JSON.stringify(defaultDoctorTimeSlots)]
  );

  const created = await doctorById(insert.insertId);
  res.status(201).json(formatDoctor(created));
}));

app.put('/api/doctors/:id', requireAuth, requireRoles('manager'), asyncHandler(async (req, res) => {
  const doctorId = Number(req.params.id);
  const { name, specialty, phone, email, password, status, fee } = req.body || {};

  const existing = await doctorById(doctorId);
  if (!existing || existing.role !== 'doctor') {
    res.status(404).json({ message: 'Doctor not found.' });
    return;
  }

  await query(
    `UPDATE doctor
     SET full_name = ?, specialty = ?, phone = ?, email = ?, password = ?, status = ?, consultation_fee = ?
     WHERE doctor_id = ?`,
    [
      name || existing.full_name,
      specialty || existing.specialty,
      phone || existing.phone,
      email || existing.email,
      password || existing.password,
      status || existing.status,
      Number.isFinite(Number(fee)) ? Number(fee) : existing.consultation_fee,
      doctorId,
    ]
  );

  const updated = await doctorById(doctorId);
  res.json(formatDoctor(updated));
}));

app.delete('/api/doctors/:id', requireAuth, requireRoles('manager'), asyncHandler(async (req, res) => {
  const doctorId = Number(req.params.id);
  const existing = await doctorById(doctorId);

  if (!existing || existing.role !== 'doctor') {
    res.status(404).json({ message: 'Doctor not found.' });
    return;
  }

  await query('DELETE FROM doctor WHERE doctor_id = ?', [doctorId]);
  res.json({ ok: true });
}));

app.patch('/api/doctors/:id/fee', requireAuth, asyncHandler(async (req, res) => {
  const doctorId = Number(req.params.id);
  if (req.user.role !== 'manager' && Number(req.user.userId) !== doctorId) {
    res.status(403).json({ message: 'Not allowed.' });
    return;
  }

  const fee = Number(req.body?.fee);
  if (!Number.isFinite(fee) || fee <= 0) {
    res.status(400).json({ message: 'Fee must be greater than 0.' });
    return;
  }

  await query('UPDATE doctor SET consultation_fee = ? WHERE doctor_id = ?', [Math.round(fee), doctorId]);
  const updated = await doctorById(doctorId);
  res.json(formatDoctor(updated));
}));

app.patch('/api/doctors/:id/availability', requireAuth, asyncHandler(async (req, res) => {
  const doctorId = Number(req.params.id);
  if (req.user.role !== 'manager' && Number(req.user.userId) !== doctorId) {
    res.status(403).json({ message: 'Not allowed.' });
    return;
  }

  const days = Array.isArray(req.body?.days) ? req.body.days : [];
  const times = Array.isArray(req.body?.times) ? req.body.times : [];

  if (!days.length || !times.length) {
    res.status(400).json({ message: 'At least one day and one time are required.' });
    return;
  }

  await query(
    'UPDATE doctor SET available_days = ?, available_times = ? WHERE doctor_id = ?',
    [JSON.stringify(days), JSON.stringify(times), doctorId]
  );

  const updated = await doctorById(doctorId);
  res.json(formatDoctor(updated));
}));

app.get('/api/patients', requireAuth, asyncHandler(async (req, res) => {
  const { doctorId, search } = req.query;
  const clauses = [];
  const params = [];
  let scopedDoctorId = doctorId ? Number(doctorId) : null;

  if (req.user.role === 'doctor') {
    scopedDoctorId = Number(req.user.userId);
  }

  if (scopedDoctorId) {
    clauses.push(
      `EXISTS (
        SELECT 1
        FROM appointment ap
        WHERE ap.patient_id = p.patient_id
          AND ap.doctor_id = ?
      )`
    );
    params.push(scopedDoctorId);
  }

  if (search) {
    clauses.push('(LOWER(p.full_name) LIKE ? OR LOWER(p.phone) LIKE ? OR LOWER(d.full_name) LIKE ?)');
    const q = `%${String(search).toLowerCase()}%`;
    params.push(q, q, q);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = await query(
    `SELECT
      p.*,
      d.full_name AS doctor_name,
      (
        SELECT mr.diagnosis
        FROM medical_record mr
        WHERE mr.patient_id = p.patient_id
        ORDER BY mr.record_date DESC, mr.medical_record_id DESC
        LIMIT 1
      ) AS latest_diagnosis,
      (
        SELECT DATE_FORMAT(a.appointment_date, '%Y-%m-%d')
        FROM appointment a
        WHERE a.patient_id = p.patient_id AND a.appointment_date >= CURDATE()
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
        LIMIT 1
      ) AS next_visit
     FROM patient p
     LEFT JOIN doctor d ON d.doctor_id = p.assigned_doctor_id
     ${where}
     ORDER BY p.full_name ASC`,
    params
  );

  res.json(rows.map(formatPatient));
}));

app.post('/api/patients', requireAuth, requireRoles('manager'), asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    address = null,
    dob = null,
    gender = null,
    age = null,
    assignedDoctorId = null,
    notes = '',
  } = req.body || {};

  if (!name || !phone || !email || !password) {
    res.status(400).json({ message: 'Patient name, phone, email, and password are required.' });
    return;
  }

  const doctorEmailMatch = await query('SELECT doctor_id FROM doctor WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  const patientEmailMatch = await query('SELECT patient_id FROM patient WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);

  if (doctorEmailMatch[0] || patientEmailMatch[0]) {
    res.status(409).json({ message: 'Patient email already exists.' });
    return;
  }

  const insert = await query(
    `INSERT INTO patient
      (full_name, email, password, phone, address, dob, gender, age, assigned_doctor_id, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [name, String(email).trim(), password, phone, address, dob, gender, age, assignedDoctorId, notes]
  );

  const rows = await query(
    `SELECT p.*, d.full_name AS doctor_name, NULL AS latest_diagnosis, NULL AS next_visit
     FROM patient p
     LEFT JOIN doctor d ON d.doctor_id = p.assigned_doctor_id
     WHERE p.patient_id = ?`,
    [insert.insertId]
  );

  res.status(201).json(formatPatient(rows[0]));
}));

app.put('/api/patients/:id', requireAuth, requireRoles('manager'), asyncHandler(async (req, res) => {
  const patientId = Number(req.params.id);
  const existing = await patientById(patientId);

  if (!existing) {
    res.status(404).json({ message: 'Patient not found.' });
    return;
  }

  const {
    name,
    email,
    password,
    phone,
    address,
    dob,
    gender,
    age,
    assignedDoctorId,
    lastVisit,
    notes,
    status,
  } = req.body || {};

  await query(
    `UPDATE patient
     SET full_name = ?, email = ?, password = ?, phone = ?, address = ?, dob = ?, gender = ?,
         age = ?, assigned_doctor_id = ?, last_visit = ?, notes = ?, status = ?
     WHERE patient_id = ?`,
    [
      name ?? existing.full_name,
      email ?? existing.email,
      password ?? existing.password,
      phone ?? existing.phone,
      address ?? existing.address,
      dob ?? existing.dob,
      gender ?? existing.gender,
      age ?? existing.age,
      assignedDoctorId ?? existing.assigned_doctor_id,
      lastVisit ?? existing.last_visit,
      notes ?? existing.notes,
      status ?? existing.status,
      patientId,
    ]
  );

  const rows = await query(
    `SELECT p.*, d.full_name AS doctor_name, NULL AS latest_diagnosis, NULL AS next_visit
     FROM patient p
     LEFT JOIN doctor d ON d.doctor_id = p.assigned_doctor_id
     WHERE p.patient_id = ?`,
    [patientId]
  );

  res.json(formatPatient(rows[0]));
}));

app.delete('/api/patients/:id', requireAuth, requireRoles('manager'), asyncHandler(async (req, res) => {
  const patientId = Number(req.params.id);
  await query('DELETE FROM patient WHERE patient_id = ?', [patientId]);
  res.json({ ok: true });
}));

app.get('/api/appointments', requireAuth, asyncHandler(async (req, res) => {
  const { patientId, doctorId } = req.query;
  const clauses = [];
  const params = [];

  if (patientId) {
    clauses.push('a.patient_id = ?');
    params.push(Number(patientId));
  }

  if (doctorId) {
    clauses.push('a.doctor_id = ?');
    params.push(Number(doctorId));
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = await query(
    `SELECT
      a.*, DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
      p.full_name AS patient_name,
      d.full_name AS doctor_name
     FROM appointment a
     INNER JOIN patient p ON p.patient_id = a.patient_id
     INNER JOIN doctor d ON d.doctor_id = a.doctor_id
     ${where}
     ORDER BY a.appointment_date DESC, a.appointment_time DESC, a.appointment_id DESC`,
    params
  );

  res.json(rows.map(formatAppointment));
}));

app.post('/api/appointments', requireAuth, asyncHandler(async (req, res) => {
  const {
    patientId,
    patient,
    doctorId,
    doctor,
    specialty,
    date,
    time,
    duration = '15min',
    reason,
    status = 'pending',
    doctorFee,
    preFeeImage = null,
    preFeeImageName = null,
  } = req.body || {};

  if (!specialty || !date || !time || !reason) {
    res.status(400).json({ message: 'Missing required appointment fields.' });
    return;
  }

  let resolvedDoctorId = doctorId ? Number(doctorId) : null;

  if (!resolvedDoctorId && doctor) {
    const byName = await query('SELECT doctor_id FROM doctor WHERE full_name = ? LIMIT 1', [doctor]);
    resolvedDoctorId = byName[0]?.doctor_id || null;
  }

  if (!resolvedDoctorId && req.user.role === 'doctor') {
    resolvedDoctorId = Number(req.user.userId);
  }

  if (!resolvedDoctorId) {
    res.status(400).json({ message: 'Doctor is required.' });
    return;
  }

  const isSlotTaken = await hasBookedAppointment({
    doctorId: resolvedDoctorId,
    date,
    time,
  });

  if (isSlotTaken) {
    res.status(409).json({ message: 'This time slot is already booked for another appointment.' });
    return;
  }

  const doctorRow = await doctorById(resolvedDoctorId);
  if (!doctorRow) {
    res.status(404).json({ message: 'Doctor not found.' });
    return;
  }

  const ensuredPatient = await ensurePatient({ patientId: patientId ? Number(patientId) : null, patientName: patient });
  const amount = Number.isFinite(Number(doctorFee)) ? Number(doctorFee) : Number(doctorRow.consultation_fee || 0);

  const insert = await query(
    `INSERT INTO appointment
      (patient_id, doctor_id, specialty, appointment_date, appointment_time, duration_minutes,
       reason, status, doctor_fee, pre_fee_image, pre_fee_image_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ensuredPatient.patient_id,
      resolvedDoctorId,
      specialty,
      date,
      time,
      parseDuration(duration),
      reason,
      status,
      amount,
      preFeeImage,
      preFeeImageName,
    ]
  );

  await query(
    `INSERT INTO bills
      (appointment_id, patient_id, doctor_id, amount, bill_status, issued_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      insert.insertId,
      ensuredPatient.patient_id,
      resolvedDoctorId,
      amount,
      status === 'cancelled' ? 'cancelled' : 'unpaid',
      date,
      'Auto-generated from appointment booking.',
    ]
  );

  const rows = await query(
    `SELECT
      a.*, DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
      p.full_name AS patient_name,
      d.full_name AS doctor_name
     FROM appointment a
     INNER JOIN patient p ON p.patient_id = a.patient_id
     INNER JOIN doctor d ON d.doctor_id = a.doctor_id
     WHERE a.appointment_id = ?`,
    [insert.insertId]
  );

  res.status(201).json(formatAppointment(rows[0]));
}));

app.patch('/api/appointments/:id', requireAuth, asyncHandler(async (req, res) => {
  const appointmentId = Number(req.params.id);
  const existingRows = await query('SELECT * FROM appointment WHERE appointment_id = ? LIMIT 1', [appointmentId]);
  const existing = existingRows[0];

  if (!existing) {
    res.status(404).json({ message: 'Appointment not found.' });
    return;
  }

  const updates = req.body || {};
  const nextDate = updates.date ?? existing.appointment_date;
  const nextTime = updates.time ?? existing.appointment_time;
  const nextStatus = updates.status ?? existing.status;

  if (
    updates.status &&
    updates.status !== existing.status &&
    (existing.status === 'confirmed' || existing.status === 'cancelled')
  ) {
    res.status(409).json({
      message: `Appointment is already ${existing.status}. Status cannot be changed anymore.`,
    });
    return;
  }

  if (nextStatus !== 'cancelled') {
    const isSlotTaken = await hasBookedAppointment({
      doctorId: existing.doctor_id,
      date: nextDate,
      time: nextTime,
      excludeAppointmentId: appointmentId,
    });

    if (isSlotTaken) {
      res.status(409).json({
        message: 'This time slot is already booked for another appointment.',
      });
      return;
    }
  }

  await query(
    `UPDATE appointment
     SET appointment_date = ?, appointment_time = ?, status = ?, reason = ?,
         pre_fee_image = ?, pre_fee_image_name = ?, duration_minutes = ?
     WHERE appointment_id = ?`,
    [
      updates.date ?? existing.appointment_date,
      updates.time ?? existing.appointment_time,
      updates.status ?? existing.status,
      updates.reason ?? existing.reason,
      updates.preFeeImage ?? existing.pre_fee_image,
      updates.preFeeImageName ?? existing.pre_fee_image_name,
      15,
      appointmentId,
    ]
  );

  if (nextStatus === 'confirmed') {
    const pendingSameSlot = await query(
      `SELECT appointment_id
       FROM appointment
       WHERE doctor_id = ?
         AND appointment_date = ?
         AND appointment_time = ?
         AND status = 'pending'
         AND appointment_id <> ?`,
      [existing.doctor_id, nextDate, nextTime, appointmentId]
    );

    const pendingIds = pendingSameSlot.map((row) => Number(row.appointment_id)).filter(Number.isFinite);
    if (pendingIds.length) {
      const placeholders = pendingIds.map(() => '?').join(', ');
      await query(
        `UPDATE appointment
         SET status = 'cancelled'
         WHERE appointment_id IN (${placeholders})`,
        pendingIds
      );
      await query(
        `UPDATE bills
         SET bill_status = 'cancelled'
         WHERE appointment_id IN (${placeholders})`,
        pendingIds
      );
    }
  }

  if (updates.status) {
    const billStatus = updates.status === 'cancelled' ? 'cancelled' : updates.status === 'confirmed' ? 'paid' : 'unpaid';
    await query('UPDATE bills SET bill_status = ? WHERE appointment_id = ?', [billStatus, appointmentId]);
  }

  const rows = await query(
    `SELECT
      a.*, DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
      p.full_name AS patient_name,
      d.full_name AS doctor_name
     FROM appointment a
     INNER JOIN patient p ON p.patient_id = a.patient_id
     INNER JOIN doctor d ON d.doctor_id = a.doctor_id
     WHERE a.appointment_id = ?`,
    [appointmentId]
  );

  res.json(formatAppointment(rows[0]));
}));

app.get('/api/medical-records', requireAuth, asyncHandler(async (req, res) => {
  const { patientId, doctorId, search } = req.query;
  const clauses = [];
  const params = [];

  if (patientId) {
    clauses.push('mr.patient_id = ?');
    params.push(Number(patientId));
  }

  if (doctorId) {
    clauses.push('mr.doctor_id = ?');
    params.push(Number(doctorId));
  }

  if (search) {
    clauses.push('LOWER(p.full_name) LIKE ?');
    params.push(`%${String(search).toLowerCase()}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = await query(
    `SELECT
      mr.medical_record_id,
      mr.patient_id,
      mr.doctor_id,
      DATE_FORMAT(mr.record_date, '%Y-%m-%d') AS record_date,
      mr.diagnosis,
      mr.notes,
      p.full_name AS patient_name,
      d.full_name AS doctor_name,
      pr.medication_details AS prescription
     FROM medical_record mr
     INNER JOIN patient p ON p.patient_id = mr.patient_id
     INNER JOIN doctor d ON d.doctor_id = mr.doctor_id
     LEFT JOIN prescription pr ON pr.medical_record_id = mr.medical_record_id
     ${where}
     ORDER BY mr.record_date DESC, mr.medical_record_id DESC`,
    params
  );

  res.json(rows.map((row) => ({
    id: row.medical_record_id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    patient: row.patient_name,
    doctor: row.doctor_name,
    date: row.record_date,
    diagnosis: row.diagnosis,
    prescription: row.prescription || '',
    notes: row.notes || '',
  })));
}));

app.post('/api/medical-records', requireAuth, asyncHandler(async (req, res) => {
  const { patientId, patient, doctorId, date, diagnosis, prescription, notes } = req.body || {};

  if (!date || !diagnosis) {
    res.status(400).json({ message: 'Date and diagnosis are required.' });
    return;
  }

  const resolvedDoctorId = doctorId ? Number(doctorId) : Number(req.user.userId);
  const patientRow = await ensurePatient({ patientId: patientId ? Number(patientId) : null, patientName: patient });

  const insert = await query(
    `INSERT INTO medical_record
      (patient_id, doctor_id, record_date, diagnosis, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [patientRow.patient_id, resolvedDoctorId, date, diagnosis, notes || null]
  );

  if (prescription && String(prescription).trim()) {
    await query(
      `INSERT INTO prescription
        (medical_record_id, patient_id, doctor_id, prescribed_on, medication_details)
       VALUES (?, ?, ?, ?, ?)`,
      [insert.insertId, patientRow.patient_id, resolvedDoctorId, date, String(prescription).trim()]
    );
  }

  const rows = await query(
    `SELECT
      mr.medical_record_id,
      mr.patient_id,
      mr.doctor_id,
      DATE_FORMAT(mr.record_date, '%Y-%m-%d') AS record_date,
      mr.diagnosis,
      mr.notes,
      p.full_name AS patient_name,
      d.full_name AS doctor_name,
      pr.medication_details AS prescription
     FROM medical_record mr
     INNER JOIN patient p ON p.patient_id = mr.patient_id
     INNER JOIN doctor d ON d.doctor_id = mr.doctor_id
     LEFT JOIN prescription pr ON pr.medical_record_id = mr.medical_record_id
     WHERE mr.medical_record_id = ?
     LIMIT 1`,
    [insert.insertId]
  );

  const row = rows[0];
  res.status(201).json({
    id: row.medical_record_id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    patient: row.patient_name,
    doctor: row.doctor_name,
    date: row.record_date,
    diagnosis: row.diagnosis,
    prescription: row.prescription || '',
    notes: row.notes || '',
  });
}));

app.get('/api/lab-results', requireAuth, asyncHandler(async (req, res) => {
  const { patientId, doctorId, search } = req.query;
  const clauses = [];
  const params = [];

  if (patientId) {
    clauses.push('lr.patient_id = ?');
    params.push(Number(patientId));
  }

  if (doctorId) {
    clauses.push('lr.doctor_id = ?');
    params.push(Number(doctorId));
  }

  if (search) {
    clauses.push('LOWER(p.full_name) LIKE ?');
    params.push(`%${String(search).toLowerCase()}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = await query(
    `SELECT
      lr.lab_result_id,
      lr.patient_id,
      lr.doctor_id,
      lr.test_name,
      lr.result_image,
      lr.result_image_name,
      lr.notes,
      DATE_FORMAT(lr.result_date, '%Y-%m-%d') AS result_date,
      p.full_name AS patient_name
     FROM lab_result lr
     INNER JOIN patient p ON p.patient_id = lr.patient_id
     ${where}
     ORDER BY lr.result_date DESC, lr.lab_result_id DESC`,
    params
  );

  res.json(rows.map((row) => ({
    id: row.lab_result_id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    patient: row.patient_name,
    testName: row.test_name,
    resultImage: row.result_image || '',
    resultImageName: row.result_image_name || '',
    notes: row.notes || '',
    date: row.result_date,
  })));
}));

app.post('/api/lab-results', requireAuth, asyncHandler(async (req, res) => {
  const { patientId, patient, doctorId, testName, resultImage, resultImageName, notes, date } = req.body || {};

  if (!testName || !notes || !date) {
    res.status(400).json({ message: 'Test name, notes, and date are required.' });
    return;
  }

  const resolvedDoctorId = doctorId ? Number(doctorId) : Number(req.user.userId);
  const patientRow = await ensurePatient({ patientId: patientId ? Number(patientId) : null, patientName: patient });

  const insert = await query(
    `INSERT INTO lab_result
      (patient_id, doctor_id, test_name, result_image, result_image_name, notes, result_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      patientRow.patient_id,
      resolvedDoctorId,
      testName,
      resultImage || null,
      resultImageName || null,
      notes,
      date,
    ]
  );

  const rows = await query(
    `SELECT
      lr.lab_result_id,
      lr.patient_id,
      lr.doctor_id,
      lr.test_name,
      lr.result_image,
      lr.result_image_name,
      lr.notes,
      DATE_FORMAT(lr.result_date, '%Y-%m-%d') AS result_date,
      p.full_name AS patient_name
     FROM lab_result lr
     INNER JOIN patient p ON p.patient_id = lr.patient_id
     WHERE lr.lab_result_id = ?
     LIMIT 1`,
    [insert.insertId]
  );

  const row = rows[0];
  res.status(201).json({
    id: row.lab_result_id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    patient: row.patient_name,
    testName: row.test_name,
    resultImage: row.result_image || '',
    resultImageName: row.result_image_name || '',
    notes: row.notes || '',
    date: row.result_date,
  });
}));

app.use((error, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(error);
  res.status(500).json({ message: 'Server error', detail: error.message });
});

const checkDatabaseOnStartup = async () => {
  try {
    await query('SELECT 1');
    const ensureColumn = async (tableName, columnName, definitionSql) => {
      const rows = await query(
        `SELECT COUNT(*) AS count
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?`,
        [tableName, columnName]
      );

      if (Number(rows[0]?.count || 0) === 0) {
        await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`);
      }
    };

    await ensureColumn('doctor', 'profile_image', 'LONGTEXT NULL');
    await ensureColumn('doctor', 'profile_image_name', 'VARCHAR(255) NULL');
    await ensureColumn('patient', 'profile_image', 'LONGTEXT NULL');
    await ensureColumn('patient', 'profile_image_name', 'VARCHAR(255) NULL');
    await query('ALTER TABLE appointment MODIFY COLUMN duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 15');
    await query('UPDATE appointment SET duration_minutes = 15 WHERE duration_minutes <> 15');
    await query(
      `CREATE TABLE IF NOT EXISTS doctor_review (
        doctor_review_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        doctor_id BIGINT UNSIGNED NOT NULL,
        patient_id BIGINT UNSIGNED NOT NULL,
        rating TINYINT UNSIGNED NULL,
        comment TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (doctor_review_id),
        KEY idx_doctor_review_doctor (doctor_id),
        KEY idx_doctor_review_patient (patient_id),
        CONSTRAINT fk_doctor_review_doctor
          FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id)
          ON DELETE CASCADE,
        CONSTRAINT fk_doctor_review_patient
          FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB`
    );
    await query('ALTER TABLE doctor_review MODIFY COLUMN rating TINYINT UNSIGNED NULL');
    await query('ALTER TABLE doctor_review MODIFY COLUMN comment TEXT NULL');
    const reviewUniqueKeyRows = await query(
      `SELECT COUNT(*) AS count
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'doctor_review'
         AND INDEX_NAME = 'uq_doctor_review_doctor_patient'`
    );
    if (Number(reviewUniqueKeyRows[0]?.count || 0) > 0) {
      await query('ALTER TABLE doctor_review DROP INDEX uq_doctor_review_doctor_patient');
    }
    await query(
      `CREATE TABLE IF NOT EXISTS patient_complaint (
        patient_complaint_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        patient_id BIGINT UNSIGNED NOT NULL,
        subject VARCHAR(180) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('new', 'reviewed') NOT NULL DEFAULT 'new',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (patient_complaint_id),
        KEY idx_patient_complaint_patient (patient_id),
        KEY idx_patient_complaint_status (status),
        CONSTRAINT fk_patient_complaint_patient
          FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB`
    );

    startupDbStatus = {
      ok: true,
      checkedAt: new Date().toISOString(),
      error: null,
    };
    // eslint-disable-next-line no-console
    console.log(`Database connection OK (${process.env.DB_NAME || 'clinic_system_db'}).`);
  } catch (error) {
    startupDbStatus = {
      ok: false,
      checkedAt: new Date().toISOString(),
      error: error.message,
    };
    // eslint-disable-next-line no-console
    console.error(`Database connection failed: ${error.message}`);
  }
};

let serverInstance = null;
let isStartingServer = false;

const startServer = async () => {
  if (serverInstance || isStartingServer) {
    return serverInstance;
  }

  isStartingServer = true;
  try {
    await checkDatabaseOnStartup();

    const server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`API running on http://localhost:${PORT}`);
      // eslint-disable-next-line no-console
      console.log(`Health endpoints: http://localhost:${PORT}/health and http://localhost:${PORT}/api/health`);
    });

    serverInstance = server;

    server.on('error', (error) => {
      serverInstance = null;
      if (error?.code === 'EADDRINUSE') {
        // eslint-disable-next-line no-console
        console.error(`Port ${PORT} is already in use. Stop the old process or change PORT in .env.`);
        return;
      }

      // eslint-disable-next-line no-console
      console.error(`Server startup error: ${error.message}`);
    });

    server.on('close', () => {
      serverInstance = null;
    });

    return server;
  } finally {
    isStartingServer = false;
  }
};

startServer();
