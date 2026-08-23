import { StrictMode } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PasswordGate } from './components/PasswordGate';
import { reloadOnceForStaleChunk } from './lib/staleChunkGuard';

const isStaticBuild = import.meta.env.VITE_STATIC_BUILD === 'true';

if (isStaticBuild) {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnceForStaleChunk((event as any).payload?.message || 'preload error')) {
      event.preventDefault();
    }
  });
}

// Solo sulla build GitHub Pages: nessun server.ts, quindi le route /api/*
// vengono servite in-browser da apiShim.ts. Di default in modalità
// "viewer" (legge lo snapshot statico incluso nel sito, nessun token
// richiesto — solo la password del gate qui sotto, gestito insieme al
// caricamento del corpus e all'hero di ingresso da PasswordGate stesso).
// In sviluppo locale (npm run dev) questo ramo non viene mai eseguito:
// server Express reale, comportamento invariato.
const root = (
  <StrictMode>
    {isStaticBuild ? <PasswordGate /> : <App />}
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(root);
