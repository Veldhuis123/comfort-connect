import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.brl100',
  appName: 'BRL 100 App',
  webDir: 'dist',
  server: {
    url: 'https://9b02e0a3-9946-4ca4-aacd-f0565c7d406a.lovableproject.com/brl?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
