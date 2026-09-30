import { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { Monumento } from '../types';
import { etichettaScheda } from '../lib/sezioni';
import { PRINT_SOURCES } from '../lib/printSources';

/**
 * BibliographyIndex — censimento e modifica in blocco delle diciture
 * bibliografiche del corpus. Interamente nascosto a chi non ha sbloccato
 * l'editing (vedi effectiveAdmin in App.tsx): il pannello compare nella
 * rail solo dopo l'inserimento del token GitHub.
 *
 * Raccoglie tutte le stringhe <bibl> distinte, le raggruppa per famiglia
 * (primo token / autore) e per "chiave normalizzata" (per far emergere le
 * discrepanze di forma), e permette un find/replace esatto applicato a
 * tutte le schede che contengono quella dicitura. Il salvataggio passa
 * per lo stesso canale dell'editor (una PATCH per file, con baseHash),
 * quindi ogni scheda toccata diventa un commit come per una modifica
 * manuale di sezione.
 *
 * Norme redazionali di riferimento: docs/norme-bibliografia.md
 */

export interface BiblioReplacement {
  from: string; // dicitura esatta da sostituire
  to: string;   // nuova dicitura
}

export interface BiblioApplyResult {
  ok: boolean;
  updatedEntries: number;
  updatedSchede: number;
  failures: { entryId: string; error: string }[];
}

interface Props {
  monumenti: Monumento[];
  onApply: (edits: BiblioReplacement[]) => Promise<BiblioApplyResult>;
  onSelectMonumento: (m: Monumento) => void;
  progress: { done: number; total: number } | null;
}

// Chiave per raggruppare varianti "quasi uguali": minuscole, niente accenti,
// via ogni punteggiatura e spazio. Due diciture con la stessa chiave ma forma
// grezza diversa = discrepanza da uniformare.
const normKey = (s: string) =>
  s.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,;:()«»"'\s-]+/g, '')
    .toLowerCase();

// Famiglia = cognome/sigla iniziale, per dare una prima aggregazione leggibile.
const FAMILY_NAMES = [
  'lane', 'drexler', 'robert', 'perdrizet', 'keil', 'premerstein', 'steinleitner',
  'zingerle', 'smirnoff', 'vermaseren', 'buresch', 'ramsay', 'calder', 'sterrett',
  'buckler', 'waddington', 'foucart', 'hirschfeld', 'homolle', 'wiegand', 'daremberg',
  'kern', 'cumont', 'sardis', 'sylloge', 'seg', 'tam', 'mama', 'cig', 'ogis',
];
const familyOf = (v: string): string => {
  const vl = v.toLowerCase();
  for (const n of FAMILY_NAMES) if (new RegExp(`\\b${n}\\b`).test(vl)) return n;
  const m = v.match(/^[*\s]*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.\-]*)/);
  return m ? m[1].toLowerCase() : '(altro)';
};

// Cognomi degli autori del registro delle fonti a stampa: «E. N. Lane» → «Lane».
// Servono alle regole rapide che normalizzano la forma delle citazioni.
const SOURCE_SURNAMES = Array.from(new Set(
  PRINT_SOURCES.map(f => (f.autore || '').split(/\s+/).filter(Boolean).pop() || '').filter(x => x.length > 2),
));

// Normalizzazioni sicure predefinite (approvate 29 ago 2026). Ognuna è una
// funzione pura stringa→stringa; il pannello calcola in tempo reale quante
// diciture cambierebbero prima di applicare.
const QUICK_RULES: { id: string; label: string; desc: string; fn: (s: string) => string }[] = [
  {
    // Il cognome dell'autore e il numero di volume vanno separati da virgola.
    // I cognomi vengono dal registro delle fonti (printSources.ts): la regola
    // non conosce nessun autore in particolare, e cresce col registro.
    id: 'autore-volume-comma',
    label: 'Virgola fra autore e volume',
    desc: 'Lane I, p. … → Lane, I, p. … (vale per ogni autore del registro fonti)',
    fn: (s) => SOURCE_SURNAMES.reduce(
      (acc, cognome) => acc.replace(new RegExp(`\\b${cognome}\\s+(?=[IVX]+\\b)`, 'g'), `${cognome}, `),
      s,
    ),
  },
  {
    id: 'pp-ranges',
    label: '«pp.» + cifre piene nei range di pagine',
    desc: 'p. 26-27 → pp. 26-27 · p. 43-4 → pp. 43-44',
    fn: (s) =>
      s.replace(/\bp\.\s*(\d+)\s*-\s*(\d+)\b/g, (_m, a: string, b: string) => {
        let end = b;
        // 43-4 → 43-44 : completa le cifre mancanti col prefisso di "a".
        if (b.length < a.length) end = a.slice(0, a.length - b.length) + b;
        return `pp. ${a}-${end}`;
      }),
  },
  {
    id: 'no-double-space',
    label: 'Spazi doppi e spazi prima di virgola',
    desc: '"Berlin ,  1900" → "Berlin, 1900"',
    fn: (s) => s.replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim(),
  },
];

export function BibliographyIndex({ monumenti, onApply, onSelectMonumento, progress }: Props) {
  const [query, setQuery] = useState('');
  const [onlyConflicts, setOnlyConflicts] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [applying, setApplying] = useState(false);
  const [lastResult, setLastResult] = useState<BiblioApplyResult | null>(null);
  const [ruleBusy, setRuleBusy] = useState<string | null>(null);

  // Inventario: dicitura → schede che la contengono (una scheda può comparire
  // più volte se ripete la stessa stringa, ma è raro; si tiene la lista piena).
  const inventory = useMemo(() => {
    const map = new Map<string, Monumento[]>();
    for (const m of monumenti) {
      for (const b of m.bibliografia || []) {
        const t = (b.titolo || '').trim();
        if (!t) continue;
        const arr = map.get(t) || [];
        arr.push(m);
        map.set(t, arr);
      }
    }
    return map;
  }, [monumenti]);

  const totalBibl = useMemo(
    () => monumenti.reduce((n, m) => n + (m.bibliografia?.filter(b => (b.titolo || '').trim()).length || 0), 0),
    [monumenti]
  );

  // Gruppi di discrepanza: chiave normalizzata con >1 forma grezza.
  const conflictGroups = useMemo(() => {
    const byKey = new Map<string, Map<string, number>>();
    for (const [val, schede] of inventory) {
      const k = normKey(val);
      const forms = byKey.get(k) || new Map<string, number>();
      forms.set(val, (forms.get(val) || 0) + schede.length);
      byKey.set(k, forms);
    }
    return Array.from(byKey.values())
      .filter(forms => forms.size > 1)
      .map(forms => Array.from(forms.entries())
        .map(([form, count]) => ({ form, count }))
        .sort((a, b) => b.count - a.count));
  }, [inventory]);

  const conflictForms = useMemo(() => {
    const s = new Set<string>();
    for (const g of conflictGroups) for (const v of g) s.add(v.form);
    return s;
  }, [conflictGroups]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = Array.from(inventory.entries()).map(([val, schede]) => ({
      val,
      schede: Array.from(new Set(schede)),
      family: familyOf(val),
      conflict: conflictForms.has(val),
    }));
    if (q) list = list.filter(r => r.val.toLowerCase().includes(q));
    if (onlyConflicts) list = list.filter(r => r.conflict);
    list.sort((a, b) =>
      a.family === b.family ? a.val.localeCompare(b.val) : a.family.localeCompare(b.family)
    );
    return list;
  }, [inventory, query, onlyConflicts, conflictForms]);

  const ruleMatches = useMemo(() => {
    const out: Record<string, BiblioReplacement[]> = {};
    for (const rule of QUICK_RULES) {
      const edits: BiblioReplacement[] = [];
      for (const val of inventory.keys()) {
        const next = rule.fn(val);
        if (next !== val) edits.push({ from: val, to: next });
      }
      out[rule.id] = edits;
    }
    return out;
  }, [inventory]);

  const runApply = async (edits: BiblioReplacement[], ruleId?: string) => {
    if (!edits.length) return;
    if (ruleId) setRuleBusy(ruleId);
    else setApplying(true);
    setLastResult(null);
    try {
      const res = await onApply(edits);
      setLastResult(res);
      setEditing(null);
    } finally {
      setApplying(false);
      setRuleBusy(null);
    }
  };

  const startEdit = (val: string) => {
    setEditing(val);
    setDraft(val);
    setLastResult(null);
  };

  const busy = applying || ruleBusy !== null;

  return (
    <div className="flex-1 overflow-y-auto pr-3">
      <div className="max-w-4xl w-full pb-10">
      <div className="mb-6">
        <p className="font-serif italic text-[13px] text-muted leading-relaxed">
          Censimento e modifica in blocco delle diciture: {inventory.size.toLocaleString('it')} distinte su {totalBibl.toLocaleString('it')} riferimenti,
          {' '}{conflictGroups.length} gruppi con discrepanze di forma. Norme:{' '}
          <a href="https://github.com/Gregoee2002/ILA---INTERFACE/blob/main/docs/norme-bibliografia.md" target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-accent">norme-bibliografia.md</a>.
        </p>
      </div>

      {progress && (
        <p className="mb-4 font-serif italic text-[13px] text-accent">
          Salvataggio {progress.done} di {progress.total} schede…
        </p>
      )}

      {lastResult && (
        <p className={cn('mb-4 font-serif text-[13px]', lastResult.failures.length ? 'text-danger' : 'text-muted')}>
          {lastResult.updatedEntries} diciture aggiornate in {lastResult.updatedSchede} schede.
          {lastResult.failures.length > 0 && (
            <span> Non riuscite: {lastResult.failures.map(f => f.entryId).join(', ')}.</span>
          )}
        </p>
      )}

      {/* Normalizzazioni rapide */}
      <section className="mb-8">
        <h3 className="font-serif text-[15px] text-ink mb-1.5 pb-1 border-b border-border/30">Normalizzazioni rapide</h3>
        {QUICK_RULES.map(rule => {
          const edits = ruleMatches[rule.id] || [];
          return (
            <div key={rule.id} className="flex items-baseline gap-2 px-1.5 py-[3px]">
              <span className="font-serif text-[14px] text-ink shrink-0">{rule.label}</span>
              <span className="font-serif italic text-[12px] text-muted/60 truncate">{rule.desc}</span>
              <span className="flex-1 self-center border-b border-dotted border-border/70 mx-1 min-w-4" />
              <span className="shrink-0 font-sans text-xs tabular-nums text-muted">{edits.length} diciture</span>
              <button
                disabled={busy || edits.length === 0}
                onClick={() => runApply(edits, rule.id)}
                className="shrink-0 w-14 text-right font-serif text-[13px] text-accent hover:opacity-70 transition-opacity disabled:text-muted/40 disabled:hover:opacity-100"
              >
                {ruleBusy === rule.id ? '…' : 'Applica'}
              </button>
            </div>
          );
        })}
      </section>

      {/* Ricerca / filtri */}
      <div className="mb-2 pb-1 border-b border-border/30 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <h3 className="font-serif text-[15px] text-ink">Diciture</h3>
        <input
          type="search"
          aria-label="Filtra le diciture bibliografiche"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filtra le diciture"
          className="w-56 bg-transparent border-0 border-b border-border/50 rounded-none font-sans text-xs text-ink outline-none focus:border-accent/60 py-0.5 placeholder:text-muted/60"
        />
        <label className="font-serif text-[13px] text-muted flex items-baseline gap-1.5 cursor-pointer">
          <input type="checkbox" checked={onlyConflicts} onChange={e => setOnlyConflicts(e.target.checked)} className="accent-[var(--accent)] translate-y-[1px]" />
          solo le discrepanze
        </label>
        <span className="ml-auto font-sans text-[11px] tabular-nums text-muted/60">{rows.length}</span>
      </div>

      <div>
        {rows.map(row => (
          <div key={row.val} className={cn('border-b border-border/15', editing === row.val && 'bg-sidebar/30')}>
            <div className="flex items-baseline gap-2.5 px-1.5 py-1.5">
              <span
                className={cn('shrink-0 self-center h-1.5 w-1.5 rounded-full', row.conflict ? 'bg-warning' : 'bg-transparent')}
                title={row.conflict ? 'Esiste una forma quasi uguale scritta diversamente' : undefined}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <div className="font-serif text-[14px] text-ink leading-snug">{row.val}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
                  {row.schede.slice(0, 12).map(m => (
                    <button
                      key={m.entryId || m.id}
                      onClick={() => onSelectMonumento(m)}
                      className="font-sans text-[11px] tabular-nums text-muted hover:text-accent transition-colors"
                    >
                      {etichettaScheda(m.id)}
                    </button>
                  ))}
                  {row.schede.length > 12 && (
                    <span className="font-sans text-[11px] text-muted/60">+{row.schede.length - 12}</span>
                  )}
                </div>
              </div>
              <span className="shrink-0 font-sans text-xs tabular-nums text-muted">×{row.schede.length}</span>
              <button
                onClick={() => (editing === row.val ? setEditing(null) : startEdit(row.val))}
                aria-expanded={editing === row.val}
                className={cn('shrink-0 font-serif text-[13px] transition-colors', editing === row.val ? 'text-accent italic' : 'text-muted hover:text-ink')}
              >
                Modifica
              </button>
            </div>

            {editing === row.val && (
              <div className="ml-6 pl-3 mb-3 border-l border-border/40 space-y-2">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={2}
                  className="w-full resize-y bg-transparent border-0 border-b border-border/50 rounded-none font-serif text-[14px] text-ink outline-none focus:border-accent/60"
                />
                <div className="flex items-baseline gap-4">
                  <button
                    disabled={busy || draft.trim() === '' || draft === row.val}
                    onClick={() => runApply([{ from: row.val, to: draft.trim() }])}
                    className="font-serif text-[14px] text-accent hover:opacity-70 transition-opacity disabled:opacity-40"
                  >
                    {applying ? 'Sostituzione…' : `Sostituisci in ${row.schede.length} ${row.schede.length === 1 ? 'scheda' : 'schede'}`}
                  </button>
                  <button onClick={() => setEditing(null)} className="font-serif italic text-[13px] text-muted hover:text-ink transition-colors">
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-12 text-center font-serif italic text-sm text-muted/60">Nessuna dicitura corrisponde al filtro.</p>
        )}
      </div>
      </div>
    </div>
  );
}
