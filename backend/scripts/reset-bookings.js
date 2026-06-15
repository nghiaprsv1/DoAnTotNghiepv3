/**
 * Wipe seeded guide bookings + their wallet transactions so seed-guides can
 * re-run with the new tripId requirement. Idempotent.
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })
const { Client } = require('pg')

;(async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })
  await client.connect()
  // Delete in dependency order. Wallet rows are kept (just cleared txns), then
  // the seed re-credits them.
  await client.query("DELETE FROM wallet_transactions WHERE booking_id IS NOT NULL OR note LIKE '%Seed%' OR note ILIKE '%admin top-up%'")
  await client.query('DELETE FROM guide_bookings')
  await client.query('UPDATE wallets SET balance_available = 0, balance_frozen = 0')
  console.log('✓ wiped guide_bookings + booking-related wallet txns; balances reset to 0')
  await client.end()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
