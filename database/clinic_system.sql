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
DROP TABLE IF EXISTS patient_report;
DROP TABLE IF EXISTS patient_complaint;
DROP TABLE IF EXISTS doctor_review;
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
  consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  available_days JSON NULL,
  available_times JSON NULL,
  address VARCHAR(255) NULL,
  dob DATE NULL,
  gender ENUM('male', 'female') NULL,
  profile_image LONGTEXT NULL,
  profile_image_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (doctor_id),
  UNIQUE KEY uq_doctor_email (email),
  KEY idx_doctor_role (role),
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
  gender ENUM('male', 'female') NULL,
  assigned_doctor_id BIGINT UNSIGNED NULL,
  last_visit DATE NULL,
  notes TEXT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  profile_image LONGTEXT NULL,
  profile_image_name VARCHAR(255) NULL,
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
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 15,
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

CREATE TABLE doctor_review (
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
) ENGINE=InnoDB;

CREATE TABLE patient_complaint (
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
) ENGINE=InnoDB;

CREATE TABLE patient_report (
  patient_report_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (patient_report_id),
  UNIQUE KEY uq_patient_report_patient_doctor (patient_id, doctor_id),
  KEY idx_patient_report_patient (patient_id),
  KEY idx_patient_report_doctor (doctor_id),
  CONSTRAINT fk_patient_report_patient
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_patient_report_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
