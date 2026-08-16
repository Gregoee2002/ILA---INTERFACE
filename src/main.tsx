import React, {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PasswordGate } from './components/PasswordGate';
import { GitHubTokenGate } from './components/GitHubTokenGate';

const isStaticBuild = import.meta.env.VITE_STATIC_BUILD === 'true';

// Solo sulla build GitHub Pages: nessun server.ts, quindi le route /api/*
// vengono servite in-browser da apiShim.ts (idratato da GitHub). In
// sviluppo locale (npm run dev) questo ramo non viene mai eseguito: server
// Express reale, comportamento invariato.
function StaticBoot({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import('./lib/apiShim')
      .then(({ installApiShim }) => installApiShim())
      .then(() => setReady(true))
      .catch((e: any) => setError(e.message || String(e)));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-red-400 text-sm px-4 text-center">
        Errore caricamento corpus da GitHub: {error}
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-400 text-sm">
        Caricamento corpus da GitHub…
      </div>
    );
  }
  return <>{children}</>;
}

const root = (
  <StrictMode>
    {isStaticBuild ? (
      <PasswordGate>
        <GitHubTokenGate>
          <StaticBoot>
            <App />
          </StaticBoot>
        </GitHubTokenGate>
      </PasswordGate>
    ) : (
      <App />
    )}
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(root);
