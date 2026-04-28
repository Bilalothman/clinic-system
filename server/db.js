const mysql = require('mysql2/promise');

// Reuse a single pool so API handlers can share connections safely.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clinic_system_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Small wrapper used across the API to keep query calls consistent.
const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

module.exports = {
  pool,
  query,
};
