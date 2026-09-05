/* ------------------------------------------------------------------
 *  data-sync-report.ts — chi ha davvero il corpus buono?
 * ------------------------------------------------------------------
 *  Il corpus vive in due posti: `src/data/corpus/` in questa repo e la
 *  cartella corpus della repo dati. I due si sono già disallineati (naming
 *  diverso, conteggi diversi), e finché non si sa quale vince ogni fix XML
 *  rischia di essere annullata dal boot-sync del server.
 *
 *  Questo script non decide: guarda i file e stampa cosa c'è di diverso.
 *
 *  Uso:
 *    npx tsx scripts/data-sync-report.ts --repo ~/Documents/GitHub/ILA
 *    npx tsx scripts/data-sync-report.ts --github          (usa GITHUB_TOKEN/GITHUB_REPO)
 *    …aggiungi --csv docs/divergenza-corpus.csv per scrivere il dettaglio.
 *
 *  L'accoppiamento fra le due parti NON si fa sul nome del file (i due
 *  naming sono incompatibili: `ILA-042.xml` contro `CMRDM-AS-028_nr47.xml`).
 *  Si fa sull'identità che il file dichiara dentro di sé, in quest'ordine:
 *    1. <idno type="entryId">  — l'id interno, il più stabile;
 *    2. il riferimento alla fonte a stampa riconosciuto dal registro
 *       (printSources.ts), es. «CMRDM I 47»;
 *    3. il nome del file, come ultima spiaggia.
 * ------------------------------------------------------------------
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extractSourceRefs } from '../src/lib/printSources';

interface Scheda {
  file: string;
  entryId?: string;
  sourceRef?: string;
  /** identità usata per l'accoppiamento, con la sua provenienza. */
  key: string;
  keyKind: 'entryId' | 'fonte' | 'file';
  bytes: number;
  /** impronta del contenuto normalizzato: dice se due copie sono uguali. */
  fingerprint: string;
}

const norm = (s: string) => s.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();

function hash(s: string): string {
  // FNV-1a a 32 bit: basta a dire «uguale / diverso», non è crittografia.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function leggiScheda(file: string, xml: string): Scheda {
  const entryId = (xml.match(/<idno\s+type="entryId">([^<]+)<\/idno>/) || [])[1];
  const sourceRef = extractSourceRefs(xml)[0]?.ref;
  const key = entryId || sourceRef || path.basename(file);
  const keyKind: Scheda['keyKind'] = entryId ? 'entryId' : sourceRef ? 'fonte' : 'file';
  return {
    file: path.basename(file),
    entryId, sourceRef, key, keyKind,
    bytes: Buffer.byteLength(xml),
    fingerprint: hash(norm(xml)),
  };
}

function leggiCartella(dir: string): Scheda[] {
  if (!fs.existsSync(dir)) throw new Error(`Cartella inesistente: ${dir}`);
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.xml') && !f.startsWith('_'))
    .map(f => leggiScheda(f, fs.readFileSync(path.join(dir, f), 'utf-8')));
}

async function leggiGitHub(): Promise<Scheda[]> {
  const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPO;
  if (!token || !repo) throw new Error('GITHUB_TOKEN e GITHUB_REPO non impostati: usa --repo <cartella> su un clone locale.');
  const branch = process.env.GITHUB_BRANCH || 'main';
  const corpusPath = (process.env.GITHUB_CORPUS_PATH || 'corpus').replace(/^\/+|\/+$/g, '');
  const headers = { Authorization: `Bearer ${token}`, 'User-Agent': 'ila-sync-report' };
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${corpusPath}?ref=${branch}`, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const entries = (await res.json()) as { name: string; type: string; download_url?: string }[];
  const out: Scheda[] = [];
  for (const e of entries) {
    if (e.type !== 'file' || !e.name.endsWith('.xml') || e.name.startsWith('_') || !e.download_url) continue;
    const r = await fetch(e.download_url, { headers });
    if (!r.ok) { console.warn(`  ! ${e.name}: download fallito (${r.status})`); continue; }
    out.push(leggiScheda(e.name, await r.text()));
  }
  return out;
}

function indicizza(schede: Scheda[]): Map<string, Scheda> {
  const m = new Map<string, Scheda>();
  for (const s of schede) {
    // Una chiave duplicata è già di per sé un rilievo: la segnaliamo e teniamo la prima.
    if (m.has(s.key)) console.warn(`  ! chiave doppia «${s.key}»: ${m.get(s.key)!.file} e ${s.file}`);
    else m.set(s.key, s);
  }
  return m;
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const localDir = path.resolve(arg('--local') || 'src/data/corpus');
  const csvOut = arg('--csv');
  const repoArg = arg('--repo');
  const viaGitHub = argv.includes('--github');

  console.log(`Locale : ${localDir}`);
  const locali = leggiCartella(localDir);

  let remoti: Scheda[];
  let etichettaRemoto: string;
  if (viaGitHub) {
    etichettaRemoto = `GitHub ${process.env.GITHUB_REPO}`;
    console.log(`Remoto : ${etichettaRemoto}`);
    remoti = await leggiGitHub();
  } else {
    const base = (repoArg || path.join(os.homedir(), 'Documents/GitHub/ILA')).replace(/^~/, os.homedir());
    // la cartella corpus può stare nella radice del clone o in corpus/
    const dir = fs.existsSync(path.join(base, 'corpus')) ? path.join(base, 'corpus') : base;
    etichettaRemoto = dir;
    console.log(`Remoto : ${etichettaRemoto}`);
    remoti = leggiCartella(dir);
  }

  const L = indicizza(locali), R = indicizza(remoti);
  const soloLocali = locali.filter(s => !R.has(s.key));
  const soloRemoti = remoti.filter(s => !L.has(s.key));
  const comuni = locali.filter(s => R.has(s.key));
  const divergenti = comuni.filter(s => R.get(s.key)!.fingerprint !== s.fingerprint);

  const perKind = (xs: Scheda[]) => {
    const c: Record<string, number> = {};
    for (const x of xs) c[x.keyKind] = (c[x.keyKind] || 0) + 1;
    return Object.entries(c).map(([k, v]) => `${v} per ${k}`).join(', ');
  };

  console.log('');
  console.log('┌─ Conteggi ────────────────────────────────');
  console.log(`│ schede locali        ${String(locali.length).padStart(5)}   (${perKind(locali)})`);
  console.log(`│ schede remote        ${String(remoti.length).padStart(5)}   (${perKind(remoti)})`);
  console.log(`│ accoppiate           ${String(comuni.length).padStart(5)}`);
  console.log(`│ solo in locale       ${String(soloLocali.length).padStart(5)}`);
  console.log(`│ solo sul remoto      ${String(soloRemoti.length).padStart(5)}`);
  console.log(`│ contenuto divergente ${String(divergenti.length).padStart(5)}`);
  console.log('└───────────────────────────────────────────');

  const mostra = (titolo: string, xs: Scheda[], n = 15) => {
    if (xs.length === 0) return;
    console.log(`\n${titolo} (${xs.length}):`);
    for (const s of xs.slice(0, n)) console.log(`  ${s.file.padEnd(28)} ${s.sourceRef || '—'}`);
    if (xs.length > n) console.log(`  … e altre ${xs.length - n}`);
  };
  mostra('Presenti solo in locale', soloLocali);
  mostra('Presenti solo sul remoto', soloRemoti);
  mostra('Stessa scheda, contenuto diverso', divergenti);

  console.log('\nLettura:');
  if (soloLocali.length > 0 && soloRemoti.length === 0) {
    console.log(`  Il locale è avanti di ${soloLocali.length} schede e il remoto non ha nulla di suo.`);
    console.log('  Sincronizzare da remoto ora vorrebbe dire perderle: spingere prima il locale.');
  } else if (soloRemoti.length > 0 && soloLocali.length === 0) {
    console.log(`  Il remoto ha ${soloRemoti.length} schede che il locale non ha: qui il pull è sicuro.`);
  } else if (soloLocali.length > 0 && soloRemoti.length > 0) {
    console.log('  Le due parti sono divergenti in entrambe le direzioni: nessun pull automatico è sicuro.');
    console.log('  Va deciso a mano quale copia è canonica, scheda per scheda, prima di sincronizzare.');
  } else if (divergenti.length > 0) {
    console.log(`  Stessi file, ${divergenti.length} con contenuto diverso: guardare il dettaglio prima di sovrascrivere.`);
  } else {
    console.log('  Le due copie coincidono.');
  }

  if (csvOut) {
    const righe = ['stato,chiave,tipo_chiave,file_locale,file_remoto,fonte,byte_locali,byte_remoti'];
    const q = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
    for (const s of soloLocali) righe.push(['solo-locale', q(s.key), s.keyKind, q(s.file), '', q(s.sourceRef || ''), s.bytes, ''].join(','));
    for (const s of soloRemoti) righe.push(['solo-remoto', q(s.key), s.keyKind, '', q(s.file), q(s.sourceRef || ''), '', s.bytes].join(','));
    for (const s of divergenti) {
      const r = R.get(s.key)!;
      righe.push(['divergente', q(s.key), s.keyKind, q(s.file), q(r.file), q(s.sourceRef || ''), s.bytes, r.bytes].join(','));
    }
    fs.mkdirSync(path.dirname(path.resolve(csvOut)), { recursive: true });
    fs.writeFileSync(csvOut, righe.join('\n') + '\n', 'utf-8');
    console.log(`\nDettaglio in ${csvOut} (${righe.length - 1} righe).`);
  }
}

main().catch(e => { console.error(String(e.message || e)); process.exit(1); });
