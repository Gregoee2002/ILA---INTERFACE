import React, { useMemo, useState, useCallback } from 'react';
import { Monumento } from '../types';
import { cn } from '../lib/utils';
import { buildCultIndex, CultLemmaStats, CultFamilyStats } from '../lib/cultIndex';
import { CULT_FAMILIES } from '../lib/cultLexicon';
import { Tags, ExternalLink, ChevronDown, Search, X, List } from 'lucide-react';

interface Props {
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
}

const foldForSearch = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Tinte terrose, una per famiglia — leggibili su pergamena chiara e scura.
const FAMILY_COLOR: Record<string, string> = {
  'agency': '#6E4B6E',            // melanzana — il dio soggetto
  'atto-cultuale': '#B4653E',     // terracotta — l'atto umano
  'colpa': '#8C3B39',             // rosso-mattone cupo — la trasgressione
  'formula-fissa': '#5B7A99',     // blu ardesia — la formula di genere
  'ruolo-istituzione': '#B08A2E', // ocra — ruoli e istituzioni
  '(altro)': '#8A8A80',
};

// Larghezza angolare del braccio, per famiglia. atto-cultuale ha molte più
// attestazioni: il suo braccio è molto più lungo, quindi lo si tiene più sottile.
const BAR_WIDTH_DEG: Record<string, number> = {
  'atto-cultuale': 9,
};
const BAR_WIDTH_DEFAULT = 22;

const familyShort = (label: string) => label.split(/[—–-]/)[0].trim();

const FIELD_BASE =
  'bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-lg font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 transition-all duration-300';
const FIELD_STYLE = { backgroundColor: 'var(--card)', color: 'var(--ink)' } as const;

// ────────────────────────────────────────────────────────────────────
// Geometria polare
// ────────────────────────────────────────────────────────────────────
const CX = 320, CY = 320, R_HOLE = 12, R_MAX = 292;

const polar = (r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};

/** settore anulare tra due raggi e due angoli. */
const sectorPath = (r0: number, r1: number, a0: number, a1: number): string => {
  const [x0o, y0o] = polar(r1, a0);
  const [x1o, y1o] = polar(r1, a1);
  const [x1i, y1i] = polar(r0, a1);
  const [x0i, y0i] = polar(r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${x0o} ${y0o}`,
    `A ${r1} ${r1} 0 ${large} 1 ${x1o} ${y1o}`,
    `L ${x1i} ${y1i}`,
    `A ${r0} ${r0} 0 ${large} 0 ${x0i} ${y0i}`,
    'Z',
  ].join(' ');
};

interface Seg {
  lemma: CultLemmaStats;
  family: CultFamilyStats;
  ref: CultLemmaStats['refs'][number];
  lemmaFirst: boolean;
}

// ────────────────────────────────────────────────────────────────────
// La corona: 5 bracci (uno per famiglia) che si estendono in tanti
// segmenti quante sono le attestazioni. Nessun cerchio concentrico.
// ────────────────────────────────────────────────────────────────────
const Corona: React.FC<{
  families: CultFamilyStats[];
  familyFilter: string;
  searchTokens: string[];
  activeLemma: string | null;
  onPick: (l: CultLemmaStats, f: CultFamilyStats) => void;
  onHover: (s: Seg | null, clientX?: number, clientY?: number) => void;
}> = ({ families, familyFilter, searchTokens, activeLemma, onPick, onHover }) => {
  const maxCount = Math.max(1, ...families.map(f => f.count));
  // Lunghezza del braccio ∝ √(n. attestazioni): comprime lo stacco fra
  // «atto-cultuale» e le famiglie rare senza appiattirle. Il braccio più lungo
  // arriva comunque a R_MAX. Le tacche restano una per attestazione.
  const S = (R_MAX - R_HOLE) / Math.sqrt(maxCount);
  // i 5 bracci, equidistanti sul giro, partendo dall'alto.
  const step = 360 / families.length;

  return (
    <svg
      viewBox="0 0 640 640"
      className="w-full h-auto max-w-[560px] mx-auto select-none overflow-visible"
      role="img"
      aria-label="Corona del lessico cultuale: cinque bracci, un segmento per attestazione"
    >
      {families.map((f, fi) => {
        const center = -90 + fi * step;
        const width = BAR_WIDTH_DEG[f.id] ?? BAR_WIDTH_DEFAULT;
        const a0 = center - width / 2;
        const a1 = center + width / 2;
        const famDim = !!familyFilter && f.id !== familyFilter;

        const lemmata = [...f.lemmata].sort(
          (a, b) => b.count - a.count || a.lemma.localeCompare(b.lemma),
        );
        const segs: Seg[] = [];
        lemmata.forEach(l =>
          l.refs.forEach((ref, ri) =>
            segs.push({ lemma: l, family: f, ref, lemmaFirst: ri === 0 }),
          ),
        );

        // lunghezza del braccio (√) e lunghezza della singola tacca; la tacca
        // non scende sotto ~1.1px perché resti visibile anche nei bracci fitti.
        const armLen = S * Math.sqrt(Math.max(1, segs.length));
        const segLen = Math.max(armLen / Math.max(1, segs.length), 1.1);
        const segGap = Math.min(segLen * 0.3, 1.4);
        const lemmaGap = Math.min(segLen * 0.85, 3);

        // etichetta al vertice del braccio
        const rTip = R_HOLE + segLen * segs.length;
        const [lx, ly] = polar(rTip + 16, center);
        const flip = ((center % 360) + 360) % 360 > 180;

        return (
          <g key={f.id} opacity={famDim ? 0.16 : 1} style={{ transition: 'opacity .25s' }}>
            {segs.map((s, si) => {
              const rIn = R_HOLE + si * segLen;
              const rOut = R_HOLE + (si + 1) * segLen - (s.lemmaFirst && si > 0 ? lemmaGap : segGap);
              const active = activeLemma === s.lemma.lemma;
              const matches =
                searchTokens.length === 0 ||
                searchTokens.some(t =>
                  foldForSearch(
                    [s.lemma.lemma, s.lemma.subFunction, s.lemma.family, ...s.lemma.forms].join(' '),
                  ).includes(t),
                );
              return (
                <path
                  key={si}
                  d={sectorPath(rIn, Math.max(rIn + 0.4, rOut), a0, a1)}
                  style={{
                    fill: FAMILY_COLOR[f.id] || FAMILY_COLOR['(altro)'],
                    fillOpacity: active ? 1 : matches ? 0.9 - 0.42 * (si / Math.max(1, segs.length)) : 0.09,
                    stroke: active ? 'var(--accent)' : 'none',
                    strokeWidth: active ? 1.4 : 0,
                    cursor: 'pointer',
                    transition: 'fill-opacity .2s',
                  }}
                  onClick={() => onPick(s.lemma, s.family)}
                  onMouseEnter={e => onHover(s, e.clientX, e.clientY)}
                  onMouseMove={e => onHover(s, e.clientX, e.clientY)}
                  onMouseLeave={() => onHover(null)}
                />
              );
            })}
            <text
              x={lx} y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--muted)"
              fontSize={11}
              style={{ fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}
              transform={`rotate(${flip ? center + 180 : center} ${lx} ${ly})`}
            >
              {familyShort(f.label)}
              <tspan dx={6} style={{ fontWeight: 700, fill: FAMILY_COLOR[f.id] }}>{f.count}</tspan>
            </text>
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r={R_HOLE - 4} fill="var(--sidebar)" stroke="var(--border)" strokeWidth={1} />
    </svg>
  );
};

// ────────────────────────────────────────────────────────────────────
// Vista
// ────────────────────────────────────────────────────────────────────
export const CultLexiconPanel: React.FC<Props> = ({ monumenti, onSelectMonumento }) => {
  const [search, setSearch] = useState('');
  const [regione, setRegione] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [active, setActive] = useState<{ lemma: CultLemmaStats; family: CultFamilyStats } | null>(null);
  const [showList, setShowList] = useState(false);
  const [hover, setHover] = useState<{ s: Seg; x: number; y: number } | null>(null);

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

  const onHover = useCallback((s: Seg | null, x?: number, y?: number) => {
    setHover(s && x != null && y != null ? { s, x, y } : null);
  }, []);

  const schede = (n: number) => `${n} ${n === 1 ? 'scheda' : 'schede'}`;
  const atts = (n: number) => `${n} ${n === 1 ? 'attestazione' : 'attestazioni'}`;
  const famColor = (id: string) => FAMILY_COLOR[id] || FAMILY_COLOR['(altro)'];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="text-xs font-sans font-bold uppercase tracking-[0.22em] text-accent/70 flex items-center gap-1.5">
            <Tags className="h-3.5 w-3.5" /> Lessico cultuale
          </div>
          <button
            onClick={() => setShowList(s => !s)}
            className={cn(
              'text-[10px] font-sans font-bold uppercase tracking-widest px-3 py-2 rounded-lg border transition-colors inline-flex items-center gap-1.5',
              showList ? 'bg-accent/10 text-accent border-accent/30' : 'text-muted hover:text-ink border-[var(--border)]/50',
            )}
          >
            <List className="h-3.5 w-3.5" /> Elenco completo
          </button>
        </div>

        {/* filtri */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          <div className="relative flex-1 min-w-[14rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Evidenzia lemma, forma, sotto-funzione…"
              className={cn(FIELD_BASE, 'w-full pl-9 pr-3 py-2')}
              style={FIELD_STYLE}
            />
          </div>
          <div className="relative">
            <select
              value={regione}
              onChange={e => setRegione(e.target.value)}
              className={cn(FIELD_BASE, 'pl-3 pr-8 py-2 cursor-pointer appearance-none')}
              style={{ ...FIELD_STYLE, WebkitAppearance: 'none', appearance: 'none' }}
            >
              <option value="">Tutte le regioni</option>
              {index.regioni.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={familyFilter}
              onChange={e => setFamilyFilter(e.target.value)}
              className={cn(FIELD_BASE, 'pl-3 pr-8 py-2 cursor-pointer appearance-none')}
              style={{ ...FIELD_STYLE, WebkitAppearance: 'none', appearance: 'none' }}
            >
              <option value="">Tutte le famiglie</option>
              {CULT_FAMILIES.map(f => <option key={f.id} value={f.id}>{familyShort(f.label)}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
          </div>
        </div>

        {index.lemmata.length === 0 ? (
          <div className="text-sm italic text-muted/60 py-12 text-center">Nessuna attestazione per questi filtri.</div>
        ) : (
          <>
            <div className="relative">
              <Corona
                families={index.families}
                familyFilter={familyFilter}
                searchTokens={tokens}
                activeLemma={active?.lemma.lemma ?? null}
                onPick={(lemma, family) => setActive({ lemma, family })}
                onHover={onHover}
              />
              {hover && (
                <div
                  className="fixed z-50 pointer-events-none rounded-md border border-[var(--border)] bg-[var(--card)] shadow-lg px-3 py-2 text-xs"
                  style={{ left: hover.x + 14, top: hover.y + 14, maxWidth: 260 }}
                >
                  <div className="font-greek text-sm" lang="grc" style={{ color: famColor(hover.s.family.id) }}>
                    {hover.s.lemma.lemma}
                    {hover.s.ref.form && (
                      <span className="ml-2 font-greek text-muted/70" lang="grc">{hover.s.ref.form}</span>
                    )}
                  </div>
                  <div className="text-muted/70 mt-0.5">
                    {familyShort(hover.s.family.label)}
                    {hover.s.lemma.subFunction && ` · ${hover.s.lemma.subFunction}`}
                  </div>
                  <div className="text-muted/60 mt-0.5 font-sans">
                    {hover.s.ref.scheda}{hover.s.ref.regione ? ` · ${hover.s.ref.regione}` : ''}
                    {hover.s.ref.line ? ` · r.${hover.s.ref.line}` : ''}
                  </div>
                </div>
              )}
            </div>

            {/* legenda */}
            <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2">
              {index.families.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFamilyFilter(v => (v === f.id ? '' : f.id))}
                  className={cn(
                    'inline-flex items-center gap-2 text-xs font-sans transition-opacity',
                    familyFilter && familyFilter !== f.id ? 'opacity-35' : 'opacity-100',
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: famColor(f.id) }} />
                  <span className="text-ink/80">{familyShort(f.label)}</span>
                  <span className="text-muted/60 tabular-nums">{atts(f.count)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* elenco completo a scomparsa */}
        {showList && index.lemmata.length > 0 && (
          <div className="mt-10 space-y-4 border-t border-border/40 pt-8">
            {index.families.map(f => (
              <section key={f.id}>
                <h3 className="text-xs font-sans font-bold uppercase tracking-[0.15em] mb-2 flex items-center gap-2"
                  style={{ color: famColor(f.id) }}>
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: famColor(f.id) }} />
                  {familyShort(f.label)}
                  <span className="text-muted/60 font-normal">{schede(f.schedeCount)} · {atts(f.count)}</span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {[...f.lemmata]
                    .sort((a, b) => b.count - a.count || a.lemma.localeCompare(b.lemma))
                    .map(l => (
                      <button
                        key={l.lemma}
                        onClick={() => setActive({ lemma: l, family: f })}
                        className="font-greek text-sm border border-border/50 rounded-sm px-2 py-1 hover:border-accent hover:text-accent transition-colors"
                        lang="grc"
                      >
                        {l.lemma}
                        <span className="ml-1.5 font-sans text-[10px] text-muted/60 tabular-nums">{l.count}</span>
                      </button>
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* drawer attestazioni */}
      {active && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setActive(null)} />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-[var(--card)] border-l border-[var(--border)] shadow-2xl flex flex-col">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/40">
              <div className="min-w-0">
                <div className="font-greek text-2xl" lang="grc" style={{ color: famColor(active.family.id) }}>
                  {active.lemma.lemma}
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1.5 font-sans text-muted/80">
                    <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: famColor(active.family.id) }} />
                    {familyShort(active.family.label)}
                  </span>
                  {active.lemma.subFunction && (
                    <span className="font-serif italic text-muted/70">· {active.lemma.subFunction}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setActive(null)} className="shrink-0 text-muted hover:text-ink transition-colors" aria-label="Chiudi">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-border/40 flex items-center gap-4 text-xs font-sans text-muted/80">
              <span>{schede(active.lemma.schedeCount)}</span>
              <span>{atts(active.lemma.count)}</span>
              {active.lemma.lemmaRef && (
                <a href={active.lemma.lemmaRef} target="_blank" rel="noreferrer"
                  className="ml-auto text-[10px] uppercase tracking-wide text-accent hover:opacity-70 inline-flex items-center gap-0.5">
                  Logeion <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {active.lemma.forms.length > 0 && (
              <div className="px-5 py-3 border-b border-border/40 font-greek text-sm text-muted/80 leading-relaxed" lang="grc">
                {active.lemma.forms.join('  ·  ')}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted/50 mb-2">
                Attestazioni
              </div>
              <div className="space-y-1">
                {active.lemma.refs.map((r, i) => {
                  const m = byId.get(r.id);
                  return (
                    <button
                      key={`${r.scheda}-${i}`}
                      disabled={!m}
                      onClick={() => { if (m) { onSelectMonumento(m); setActive(null); } }}
                      className={cn(
                        'w-full text-left flex items-baseline gap-2 px-2 py-1.5 rounded-sm transition-colors',
                        m ? 'hover:bg-sidebar text-ink/85' : 'text-muted/40',
                      )}
                    >
                      <span className="font-sans text-xs uppercase tracking-wide shrink-0">{r.scheda}</span>
                      {r.form && <span className="font-greek text-sm text-muted/70" lang="grc">{r.form}</span>}
                      {r.regione && <span className="font-sans text-[10px] text-muted/45 ml-auto shrink-0">{r.regione}</span>}
                      {r.line && <span className="font-sans text-[10px] text-muted/40">r.{r.line}</span>}
                      {r.cert === 'low' && <span className="text-amber-500" title="forma integrata">[ ]</span>}
                      {r.formula && <span className="text-cult" title="#formula">✦</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};
