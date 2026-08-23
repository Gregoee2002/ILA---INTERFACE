import React, { useState, FormEvent } from 'react';
import { KeyRound, X } from 'lucide-react';

// Sostituisce il vecchio gate a pagina intera: sulla build statica,
// consultare il catalogo richiede solo la password (vedi PasswordGate);
// modificare/salvare richiede in più questo sblocco, aperto da un pulsante
// nel menu — così il link con la sola password si può condividere con chi
// deve solo consultare, senza dargli accesso a editing/creazione schede.
// Il token resta SEMPRE solo in questo browser (localStorage, vedi
// githubStorageBrowser.ts) — non viene mai incluso nel bundle pubblicato
// né inviato altrove che alle API GitHub.
//
// Non importa apiShim.ts direttamente: lo riceve come prop (onSubmit) da
// App.tsx, che lo carica con import() dinamico. Così questo componente
// resta nel bundle principale (App.tsx lo renderizza sempre, condizionato
// solo a runtime) senza trascinarci dentro apiShim — che altrimenti
// finirebbe anche in eventuali build embeddate/sandboxate dove non serve.
//
// A differenza di PasswordGate, qui App è già montata (si apre da un
// pulsante dentro l'app) quindi la classe "dark" su <html> è già
// applicata: si possono usare i token colore del tema (bg-card, text-accent
// ecc. da index.css) invece di hex hardcoded, e seguono chiaro/scuro.

interface Props {
  onClose: () => void;
  onUnlocked: () => void;
  onSubmit: (token: string) => Promise<{ ok: boolean; detail: string }>;
}

export function UnlockEditingModal({ onClose, onUnlocked, onSubmit }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    const result = await onSubmit(input.trim());
    if (result.ok) {
      onUnlocked();
      onClose();
    } else {
      setError(`Token non valido o senza accesso alla repo: ${result.detail}`);
    }
    setChecking(false);
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md space-y-4 bg-card border border-border rounded-2xl p-7 text-ink shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-accent">
            <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
              <KeyRound size={16} />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] font-sans">Sblocca modifica</h2>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink transition-colors" title="Chiudi">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Per modificare e salvare il corpus serve un tuo GitHub Personal Access
          Token (fine-grained) con permesso <span className="text-ink font-medium">Contents: Read and write</span> sulla
          repo <span className="text-ink font-medium">Gregoee2002/ILA</span>. Resta salvato solo in questo browser —
          senza token puoi comunque consultare liberamente il catalogo.
        </p>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="github_pat_..."
          className="w-full rounded-full bg-sidebar border border-border px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors font-mono text-center"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={checking || !input.trim()}
          className="w-full font-sans text-xs font-bold uppercase tracking-[0.15em] rounded-full py-3.5 text-parchment bg-accent hover:bg-accent/90 transition-all disabled:opacity-40 disabled:hover:bg-accent"
        >
          {checking ? 'Verifica…' : 'Sblocca'}
        </button>
      </form>
    </div>
  );
}
