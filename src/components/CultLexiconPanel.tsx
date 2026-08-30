import React, { useMemo, useState } from 'react';
import { Monumento } from '../types';
import { cn } from '../lib/utils';
import { buildCultIndex, CultLemmaStats } from '../lib/cultIndex';
import { CULT_FAMILIES } from '../lib/cultLexicon';
import { Tags, ExternalLink, ChevronRight, Search } from 'lucide-react';

interface Props {
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
}

type GroupBy = 'family' | 'lemma';

const foldForSearch = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const CultLexiconPanel: React.FC<Props> = ({ monumenti, onSelectMonumento }) => {
  const [search, setSearch] = useState('');
  const [regione, setRegione] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('family');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openFamilies, setOpenFamilies] = useState<Set<string>>(new Set());

  const index = useMemo(
    () => buildCultIndex(monumenti, { regione: regione || undefined }),
    [monumenti, regione],
  );
  const byId = useMemo(() => {
    const m = new Map<number, Monumento>();
    monumenti.forEach(x => m.set(x.id, x));
    return m;
  }, [monumenti]);

  const tokens = foldForSearch(search).split(/\s+/).filter(Boolean);
  const filterActive = tokens.length > 0 || !!familyFilter || !!regione;

  const matchLemma = (l: CultLemmaStats): boolean => {
    if (familyFilter && l.family !== familyFilter) return false;
    if (tokens.length === 0) return true;
    const hay = foldForSearch([l.lemma, l.subFunction, l.family, ...l.forms].join(' '));
    return tokens.some(t => hay.includes(t));
  };

  const filteredLemmata = index.lemmata.filter(matchLemma);
  const shownAtt = filteredLemmata.reduce((s, l) => s + l.count, 0);
  const shownSchede = new Set<string>();
  filteredLemmata.forEach(l => l.refs.forEach(r => shownSchede.add(r.scheda)));

  const toggle = (key: string) =>
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const toggleFamily = (id: string) =>
    setOpenFamilies(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const runExample = (opts: { search?: string; family?: string; group?: GroupBy }) => {
    setSearch(opts.search ?? '');
    setFamilyFilter(opts.family ?? '');
    setGroupBy(opts.group ?? 'lemma');
    setExpanded(new Set());
  };

  const EXAMPLES: { label: string; opts: Parameters<typeof runExample>[0] }[] = [
    { label: 'θρεπτός per regione', opts: { search: 'θρεπτός', group: 'lemma' } },
    { label: 'forme in #colpa', opts: { family: 'colpa', group: 'lemma' } },
    { label: 'εὐλογέω vs ὁμολογέω', opts: { search: 'εὐλογέω ὁμολογέω', group: 'lemma' } },
    { label: 'atti #agency di castigo', opts: { search: 'castigo', family: 'agency', group: 'lemma' } },
  ];

  const renderLemmaRow = (l: CultLemmaStats) => {
    const key = `${l.family}::${l.lemma}`;
    const open = expanded.has(key);
    return (
      <div key={key} className="rounded-sm border border-border/40 hover:border-border transition-colors">
        <div className="flex items-start gap-3 px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2.5 flex-wrap leading-snug">
              <span className="font-greek text-cult text-base" lang="grc">{l.lemma}</span>
              {l.subFunction && (
                <span className="text-xs font-serif italic text-muted/80">{l.subFunction}</span>
              )}
              {l.lemmaRef && (
                <a
                  href={l.lemmaRef}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-sans uppercase tracking-wide text-accent hover:opacity-70 inline-flex items-center gap-0.5"
                >
                  Logeion <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {l.forms.length > 0 && (
              <div className="mt-1 font-greek text-sm text-muted/80 leading-snug" lang="grc">
                {l.forms.join('  ·  ')}
              </div>
            )}
          </div>

          <div className="shrink-0 pt-0.5 text-xs font-sans text-muted tabular-nums text-right leading-tight">
            <span className="uppercase tracking-wide text-muted/60">{l.family}</span>
            <br />
            {l.count}× · {l.schedeCount} {l.schedeCount === 1 ? 'scheda' : 'schede'}
          </div>

          <button
            onClick={() => toggle(key)}
            className="shrink-0 pt-0.5 text-xs font-sans font-bold uppercase tracking-wide text-accent hover:opacity-70 transition-opacity inline-flex items-center gap-1"
          >
            {l.refs.length}
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')} />
          </button>
        </div>

        {open && (
          <div className="border-t border-border/40 px-3 py-2.5 bg-sidebar/40 flex flex-wrap gap-x-4 gap-y-1.5">
            {l.refs.map((r, i) => {
              const m = byId.get(r.id);
              return (
                <button
                  key={`${r.scheda}-${i}`}
                  disabled={!m}
                  onClick={() => m && onSelectMonumento(m)}
                  title={[r.scheda, r.regione, r.line ? `r. ${r.line}` : '', r.form].filter(Boolean).join(' · ')}
                  className={cn(
                    'text-xs font-sans inline-flex items-baseline gap-1 transition-colors',
                    m ? 'text-muted/80 hover:text-accent' : 'text-muted/40',
                  )}
                >
                  <span className="uppercase tracking-wide">{r.scheda}</span>
                  {r.form && <span className="font-greek text-muted/60" lang="grc">{r.form}</span>}
                  {r.line && <span className="text-muted/40">r.{r.line}</span>}
                  {r.cert === 'low' && <span className="text-amber-500" title="forma integrata">[ ]</span>}
                  {r.formula && <span className="text-cult" title="#formula">✦</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const familiesToRender = index.families
    .map(f => ({ ...f, lemmata: f.lemmata.filter(matchLemma) }))
    .filter(f => f.lemmata.length > 0);

  const inputCls =
    'text-sm font-sans rounded-sm border border-border bg-sidebar px-3 py-2 outline-none focus:border-accent transition-colors';

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
      <div className="mb-5">
        <div className="text-xs font-sans font-bold uppercase tracking-[0.22em] text-accent/70 flex items-center gap-1.5">
          <Tags className="h-3.5 w-3.5" /> Lessico cultuale
        </div>
      </div>

      {/* Ricerca / filtri */}
      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted/50" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtra lemma, forma, sotto-funzione…"
            className={cn(inputCls, 'w-full pl-9')}
          />
        </div>

        <select value={regione} onChange={e => setRegione(e.target.value)} className={inputCls}>
          <option value="">Tutte le regioni</option>
          {index.regioni.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} className={inputCls}>
          <option value="">Tutte le famiglie</option>
          {CULT_FAMILIES.map(f => <option key={f.id} value={f.id}>{f.id}</option>)}
        </select>

        <div className="inline-flex rounded-sm border border-border overflow-hidden text-[11px] font-sans font-bold uppercase tracking-widest">
          {(['family', 'lemma'] as GroupBy[]).map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={cn(
                'px-3 py-2 transition-colors',
                groupBy === g ? 'bg-accent/10 text-accent' : 'text-muted hover:text-ink',
              )}
            >
              {g === 'family' ? 'per famiglia' : 'per lemma'}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs font-sans text-muted/70 mb-4 flex flex-wrap gap-x-1.5">
        <span>Query pronte:</span>
        {EXAMPLES.map((ex, i) => (
          <React.Fragment key={ex.label}>
            {i > 0 && <span className="text-muted/30">·</span>}
            <button
              onClick={() => runExample(ex.opts)}
              className="font-greek hover:text-accent transition-colors"
              lang="grc"
            >
              {ex.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="text-xs font-sans text-muted/70 mb-3">
        {shownAtt} attestazioni · {filteredLemmata.length} lemmi · {shownSchede.size} schede
        {regione && <> · regione <span className="text-ink">{regione}</span></>}
        <span className="text-muted/40"> — corpus: {index.totalAttestations} attestazioni in {index.totalSchede} schede</span>
      </div>

      {filteredLemmata.length === 0 ? (
        <div className="text-sm italic text-muted/60 py-12 text-center">Nessuna attestazione per questi filtri.</div>
      ) : groupBy === 'lemma' ? (
        <div className="space-y-1.5">{filteredLemmata.map(renderLemmaRow)}</div>
      ) : (
        <div className="space-y-1.5">
          {familiesToRender.map(f => {
            const fOpen = filterActive || openFamilies.has(f.id);
            return (
              <section key={f.id} className="rounded-sm border border-border/40">
                <button
                  onClick={() => toggleFamily(f.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-3 text-left hover:bg-sidebar/40 transition-colors"
                >
                  <ChevronRight className={cn('h-4 w-4 text-muted shrink-0 transition-transform', fOpen && 'rotate-90')} />
                  <span className="text-sm font-sans font-bold uppercase tracking-[0.15em] text-cult">{f.id}</span>
                  <span className="text-xs font-sans text-muted/70">
                    {f.lemmata.length} lemmi · {f.lemmata.reduce((s, l) => s + l.count, 0)}× · {f.schedeCount} schede
                  </span>
                </button>
                {fOpen && (
                  <div className="border-t border-border/40 p-2 space-y-1.5">
                    {f.lemmata.map(renderLemmaRow)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
