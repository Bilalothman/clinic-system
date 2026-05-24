const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const main = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clinic_system_db',
  });

  try {
    const [columns] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      ['doctor', 'status']
    );

    if (Number(columns[0].count || 0) === 0) {
      console.log('doctor.status is already removed.');
      return;
    }

    const [statusIndexes] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND INDEX_NAME = ?`,
      ['doctor', 'idx_doctor_role_status']
    );

    if (Number(statusIndexes[0].count || 0) > 0) {
      await connection.query('ALTER TABLE doctor DROP INDEX idx_doctor_role_status');
    }

    await connection.query('ALTER TABLE doctor DROP COLUMN status');

    const [roleIndexes] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND INDEX_NAME = ?`,
      ['doctor', 'idx_doctor_role']
    );

    if (Number(roleIndexes[0].count || 0) === 0) {
      await connection.query('ALTER TABLE doctor ADD INDEX idx_doctor_role (role)');
    }

    console.log('Removed doctor.status from the database.');
  } finally {
    await connection.end();
  }
};

main().catch((error) => {
  console.error('Failed to remove doctor.status:');
  console.error(error.message);
  process.exitCode = 1;
});
