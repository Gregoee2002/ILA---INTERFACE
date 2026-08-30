import React, { useMemo, useState } from 'react';
import { Monumento } from '../types';
import { cn } from '../lib/utils';
import { buildCultIndex, CultLemmaStats } from '../lib/cultIndex';
import { CULT_FAMILIES } from '../lib/cultLexicon';
import { Tags, ExternalLink, ChevronRight, Search, X } from 'lucide-react';

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

  const renderLemmaCard = (l: CultLemmaStats) => {
    const key = `${l.family}::${l.lemma}`;
    const open = expanded.has(key);
    return (
      <div key={key} className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <span className="font-greek text-cult text-lg font-semibold" lang="grc">{l.lemma}</span>
            {l.subFunction && (
              <span className="text-[11px] text-muted font-sans italic">{l.subFunction}</span>
            )}
            {l.lemmaRef && (
              <a href={l.lemmaRef} target="_blank" rel="noreferrer"
                className="text-[10px] text-accent hover:underline inline-flex items-center gap-0.5 shrink-0">
                Logeion <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 text-[10px] font-sans uppercase tracking-wider text-muted">
            <span className="border border-border/60 rounded-full px-2 py-0.5">{l.family}</span>
            <span className="text-accent font-bold">{l.count}×</span>
            <span>· {l.schedeCount} {l.schedeCount === 1 ? 'scheda' : 'schede'}</span>
          </div>
        </div>

        {l.forms.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {l.forms.map(f => (
              <span key={f} className="font-greek text-xs bg-sidebar/60 border border-border/50 text-ink/80 rounded-full px-2 py-0.5" lang="grc">
                {f}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={() => toggle(key)}
          className="mt-3 text-[10px] font-sans font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors inline-flex items-center gap-1"
        >
          <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
          {open ? 'Nascondi' : 'Mostra'} le {l.refs.length} attestazioni
        </button>

        {open && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {l.refs.map((r, i) => {
              const m = byId.get(r.id);
              return (
                <button
                  key={`${r.scheda}-${i}`}
                  disabled={!m}
                  onClick={() => m && onSelectMonumento(m)}
                  title={[r.scheda, r.regione, r.line ? `r. ${r.line}` : '', r.form].filter(Boolean).join(' · ')}
                  className={cn(
                    'text-[11px] font-sans border rounded-lg px-2 py-1 transition-colors',
                    m ? 'border-border/60 hover:border-accent hover:text-accent' : 'border-border/30 opacity-50',
                  )}
                >
                  <span className="font-bold">{r.scheda}</span>
                  {r.form && <span className="font-greek ml-1.5 text-muted" lang="grc">{r.form}</span>}
                  {r.line && <span className="text-muted/60 ml-1">r.{r.line}</span>}
                  {r.cert === 'low' && <span className="text-amber-500 ml-1" title="forma integrata">[ ]</span>}
                  {r.formula && <span className="text-cult ml-1" title="#formula">✦</span>}
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

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-[11px] font-sans font-bold uppercase tracking-[0.2em] text-muted mb-1 flex items-center gap-2">
          <Tags className="w-4 h-4" /> Lessico cultuale
        </h2>
        <p className="text-sm font-serif text-muted mb-5">
          Il vocabolario delle funzioni cultuali marcato nelle edizioni (<span className="font-mono text-xs">&lt;w&gt;</span> /{' '}
          <span className="font-mono text-xs">&lt;rs type="cultTerm"&gt;</span>), reso in{' '}
          <span className="text-cult font-semibold">viola</span> nel testo. La sotto-funzione fine deriva dal lemma
          (<span className="font-mono text-xs">docs/tassonomia-funzioni-cultuali.md</span> §5).
        </p>

        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca lemma, forma, sotto-funzione…"
              className="bg-card border border-border/60 rounded-lg pl-8 pr-7 py-1.5 font-sans text-xs outline-none focus:border-accent/50 w-72"
              style={{ backgroundColor: 'var(--card)', color: 'var(--ink)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted/50 hover:text-accent">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={regione}
            onChange={e => setRegione(e.target.value)}
            className="bg-card border border-border/60 rounded-lg px-2.5 py-1.5 font-sans text-xs outline-none focus:border-accent/50"
            style={{ backgroundColor: 'var(--card)', color: 'var(--ink)' }}
          >
            <option value="">Tutte le regioni</option>
            {index.regioni.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select
            value={familyFilter}
            onChange={e => setFamilyFilter(e.target.value)}
            className="bg-card border border-border/60 rounded-lg px-2.5 py-1.5 font-sans text-xs outline-none focus:border-accent/50"
            style={{ backgroundColor: 'var(--card)', color: 'var(--ink)' }}
          >
            <option value="">Tutte le famiglie</option>
            {CULT_FAMILIES.map(f => <option key={f.id} value={f.id}>{f.id}</option>)}
          </select>

          <div className="inline-flex rounded-lg border border-border/60 overflow-hidden text-[10px] font-sans font-bold uppercase tracking-wider">
            {(['family', 'lemma'] as GroupBy[]).map(g => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={cn('px-3 py-1.5 transition-colors', groupBy === g ? 'bg-accent text-white' : 'text-muted hover:text-ink')}
              >
                {g === 'family' ? 'per famiglia' : 'per lemma'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          <span className="text-[10px] font-sans uppercase tracking-widest text-muted/60 self-center mr-1">Query pronte:</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex.label}
              onClick={() => runExample(ex.opts)}
              className="font-greek text-xs border border-border/60 rounded-full px-2.5 py-1 hover:border-accent hover:text-accent transition-colors"
              lang="grc"
            >
              {ex.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-sans text-muted mb-4">
          {shownAtt} attestazioni · {filteredLemmata.length} lemmi · {shownSchede.size} schede
          {regione && <> · regione <span className="text-ink">{regione}</span></>}
          <span className="text-muted/50"> — corpus: {index.totalAttestations} attestazioni in {index.totalSchede} schede</span>
        </div>

        {filteredLemmata.length === 0 ? (
          <p className="text-sm font-serif text-muted italic py-12 text-center">
            Nessuna attestazione per questi filtri.
          </p>
        ) : groupBy === 'lemma' ? (
          <div className="space-y-2.5">
            {filteredLemmata.map(renderLemmaCard)}
          </div>
        ) : (
          <div className="space-y-8">
            {familiesToRender.map(f => (
              <section key={f.id}>
                <div className="mb-3 border-b border-border/50 pb-2">
                  <h3 className="font-serif text-base text-ink flex items-baseline gap-2 flex-wrap">
                    <span className="text-cult font-semibold">{f.id}</span>
                    <span className="text-[11px] font-sans uppercase tracking-wider text-muted">
                      {f.lemmata.reduce((s, l) => s + l.count, 0)}× · {f.schedeCount} schede
                    </span>
                  </h3>
                  <p className="text-xs font-serif text-muted mt-1">{f.rule}</p>
                </div>
                <div className="space-y-2.5">
                  {f.lemmata.map(renderLemmaCard)}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
