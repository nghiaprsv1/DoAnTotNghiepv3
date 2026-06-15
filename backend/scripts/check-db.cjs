/* eslint-disable */
// Tiny script to verify Postgres connection and create the database if missing.
const { Client } = require('pg');
require('dotenv').config();

const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT || 5432);
const user = process.env.DB_USERNAME || 'postgres';
const password = process.env.DB_PASSWORD || 'postgres';
const targetDb = process.env.DB_NAME || 'tripmate';

(async () => {
  const admin = new Client({ host, port, user, password, database: 'postgres' });
  try {
    await admin.connect();
    console.log('✓ connected to Postgres at', `${host}:${port}`);
  } catch (e) {
    console.error('✗ cannot connect to Postgres:', e.message);
    console.error('  → check that Postgres is running and credentials in .env are correct');
    process.exit(1);
  }

  const { rows } = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname=$1",
    [targetDb],
  );
  if (rows.length === 0) {
    await admin.query(`CREATE DATABASE "${targetDb}"`);
    console.log(`✓ created database "${targetDb}"`);
  } else {
    console.log(`✓ database "${targetDb}" already exists`);
  }
  await admin.end();
})();
