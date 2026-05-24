// pages/_app.js
// Global app wrapper – injects global styles and fonts

import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
