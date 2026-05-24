ALTER TABLE doctor DROP INDEX idx_doctor_role_status;
ALTER TABLE doctor DROP COLUMN status;
ALTER TABLE doctor ADD INDEX idx_doctor_role (role);
