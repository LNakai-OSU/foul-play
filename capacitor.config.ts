import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.foulplay.app',
  appName: 'Foul Play',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
