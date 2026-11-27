import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'node:fs';

let nativeCode = 1;
try {
  nativeCode = Number(JSON.parse(readFileSync('deploy/native.json', 'utf8')).code) || 1;
} catch {
  /* first native build */
}

// Live URL loaded by the thin native APK shell (updated automatically to Vercel URL once deployed)
let liveUrl = 'https://six-planets.github.io/bcs-bank-by-okz/';
try {
  const custom = readFileSync('deploy/app-url.txt', 'utf8').trim();
  if (custom) liveUrl = custom;
} catch {
  /* fallback to GitHub Pages live URL */
}

const config: CapacitorConfig = {
  appId: 'com.bbbokz.app',
  appName: 'BCS Bank by OKZ',
  webDir: 'dist',
  backgroundColor: '#070614',
  appendUserAgent: `BBBOKZApp/${nativeCode}`,
  server: {
    url: liveUrl,
    errorPath: 'offline.html',
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
