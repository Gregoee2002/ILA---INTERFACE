import React, { useEffect, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import App from '../App';
import { EASE_OUT } from '../lib/utils';
import { RELOAD_GUARD_KEY, reloadOnceForStaleChunk } from '../lib/staleChunkGuard';
import ilaLogo from '../assets/images/ila-logo.png';

// Gate a password lato client per la build GitHub Pages. NON è sicurezza
// vera: l'hash confrontato qui è nel bundle pubblico, chiunque ispezioni
// il codice sorgente può leggerlo o bypassare il controllo. Serve solo a
// tenere fuori visitatori casuali finché non c'è un'autenticazione reale
// (vedi PLAN — opzioni valutate: repo privata con Pages a pagamento, o un
// proxy con auth reale tipo Cloudflare Access).
//
// main.tsx monta questo componente SOLO sulla build statica
// (VITE_STATIC_BUILD=true) — in dev locale (`npm run dev`) non viene mai
// renderizzato, quindi <App/> gestisce da sé la propria hero/landing.
//
// Questo componente È la hero: stessa identità visiva ("ILA" in App.tsx —
// logo, dissolvenza, pillola teal) dall'istante del primo paint fino
// all'ingresso nel catalogo, un solo mount continuo. Prima serviva un
// passaggio separato (schermo password scuro → "Caricamento corpus…" →
// hero di App con "Entra nel catalogo"): tre schermate diverse in
// sequenza davano un effetto "flash" fastidioso. Qui il campo password
// e il pulsante "Entra nel catalogo" sono due stati dello stesso slot
// sotto al logo, mai un remount separato — e l'apiShim viene installato
// in background fin da subito, in parallelo all'inserimento password,
// così quando l'utente preme "Entra" il corpus è già pronto e <App/>
// monta senza il rischio di un fetch reale (404) prima che lo shim sia
// attivo.

const STORAGE_KEY = 'site_unlocked';

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function PasswordGate() {
  const requiredHash = import.meta.env.VITE_SITE_PASSWORD_HASH as string | undefined;

  const [unlocked, setUnlocked] = useState(!!requiredHash && sessionStorage.getItem(STORAGE_KEY) === '1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [corpusReady, setCorpusReady] = useState(false);
  const [corpusError, setCorpusError] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    import('../lib/apiShim')
      .then(({ installApiShim }) => installApiShim())
      .then(() => {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
        setCorpusReady(true);
      })
      .catch((e: any) => {
        const message = e?.message || String(e);
        if (!reloadOnceForStaleChunk(message)) setCorpusError(message);
      });
  }, []);

  if (entered) return <App skipLanding />;

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
    <AnimatePresence>
      <motion.div
        key="entry"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 1, ease: 'easeInOut' } }}
        exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
        className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-parchment py-8"
        style={{
          // Sempre in tema chiaro, a prescindere dalla modalità notte:
          // il ritaglio del logo non è pulito sullo sfondo scuro, quindi
          // qui le custom property del tema vengono fissate ai valori
          // light indipendentemente da .dark sull'antenato.
          ['--parchment' as any]: '#F7F4EC',
          ['--ink' as any]: '#1E2A26',
          ['--accent' as any]: '#1F8377',
          ['--muted' as any]: '#6E6A5E',
          ['--border' as any]: '#E1DBC8',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 10%, rgba(127,168,150,0.07), transparent 38%), radial-gradient(circle at 85% 90%, rgba(31,131,119,0.05), transparent 40%)'
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
          className="relative z-10 flex flex-col items-center text-center max-w-lg px-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 1.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: EASE_OUT }}
            className="mb-12"
          >
            <img
              src={ilaLogo}
              alt="Index Lunae Antiquae"
              className="w-auto object-contain"
              style={{ height: 'clamp(120px, 32vh, 320px)' }}
            />
          </motion.div>

          {!requiredHash ? (
            <p className="text-sm text-center max-w-sm" style={{ color: '#E08585' }}>
              Configurazione mancante: VITE_SITE_PASSWORD_HASH non impostata in build. Sito bloccato per sicurezza.
            </p>
          ) : corpusError ? (
            <p className="text-sm text-center max-w-sm" style={{ color: '#E08585' }}>
              Errore caricamento corpus: {corpusError}
            </p>
          ) : !unlocked ? (
            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
              <input
                type="password"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full max-w-xs rounded-full px-5 py-3 text-sm text-center outline-none transition-colors font-sans bg-[var(--card)] border border-[var(--border)] text-[var(--ink)]"
              />
              {error && <p className="text-xs mt-3" style={{ color: '#E08585' }}>{error}</p>}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                type="submit"
                disabled={checking || !password}
                className="font-sans text-xs font-bold uppercase tracking-[0.15em] text-parchment bg-accent px-9 py-4 rounded-full shadow-[0_8px_24px_rgba(31,131,119,0.25)] hover:bg-accent/90 hover:shadow-[0_10px_28px_rgba(31,131,119,0.32)] transition-all duration-300 mt-6 disabled:opacity-40"
              >
                {checking ? 'Verifica…' : 'Entra'}
              </motion.button>
            </form>
          ) : (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              onClick={() => setEntered(true)}
              disabled={!corpusReady}
              className="font-sans text-xs font-bold uppercase tracking-[0.15em] text-parchment bg-accent px-9 py-4 rounded-full shadow-[0_8px_24px_rgba(31,131,119,0.25)] hover:bg-accent/90 hover:shadow-[0_10px_28px_rgba(31,131,119,0.32)] transition-all duration-300 disabled:opacity-40"
            >
              {corpusReady ? 'Entra nel catalogo' : 'Caricamento…'}
            </motion.button>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="flex flex-col items-center gap-1.5 text-[10px] font-sans tracking-[0.1em] text-muted mt-10"
          >
            <span>A cura di Gabriele Gregorio</span>
            <span>MMXXVI</span>
            <span className="italic opacity-70 mt-1" style={{ fontFamily: 'Georgia, serif' }}>Dis Manibus</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
