import React, { useState, FormEvent } from 'react';
import { Lock } from 'lucide-react';

// Gate a password lato client per la build GitHub Pages. NON è sicurezza
// vera: l'hash confrontato qui è nel bundle pubblico, chiunque ispezioni
// il codice sorgente può leggerlo o bypassare il controllo. Serve solo a
// tenere fuori visitatori casuali finché non c'è un'autenticazione reale
// (vedi PLAN — opzioni valutate: repo privata con Pages a pagamento, o un
// proxy con auth reale tipo Cloudflare Access).
//
// main.tsx monta questo componente SOLO sulla build statica
// (VITE_STATIC_BUILD=true) — in dev locale (`npm run dev`) non viene mai
// renderizzato, quindi qui dentro siamo sempre sulla build Pages. Se manca
// VITE_SITE_PASSWORD_HASH (secret non configurato nel workflow) il gate
// fallisce CHIUSO — non c'è un fallback "aperto", altrimenti un deploy con
// il secret dimenticato pubblicherebbe il sito senza alcuna protezione.

const STORAGE_KEY = 'site_unlocked';

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const requiredHash = import.meta.env.VITE_SITE_PASSWORD_HASH as string | undefined;

  const [unlocked, setUnlocked] = useState(!!requiredHash && sessionStorage.getItem(STORAGE_KEY) === '1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (!requiredHash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-red-400 text-sm px-4 text-center">
        Configurazione mancante: VITE_SITE_PASSWORD_HASH non impostata in build. Sito bloccato per sicurezza.
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    const hash = await sha256Hex(password);
    if (hash === requiredHash) {
      sessionStorage.setItem(STORAGE_KEY, '1');
      setUnlocked(true);
    } else {
      setError('Password errata.');
    }
    setChecking(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-2 text-neutral-300">
          <Lock size={18} />
          <h1 className="text-sm font-medium">Accesso riservato</h1>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={checking || !password}
          className="w-full rounded-lg bg-neutral-100 text-neutral-900 text-sm font-medium py-2 disabled:opacity-50"
        >
          {checking ? 'Verifica…' : 'Entra'}
        </button>
      </form>
    </div>
  );
}
