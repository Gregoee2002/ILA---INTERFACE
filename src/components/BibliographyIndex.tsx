import React, { useMemo, useState } from 'react';
import { BookMarked, Loader2, Search, Wand2, Check, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Monumento } from '../types';

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

// Normalizzazioni sicure predefinite (approvate 29 ago 2026). Ognuna è una
// funzione pura stringa→stringa; il pannello calcola in tempo reale quante
// diciture cambierebbero prima di applicare.
const QUICK_RULES: { id: string; label: string; desc: string; fn: (s: string) => string }[] = [
  {
    id: 'lane-comma',
    label: 'Virgola dopo «Lane»',
    desc: 'Lane I, p. … → Lane, I, p. …',
    fn: (s) => s.replace(/\bLane\s+(?=[IVX]+\b)/g, 'Lane, '),
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
    <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-2 flex items-center gap-1.5">
          <BookMarked className="h-3 w-3" /> Bibliografia — censimento e modifica in blocco
        </div>
        <p className="text-xs font-serif italic text-muted leading-relaxed">
          {inventory.size.toLocaleString('it')} diciture distinte su {totalBibl.toLocaleString('it')} riferimenti
          <span className="text-muted/60"> · {conflictGroups.length} gruppi con discrepanze di forma</span>
          <span className="text-muted/60"> · norme: </span>
          <a href="/docs/norme-bibliografia.md" target="_blank" rel="noreferrer" className="text-accent hover:opacity-70">docs/norme-bibliografia.md</a>
        </p>
      </div>

      {progress && (
        <div className="mb-4 text-[11px] font-sans text-accent flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Salvataggio {progress.done}/{progress.total} schede…
        </div>
      )}

      {lastResult && (
        <div className={cn(
          'mb-4 rounded-sm border px-3 py-2 text-[11px] font-sans',
          lastResult.failures.length
            ? 'border-amber-400/40 bg-amber-400/5 text-amber-600'
            : 'border-accent/30 bg-accent/5 text-accent'
        )}>
          {lastResult.updatedEntries} diciture aggiornate in {lastResult.updatedSchede} schede.
          {lastResult.failures.length > 0 && (
            <span> {lastResult.failures.length} falliti: {lastResult.failures.map(f => f.entryId).join(', ')}</span>
          )}
        </div>
      )}

      {/* Normalizzazioni rapide */}
      <div className="mb-6 rounded-lg border border-border/40 p-3">
        <div className="text-[10px] font-sans font-bold uppercase tracking-wide text-muted/70 mb-2 flex items-center gap-1.5">
          <Wand2 className="h-3 w-3" /> Normalizzazioni rapide
        </div>
        <div className="space-y-2">
          {QUICK_RULES.map(rule => {
            const edits = ruleMatches[rule.id] || [];
            return (
              <div key={rule.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-sans text-ink">{rule.label}</div>
                  <div className="text-[10px] font-serif italic text-muted/70 truncate">{rule.desc}</div>
                </div>
                <div className="text-[10px] font-sans text-muted tabular-nums shrink-0">{edits.length} diciture</div>
                <button
                  disabled={busy || edits.length === 0}
                  onClick={() => runApply(edits, rule.id)}
                  className="px-2.5 py-1 bg-accent hover:bg-accent/90 text-white font-sans text-[9px] font-bold uppercase tracking-widest transition-colors rounded-sm disabled:opacity-30 flex items-center gap-1.5 shrink-0"
                >
                  {ruleBusy === rule.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Applica
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ricerca / filtri */}
      <div className="flex gap-2 mb-3 items-center">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted/50" aria-hidden="true" />
          <input
            type="search"
            aria-label="Filtra le diciture bibliografiche"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filtra le diciture…"
            className="w-full text-xs font-sans rounded-sm border border-border bg-sidebar pl-8 pr-2.5 py-1.5 outline-none focus:border-accent transition-colors"
          />
        </div>
        <button
          onClick={() => setOnlyConflicts(v => !v)}
          aria-pressed={onlyConflicts}
          className={cn(
            'px-3 py-1.5 font-sans text-[9px] font-bold uppercase tracking-widest transition-colors rounded-sm border flex items-center gap-1.5',
            onlyConflicts
              ? 'border-amber-400/50 bg-amber-400/10 text-amber-600'
              : 'border-border text-muted hover:text-ink hover:border-accent/40'
          )}
        >
          <AlertTriangle className="h-3 w-3" /> Solo discrepanze
        </button>
      </div>

      <div className="text-[10px] font-sans text-muted/60 mb-2">{rows.length} diciture</div>

      <div className="space-y-1">
        {rows.map(row => (
          <div key={row.val} className="rounded-sm border border-border/40 hover:border-border transition-colors">
            <div className="flex items-start gap-2 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-serif text-ink leading-snug flex items-start gap-1.5">
                  {row.conflict && <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />}
                  <span>{row.val}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {row.schede.slice(0, 12).map(m => (
                    <button
                      key={m.entryId || m.id}
                      onClick={() => onSelectMonumento(m)}
                      className="text-[9px] font-sans uppercase tracking-wide text-muted/70 hover:text-accent transition-colors"
                    >
                      ILA-{String(m.id).padStart(3, '0')}
                    </button>
                  ))}
                  {row.schede.length > 12 && (
                    <span className="text-[9px] font-sans text-muted/50">+{row.schede.length - 12}</span>
                  )}
                </div>
              </div>
              <div className="text-[10px] font-sans text-muted tabular-nums shrink-0 pt-0.5">×{row.schede.length}</div>
              <button
                onClick={() => (editing === row.val ? setEditing(null) : startEdit(row.val))}
                aria-expanded={editing === row.val}
                className="text-[10px] font-sans font-bold uppercase tracking-wide text-accent hover:opacity-70 transition-opacity flex items-center gap-1 shrink-0 pt-0.5"
              >
                Modifica <ChevronRight className={cn('h-3 w-3 transition-transform', editing === row.val && 'rotate-90')} aria-hidden="true" />
              </button>
            </div>

            {editing === row.val && (
              <div className="border-t border-border/40 px-3 py-2.5 space-y-2 bg-sidebar/40">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={2}
                  className="w-full text-xs font-serif rounded-sm border border-border bg-sidebar px-2.5 py-2 outline-none focus:border-accent transition-colors resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    disabled={busy || draft.trim() === '' || draft === row.val}
                    onClick={() => runApply([{ from: row.val, to: draft.trim() }])}
                    className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white font-sans text-[9px] font-bold uppercase tracking-widest transition-colors rounded-sm disabled:opacity-30 flex items-center gap-1.5"
                  >
                    {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Sostituisci in {row.schede.length} {row.schede.length === 1 ? 'scheda' : 'schede'}
                  </button>
                  <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-muted hover:text-ink font-sans text-[9px] font-bold uppercase tracking-widest transition-colors rounded-sm">
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-sm italic text-muted/60 py-12 text-center">Nessuna dicitura corrisponde al filtro.</div>
        )}
      </div>
    </div>
  );
}
