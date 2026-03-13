import { CapacitorConfig } from '@capacitor/cli';

const appUrl = process.env.CAPACITOR_SERVER_URL || '';

const config: CapacitorConfig = {
  appId: 'com.crickethub.app',
  appName: 'CricketHub',
  webDir: 'dist',
  server: appUrl
    ? {
        url: appUrl,
        cleartext: false,
        androidScheme: 'https',
      }
    : {
        androidScheme: 'https',
      },
};

export default config;
