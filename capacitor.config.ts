import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.educrm.app',
  appName: 'Edu CRM',
  webDir: 'out',
  server: {
    url: 'https://hopestudy.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#6B21A8'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6B21A8',
      showSpinner: false
    }
  }
};

export default config;
