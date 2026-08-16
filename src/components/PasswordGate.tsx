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
//
// Stile: stessa identità visiva della hero "ILA" in App.tsx (Cinzel per il
// titolo, vignetta radiale, pillola teal per il pulsante) — colori del
// tema dark hardcoded (var(--accent) ecc. da index.css non sono ancora
// applicati qui: la classe "dark" su <html> la mette App.tsx al mount, che
// a questo punto non è ancora montata).

const STORAGE_KEY = 'site_unlocked';

const COLORS = {
  parchment: '#171915',
  ink: '#E4E6DD',
  accent: '#35BDB3',
  muted: '#8C9084',
  card: '#262920',
  border: '#34372C',
};

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: COLORS.parchment, color: COLORS.ink }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 10%, rgba(127,168,150,0.09), transparent 38%), radial-gradient(circle at 85% 90%, rgba(53,189,179,0.08), transparent 40%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const requiredHash = import.meta.env.VITE_SITE_PASSWORD_HASH as string | undefined;

  const [unlocked, setUnlocked] = useState(!!requiredHash && sessionStorage.getItem(STORAGE_KEY) === '1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (!requiredHash) {
    return (
      <Shell>
        <p className="text-sm text-center max-w-sm" style={{ color: '#E08585' }}>
          Configurazione mancante: VITE_SITE_PASSWORD_HASH non impostata in build. Sito bloccato per sicurezza.
        </p>
      </Shell>
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
    <Shell>
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col items-center text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: 'rgba(53,189,179,0.12)', border: `1px solid rgba(53,189,179,0.3)` }}
        >
          <Lock size={20} style={{ color: COLORS.accent }} />
        </div>

        <span
          className="text-[10px] font-sans tracking-[0.25em] uppercase mb-2"
          style={{ color: COLORS.muted }}
        >
          Index Lunae Antiquae
        </span>
        <h1
          className="text-3xl font-bold mb-8 tracking-[0.1em]"
          style={{ fontFamily: '"Cinzel", serif', color: COLORS.accent }}
        >
          Accesso Riservato
        </h1>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-full px-5 py-3 text-sm text-center outline-none transition-colors font-sans"
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.ink,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = COLORS.accent)}
          onBlur={e => (e.currentTarget.style.borderColor = COLORS.border)}
        />
        {error && <p className="text-xs mt-3" style={{ color: '#E08585' }}>{error}</p>}

        <button
          type="submit"
          disabled={checking || !password}
          className="font-sans text-xs font-bold uppercase tracking-[0.15em] px-9 py-4 rounded-full transition-all duration-300 mt-6 disabled:opacity-40"
          style={{
            color: COLORS.parchment,
            backgroundColor: COLORS.accent,
            boxShadow: checking || !password ? 'none' : '0 8px 24px rgba(53,189,179,0.25)',
          }}
        >
          {checking ? 'Verifica…' : 'Entra'}
        </button>
      </form>
    </Shell>
  );
}
