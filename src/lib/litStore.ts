// litStore.ts — dove vivono, e come si salvano, le fonti letterarie.
//
// TRE STATI DELLO STESSO CONTENUTO, in ordine di precedenza:
//
//  1. ARCHIVIO LIVE — fonti-letterarie.json sulla repo dati (Gregoee2002/ILA),
//     letto e riscritto dall'editor quando la redazione è sbloccata. È la
//     fonte di verità.
//  2. SCATTO STATICO — public/fonti-letterarie.json, copia dell'archivio
//     generata a ogni deploy (scripts/build-corpus-snapshot.ts). È quello che
//     legge chi apre il sito con la sola password.
//  3. SEME COMPILATO — src/data/fontiLetterarie.ts, dentro il bundle. Vale
//     finché nessuno ha mai salvato: al primo deploy l'archivio non esiste, e
//     senza il seme la sezione sarebbe vuota.
//
// Il passaggio è automatico: 1 se c'è, altrimenti 2, altrimenti 3.
// L'interfaccia dichiara però quale dei tre sta leggendo — un redattore deve
// sapere se sta guardando dati suoi o il seme di partenza.
//
// Perché un file solo e non uno per saggio: opere, testimonianze e saggi si
// rimandano l'un l'altro per id. Salvarli separatamente vorrebbe dire poter
// salvare un saggio che richiama testimonianze non ancora scritte.

import {
  LitDataset, Saggio, Opera, Testimonium, Nucleo, SaggioInPreparazione,
  opereById,
} from './litSources';
import { safeParseLitTesto, validateLitTokens, extractLitMarkupIndex } from './litMarkup';
import { OPERE, TESTIMONIA, SAGGI, SAGGI_IN_PREPARAZIONE } from '../data/fontiLetterarie';

export const SEME: LitDataset = {
  opere: OPERE,
  testimonia: TESTIMONIA,
  saggi: SAGGI,
  inPreparazione: SAGGI_IN_PREPARAZIONE,
};

export type FonteDati = 'seme' | 'archivio';

export interface CaricamentoLit {
  dataset: LitDataset;
  fonte: FonteDati;
  /** solo se l'archivio c'era ma era illeggibile: si è ricaduti sul seme */
  errore?: string;
}

const clona = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export const clonaDataset = (d: LitDataset): LitDataset => clona(d);

function normalizza(raw: any): LitDataset | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!Array.isArray(raw.opere)) return null;
  if (!Array.isArray(raw.testimonia) || !Array.isArray(raw.saggi)) return null;
  return {
    opere: raw.opere as Opera[],
    testimonia: raw.testimonia as Testimonium[],
    saggi: raw.saggi as Saggio[],
    inPreparazione: Array.isArray(raw.inPreparazione) ? raw.inPreparazione as SaggioInPreparazione[] : [],
  };
}

/**
 * Carica il contenuto della sezione. Non lancia mai: un archivio assente,
 * irraggiungibile o malformato fa ricadere sul seme compilato, perché una
 * sezione che non si apre è peggio di una ferma all'ultimo deploy.
 */
export async function caricaLitDataset(): Promise<CaricamentoLit> {
  try {
    const res = await fetch('/api/fonti-letterarie');
    // 204 = nessun archivio (stato iniziale), non un errore.
    if (res.status === 204 || res.status === 404 || !res.ok) return { dataset: clona(SEME), fonte: 'seme' };
    const ds = normalizza(await res.json());
    if (!ds) return { dataset: clona(SEME), fonte: 'seme', errore: 'Archivio in un formato non riconosciuto: si usa il seme compilato.' };
    return { dataset: ds, fonte: 'archivio' };
  } catch (e: any) {
    return { dataset: clona(SEME), fonte: 'seme', errore: e?.message };
  }
}

/** Scrive il dataset sulla repo dati. Lancia con il messaggio del server. */
export async function salvaLitDataset(dataset: LitDataset, message: string): Promise<void> {
  const res = await fetch('/api/fonti-letterarie', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset, message }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { detail = (await res.json()).error || detail; } catch { /* corpo non JSON */ }
    throw new Error(detail);
  }
}


export interface ProblemaIntegrita {
  severita: 'errore' | 'avviso';
  dove: string;
  messaggio: string;
}


/**
 * Le categorie di una testimonianza (divinità, personaggi, luoghi, termini)
 * hanno DUE possibili provenienze: il markup del testo, che è normalizzato
 * sulle chiavi del corpus, e i campi liberi della scheda, che sono testo nudo
 * scritto a mano. buildIndici oggi li versa entrambi nello stesso indice —
 * quindi la stessa divinità può entrarci due volte con due grafie, e nessuno
 * se ne accorge.
 *
 * La direzione è una sola: il markup è la fonte, i campi liberi sono un
 * residuo da riassorbire. Ma non si possono togliere prima di aver marcato,
 * perché oggi sono quasi tutto l'indice. Questa funzione misura la distanza
 * fra le due fonti, scheda per scheda, così che il lavoro di marcatura abbia
 * un traguardo visibile invece di procedere a memoria.
 *
 * Il confronto è insensibile a maiuscole, accenti e punteggiatura: «Selene» e
 * «Σελήνη» restano distinti (giustamente, sono chiavi diverse), ma «Carre» e
 * «carre» no.
 */
export type StatoCopertura = 'vuota' | 'assente' | 'parziale' | 'completa';

export interface CoperturaTestimonium {
  id: string;
  stato: StatoCopertura;
  /** quante marcature ha il testo */
  marcature: number;
  /** valori dei campi liberi che il markup non ha ancora ripreso */
  scoperti: { rubrica: string; valori: string[] }[];
  /** totale dei valori nei campi liberi */
  liberi: number;
}

/** Normalizza per il confronto: minuscole, senza diacritici né punteggiatura. */
function chiaveConfronto(s: string): string {
  return s.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function coperturaMarkup(testimonia: Testimonium[]): CoperturaTestimonium[] {
  return testimonia.map(t => {
    const mk = t.testo.includes('<')
      ? (() => { const tok = safeParseLitTesto(t.testo); return tok ? extractLitMarkupIndex(tok) : null; })()
      : null;

    // Rubrica per rubrica: valori scritti a mano contro valori già nel markup.
    // Le divinità si confrontano anche con gli epiteti, perché la redazione
    // scrive spesso «Men Askaenos» in un campo solo.
    const rubriche: { rubrica: string; liberi: string[]; marcati: string[] }[] = [
      {
        rubrica: 'Divinità',
        liberi: t.divinita || [],
        // Il markup tiene teonimo ed epiteto separati (key="Men Pharnakou" →
        // divinità «Men», epiteto «Pharnakou»), la redazione scrive «Men
        // Pharnakou» in un campo solo. Sono la stessa cosa detta a due
        // granularità: si accettano anche le coppie ricomposte, altrimenti il
        // controllo segnalerebbe come scoperto proprio ciò che è marcato.
        marcati: mk
          ? [...mk.divinita, ...mk.epiteti,
            ...mk.divinita.flatMap(d => mk.epiteti.map(e => `${d} ${e}`))]
          : [],
      },
      { rubrica: 'Personaggi mitici', liberi: t.personaggi || [], marcati: mk ? mk.personaggi : [] },
      { rubrica: 'Figure storiche', liberi: t.figure || [], marcati: mk ? mk.persone : [] },
      { rubrica: 'Luoghi', liberi: t.luoghi || [], marcati: mk ? mk.luoghi : [] },
      {
        rubrica: 'Termini',
        liberi: t.termini.map(w => w.lemma),
        marcati: mk
          ? [...mk.cultuale.flatMap(c => [c.lemma, c.forma]),
            ...mk.parole.flatMap(w => [w.lemma, w.forma]),
            ...mk.mentioned]
          : [],
      },
    ];

    const scoperti: CoperturaTestimonium['scoperti'] = [];
    let liberi = 0;
    for (const r of rubriche) {
      liberi += r.liberi.length;
      if (r.liberi.length === 0) continue;
      const noti = new Set(r.marcati.map(chiaveConfronto).filter(Boolean));
      const mancanti = r.liberi.filter(v => {
        const k = chiaveConfronto(v);
        return k && !noti.has(k);
      });
      if (mancanti.length > 0) scoperti.push({ rubrica: r.rubrica, valori: mancanti });
    }

    const mancanti = scoperti.reduce((n, s) => n + s.valori.length, 0);
    const stato: StatoCopertura =
      liberi === 0 ? 'vuota'
        : mancanti === 0 ? 'completa'
          : mancanti === liberi ? 'assente'
            : 'parziale';

    return { id: t.id, stato, marcature: mk?.marcature ?? 0, scoperti, liberi };
  });
}

/**
 * Controlli che nessun tipo TypeScript può fare, perché riguardano rimandi fra
 * oggetti: un `operaId` che non risolve, un saggio che richiama una
 * testimonianza inesistente, un id duplicato. Sono esattamente gli errori che
 * si commettono redigendo, e restano invisibili finché qualcuno non apre la
 * sezione dal lato sbagliato.
 */
export function verificaIntegrita(d: LitDataset): ProblemaIntegrita[] {
  const out: ProblemaIntegrita[] = [];
  const opere = opereById(d.opere);

  const idOpere = new Set<string>();
  for (const o of d.opere) {
    if (!o.id.trim()) out.push({ severita: 'errore', dove: o.titolo || '(opera senza titolo)', messaggio: 'Opera senza identificatore.' });
    else if (idOpere.has(o.id)) out.push({ severita: 'errore', dove: o.id, messaggio: 'Due opere con lo stesso identificatore.' });
    idOpere.add(o.id);
    if (!o.autore.trim() || !o.titolo.trim()) {
      out.push({ severita: 'avviso', dove: o.id, messaggio: 'Opera senza autore o senza titolo.' });
    }
  }

  const idTest = new Set<string>();
  const usate = new Set<string>();
  for (const t of d.testimonia) {
    const dove = t.id || '(senza id)';
    if (!t.id.trim()) out.push({ severita: 'errore', dove, messaggio: 'Testimonianza senza identificatore.' });
    else if (idTest.has(t.id)) out.push({ severita: 'errore', dove, messaggio: 'Due testimonianze con lo stesso identificatore.' });
    idTest.add(t.id);

    if (!t.operaId || !opere.has(t.operaId)) {
      out.push({ severita: 'errore', dove, messaggio: `Rimanda a un'opera inesistente («${t.operaId || '—'}»): resta senza dati bibliografici.` });
    } else usate.add(t.operaId);

    if (!t.locus.trim()) out.push({ severita: 'avviso', dove, messaggio: 'Senza locus: la citazione non è verificabile.' });
    if (!t.testo.trim()) out.push({ severita: 'avviso', dove, messaggio: 'Senza testo antico.' });

    if (t.testo.includes('<')) {
      const tok = safeParseLitTesto(t.testo);
      if (!tok) {
        out.push({ severita: 'errore', dove, messaggio: 'Markup del testo malformato: non si apre nell\'editor assistito.' });
      } else {
        const gravi = validateLitTokens(tok).filter(i => i.severity === 'error');
        if (gravi.length > 0) {
          out.push({ severita: 'avviso', dove, messaggio: `${gravi.length} error${gravi.length === 1 ? 'e' : 'i'} di markup: ${gravi[0].message}` });
        }
      }
    }
  }

  const citate = new Set<string>();
  const idSaggi = new Set<string>();
  for (const s of d.saggi) {
    if (idSaggi.has(s.id)) out.push({ severita: 'errore', dove: s.lemma, messaggio: 'Due saggi con lo stesso identificatore.' });
    idSaggi.add(s.id);

    for (const n of s.nuclei) {
      for (const id of n.testimonia) {
        if (!idTest.has(id)) {
          out.push({ severita: 'errore', dove: `${s.lemma} · ${n.titolo}`, messaggio: `Richiama la testimonianza «${id}», che non esiste.` });
        } else citate.add(id);
      }
      if (n.testimonia.length === 0) {
        out.push({ severita: 'avviso', dove: `${s.lemma} · ${n.titolo}`, messaggio: 'Nucleo vuoto.' });
      }
    }
    // Una testimonianza citata due volte nello stesso saggio riceverebbe due
    // sigle: la prima vince, la seconda sparisce senza dirlo.
    const visti = new Set<string>();
    for (const n of s.nuclei) for (const id of n.testimonia) {
      if (visti.has(id)) out.push({ severita: 'avviso', dove: `${s.lemma} · ${n.titolo}`, messaggio: `La testimonianza «${id}» compare in due nuclei dello stesso saggio.` });
      visti.add(id);
    }
  }

  for (const t of d.testimonia) {
    if (!citate.has(t.id)) {
      out.push({ severita: 'avviso', dove: t.id, messaggio: 'Catalogata ma non richiamata da nessun saggio: si legge solo dall\'elenco.' });
    }
  }
  for (const o of d.opere) {
    if (!usate.has(o.id)) {
      out.push({ severita: 'avviso', dove: o.id, messaggio: 'Opera nell\'indice ma senza testimonianze.' });
    }
  }

  // Un avviso solo, aggregato: il dettaglio scheda per scheda sta nella
  // tabella di copertura, che si legge meglio di venti righe uguali.
  const daMigrare = coperturaMarkup(d.testimonia)
    .filter(c => c.stato === 'assente' || c.stato === 'parziale');
  if (daMigrare.length > 0) {
    out.push({
      severita: 'avviso',
      dove: 'copertura del markup',
      messaggio: `${daMigrare.length} testimonianz${daMigrare.length === 1 ? 'a ha' : 'e hanno'} categorie ancora `
        + `come testo libero: l'indice le riceve senza normalizzazione, e il ponte verso le pagine del corpus non le vede.`,
    });
  }

  return out;
}


export const slugify = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const unico = (base: string, usati: Set<string>) => {
  let id = base || 'x', n = 2;
  while (usati.has(id)) id = `${base}-${n++}`;
  return id;
};

export function nuovoOperaId(autoreAbbr: string, titoloAbbr: string, esistenti: Opera[]): string {
  const base = [slugify(autoreAbbr), slugify(titoloAbbr)].filter(Boolean).join('-') || 'opera';
  return unico(base, new Set(esistenti.map(o => o.id)));
}

export function nuovaOpera(esistenti: Opera[]): Opera {
  return {
    id: nuovoOperaId('', '', esistenti),
    autore: '', autoreAbbr: '', titolo: '', titoloAbbr: '',
    lingua: 'grc', refType: 'lit', genere: 'epica',
    datazione: '', datazioneSort: 0, edizione: '',
  };
}

/** Id di una testimonianza: opera + locus, cioè la citazione stessa. */
export function nuovoTestimoniumId(operaId: string, locus: string, esistenti: Testimonium[]): string {
  const base = `ILA-LIT-${operaId || 'x'}-${slugify(locus).slice(0, 14) || 'x'}`;
  return unico(base, new Set(esistenti.map(t => t.id)));
}

export function nuovoTestimonium(operaId: string, esistenti: Testimonium[]): Testimonium {
  return {
    id: nuovoTestimoniumId(operaId, '', esistenti),
    operaId,
    locus: '',
    testo: '',
    traduzione: '',
    traduttore: 'trad. redazionale ILA',
    // Non è una formalità: un testo appena inserito NON è collazionato, e
    // dichiararlo è la regola della sezione.
    collazione: 'da-collazionare',
    tipo: [],
    lares: [],
    commento: '',
    termini: [],
  };
}

const ROMANI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function nuovoNucleo(s: Saggio): Nucleo {
  const n = s.nuclei.length + 1;
  return {
    id: `n${n}-${Date.now().toString(36)}`,
    titolo: `${ROMANI[n - 1] || n}. Nuovo nucleo`,
    cappello: '',
    testimonia: [],
  };
}

export function nuovoSaggio(lemma: string, esistenti: Saggio[]): Saggio {
  return {
    id: unico(`ILA-LIT-${slugify(lemma) || 'saggio'}`, new Set(esistenti.map(s => s.id))),
    lemma,
    sottotitolo: '',
    cappello: [''],
    nuclei: [],
    sintesi: [''],
    bibliografia: [],
    redazione: 'ILA',
    aggiornamento: new Date().toISOString().slice(0, 10),
  };
}
