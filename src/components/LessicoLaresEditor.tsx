import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { Monumento } from '../types';
import { buildCultIndex } from '../lib/cultIndex';
import {
  LessicoLaresOverlay, EMPTY_OVERLAY, ResolvedVocab, buildLessicoLares, validateOverlay,
  FamigliaPatch, SottoFunzione, LemmaPatch, ToolboxNodoPatch,
} from '../lib/lessicoLaresOverlay';
import { caricaVocab, salvaVocab } from '../lib/lessicoLaresStore';
import { ToolboxMarker, LaresMarker, LARES_GRID, CAMPO_COLOR, AMBITO_LABELS } from '../lib/laresToolbox';
import {
  ArrowLeft, Loader2, Save, RotateCcw, Plus, ExternalLink, Lock, AlertTriangle, Check,
} from 'lucide-react';

interface Props {
  monumenti: Monumento[];
  onSelectMonumento?: (m: Monumento) => void;
  onChiudi: () => void;
}

type Tab = 'lemmi' | 'famiglie' | 'sottofunzioni' | 'toolbox' | 'concettuali';

const TABS: { id: Tab; label: string }[] = [
  { id: 'lemmi', label: 'Lemmi' },
  { id: 'famiglie', label: 'Famiglie' },
  { id: 'sottofunzioni', label: 'Sotto-funzioni' },
  { id: 'toolbox', label: 'Toolbox LARES' },
  { id: 'concettuali', label: 'Marcatori concettuali' },
];

const INPUT = 'bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-md font-sans text-xs outline-none px-2 py-1 focus:border-accent/50 focus:ring-1 focus:ring-accent/30';
const BTN = 'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-sans font-bold uppercase tracking-wide transition-colors';
const BTN_GHOST = cn(BTN, 'text-muted hover:text-ink hover:bg-sidebar/60');
const BTN_ACCENT = cn(BTN, 'bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20');

function upsertBy<T>(arr: T[], keyOf: (x: T) => string, k: string, patch: Partial<T>, base: () => T): T[] {
  const i = arr.findIndex(x => keyOf(x) === k);
  if (i === -1) return [...arr, { ...base(), ...patch } as T];
  const next = arr.slice();
  next[i] = { ...next[i], ...patch };
  return next;
}

/** Riga con un + un campo testo inline, per aggiungere una voce senza un form a parte. */
const InlineAdd: React.FC<{
  campi: { chiave: string; placeholder: string; className?: string }[];
  label: string;
  onAggiungi: (v: Record<string, string>) => void;
}> = ({ campi, label, onAggiungi }) => {
  const [aperto, setAperto] = useState(false);
  const [v, setV] = useState<Record<string, string>>({});
  if (!aperto) {
    return <button onClick={() => setAperto(true)} className={BTN_GHOST}><Plus className="h-3 w-3" /> {label}</button>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {campi.map(c => (
        <input
          key={c.chiave}
          placeholder={c.placeholder}
          value={v[c.chiave] || ''}
          onChange={e => setV(s => ({ ...s, [c.chiave]: e.target.value }))}
          className={cn(INPUT, c.className || 'w-28')}
        />
      ))}
      <button
        onClick={() => { onAggiungi(v); setV({}); setAperto(false); }}
        className={BTN_ACCENT}
      >
        <Check className="h-3 w-3" /> Aggiungi
      </button>
      <button onClick={() => { setV({}); setAperto(false); }} className={BTN_GHOST}>Annulla</button>
    </div>
  );
};

const PercorsoPicker: React.FC<{
  vocab: ResolvedVocab;
  value?: ToolboxMarker;
  onChange: (m: ToolboxMarker | null) => void;
}> = ({ vocab, value, onChange }) => {
  const itemId = value?.item || '';
  const catId = value?.subtype[0] || '';
  const subId = value?.subtype[1] || '';
  const item = vocab.toolbox.find(i => i.id === itemId);
  const cat = item?.categorie.find(c => c.id === catId);
  return (
    <div className="flex items-center gap-1">
      <select
        value={itemId}
        onChange={e => onChange(e.target.value ? { item: e.target.value, subtype: [] } : null)}
        className={cn(INPUT, 'w-32')}
      >
        <option value="">— senza percorso —</option>
        {vocab.toolbox.filter(i => !i.deprecated).map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
      </select>
      {item && item.categorie.length > 0 && (
        <select
          value={catId}
          onChange={e => onChange(e.target.value ? { item: itemId, subtype: [e.target.value] } : { item: itemId, subtype: [] })}
          className={cn(INPUT, 'w-32')}
        >
          <option value="">(categoria)</option>
          {item.categorie.filter(c => !c.deprecated).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      )}
      {cat && cat.sub.length > 0 && (
        <select
          value={subId}
          onChange={e => onChange(e.target.value ? { item: itemId, subtype: [catId, e.target.value] } : { item: itemId, subtype: [catId] })}
          className={cn(INPUT, 'w-32')}
        >
          <option value="">(sottocategoria)</option>
          {cat.sub.filter(s => !s.deprecated).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      )}
    </div>
  );
};

export const LessicoLaresEditor: React.FC<Props> = ({ monumenti, onSelectMonumento, onChiudi }) => {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<LessicoLaresOverlay>(EMPTY_OVERLAY);
  const [tab, setTab] = useState<Tab>('lemmi');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string[] | string | null>(null);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let vivo = true;
    caricaVocab().then(({ overlay }) => {
      if (!vivo) return;
      setWorking(JSON.parse(JSON.stringify(overlay)));
      setLoading(false);
    });
    return () => { vivo = false; };
  }, []);

  const vocab = useMemo(() => buildLessicoLares(working), [working]);
  const errors = useMemo(() => validateOverlay(working), [working]);

  const counts = useMemo(() => {
    const idx = buildCultIndex(monumenti, { vocab });
    return new Map(idx.lemmata.map(l => [l.lemma, l]));
  }, [monumenti, vocab]);
  const byId = useMemo(() => new Map(monumenti.map(m => [m.id, m])), [monumenti]);

  // ── famiglie ─────────────────────────────────────────────────────────
  const updateFamiglia = (id: string, patch: Partial<FamigliaPatch>) =>
    setWorking(w => ({ ...w, famiglie: upsertBy<FamigliaPatch>(w.famiglie, f => f.id, id, patch, () => ({ id })) }));
  const addFamiglia = (id: string, label: string) =>
    setWorking(w => ({ ...w, famiglie: upsertBy<FamigliaPatch>(w.famiglie, f => f.id, id, { label, _new: true }, () => ({ id, _new: true })) }));
  const revertFamiglia = (id: string) =>
    setWorking(w => ({ ...w, famiglie: w.famiglie.filter(f => f.id !== id) }));

  // ── sotto-funzioni ───────────────────────────────────────────────────
  const updateSub = (id: string, patch: Partial<SottoFunzione>) =>
    setWorking(w => ({ ...w, sottofunzioni: upsertBy<SottoFunzione>(w.sottofunzioni, s => s.id, id, patch, () => ({ id })) }));
  const addSub = (id: string, label: string) =>
    setWorking(w => ({ ...w, sottofunzioni: upsertBy<SottoFunzione>(w.sottofunzioni, s => s.id, id, { label }, () => ({ id })) }));
  const revertSub = (id: string) =>
    setWorking(w => ({ ...w, sottofunzioni: w.sottofunzioni.filter(s => s.id !== id) }));

  // ── lemmi ────────────────────────────────────────────────────────────
  const updateLemma = (lemma: string, patch: Partial<LemmaPatch>) =>
    setWorking(w => ({ ...w, lemmi: upsertBy<LemmaPatch>(w.lemmi, l => l.lemma, lemma, patch, () => ({ lemma })) }));
  const addLemma = (lemma: string, family: string) =>
    setWorking(w => ({
      ...w,
      lemmi: upsertBy<LemmaPatch>(w.lemmi, l => l.lemma, lemma, { family, _new: true }, () => ({ lemma, family, _new: true })),
    }));
  const revertLemma = (lemma: string) =>
    setWorking(w => ({ ...w, lemmi: w.lemmi.filter(l => l.lemma !== lemma) }));
  const hasPatch = (lemma: string) => working.lemmi.some(l => l.lemma === lemma);

  // ── toolbox ──────────────────────────────────────────────────────────
  const updateToolbox = (path: string, patch: Partial<ToolboxNodoPatch>) =>
    setWorking(w => ({ ...w, toolbox: upsertBy<ToolboxNodoPatch>(w.toolbox, t => t.path, path, patch, () => ({ path })) }));
  const addToolboxNode = (path: string, patch: Partial<ToolboxNodoPatch>) =>
    setWorking(w => ({ ...w, toolbox: upsertBy<ToolboxNodoPatch>(w.toolbox, t => t.path, path, { ...patch, _new: true }, () => ({ path, ...patch, _new: true })) }));
  const revertToolbox = (path: string) =>
    setWorking(w => ({ ...w, toolbox: w.toolbox.filter(t => t.path !== path) }));
  const toolboxHasPatch = (path: string) => working.toolbox.some(t => t.path === path);

  // ── concettuali ──────────────────────────────────────────────────────
  const setDefault = (famId: string, m: LaresMarker | null) =>
    setWorking(w => ({
      ...w,
      concettuali: { ...w.concettuali, defaultPerFamiglia: { ...w.concettuali.defaultPerFamiglia, [famId]: m } },
    }));

  const handleSave = async () => {
    const errs = validateOverlay(working);
    if (errs.length > 0) { setSaveError(errs); return; }
    setSaving(true); setSaveError(null);
    try {
      const toSave: LessicoLaresOverlay = { ...working, version: 1, updatedAt: new Date().toISOString() };
      await salvaVocab(toSave, message.trim() || 'Vocabolario lessico/LARES: aggiornamento redazionale');
      setWorking(toSave);
      setMessage('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setSaveError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleReload = async () => {
    setLoading(true);
    const { overlay } = await caricaVocab();
    setWorking(JSON.parse(JSON.stringify(overlay)));
    setSaveError(null);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Carico il vocabolario…
      </div>
    );
  }

  const lemmiFiltrati = vocab.lemmi.filter(l => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return l.lemma.includes(search.trim()) || l.aliases.some(a => a.includes(search.trim()))
      || l.family.toLowerCase().includes(q) || l.subFunction.toLowerCase().includes(q);
  }).sort((a, b) => a.lemma.localeCompare(b.lemma));

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-5xl mx-auto w-full">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <button onClick={onChiudi} className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted hover:text-accent flex items-center gap-1 mb-1.5">
            <ArrowLeft className="h-3 w-3" /> Lessico cultuale
          </button>
          <div className="text-xs font-sans font-bold uppercase tracking-[0.22em] text-accent/70">
            Vocabolario · Lessico cultuale &amp; LARES
          </div>
          <p className="text-[13px] font-serif italic text-muted/75 mt-1">
            Il seed (cultLexicon.ts / laresToolbox.ts) non si tocca: qui si scrive un overlay.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="messaggio di commit (opzionale)"
              className={cn(INPUT, 'w-56')}
            />
            <button onClick={handleReload} className={BTN_GHOST} title="Ricarica dal server, scartando le modifiche non salvate">
              <RotateCcw className="h-3 w-3" /> Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={saving || errors.length > 0}
              className={cn(BTN_ACCENT, (saving || errors.length > 0) && 'opacity-40 cursor-not-allowed')}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salva
            </button>
          </div>
          {saved && <span className="text-[10px] font-sans text-emerald-600">Salvato.</span>}
        </div>
      </div>

      {(errors.length > 0 || saveError) && (
        <div className="mb-5 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs font-sans text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-[10px] mb-1">
            <AlertTriangle className="h-3 w-3" /> {errors.length > 0 ? `${errors.length} problemi di integrità — il salvataggio è bloccato` : 'Salvataggio fallito'}
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {(Array.isArray(saveError) ? saveError : errors.length > 0 ? errors : [String(saveError)]).map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-border/40">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-2 text-[11px] font-sans font-bold uppercase tracking-widest border-b-2 -mb-px transition-colors',
              tab === t.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'lemmi' && (
        <div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtra lemma, alias, famiglia, sotto-funzione…"
            className={cn(INPUT, 'w-full mb-4 py-1.5')}
          />
          <div className="space-y-1.5">
            {lemmiFiltrati.map(l => {
              const stat = counts.get(l.lemma);
              return (
                <div key={l.lemma} className={cn('rounded-md border border-border/30 px-2.5 py-2', l.deprecated && 'opacity-50')}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-greek text-base w-28 shrink-0 truncate" lang="grc" title={l.lemma}>{l.lemma}</span>
                    {l.aggiunta && <span className="text-[9px] font-sans uppercase tracking-wide px-1 py-px rounded-sm border border-cult/40 text-cult">nuovo</span>}
                    <select value={l.family} onChange={e => updateLemma(l.lemma, { family: e.target.value })} className={cn(INPUT, 'w-36')}>
                      {vocab.families.filter(f => !f.deprecated).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                    <select value={l.subFunction} onChange={e => updateLemma(l.lemma, { subFunction: e.target.value })} className={cn(INPUT, 'w-40')}>
                      <option value="">(sotto-funzione)</option>
                      {vocab.subFunctions.filter(s => !s.deprecated).map(s => <option key={s.id} value={s.id}>{s.label || s.id}</option>)}
                    </select>
                    <PercorsoPicker vocab={vocab} value={l.percorso} onChange={m => updateLemma(l.lemma, { percorso: m })} />
                    {stat && stat.refs[0] && (
                      <button
                        onClick={() => onSelectMonumento?.(byId.get(stat.refs[0].id)!)}
                        disabled={!onSelectMonumento}
                        className="text-[10px] font-sans text-muted/70 hover:text-accent tabular-nums"
                        title="Vai alla prima scheda attestata"
                      >
                        {stat.count} att.
                      </button>
                    )}
                    {hasPatch(l.lemma) && (
                      <button onClick={() => revertLemma(l.lemma)} title="Annulla l'override, torna al seed" className="ml-auto text-muted/50 hover:text-accent">
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <input
                      defaultValue={l.lemmaRef || ''}
                      placeholder="URL Logeion (vuoto = nessuna)"
                      onBlur={e => updateLemma(l.lemma, { lemmaRef: e.target.value.trim() || null })}
                      className={cn(INPUT, 'w-64')}
                    />
                    {l.lemmaRef && <a href={l.lemmaRef} target="_blank" rel="noreferrer" className="text-accent"><ExternalLink className="h-3 w-3" /></a>}
                    <input
                      defaultValue={l.aliases.join(', ')}
                      placeholder="alias / composti, separati da virgola"
                      onBlur={e => updateLemma(l.lemma, { aliases: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      className={cn(INPUT, 'w-64')}
                    />
                    <label className="flex items-center gap-1 text-[10px] font-sans text-muted">
                      <input type="checkbox" checked={!!l.manual} onChange={e => updateLemma(l.lemma, { manual: e.target.checked })} /> manuale
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-sans text-muted">
                      <input type="checkbox" checked={!!l.deprecated} onChange={e => updateLemma(l.lemma, { deprecated: e.target.checked })} /> ritirato
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <InlineAdd
              label="Aggiungi lemma"
              campi={[
                { chiave: 'lemma', placeholder: 'lemma (greco)', className: 'font-greek w-28' },
                { chiave: 'family', placeholder: 'id famiglia', className: 'w-32' },
              ]}
              onAggiungi={v => v.lemma?.trim() && v.family?.trim() && addLemma(v.lemma.trim(), v.family.trim())}
            />
          </div>
        </div>
      )}

      {tab === 'famiglie' && (
        <div className="space-y-1.5">
          {vocab.families.map(f => (
            <div key={f.id} className={cn('flex flex-wrap items-center gap-2 rounded-md border border-border/30 px-2.5 py-2', f.deprecated && 'opacity-50')}>
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
              <span className="font-mono text-[10px] text-muted/60 w-32 shrink-0 truncate">{f.id}</span>
              <input defaultValue={f.label} onBlur={e => updateFamiglia(f.id, { label: e.target.value })} className={cn(INPUT, 'w-64')} />
              <input defaultValue={f.rule} onBlur={e => updateFamiglia(f.id, { rule: e.target.value })} className={cn(INPUT, 'flex-1 min-w-[16rem]')} placeholder="regola operativa" />
              <input type="color" defaultValue={f.color} onBlur={e => updateFamiglia(f.id, { color: e.target.value })} className="h-6 w-8 rounded border border-border/40" />
              <label className="flex items-center gap-1 text-[10px] font-sans text-muted">
                <input type="checkbox" checked={!!f.deprecated} onChange={e => updateFamiglia(f.id, { deprecated: e.target.checked })} /> ritirata
              </label>
              {working.famiglie.some(p => p.id === f.id) && (
                <button onClick={() => revertFamiglia(f.id)} className="text-muted/50 hover:text-accent"><RotateCcw className="h-3 w-3" /></button>
              )}
            </div>
          ))}
          <InlineAdd
            label="Aggiungi famiglia"
            campi={[{ chiave: 'id', placeholder: 'id (kebab-case)' }, { chiave: 'label', placeholder: 'etichetta', className: 'w-48' }]}
            onAggiungi={v => v.id?.trim() && addFamiglia(v.id.trim(), v.label?.trim() || v.id.trim())}
          />
        </div>
      )}

      {tab === 'sottofunzioni' && (
        <div className="space-y-1.5">
          {vocab.subFunctions.map(s => {
            const uso = vocab.lemmi.filter(l => l.subFunction === s.id).length;
            return (
              <div key={s.id} className={cn('flex flex-wrap items-center gap-2 rounded-md border border-border/30 px-2.5 py-2', s.deprecated && 'opacity-50')}>
                <span className="font-mono text-[10px] text-muted/60 w-40 shrink-0 truncate">{s.id}</span>
                <input defaultValue={s.label || s.id} onBlur={e => updateSub(s.id, { label: e.target.value })} className={cn(INPUT, 'w-48')} />
                <input defaultValue={s.note || ''} placeholder="nota" onBlur={e => updateSub(s.id, { note: e.target.value })} className={cn(INPUT, 'flex-1 min-w-[12rem]')} />
                <span className="text-[10px] font-sans text-muted/60 tabular-nums">{uso} {uso === 1 ? 'lemma' : 'lemmi'}</span>
                <label className="flex items-center gap-1 text-[10px] font-sans text-muted">
                  <input type="checkbox" checked={!!s.deprecated} onChange={e => updateSub(s.id, { deprecated: e.target.checked })} /> ritirata
                </label>
                {working.sottofunzioni.some(p => p.id === s.id) && (
                  <button onClick={() => revertSub(s.id)} className="text-muted/50 hover:text-accent"><RotateCcw className="h-3 w-3" /></button>
                )}
              </div>
            );
          })}
          <InlineAdd
            label="Aggiungi sotto-funzione"
            campi={[{ chiave: 'id', placeholder: 'id' }, { chiave: 'label', placeholder: 'etichetta', className: 'w-48' }]}
            onAggiungi={v => v.id?.trim() && addSub(v.id.trim(), v.label?.trim() || v.id.trim())}
          />
        </div>
      )}

      {tab === 'toolbox' && (
        <div className="space-y-5">
          {vocab.toolbox.map(item => (
            <section key={item.id} className={cn(item.deprecated && 'opacity-50')}>
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border/40">
                <span title="item: struttura fissa, non innestabile"><Lock className="h-3 w-3 text-muted/40" /></span>
                <h3 className="text-sm font-sans font-bold uppercase tracking-[0.15em] text-ink/90">{item.label}</h3>
              </div>
              <div className="space-y-1.5 pl-4">
                {item.categorie.map(cat => (
                  <div key={cat.id} className={cn('rounded-md border border-border/20 px-2 py-1.5', cat.deprecated && 'opacity-50')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-muted/50 w-32 shrink-0 truncate">{cat.id}</span>
                      <input defaultValue={cat.label} onBlur={e => updateToolbox(`${item.id}/${cat.id}`, { label: e.target.value })} className={cn(INPUT, 'w-40')} />
                      {cat.aggiunta && <span className="text-[9px] font-sans uppercase px-1 py-px rounded-sm border border-cult/40 text-cult">{cat.fonte}</span>}
                      <label className="flex items-center gap-1 text-[10px] font-sans text-muted">
                        <input type="checkbox" checked={!!cat.deprecated} onChange={e => updateToolbox(`${item.id}/${cat.id}`, { deprecated: e.target.checked })} /> ritirata
                      </label>
                      {toolboxHasPatch(`${item.id}/${cat.id}`) && (
                        <button onClick={() => revertToolbox(`${item.id}/${cat.id}`)} className="text-muted/50 hover:text-accent"><RotateCcw className="h-3 w-3" /></button>
                      )}
                    </div>
                    <div className="pl-6 mt-1.5 space-y-1">
                      {cat.sub.map(sub => (
                        <div key={sub.id} className={cn('flex flex-wrap items-center gap-2', sub.deprecated && 'opacity-50')}>
                          <span className="font-mono text-[10px] text-muted/50 w-32 shrink-0 truncate">{sub.id}</span>
                          <input defaultValue={sub.label} onBlur={e => updateToolbox(`${item.id}/${cat.id}/${sub.id}`, { label: e.target.value })} className={cn(INPUT, 'w-40')} />
                          <input defaultValue={sub.esempi || ''} placeholder="esempi" onBlur={e => updateToolbox(`${item.id}/${cat.id}/${sub.id}`, { esempi: e.target.value })} className={cn(INPUT, 'flex-1 min-w-[10rem]')} />
                          {sub.aggiunta && <span className="text-[9px] font-sans uppercase px-1 py-px rounded-sm border border-cult/40 text-cult">{sub.fonte}</span>}
                          <label className="flex items-center gap-1 text-[10px] font-sans text-muted">
                            <input type="checkbox" checked={!!sub.deprecated} onChange={e => updateToolbox(`${item.id}/${cat.id}/${sub.id}`, { deprecated: e.target.checked })} /> ritirata
                          </label>
                          {toolboxHasPatch(`${item.id}/${cat.id}/${sub.id}`) && (
                            <button onClick={() => revertToolbox(`${item.id}/${cat.id}/${sub.id}`)} className="text-muted/50 hover:text-accent"><RotateCcw className="h-3 w-3" /></button>
                          )}
                        </div>
                      ))}
                      <InlineAdd
                        label="sottocategoria"
                        campi={[{ chiave: 'id', placeholder: 'id' }, { chiave: 'label', placeholder: 'etichetta', className: 'w-40' }]}
                        onAggiungi={v => v.id?.trim() && addToolboxNode(`${item.id}/${cat.id}/${v.id.trim()}`, { label: v.label?.trim() || v.id.trim(), fonte: 'ILA' })}
                      />
                    </div>
                  </div>
                ))}
                <InlineAdd
                  label="categoria"
                  campi={[{ chiave: 'id', placeholder: 'id' }, { chiave: 'label', placeholder: 'etichetta', className: 'w-40' }]}
                  onAggiungi={v => v.id?.trim() && addToolboxNode(`${item.id}/${v.id.trim()}`, { label: v.label?.trim() || v.id.trim(), fonte: 'ILA' })}
                />
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === 'concettuali' && (
        <div>
          <p className="text-[13px] font-serif italic text-muted/70 mb-4">
            I nove marcatori sono lo standard LARES: non si toccano qui. Sotto, il default
            campo/ambito suggerito per ciascuna famiglia — un suggerimento, non un'assegnazione automatica.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {LARES_GRID.map(c => (
              <div key={c.campo} className="rounded-md border border-border/30 px-3 py-2">
                <div className="text-[10px] font-sans font-bold uppercase tracking-wide mb-1" style={{ color: CAMPO_COLOR[c.campo] }}>{c.label}</div>
                {c.ambiti.map(a => <div key={a.id} className="text-[11px] font-serif text-muted/80">{AMBITO_LABELS[a.id]}</div>)}
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {vocab.families.filter(f => !f.deprecated).map(f => {
              const cur = working.concettuali.defaultPerFamiglia[f.id] !== undefined
                ? working.concettuali.defaultPerFamiglia[f.id]
                : vocab.defaultConcettuale[f.id];
              return (
                <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/30 px-2.5 py-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                  <span className="text-xs font-sans w-40 shrink-0 truncate">{f.label}</span>
                  <select
                    value={cur?.campo || ''}
                    onChange={e => {
                      const campo = e.target.value as LaresMarker['campo'];
                      const ambiti = LARES_GRID.find(c => c.campo === campo)?.ambiti || [];
                      setDefault(f.id, campo ? { campo, ambito: ambiti[0]?.id } : null);
                    }}
                    className={cn(INPUT, 'w-36')}
                  >
                    <option value="">— nessuno —</option>
                    {LARES_GRID.map(c => <option key={c.campo} value={c.campo}>{c.label}</option>)}
                  </select>
                  {cur?.campo && (
                    <select
                      value={cur.ambito}
                      onChange={e => setDefault(f.id, { campo: cur.campo, ambito: e.target.value as LaresMarker['ambito'] })}
                      className={cn(INPUT, 'w-36')}
                    >
                      {LARES_GRID.find(c => c.campo === cur.campo)?.ambiti.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
