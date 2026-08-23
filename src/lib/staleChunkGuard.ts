// Ogni deploy su GitHub Pages sovrascrive dist/ con asset ri-hashati e
// cancella quelli vecchi. Chi ha la pagina già aperta (o una index.html in
// cache) da prima di un deploy prova a caricare il chunk col vecchio nome,
// che non esiste più → "Importing a module script failed" / "Failed to
// fetch dynamically imported module". Un reload risolve, quindi lo si fa
// in automatico (una sola volta, altrimenti loop infinito se l'errore è
// un altro) invece di piantare l'utente su una schermata d'errore.
export const RELOAD_GUARD_KEY = 'ila-stale-chunk-reload';

export function isStaleChunkError(message: string): boolean {
  return /module script|dynamically imported module|Failed to fetch/i.test(message);
}

export function reloadOnceForStaleChunk(message: string): boolean {
  if (!isStaleChunkError(message)) return false;
  if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return false;
  sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
  window.location.reload();
  return true;
}
