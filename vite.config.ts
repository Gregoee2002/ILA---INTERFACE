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
  build: {
    rollupOptions: {
      output: {
        // Le librerie di terze parti hanno una vita loro: separarle dal codice
        // dell'applicazione fa sì che una modifica a una scheda non invalidi
        // 700 kB di cache del visitatore. Firebase e motion pesano quanto
        // mezza applicazione e servono a due cose sole (login e transizioni).
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['motion'],
          ricerca: ['minisearch'],
          xml: ['fast-xml-parser', 'diff'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: [
      'react-leaflet',
      'react-leaflet-cluster',
      '@react-leaflet/core',
    ],
  },
});