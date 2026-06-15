/**
 * One-shot script: promote a user to ADMIN role by email.
 * Usage:  node backend/scripts/promote-admin.js admin@tripmate.vn
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })
const { Client } = require('pg')

const email = process.argv[2]
if (!email) {
  console.error('Usage: node promote-admin.js <email>')
  process.exit(1)
}

;(async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })
  await client.connect()
  const res = await client.query(
    'UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, role',
    ['admin', email],
  )
  console.log(res.rows[0] ?? 'No user found')
  await client.end()
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
