const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const seedPath = path.resolve(__dirname, 'demo_data.sql');

const main = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clinic_system_db',
    multipleStatements: true,
  });

  try {
    const sql = fs.readFileSync(seedPath, 'utf8');
    await connection.query(sql);
    console.log('Demo data inserted successfully.');
    console.log('');
    console.log('Demo accounts:');
    console.log('  Manager: manager@gmail.com / 1234');
    console.log('  Doctor:  doctor@doctor.com / doctor123');
    console.log('  Doctor:  maya.lee@clinic.test / doctor123');
    console.log('  Doctor:  karim.haddad@clinic.test / doctor123');
    console.log('  Patient: patient@patient.com / patient123');
    console.log('  Patient: alice.johnson@patient.test / patient123');
    console.log('  Patient: bob.wilson@patient.test / patient123');
    console.log('  Patient: nadine.mansour@patient.test / patient123');
    console.log('  Patient: sam.taylor@patient.test / patient123');
  } finally {
    await connection.end();
  }
};

main().catch((error) => {
  console.error('Failed to insert demo data:');
  console.error(error.message);
  process.exitCode = 1;
});
