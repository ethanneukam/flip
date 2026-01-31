import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flip.oracle',
  appName: 'FLIP',
  webDir: 'out', // <--- MAKE SURE THIS SAYS 'out'
  bundledWebRuntime: false
};

export default config;
