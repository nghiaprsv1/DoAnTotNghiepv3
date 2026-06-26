import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor config — wraps the production Vite build (`dist/`) into an
 * Android shell. The `server.url` field is intentionally left out so the
 * built APK ships its own copy of the JS/CSS. To run against a remote API,
 * set VITE_API_BASE_URL when running `npm run build`.
 *
 * To run against the dev server while developing, uncomment the `server`
 * block below and replace the IP with your machine's LAN IP.
 */
const config: CapacitorConfig = {
  appId: 'com.tripmate.app',
  appName: 'TripMate',
  webDir: 'dist',
  // server: {
  //   url: 'http://192.168.1.10:3000',
  //   cleartext: true,
  // },
  android: {
    allowMixedContent: true,
  },
}

export default config
