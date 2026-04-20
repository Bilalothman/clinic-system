-- Clinic System database bootstrap for MySQL/phpMyAdmin
-- Exact 7-table model requested: Patient, Appointment, Doctor, Bills,
-- Medical Record, Prescription, Lab Result.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS clinic_system_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE clinic_system_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS prescription;
DROP TABLE IF EXISTS lab_result;
DROP TABLE IF EXISTS medical_record;
DROP TABLE IF EXISTS appointment;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS doctor;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE doctor (
  doctor_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role ENUM('manager', 'doctor') NOT NULL DEFAULT 'doctor',
  full_name VARCHAR(120) NOT NULL,
  specialty VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  available_days JSON NULL,
  available_times JSON NULL,
  address VARCHAR(255) NULL,
  dob DATE NULL,
  gender ENUM('male', 'female', 'other') NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (doctor_id),
  UNIQUE KEY uq_doctor_email (email),
  KEY idx_doctor_role_status (role, status),
  KEY idx_doctor_name (full_name)
) ENGINE=InnoDB;

CREATE TABLE patient (
  patient_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  address VARCHAR(255) NULL,
  dob DATE NULL,
  gender ENUM('male', 'female', 'other') NULL,
  age INT UNSIGNED NULL,
  assigned_doctor_id BIGINT UNSIGNED NULL,
  last_visit DATE NULL,
  notes TEXT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (patient_id),
  UNIQUE KEY uq_patient_email (email),
  KEY idx_patient_name (full_name),
  KEY idx_patient_assigned_doctor (assigned_doctor_id),
  CONSTRAINT fk_patient_assigned_doctor
    FOREIGN KEY (assigned_doctor_id) REFERENCES doctor(doctor_id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE appointment (
  appointment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  specialty VARCHAR(120) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time VARCHAR(20) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  reason TEXT NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
  doctor_fee DECIMAL(10,2) NULL,
  pre_fee_image LONGTEXT NULL,
  pre_fee_image_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (appointment_id),
  KEY idx_appointment_patient (patient_id),
  KEY idx_appointment_doctor (doctor_id),
  KEY idx_appointment_date_status (appointment_date, status),
  CONSTRAINT fk_appointment_patient
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_appointment_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE medical_record (
  medical_record_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  record_date DATE NOT NULL,
  diagnosis VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (medical_record_id),
  KEY idx_medical_record_patient_date (patient_id, record_date),
  KEY idx_medical_record_doctor (doctor_id),
  CONSTRAINT fk_medical_record_patient
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_medical_record_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE prescription (
  prescription_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  medical_record_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  prescribed_on DATE NOT NULL,
  medication_details TEXT NOT NULL,
  dosage_instructions TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (prescription_id),
  KEY idx_prescription_record (medical_record_id),
  KEY idx_prescription_patient (patient_id),
  KEY idx_prescription_doctor (doctor_id),
  CONSTRAINT fk_prescription_record
    FOREIGN KEY (medical_record_id) REFERENCES medical_record(medical_record_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_prescription_patient
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_prescription_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE lab_result (
  lab_result_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  appointment_id BIGINT UNSIGNED NULL,
  test_name VARCHAR(180) NOT NULL,
  result_image LONGTEXT NULL,
  result_image_name VARCHAR(255) NULL,
  notes TEXT NULL,
  result_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (lab_result_id),
  KEY idx_lab_result_patient_date (patient_id, result_date),
  KEY idx_lab_result_doctor (doctor_id),
  KEY idx_lab_result_appointment (appointment_id),
  CONSTRAINT fk_lab_result_patient
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_lab_result_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_lab_result_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointment(appointment_id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE bills (
  bill_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  bill_status ENUM('unpaid', 'paid', 'cancelled') NOT NULL DEFAULT 'unpaid',
  payment_method VARCHAR(40) NULL,
  issued_date DATE NOT NULL,
  paid_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (bill_id),
  UNIQUE KEY uq_bill_appointment (appointment_id),
  KEY idx_bills_patient (patient_id),
  KEY idx_bills_doctor (doctor_id),
  KEY idx_bills_status (bill_status),
  CONSTRAINT fk_bills_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointment(appointment_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_bills_patient
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_bills_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Demo data matching existing UI features.
-- Manager + doctors in doctor table.
INSERT INTO doctor (
  doctor_id, role, full_name, specialty, phone, email, password, status,
  consultation_fee, available_days, available_times, address, dob, gender
) VALUES
  (
    1, 'manager', 'System Administrator', 'Administration', '+961 03 216 269',
    'manager@gmail.com', '1234', 'active', 0,
    JSON_ARRAY(), JSON_ARRAY(), 'Head Office', NULL, NULL
  ),
  (
    101, 'doctor', 'Dr. John Smith', 'Cardiology', '+1-555-100-0101',
    'doctor@doctor.com', 'doctor123', 'active', 120,
    JSON_ARRAY('Monday', 'Tuesday', 'Thursday'),
    JSON_ARRAY(
      '08:00 AM', '08:15 AM', '08:30 AM', '08:45 AM', '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM',
      '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
      '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM', '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM',
      '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM', '03:00 PM'
    ),
    'City Hospital', NULL, NULL
  ),
  (
    102, 'doctor', 'Dr. Sarah Johnson', 'Neurology', '+1-234-567-8902',
    'sarah.johnson@doctor.com', 'doctor123', 'active', 150,
    JSON_ARRAY('Monday', 'Wednesday', 'Friday'),
    JSON_ARRAY(
      '08:00 AM', '08:15 AM', '08:30 AM', '08:45 AM', '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM',
      '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
      '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM', '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM',
      '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM', '03:00 PM'
    ),
    'City Hospital', NULL, NULL
  ),
  (
    103, 'doctor', 'Dr. Michael Brown', 'Orthopedics', '+1-234-567-8903',
    'michael.brown@doctor.com', 'doctor123', 'inactive', 140,
    JSON_ARRAY('Tuesday', 'Thursday', 'Saturday'),
    JSON_ARRAY(
      '08:00 AM', '08:15 AM', '08:30 AM', '08:45 AM', '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM',
      '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
      '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM', '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM',
      '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM', '03:00 PM'
    ),
    'City Hospital', NULL, NULL
  );

INSERT INTO patient (
  patient_id, full_name, email, password, phone, address, dob, gender,
  age, assigned_doctor_id, last_visit, notes, status
) VALUES
  (201, 'John Doe', 'patient@patient.com', 'patient123', '+1-555-200-0201', 'Demo Patient Address', NULL, NULL, NULL, 101, '2026-04-06', 'Demo patient account.', 'active'),
  (202, 'Alice Johnson', 'alice.johnson@patient.com', 'patient123', '+1-234-567-8901', NULL, '1997-04-11', NULL, 28, 101, '2024-01-15', 'Follow-up for blood pressure review.', 'active'),
  (203, 'Bob Wilson', 'bob.wilson@patient.com', 'patient123', '+1-234-567-8902', NULL, '1980-09-24', NULL, 45, 102, '2024-01-10', 'Monitoring diabetes medication response.', 'active'),
  (204, 'Carol Davis', 'carol.davis@patient.com', 'patient123', '+1-234-567-8903', NULL, '1993-02-07', NULL, 32, 103, '2024-01-12', 'Migraine care plan updated this week.', 'active'),
  (205, 'Daniel Green', 'daniel.green@patient.com', 'patient123', '+1-234-567-8910', NULL, '1986-06-30', NULL, 39, 102, '2024-01-09', 'Awaiting lab results before next consultation.', 'active'),
  (206, 'Emma White', 'emma.white@patient.com', 'patient123', '+1-234-567-8911', NULL, '1974-01-15', NULL, 51, 101, '2024-01-05', 'Recovering well after cardiology review.', 'active');

INSERT INTO appointment (
  appointment_id, patient_id, doctor_id, specialty, appointment_date, appointment_time,
  duration_minutes, reason, status, doctor_fee, pre_fee_image, pre_fee_image_name
) VALUES
  (1, 201, 101, 'Cardiology', '2026-04-06', '10:00 AM', 30, 'Follow-up consultation', 'confirmed', 120.00, NULL, NULL),
  (2, 201, 102, 'Neurology', '2026-04-09', '02:30 PM', 45, 'Migraine review', 'pending', 150.00, NULL, NULL);

INSERT INTO medical_record (
  medical_record_id, patient_id, doctor_id, record_date, diagnosis, notes
) VALUES
  (1, 202, 101, '2024-01-15', 'Hypertension controlled', 'Follow-up stable.'),
  (2, 203, 102, '2024-01-10', 'Blood sugar stable', 'Continue current plan.');

INSERT INTO prescription (
  prescription_id, medical_record_id, patient_id, doctor_id, prescribed_on, medication_details, dosage_instructions
) VALUES
  (1, 1, 202, 101, '2024-01-15', 'Amlodipine 5mg', '1 tablet daily after breakfast.'),
  (2, 2, 203, 102, '2024-01-10', 'Metformin 500mg', '1 tablet twice daily with meals.');

INSERT INTO lab_result (
  lab_result_id, patient_id, doctor_id, appointment_id, test_name, result_image, result_image_name, notes, result_date
) VALUES
  (1, 205, 102, NULL, 'HbA1c', NULL, NULL, 'Awaiting follow-up consultation for interpretation.', '2024-01-09');

INSERT INTO bills (
  bill_id, appointment_id, patient_id, doctor_id, amount, bill_status,
  payment_method, issued_date, paid_date, notes
) VALUES
  (1, 1, 201, 101, 120.00, 'paid', 'cash', '2026-04-06', '2026-04-06', 'Paid during clinic visit.'),
  (2, 2, 201, 102, 150.00, 'unpaid', NULL, '2026-04-09', NULL, 'Pending confirmation and payment.');

-- Keep AUTO_INCREMENT ahead of seeded IDs.
ALTER TABLE doctor AUTO_INCREMENT = 1000;
ALTER TABLE patient AUTO_INCREMENT = 1000;
ALTER TABLE appointment AUTO_INCREMENT = 100;
ALTER TABLE medical_record AUTO_INCREMENT = 100;
ALTER TABLE prescription AUTO_INCREMENT = 100;
ALTER TABLE lab_result AUTO_INCREMENT = 100;
ALTER TABLE bills AUTO_INCREMENT = 100;
