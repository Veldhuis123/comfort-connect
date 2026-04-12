import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.brl100',
  appName: 'BRL 100 App',
  webDir: 'dist',
  server: {
    url: 'https://rv-installatie.nl/brl',
    cleartext: true
  }
};

export default config;
