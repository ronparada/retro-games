import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  // './' for Capacitor/Android/iOS — '/retro-games/' for GitHub Pages only
  base: mode === 'pages' ? '/retro-games/' : './',
}));
