/* ------------------------------------------------------------------
 *  collate-source.ts — collazione assistita contro una fonte a stampa
 * ------------------------------------------------------------------
 *  Confronta il testo greco delle schede del corpus con quello di una fonte
 *  a stampa di cui abbiamo la scansione, e dice **dove guardare**. Non è un
 *  correttore: non scrive niente sul corpus, e non sa distinguere una lezione
 *  editoriale da un errore di trascrizione. Segnala, e la revisione resta
 *  umana.
 *
 *  La fonte non è cablata: si sceglie fra quelle del registro
 *  (src/lib/printSources.ts) che dichiarano una configurazione `collazione`.
 *
 *  Uso:
 *    npx tsx scripts/collate-source.ts --source cmrdm-i --pdf ~/scans/CMRDM-I.pdf
 *    npx tsx scripts/collate-source.ts --source cmrdm-i --txt a.txt --txt b.txt --csv rapporto.csv
 *    …aggiungi --campione 30 per un campione stratificato per regione.
 *
 *  Il testo a stampa si estrae con `pdftotext -layout` (una volta sola: il
 *  .txt viene tenuto accanto al PDF). Dell'entry a stampa si prendono solo
 *  le sequenze in alfabeto greco: il resto — commento, apparato, traduzione —
 *  non è confrontabile con l'edizione EpiDoc.
 *
 *  `--txt` si può ripetere con **più letture della stessa fonte** (per esempio
 *  due modelli OCR diversi, `grc` e `ell`). Allora una divergenza viene
 *  riportata solo se **tutte** le letture la vedono: quello che due OCR
 *  indipendenti leggono in modo diverso è rumore dell'OCR, non una
 *  divergenza fra il libro e il corpus. È il filtro che rende questi numeri
 *  guardabili.
 *
 *  Cosa NON garantisce, e va detto prima di leggere i numeri:
 *    · l'estrazione da un PDF a colonne sbaglia gli a-capo e le colonne;
 *    · il testo a stampa porta parentesi e punti sottoscritti che qui vengono
 *      tolti, quindi lacune e integrazioni non sono confrontate;
 *    · una divergenza segnalata può essere una scelta editoriale nostra.
 *  Il numero da guardare è la *distribuzione* delle divergenze, non il totale.
 * ------------------------------------------------------------------
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { diffChars } from 'diff';
import { PRINT_SOURCES, COLLATABLE_SOURCES, printSource, extractSourceRefs } from '../src/lib/printSources';
import { normalizeGreek } from '../src/lib/textNorm';

const GRECO = /[Ͱ-Ͽἀ-῿]/;

/**
 * Solo le sequenze in alfabeto greco, tutto il resto via — e le parole
 * spezzate dall'a-capo ricongiunte prima, su entrambi i lati del confronto:
 * la sillabazione di fine riga è la stessa cosa sulla pietra e sul libro, ma
 * se la si lascia dov'è, ogni riga che va a capo in un punto diverso conta
 * come divergenza. Sono differenze di impaginazione, non di lettura.
 */
function soloGreco(s: string): string {
  const ricongiunto = s.replace(/(\S)-\s+/g, '$1');
  const pezzi = ricongiunto.match(/[Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿'’ͅ\s]*/g) || [];
  return pezzi.join(' ').replace(SEGNI_SCIOLTI, '');
}

/**
 * Spiriti e accenti *sciolti* — non uniti a una lettera: nel blocco greco
 * esteso sono caratteri a sé, e l'OCR ne produce a bizzeffe quando la
 * scansione stacca un accento dal suo rigo. Non sono lettere e non vanno
 * confrontati: `normalizeGreek` toglie i diacritici combinanti, non questi.
 */
const SEGNI_SCIOLTI = /[\u037E\u0384\u0385\u1FBD-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE]/g;

/** Testo dell'edizione di una scheda, senza tag e senza segni di lacuna. */
function edizioneDiScheda(xml: string): string {
  const m = xml.match(/<div\s+type="edition"[^>]*>([\s\S]*?)(?=<div\s+type="(?:apparatus|translation|commentary|bibliography)"|<\/body>)/);
  if (!m) return '';
  return m[1]
    .replace(/<lb\b[^>]*\/>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[\[\]()<>{}⌈⌉|]/g, '')          // parentesi di edizione
    .replace(/[̣̱]/g, '')            // punti/lineette sottoscritti
    .replace(/\s+/g, ' ')
    .trim();
}

interface Divergenza {
  tipo: 'lettera' | 'numerale' | 'blocco' | 'breve';
  atteso: string;   // com'è nella fonte a stampa
  trovato: string;  // com'è nel corpus
}

/** Classifica le differenze fra due testi normalizzati. */
function divergenze(stampa: string, corpus: string): Divergenza[] {
  const out: Divergenza[] = [];
  const parti = diffChars(stampa, corpus);
  for (let i = 0; i < parti.length; i++) {
    const p = parti[i];
    if (!p.removed && !p.added) continue;
    // una sostituzione è una coppia rimosso+aggiunto adiacente
    const q = parti[i + 1];
    let atteso = p.removed ? p.value : '';
    let trovato = p.added ? p.value : '';
    if (q && ((p.removed && q.added) || (p.added && q.removed))) {
      atteso = p.removed ? p.value : q.value;
      trovato = p.added ? p.value : q.value;
      i++;
    }
    const lung = Math.max(atteso.trim().length, trovato.trim().length);
    if (lung === 0) continue;
    const numerale = /[ʹ΄'0-9]/.test(atteso + trovato);
    const tipo: Divergenza['tipo'] =
      numerale ? 'numerale' : lung === 1 ? 'lettera' : lung > 20 ? 'blocco' : 'breve';
    out.push({ tipo, atteso: atteso.trim(), trovato: trovato.trim() });
  }
  return out;
}

/** Similarità 0–1 fra due stringhe, dal totale dei caratteri in comune. */
function similarita(a: string, b: string): number {
  if (!a && !b) return 1;
  let comuni = 0;
  for (const p of diffChars(a, b)) if (!p.added && !p.removed) comuni += p.value.length;
  return (2 * comuni) / (a.length + b.length || 1);
}

function estraiTesto(pdf: string): string {
  const txt = pdf.replace(/\.pdf$/i, '') + '.txt';
  if (fs.existsSync(txt)) return fs.readFileSync(txt, 'utf-8');
  console.log(`Estrazione con pdftotext -layout → ${txt}`);
  execFileSync('pdftotext', ['-layout', pdf, txt]);
  return fs.readFileSync(txt, 'utf-8');
}

/** Spezza il testo a stampa in schede, sull'attacco dichiarato dalla fonte. */
function spezzaEntry(testo: string, entryStart: RegExp): Map<string, string> {
  const re = new RegExp(entryStart.source, entryStart.flags.includes('m') ? entryStart.flags : entryStart.flags + 'm');
  const righe = testo.split('\n');
  const out = new Map<string, string>();
  let numero: string | null = null;
  let buf: string[] = [];
  const chiudi = () => { if (numero && buf.length) out.set(numero, (out.get(numero) || '') + '\n' + buf.join('\n')); };
  for (const riga of righe) {
    const m = riga.match(re);
    if (m && m[1]) { chiudi(); numero = m[1]; buf = [riga]; }
    else if (numero) buf.push(riga);
  }
  chiudi();
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const args = (n: string) => argv.flatMap((a, i) => (a === n && argv[i + 1] ? [argv[i + 1]] : []));

  const sourceId = arg('--source') || COLLATABLE_SOURCES[0]?.id;
  const fonte = sourceId ? printSource(sourceId) : undefined;
  if (!fonte || !fonte.collazione) {
    console.error(`Fonte «${sourceId}» sconosciuta o senza scansione collazionabile.`);
    console.error(`Collazionabili: ${COLLATABLE_SOURCES.map(s => s.id).join(', ') || '(nessuna)'}`);
    console.error(`Nel registro ce ne sono ${PRINT_SOURCES.length}: per aggiungerne una serve il campo «collazione» in src/lib/printSources.ts.`);
    process.exit(1);
  }

  const txtArgs = args('--txt');
  const pdfArg = arg('--pdf') || (process.env.ILA_SCANS_DIR ? path.join(process.env.ILA_SCANS_DIR, fonte.collazione.pdf) : undefined);
  if (txtArgs.length === 0 && !pdfArg) {
    console.error(`Serve la scansione: --pdf <file> (atteso «${fonte.collazione.pdf}») oppure --txt <file già estratto>.`);
    console.error('In alternativa imposta ILA_SCANS_DIR alla cartella delle scansioni.');
    process.exit(1);
  }
  const letture = (txtArgs.length ? txtArgs.map(f => fs.readFileSync(f, 'utf-8')) : [estraiTesto(pdfArg!)])
    .map(t => spezzaEntry(t, fonte.collazione!.entryStart));
  const nomiLetture = txtArgs.length ? txtArgs.map(f => path.basename(f)) : [path.basename(pdfArg!)];
  console.log(`${fonte.sigla}: ${letture[0].size} schede riconosciute nel testo a stampa.`);
  if (letture.length > 1) {
    console.log(`${letture.length} letture della stessa fonte (${nomiLetture.join(', ')}): si riporta solo ciò su cui vanno d'accordo.`);
  }
  if (fonte.collazione.note) console.log(`Nota di lettura: ${fonte.collazione.note}`);

  const corpusDir = path.resolve(arg('--corpus') || 'src/data/corpus');
  const file = fs.readdirSync(corpusDir).filter(f => f.endsWith('.xml') && !f.startsWith('_')).sort();

  interface Riga {
    scheda: string; numero: string; regione: string;
    similarita: number; nDiv: number; div: Divergenza[];
    lungStampa: number; lungCorpus: number;
  }
  const righe: Riga[] = [];
  let senzaRif = 0, senzaEntry = 0, senzaGreco = 0;

  let scartate = 0;
  const chiave = (d: Divergenza) => `${d.atteso}→${d.trovato}`;

  for (const f of file) {
    const xml = fs.readFileSync(path.join(corpusDir, f), 'utf-8');
    const rif = extractSourceRefs(xml).find(r => r.sourceId === fonte.id);
    if (!rif?.numero) { senzaRif++; continue; }
    const testiStampa = letture.map(l => l.get(rif.numero!)).filter((x): x is string => !!x);
    if (testiStampa.length === 0) { senzaEntry++; continue; }

    const corpus = normalizeGreek(soloGreco(edizioneDiScheda(xml)));
    const stampe = testiStampa.map(t => normalizeGreek(soloGreco(t))).filter(Boolean);
    if (!corpus || stampe.length === 0) { senzaGreco++; continue; }

    const perLettura = stampe.map(st => ({ st, sim: similarita(st, corpus), div: divergenze(st, corpus) }));
    // La lettura più vicina al corpus è quella da credere: se *una* lettura
    // OCR coincide col corpus, la divergenza dell'altra è un errore di quella.
    const migliore = perLettura.reduce((a, b) => (b.sim > a.sim ? b : a));
    // …e delle divergenze si tiene solo ciò che tutte le letture vedono.
    const comuni = perLettura.length === 1
      ? migliore.div
      : migliore.div.filter(d => perLettura.every(l => l.div.some(x => chiave(x) === chiave(d))));
    scartate += migliore.div.length - comuni.length;

    const regione = (xml.match(/<region>([^<]*)<\/region>/) || [])[1]
      || (xml.match(/<placeName[^>]*type="region"[^>]*>([^<]*)</) || [])[1] || '—';
    righe.push({
      scheda: f.replace(/\.xml$/, ''), numero: rif.numero, regione,
      similarita: migliore.sim, nDiv: comuni.length, div: comuni,
      lungStampa: migliore.st.length, lungCorpus: corpus.length,
    });
  }

  righe.sort((a, b) => a.similarita - b.similarita);

  // Campione stratificato per regione, se richiesto: si prendono le schede
  // più divergenti di ogni regione, in proporzione a quante ne ha la regione.
  const nCampione = Number(arg('--campione') || 0);
  let mostrate = righe;
  if (nCampione > 0) {
    const perRegione = new Map<string, Riga[]>();
    for (const r of righe) (perRegione.get(r.regione) || perRegione.set(r.regione, []).get(r.regione)!).push(r);
    const quota = (n: number) => Math.max(1, Math.round((n / righe.length) * nCampione));
    mostrate = [...perRegione.values()].flatMap(rs => rs.slice(0, quota(rs.length))).slice(0, nCampione);
    mostrate.sort((a, b) => a.similarita - b.similarita);
  }

  const conta: Record<string, number> = {};
  for (const r of righe) for (const d of r.div) conta[d.tipo] = (conta[d.tipo] || 0) + 1;
  const pulite = righe.filter(r => r.nDiv === 0).length;

  console.log('');
  console.log('┌─ Collazione ──────────────────────────────');
  console.log(`│ schede confrontate      ${String(righe.length).padStart(5)}`);
  console.log(`│ senza rif. alla fonte   ${String(senzaRif).padStart(5)}`);
  console.log(`│ rif. senza entry        ${String(senzaEntry).padStart(5)}`);
  console.log(`│ senza greco confrontab. ${String(senzaGreco).padStart(5)}`);
  console.log(`│ identiche               ${String(pulite).padStart(5)}`);
  if (letture.length > 1) {
    console.log(`│ scartate perché una sola lettura le vedeva: ${scartate}`);
  }
  console.log('├─ divergenze per tipo ─────────────────────');
  for (const [k, v] of Object.entries(conta).sort((a, b) => b[1] - a[1])) {
    console.log(`│ ${k.padEnd(22)} ${String(v).padStart(5)}`);
  }
  console.log('└───────────────────────────────────────────');

  console.log(`\nLe ${Math.min(20, mostrate.length)} schede più divergenti:`);
  for (const r of mostrate.slice(0, 20)) {
    const esempi = r.div.slice(0, 3).map(d => `${d.atteso || '∅'}→${d.trovato || '∅'}`).join('  ');
    console.log(`  ${r.scheda}  ${fonte.cita(r.numero).padEnd(14)} sim ${(r.similarita * 100).toFixed(0).padStart(3)}%  ${String(r.nDiv).padStart(3)} div  ${esempi}`);
  }

  // Le coppie di lettere che ricorrono: sono le classi d'errore da correggere
  // in blocco invece che scheda per scheda.
  const coppie: Record<string, number> = {};
  for (const r of righe) for (const d of r.div) {
    if (d.tipo !== 'lettera') continue;
    coppie[`${d.atteso || '∅'} → ${d.trovato || '∅'}`] = (coppie[`${d.atteso || '∅'} → ${d.trovato || '∅'}`] || 0) + 1;
  }
  const ricorrenti = Object.entries(coppie).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (ricorrenti.length) {
    console.log('\nScambi di lettera ricorrenti (classi d\'errore, non singoli casi):');
    for (const [k, n] of ricorrenti) console.log(`  ${String(n).padStart(4)} ×  ${k}`);
  }

  const csv = arg('--csv');
  if (csv) {
    const q = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
    const out = ['scheda,fonte,riferimento,regione,similarita,divergenze,tipi,esempi,car_stampa,car_corpus'];
    for (const r of righe) {
      const tipi = [...new Set(r.div.map(d => d.tipo))].join(' ');
      const esempi = r.div.slice(0, 6).map(d => `${d.atteso || '∅'}→${d.trovato || '∅'}`).join(' · ');
      out.push([r.scheda, fonte.id, q(fonte.cita(r.numero)), q(r.regione), r.similarita.toFixed(3), r.nDiv, q(tipi), q(esempi), r.lungStampa, r.lungCorpus].join(','));
    }
    fs.mkdirSync(path.dirname(path.resolve(csv)), { recursive: true });
    fs.writeFileSync(csv, out.join('\n') + '\n', 'utf-8');
    console.log(`\nRapporto in ${csv} (${righe.length} righe).`);
  }

  console.log('\nDa ricordare leggendo questi numeri: lo script confronta solo il greco,');
  console.log('senza parentesi né punti sottoscritti. Una divergenza è un posto dove');
  console.log('guardare, non un errore accertato.');
  const senzaGrecoDelTutto = letture.every(l => ![...l.values()].some(t => GRECO.test(t)));
  if (senzaGrecoDelTutto) {
    console.log('\nATTENZIONE: nel testo a stampa non c\'è alfabeto greco. Il livello di testo');
    console.log('del PDF non mappa il font greco: passare prima da scripts/ocr-print-source.py.');
  }
}

main();
