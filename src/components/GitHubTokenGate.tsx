import React, { useState, FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { getStoredToken, setStoredToken, clearStoredToken, testGitHubAccess } from '../lib/githubStorageBrowser';

// Solo per la build statica (GitHub Pages): senza un backend, l'editor
// legge/scrive il corpus chiamando direttamente le API di GitHub dal
// browser, autenticato col Personal Access Token dell'utente. Il token
// resta SEMPRE solo in questo browser (localStorage) — non viene mai
// incluso nel bundle pubblicato né inviato altrove che alle API GitHub.

export function GitHubTokenGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (token) return <>{children}</>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    // Serve temporaneamente in storage perché testGitHubAccess() legge il
    // token da lì (stessa funzione usata a runtime) — ma va persistito
    // solo se risulta valido, altrimenti un token sbagliato resterebbe
    // salvato e verrebbe riusato senza controllo al prossimo reload.
    setStoredToken(input.trim());
    const result = await testGitHubAccess();
    if (result.ok) {
      setToken(input.trim());
    } else {
      clearStoredToken();
      setError(`Token non valido o senza accesso alla repo: ${result.detail}`);
    }
    setChecking(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-2 text-neutral-300">
          <KeyRound size={18} />
          <h1 className="text-sm font-medium">Connetti GitHub</h1>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Per leggere e salvare il corpus serve un tuo GitHub Personal Access
          Token (fine-grained) con permesso <span className="text-neutral-200">Contents: Read and write</span> sulla
          repo <span className="text-neutral-200">Gregoee2002/ILA</span>. Resta salvato solo in questo browser.
        </p>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="github_pat_..."
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-neutral-500 font-mono"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={checking || !input.trim()}
          className="w-full rounded-lg bg-neutral-100 text-neutral-900 text-sm font-medium py-2 disabled:opacity-50"
        >
          {checking ? 'Verifica…' : 'Connetti'}
        </button>
      </form>
    </div>
  );
}
