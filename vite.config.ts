import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig(() => {
  return {
    plugins: [
  react(),
  tailwindcss(),
  VitePWA({
    registerType: 'autoUpdate',
manifest: {
  name: 'Rinde+',
  short_name: 'Rinde+',
  description: 'Controla tus compras y haz rendir tu dinero.',
  theme_color: '#ffffff',
  background_color: '#ffffff',
  display: 'standalone',
},
  }),
],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // File watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',

      // Ignore the local JSON database so Vite does not reload the page.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              ignored: ['**/db_rinde.json'],
            },
    },
  };
});