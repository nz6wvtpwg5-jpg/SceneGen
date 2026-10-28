import type { CapacitorConfig } from '@capacitor/cli';

const DEFAULT_NATIVE_SERVER_URL = 'https://scenegen-web.onrender.com/app';

function productionServer() {
  const configuredUrl = process.env.SCENEGEN_NATIVE_SERVER_URL?.trim() || DEFAULT_NATIVE_SERVER_URL;
  const url = new URL(configuredUrl);

  if (url.protocol !== 'https:') {
    throw new Error('SCENEGEN_NATIVE_SERVER_URL must use HTTPS');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('SCENEGEN_NATIVE_SERVER_URL must not contain credentials, a query, or a fragment');
  }

  url.pathname = url.pathname.replace(/\/$/, '') || '/app';
  return { url: url.toString().replace(/\/$/, ''), hostname: url.hostname };
}

const server = productionServer();

const config: CapacitorConfig = {
  appId: 'io.scenegen.app',
  appName: 'SceneGen',
  webDir: 'native-web',
  server: {
    url: server.url,
    cleartext: false,
    allowNavigation: [server.hostname],
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    allowsLinkPreview: false,
    backgroundColor: '#11140f',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#11140f',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#11140f',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
