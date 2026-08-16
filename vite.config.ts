import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Solo la build statica (GitHub Pages) serve da un sottopercorso
  // (https://gregoee2002.github.io/ILA---INTERFACE/); npm run dev e la
  // build del server Express continuano a servire dalla radice.
  base: process.env.VITE_STATIC_BUILD === 'true' ? '/ILA---INTERFACE/' : '/',
  plugins: [
    react(),
    tailwindcss()
  ],
  optimizeDeps: {
    exclude: [
      'react-leaflet',
      'react-leaflet-cluster',
      '@react-leaflet/core',
    ],
  },
});