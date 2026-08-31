import { StrictMode } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PasswordGate } from './components/PasswordGate';
import { reloadOnceForStaleChunk } from './lib/staleChunkGuard';
import ilaLogo from './assets/images/ila-logo.webp';

const isStaticBuild = import.meta.env.VITE_STATIC_BUILD === 'true';

// Il logo della hero è pesante (immagine raster ad alta risoluzione): qui
// forziamo il browser a iniziare a scaricarlo appena il bundle viene
// eseguito, prima ancora che React monti PasswordGate/App e renderizzi il
// tag <img>. Senza questo hint, su connessioni lente il logo poteva
// comparire a metà o in ritardo rispetto alla sua animazione di entrata.
const logoPreload = document.createElement('link');
logoPreload.rel = 'preload';
logoPreload.as = 'image';
logoPreload.href = ilaLogo;
document.head.appendChild(logoPreload);

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
