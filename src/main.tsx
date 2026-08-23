import React, {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PasswordGate } from './components/PasswordGate';

const isStaticBuild = import.meta.env.VITE_STATIC_BUILD === 'true';

// Ogni deploy su GitHub Pages sovrascrive dist/ con asset ri-hashati e
// cancella quelli vecchi. Chi ha la pagina già aperta (o una index.html in
// cache) da prima di un deploy prova a caricare il chunk col vecchio nome,
// che non esiste più → "Importing a module script failed" / "Failed to
// fetch dynamically imported module". Vite emette 'vite:preloadError'
// apposta per questo caso: un reload risolve, quindi lo facciamo in
// automatico (una sola volta, altrimenti loop infinito se l'errore è
// un altro) invece di piantare l'utente su una schermata d'errore.
const RELOAD_GUARD_KEY = 'ila-stale-chunk-reload';

function isStaleChunkError(message: string): boolean {
  return /module script|dynamically imported module|Failed to fetch/i.test(message);
}

function reloadOnceForStaleChunk(message: string): boolean {
  if (!isStaleChunkError(message)) return false;
  if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return false;
  sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
  window.location.reload();
  return true;
}

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
// richiesto — solo la password del gate qui sotto). Chi vuole modificare
// sblocca l'editing con un proprio PAT GitHub dal menu dentro l'app (vedi
// UnlockEditingModal in App.tsx), non è più un gate bloccante in ingresso.
// In sviluppo locale (npm run dev) questo ramo non viene mai eseguito:
// server Express reale, comportamento invariato.
function StaticBoot({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import('./lib/apiShim')
      .then(({ installApiShim }) => installApiShim())
      .then(() => {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
        setReady(true);
      })
      .catch((e: any) => {
        const message = e?.message || String(e);
        if (!reloadOnceForStaleChunk(message)) setError(message);
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-red-400 text-sm px-4 text-center">
        Errore caricamento corpus: {error}
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-400 text-sm">
        Caricamento corpus…
      </div>
    );
  }
  return <>{children}</>;
}

const root = (
  <StrictMode>
    {isStaticBuild ? (
      <PasswordGate>
        <StaticBoot>
          <App />
        </StaticBoot>
      </PasswordGate>
    ) : (
      <App />
    )}
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(root);
