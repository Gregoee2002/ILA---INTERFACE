// lessicoLaresStore.ts — carica e salva l'overlay del vocabolario
// «Lessico cultuale · LARES». Tre stati come per le fonti letterarie:
//   1. overlay live (lessico-lares-overlay.json sulla repo dati)
//   2. scatto statico (public/lessico-lares-overlay.json, per chi apre il sito)
//   3. nessun overlay → si usa il solo seed compilato
// buildLessicoLares fonde seed ⊕ overlay; senza overlay restituisce il seed.

import {
  LessicoLaresOverlay, EMPTY_OVERLAY, ResolvedVocab, buildLessicoLares,
} from './lessicoLaresOverlay';

export type FonteVocab = 'seed' | 'overlay';

export interface CaricamentoVocab {
  overlay: LessicoLaresOverlay;
  vocab: ResolvedVocab;
  fonte: FonteVocab;
  errore?: string;
}

const clona = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function normalizza(raw: any): LessicoLaresOverlay | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    version: 1,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : undefined,
    famiglie: Array.isArray(raw.famiglie) ? raw.famiglie : [],
    sottofunzioni: Array.isArray(raw.sottofunzioni) ? raw.sottofunzioni : [],
    lemmi: Array.isArray(raw.lemmi) ? raw.lemmi : [],
    toolbox: Array.isArray(raw.toolbox) ? raw.toolbox : [],
    concettuali: raw.concettuali && typeof raw.concettuali === 'object'
      ? { defaultPerFamiglia: raw.concettuali.defaultPerFamiglia || {}, note: raw.concettuali.note }
      : { defaultPerFamiglia: {} },
  };
}

export async function caricaVocab(): Promise<CaricamentoVocab> {
  try {
    const res = await fetch('/api/lessico-lares-vocab');
    if (res.status === 204 || res.status === 404 || !res.ok) {
      return { overlay: clona(EMPTY_OVERLAY), vocab: buildLessicoLares(), fonte: 'seed' };
    }
    const ov = normalizza(await res.json());
    if (!ov) {
      return { overlay: clona(EMPTY_OVERLAY), vocab: buildLessicoLares(), fonte: 'seed', errore: 'Overlay in un formato non riconosciuto: si usa il seed.' };
    }
    return { overlay: ov, vocab: buildLessicoLares(ov), fonte: 'overlay' };
  } catch (e: any) {
    return { overlay: clona(EMPTY_OVERLAY), vocab: buildLessicoLares(), fonte: 'seed', errore: e?.message };
  }
}

let condivisa: Promise<CaricamentoVocab> | null = null;

export function caricaVocabCondiviso(): Promise<CaricamentoVocab> {
  if (!condivisa) condivisa = caricaVocab();
  return condivisa;
}

export function invalidaVocabCache(): void {
  condivisa = null;
}

/** Scrive l'overlay sulla repo dati. Lancia con il messaggio del server. */
export async function salvaVocab(overlay: LessicoLaresOverlay, message: string): Promise<void> {
  const res = await fetch('/api/lessico-lares-vocab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overlay, message }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { detail = (await res.json()).error || detail; } catch { /* corpo non JSON */ }
    throw new Error(detail);
  }
  invalidaVocabCache();
}
