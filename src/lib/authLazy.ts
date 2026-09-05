/* ------------------------------------------------------------------
 *  authLazy.ts — Firebase solo quando serve davvero
 * ------------------------------------------------------------------
 *  Firebase pesa mezzo megabyte minificato e serve a una cosa sola: il login
 *  Google quando l'applicazione gira contro il server Express. Sulla build
 *  statica — quella che il pubblico apre — non viene usato affatto: lì la
 *  scrittura si sblocca col token GitHub (UnlockEditingModal).
 *
 *  Importarlo staticamente lo metteva nel primo caricamento di chiunque, per
 *  poi non usarlo quasi mai. Qui è dietro `import()`: il chunk arriva alla
 *  prima chiamata, e sulla build statica non arriva mai.
 *
 *  Il tipo `User` è importato come tipo: non porta con sé codice.
 * ------------------------------------------------------------------
 */

import type { User } from 'firebase/auth';
export type { User };

/** Si iscrive ai cambi di sessione. La disiscrizione arriva insieme al modulo. */
export async function watchAuth(cb: (u: User | null) => void): Promise<() => void> {
  const [{ auth }, { onAuthStateChanged }] = await Promise.all([
    import('./firebase'),
    import('firebase/auth'),
  ]);
  return onAuthStateChanged(auth, cb);
}

export async function loginWithGoogle(): Promise<void> {
  await (await import('./firebase')).loginWithGoogle();
}

export async function logout(): Promise<void> {
  await (await import('./firebase')).logout();
}
