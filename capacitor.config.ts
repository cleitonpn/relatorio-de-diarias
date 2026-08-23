import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Empacotamento Android.
 *
 * O APK sai da MESMA base de código da web. A diferença é a variável
 * VITE_PLATAFORMA=android no build, que desliga as telas de plano e checkout
 * (ver src/lib/platform.ts).
 */
const config: CapacitorConfig = {
  appId: 'br.com.prumo.app',
  appName: 'Prumo',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      backgroundColor: '#3730A3',
      showSpinner: false,
    },
  },
}

export default config
