import React, { useMemo, useState } from 'react';
import {
  ScrollText, Search, ChevronDown, ChevronRight, ExternalLink, FileCode2,
  BookOpen, Library, AlertTriangle, Quote, ArrowRight, Sparkles, X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  Voce, Testimonium, LaresCampo, Genere,
  GENERE_LABELS, TIPO_LABELS, AMBITO_LABELS, AMBITO_CAMPO, CAMPO_COLOR, LARES_GRID,
  buildIndici, citaBreve, foldForSearch, searchableOf, voceToTei, IndexEntry,
} from '../lib/litSources';
import { VOCI } from '../data/fontiLetterarie';

/**
 * LiterarySourcesPanel — la sezione «Fonti letterarie».
 *
 * Non è un secondo catalogo: è la raccolta ragionata delle testimonianze
 * letterarie sulla divinità lunare, organizzata per voce e per nuclei
 * tematici, con gli indici trasversali del lessico LARES (fonti, ambiti,
 * termini, personaggi, figure, luoghi) e un ponte esplicito verso le schede
 * epigrafiche del catalogo.
 *
 * Modello dati e mappatura LARES: src/lib/litSources.ts.
 * Contenuto redazionale: src/data/fontiLetterarie.ts.
 *
 * Tutto il contenuto è compilato nel bundle: la sezione funziona identica
 * sulla build statica GitHub Pages, senza passare da apiShim.
 */

interface Props {
  /** ricerca sul catalogo epigrafico: porta alla vista Catalogo con il filtro impostato */
  onCorpusSearch: (q: string) => void;
}

// Stessi stili dei campi di ricerca/tendina usati altrove (indice epiteti, lessico cultuale).
const FIELD_BASE =
  'bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-lg font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 transition-all duration-300';
const FIELD_STYLE = { backgroundColor: 'var(--card)', color: 'var(--ink)' } as const;

const EYEBROW = 'text-[10px] font-sans font-bold uppercase tracking-[0.22em]';

type IndiceKey = 'fonti' | 'termini' | 'divinita' | 'personaggi' | 'figure' | 'luoghi' | 'ambiti';

const INDICE_LABELS: Record<IndiceKey, string> = {
  fonti: 'Fonti',
  ambiti: 'Ambiti',
  termini: 'Termini',
  divinita: 'Divinità',
  personaggi: 'Personaggi',
  figure: 'Figure storiche',
  luoghi: 'Luoghi',
};

const LINGUA_LABEL: Record<'grc' | 'lat', string> = { grc: 'greco', lat: 'latino' };

// ─────────────────────────────────────────────────────────────── chip ──────

const Chip: React.FC<{
  children: React.ReactNode;
  color?: string;
  title?: string;
  onClick?: () => void;
  active?: boolean;
}> = ({ children, color, title, onClick, active }) => (
  <span
    title={title}
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-sans uppercase tracking-wide whitespace-nowrap',
      onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
      active && 'ring-1 ring-accent/50',
    )}
    style={{
      color: color || 'var(--muted)',
      backgroundColor: color ? `color-mix(in srgb, ${color} 14%, transparent)` : 'color-mix(in srgb, var(--muted) 12%, transparent)',
    }}
  >
    {children}
  </span>
);

// ──────────────────────────────────────────────────────── testimonium ──────

const TestimoniumCard: React.FC<{
  t: Testimonium;
  onCorpusSearch: (q: string) => void;
  onTerm: (lemma: string) => void;
  flash?: boolean;
}> = ({ t, onCorpusSearch, onTerm, flash }) => {
  const [openDetail, setOpenDetail] = useState(false);

  return (
    <article
      id={t.id}
      className={cn(
        'rounded-xl border bg-[var(--card)]/55 dark:bg-black/15 overflow-hidden scroll-mt-6 transition-[border-color,box-shadow] duration-500',
        flash ? 'border-accent/70 shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]' : 'border-border/40',
      )}
    >
      {/* Testata: sigla, citazione, datazione */}
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 border-b border-border/30 bg-sidebar/40">
        <span
          className="shrink-0 text-[10px] font-sans font-bold tracking-widest px-1.5 py-0.5 rounded-sm"
          style={{ color: 'var(--lit)', backgroundColor: 'color-mix(in srgb, var(--lit) 14%, transparent)' }}
        >
          {t.sigla}
        </span>
        <h4 className="font-serif font-bold text-ink text-[15px] leading-tight">
          {t.autore}, <span className="italic">{t.opera}</span> {t.locus}
        </h4>
        <span className="text-[11px] font-sans text-muted/70">{t.datazione}</span>
        <span className="flex-1" />
        <span className="text-[10px] font-sans uppercase tracking-wide text-muted/50">{citaBreve(t)}</span>
      </header>

      <div className="px-4 py-3.5 space-y-3">
        {/* Testo antico */}
        <blockquote
          className={cn(
            'whitespace-pre-wrap leading-[1.75] pl-3 border-l-2',
            t.lingua === 'grc' ? 'font-greek text-[15px]' : 'font-serif text-[15px]',
          )}
          lang={t.lingua}
          style={{ borderColor: 'color-mix(in srgb, var(--lit) 45%, transparent)' }}
        >
          {t.testo}
        </blockquote>

        {/* Traduzione */}
        <div className="whitespace-pre-wrap font-serif italic text-[14px] leading-relaxed text-ink/75 pl-3">
          {t.traduzione}
        </div>

        {/* Commento ragionato — il cuore della scheda */}
        <div className="pt-1">
          <div className={cn(EYEBROW, 'text-accent/70 mb-1.5 flex items-center gap-1.5')}>
            <Quote className="h-3 w-3" /> Commento
          </div>
          <p className="font-serif text-[14px] leading-relaxed text-ink/90 text-justify hyphens-auto">
            {t.commento}
          </p>
        </div>

        {/* Ponti al catalogo epigrafico */}
        {t.corpus && t.corpus.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {t.corpus.map(c => (
              <button
                key={c.q}
                onClick={() => onCorpusSearch(c.q)}
                title={`Cerca «${c.q}» nel catalogo`}
                className="inline-flex items-center gap-1.5 text-[11px] font-sans px-2 py-1 rounded-md border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
              >
                <ArrowRight className="h-3 w-3" /> {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Riga di classificazione + apri dettaglio */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Chip color="var(--lit)" title="genere letterario">{GENERE_LABELS[t.genere]}</Chip>
          <Chip title="lingua">{LINGUA_LABEL[t.lingua]}</Chip>
          {t.tipo.map(x => <Chip key={x} title="tipo di testimonianza">{TIPO_LABELS[x]}</Chip>)}
          {/* I marcatori concettuali LARES sono un gruppo a sé: l'etichetta li
              stacca dai chip di genere e tipologia, che seguono la tassonomia
              interna di ILA. */}
          <span className="text-[9px] font-sans font-bold uppercase tracking-[0.18em] text-muted/40 pl-1">LARES</span>
          {t.lares.map((m, i) => (
            <Chip key={`${m.ambito}-${i}`} color={CAMPO_COLOR[m.campo]} title={`LARES · ${m.campo} → ${AMBITO_LABELS[m.ambito]}`}>
              {AMBITO_LABELS[m.ambito]}
            </Chip>
          ))}
          <span className="flex-1" />
          <button
            onClick={() => setOpenDetail(o => !o)}
            className="inline-flex items-center gap-1 text-[10px] font-sans uppercase tracking-widest text-muted/60 hover:text-accent transition-colors"
          >
            Scheda <ChevronRight className={cn('h-3 w-3 transition-transform', openDetail && 'rotate-90')} />
          </button>
        </div>

        {/* Dettaglio: termini, entità, edizione, link */}
        {openDetail && (
          <div className="mt-1 rounded-lg bg-sidebar/50 border border-border/30 px-3.5 py-3 space-y-2.5 text-[12px] font-sans">
            {t.termini.length > 0 && (
              <div>
                <div className={cn(EYEBROW, 'text-muted/50 mb-1')}>Termini notevoli</div>
                <ul className="space-y-1">
                  {t.termini.map(w => (
                    <li key={w.forma} className="flex flex-wrap items-baseline gap-x-2">
                      <button
                        onClick={() => onTerm(w.lemma)}
                        className={cn(t.lingua === 'grc' ? 'font-greek' : 'font-serif', 'text-[14px] text-cult hover:underline')}
                        lang={t.lingua}
                        title={`Filtra per ${w.lemma}`}
                      >
                        {w.forma}
                      </button>
                      {w.lemma !== w.forma && (
                        <span className={cn(t.lingua === 'grc' ? 'font-greek' : 'font-serif', 'text-muted/60')} lang={t.lingua}>
                          ({w.lemma})
                        </span>
                      )}
                      {w.nota && <span className="text-muted/70 italic font-serif text-[12.5px]">— {w.nota}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(['divinita', 'personaggi', 'figure', 'luoghi'] as const).some(k => (t[k] || []).length > 0) && (
              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                {([
                  ['divinita', 'Divinità'],
                  ['personaggi', 'Personaggi'],
                  ['figure', 'Figure storiche'],
                  ['luoghi', 'Luoghi'],
                ] as const).map(([k, label]) =>
                  (t[k] || []).length > 0 ? (
                    <div key={k}>
                      <span className={cn(EYEBROW, 'text-muted/50 mr-1.5')}>{label}</span>
                      <span className="text-muted/85">{(t[k] || []).join(' · ')}</span>
                    </div>
                  ) : null,
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 border-t border-border/30 text-[11px] text-muted/70">
              <span><span className={cn(EYEBROW, 'text-muted/50 mr-1.5')}>Edizione</span>{t.edizione}</span>
              <span><span className={cn(EYEBROW, 'text-muted/50 mr-1.5')}>Traduzione</span>{t.traduttore}</span>
              <span><span className={cn(EYEBROW, 'text-muted/50 mr-1.5')}>ID</span><code className="font-mono">{t.id}</code></span>
              {t.collazione === 'da-collazionare' && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400" title="Il testo va riscontrato sull'edizione indicata">
                  <AlertTriangle className="h-3 w-3" /> da collazionare
                </span>
              )}
            </div>

            {/* Il test dev'essere booleano: con entrambi gli array presenti ma
                vuoti, `[].length || [].length` vale 0 e React stamperebbe uno
                «0» in fondo alla scheda. */}
            {((t.links?.length ?? 0) > 0 || (t.bibliografia?.length ?? 0) > 0) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                {t.links?.map(l => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:opacity-70"
                  >
                    <ExternalLink className="h-3 w-3" /> {l.label}
                  </a>
                ))}
                {t.bibliografia?.map(b => (
                  <span key={b} className="font-serif italic text-muted/70">{b}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

// ──────────────────────────────────────────────────────────── indici ───────

const IndiceList: React.FC<{
  entries: IndexEntry[];
  onGo: (id: string) => void;
  /** l'indice contiene parole di lingua antica: la resa segue `entry.lingua` */
  lexical?: boolean;
}> = ({ entries, onGo, lexical }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
    {entries.map(e => {
      // L'indice dei termini mescola lemmi greci e latini: il font greco e
      // `lang="grc"` valgono solo per i primi, o «luna» e «Noctiluca»
      // finirebbero marcati come greco per i lettori di schermo.
      const grc = lexical && e.lingua === 'grc';
      return (
      <div key={e.key} className="flex items-baseline gap-2 py-0.5 border-b border-border/20">
        <span
          className={cn(
            'flex-1 min-w-0 truncate',
            grc ? 'font-greek text-[14px] text-cult'
              : lexical ? 'font-serif italic text-[13.5px] text-cult'
              : 'font-serif text-[13.5px] text-ink/85',
          )}
          lang={lexical ? e.lingua : undefined}
        >
          {e.label}
        </span>
        {e.detail && (
          <span
            className={cn('hidden md:block shrink-0 max-w-[10rem] truncate text-[11px] italic text-muted/50', grc ? 'font-greek' : 'font-sans')}
            lang={lexical ? e.lingua : undefined}
            title={e.detail}
          >
            {e.detail}
          </span>
        )}
        <span className="shrink-0 flex gap-1">
          {e.refs.map(r => (
            <button
              key={r.sigla}
              onClick={() => onGo(r.id)}
              className="text-[10px] font-sans font-bold tracking-wide text-accent/80 hover:text-accent hover:underline"
            >
              {r.sigla}
            </button>
          ))}
        </span>
      </div>
      );
    })}
  </div>
);

// ──────────────────────────────────────────────────────────── pannello ─────

export const LiterarySourcesPanel: React.FC<Props> = ({ onCorpusSearch }) => {
  const [voceId, setVoceId] = useState(VOCI[0].id);
  const [search, setSearch] = useState('');
  const [nucleoFilter, setNucleoFilter] = useState('');
  const [genereFilter, setGenereFilter] = useState<'' | Genere>('');
  const [campoFilter, setCampoFilter] = useState<'' | LaresCampo>('');
  const [showIndici, setShowIndici] = useState(false);
  const [indiceTab, setIndiceTab] = useState<IndiceKey>('fonti');

  const voce: Voce = useMemo(() => VOCI.find(v => v.id === voceId) || VOCI[0], [voceId]);
  const indici = useMemo(() => buildIndici(voce.testimonia), [voce]);
  const bySigla = useMemo(() => new Map(voce.testimonia.map(t => [t.sigla, t])), [voce]);

  const tokens = foldForSearch(search).split(/\s+/).filter(Boolean);

  const matches = (t: Testimonium): boolean => {
    if (genereFilter && t.genere !== genereFilter) return false;
    if (campoFilter && !t.lares.some(m => m.campo === campoFilter)) return false;
    if (tokens.length === 0) return true;
    const hay = searchableOf(t);
    return tokens.every(x => hay.includes(x));
  };

  const visibleNuclei = useMemo(
    () =>
      voce.nuclei
        .filter(n => !nucleoFilter || n.id === nucleoFilter)
        .map(n => ({
          ...n,
          items: n.testimonia
            .map(s => bySigla.get(s))
            .filter((t): t is Testimonium => !!t && matches(t)),
        }))
        .filter(n => n.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voce, nucleoFilter, search, genereFilter, campoFilter],
  );

  const visibleCount = visibleNuclei.reduce((s, n) => s + n.items.length, 0);
  const daCollazionare = voce.testimonia.filter(t => t.collazione === 'da-collazionare').length;
  const filtriAttivi = !!(search || nucleoFilter || genereFilter || campoFilter);

  const generiPresenti = useMemo(
    () => [...new Set(voce.testimonia.map(t => t.genere))].sort((a, b) => GENERE_LABELS[a].localeCompare(GENERE_LABELS[b], 'it')),
    [voce],
  );

  // Il bersaglio di un salto (da un indice o dal sommario) può essere ancora
  // smontato nel momento del click, perché il salto stesso spegne gli indici e
  // azzera i filtri che lo tenevano nascosto. Si registra quindi l'id e si
  // scorre in un effetto, dopo che React ha applicato il nuovo albero — non in
  // un requestAnimationFrame, che correrebbe contro il render.
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);
  // Bersaglio appena raggiunto, evidenziato per un attimo: il salto è
  // istantaneo, e senza un segnale il lettore non capirebbe dove è atterrato.
  // Il contatore `n` serve a far ripartire il lampo anche quando si torna
  // sullo stesso bersaglio: con il solo id, React vedrebbe lo stesso stato,
  // non rieseguirebbe l'effetto e il lampo morirebbe col timer precedente.
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);
  const flashId = flash?.id ?? null;

  React.useEffect(() => {
    if (!pendingScroll) return;
    const el = document.getElementById(pendingScroll);
    // `behavior: 'smooth'` è inservibile qui: la voce è alta ~10.000 px e
    // l'animazione nativa impiegherebbe decine di secondi per arrivare in
    // fondo. Il salto da un indice deve atterrare, non viaggiare.
    el?.scrollIntoView({ behavior: 'auto', block: 'start' });
    setFlash(f => ({ id: pendingScroll, n: (f?.n ?? 0) + 1 }));
    setPendingScroll(null);
  }, [pendingScroll]);

  React.useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(timer);
  }, [flash]);

  const goTo = (id: string) => {
    setShowIndici(false);
    resetFiltri();
    setPendingScroll(id);
  };

  const exportTei = () => {
    const blob = new Blob([voceToTei(voce)], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${voce.id}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetFiltri = () => {
    setSearch(''); setNucleoFilter(''); setGenereFilter(''); setCampoFilter('');
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* ── Testata della sezione ──────────────────────────────────────── */}
      <div className="shrink-0 px-6 md:px-10 pt-4 pb-3 md:pt-6 md:pb-4 border-b border-border/30">
        <div className="max-w-6xl mx-auto w-full">
          <div className={cn(EYEBROW, 'flex items-center gap-1.5 mb-1.5 md:mb-2')} style={{ color: 'var(--lit)' }}>
            <ScrollText className="h-3.5 w-3.5" /> Fonti letterarie
          </div>

          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div>
              <h2 className="font-serif font-bold text-ink text-2xl sm:text-3xl md:text-4xl leading-none">
                {voce.lemma}
                {voce.lemmaGreco && (
                  <span className="font-greek text-lg sm:text-2xl md:text-3xl text-cult ml-2 md:ml-3 font-normal" lang="grc">
                    {voce.lemmaGreco}
                  </span>
                )}
              </h2>
              <p className="font-serif italic text-muted/80 text-[13px] md:text-[15px] mt-1 md:mt-1.5">{voce.sottotitolo}</p>
            </div>

            <div className="flex items-center gap-2">
              {VOCI.length > 1 && (
                <div className="relative">
                  <select
                    value={voceId}
                    onChange={e => { setVoceId(e.target.value); resetFiltri(); }}
                    className={cn(FIELD_BASE, 'pl-3 pr-8 py-2 cursor-pointer appearance-none')}
                    style={{ ...FIELD_STYLE, WebkitAppearance: 'none' as const, appearance: 'none' as const }}
                  >
                    {VOCI.map(v => <option key={v.id} value={v.id}>{v.lemma}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                </div>
              )}
              <button
                onClick={() => setShowIndici(s => !s)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[11px] font-sans font-bold uppercase tracking-widest transition-colors',
                  showIndici
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-border/50 text-muted hover:text-ink hover:bg-sidebar/60',
                )}
              >
                <Library className="h-3.5 w-3.5" /> Indici
              </button>
              <button
                onClick={exportTei}
                title="Esporta la voce in TEI EpiDoc (impianto compatibile con il lessico LARES)"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/50 text-[11px] font-sans font-bold uppercase tracking-widest text-muted hover:text-ink hover:bg-sidebar/60 transition-colors"
              >
                <FileCode2 className="h-3.5 w-3.5" /> TEI
              </button>
            </div>
          </div>

          {/* Filtri — su schermo stretto restano su una sola riga scorrevole:
              impilati verticalmente occupavano quasi tutta l'altezza utile. */}
          <div className="flex items-center gap-2 mt-3 md:mt-4">
          <div className="flex-1 min-w-0 flex flex-nowrap md:flex-wrap items-center gap-2 overflow-x-auto md:overflow-visible custom-scrollbar pb-1 md:pb-0">
            <div className="relative w-52 shrink-0 md:flex-1 md:w-auto md:min-w-[14rem] md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filtra autore, testo, termine, commento…"
                className={cn(FIELD_BASE, 'w-full pl-9 pr-3 py-2')}
                style={FIELD_STYLE}
              />
            </div>

            <div className="relative shrink-0">
              <select
                value={nucleoFilter}
                onChange={e => setNucleoFilter(e.target.value)}
                className={cn(FIELD_BASE, 'pl-3 pr-8 py-2 cursor-pointer appearance-none max-w-[16rem]')}
                style={{ ...FIELD_STYLE, WebkitAppearance: 'none' as const, appearance: 'none' as const }}
              >
                <option value="">Tutti i nuclei</option>
                {voce.nuclei.map(n => <option key={n.id} value={n.id}>{n.titolo}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
            </div>

            <div className="relative shrink-0">
              <select
                value={genereFilter}
                onChange={e => setGenereFilter(e.target.value as Genere | '')}
                className={cn(FIELD_BASE, 'pl-3 pr-8 py-2 cursor-pointer appearance-none')}
                style={{ ...FIELD_STYLE, WebkitAppearance: 'none' as const, appearance: 'none' as const }}
              >
                <option value="">Tutti i generi</option>
                {generiPresenti.map(g => <option key={g} value={g}>{GENERE_LABELS[g]}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
            </div>

            {/* Griglia LARES: filtro per campo concettuale */}
            <div className="shrink-0 inline-flex rounded-lg border border-[var(--border)]/50 dark:border-white/5 overflow-hidden text-[10px] font-sans font-bold uppercase tracking-widest shadow-inner">
              {LARES_GRID.map(c => (
                <button
                  key={c.campo}
                  onClick={() => setCampoFilter(f => (f === c.campo ? '' : c.campo))}
                  title={`LARES · ${c.label} (${c.en})`}
                  className={cn('px-2.5 py-2 transition-colors', campoFilter === c.campo ? 'text-ink' : 'text-muted hover:text-ink')}
                  style={campoFilter === c.campo ? { backgroundColor: `color-mix(in srgb, ${CAMPO_COLOR[c.campo]} 20%, transparent)`, color: CAMPO_COLOR[c.campo] } : undefined}
                >
                  {c.label.slice(0, 4)}.
                </button>
              ))}
            </div>

            {filtriAttivi && (
              <button
                onClick={resetFiltri}
                className="shrink-0 inline-flex items-center gap-1 text-[10px] font-sans uppercase tracking-widest text-muted/60 hover:text-accent transition-colors px-2 py-2"
              >
                <X className="h-3 w-3" /> Azzera
              </button>
            )}
          </div>

          {/* Il conteggio resta fuori dalla riga scorrevole: è il riscontro
              immediato di ogni filtro e non deve poter uscire dallo schermo. */}
          <span className="shrink-0 text-[11px] font-sans text-muted/60 tabular-nums whitespace-nowrap">
            {visibleCount}<span className="hidden sm:inline"> di {voce.testimonia.length} testimonianze</span>
            <span className="sm:hidden">/{voce.testimonia.length}</span>
          </span>
          </div>
        </div>
      </div>

      {/* ── Corpo ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto w-full px-6 md:px-10 py-6 flex gap-8">

          {/* Rail laterale: sommario dei nuclei */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-0 space-y-5">
              <div>
                <div className={cn(EYEBROW, 'text-muted/50 mb-2')}>Nuclei tematici</div>
                <nav className="space-y-0.5">
                  {voce.nuclei.map(n => (
                    <button
                      key={n.id}
                      // Passa da goTo, che azzera *tutti* i filtri: con una
                      // ricerca attiva il nucleo può essere del tutto vuoto e
                      // quindi non montato, e il click non farebbe nulla.
                      onClick={() => goTo(`nucleo-${n.id}`)}
                      className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-sidebar/60 transition-colors group"
                    >
                      <span className="block font-serif text-[13px] leading-snug text-ink/80 group-hover:text-accent transition-colors">
                        {n.titolo}
                      </span>
                      <span className="text-[10px] font-sans text-muted/50">{n.testimonia.length} testim.</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="pt-4 border-t border-border/30">
                <div className={cn(EYEBROW, 'text-muted/50 mb-2')}>Modello</div>
                <p className="text-[11px] font-sans text-muted/70 leading-relaxed">
                  Struttura e indici sul modello di{' '}
                  <a href="https://site.unibo.it/lares/en" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    LARES
                  </a>
                  , lessico dell'acculturazione religiosa antica (Bologna – Helsinki – Kraków – Complutense).
                </p>
              </div>

              {voce.vociCollegate && voce.vociCollegate.length > 0 && (
                <div className="pt-4 border-t border-border/30">
                  <div className={cn(EYEBROW, 'text-muted/50 mb-2')}>Voci collegate</div>
                  <p className="text-[11px] font-sans text-muted/50 leading-relaxed italic">
                    {voce.vociCollegate.join(' · ')} — da redigere.
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* Colonna principale */}
          <div className="flex-1 min-w-0">
            {showIndici ? (
              // ── Indici trasversali (modello LARES) ──────────────────────
              <section>
                <div className="flex flex-wrap items-center gap-1 mb-5 pb-2 border-b border-border/40">
                  {(Object.keys(INDICE_LABELS) as IndiceKey[]).map(k => (
                    <button
                      key={k}
                      onClick={() => setIndiceTab(k)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-md text-[10px] font-sans font-bold uppercase tracking-widest transition-colors',
                        indiceTab === k ? 'bg-accent/10 text-accent' : 'text-muted hover:text-ink',
                      )}
                    >
                      {INDICE_LABELS[k]}
                      <span className="ml-1.5 opacity-50 tabular-nums">{indici[k].length}</span>
                    </button>
                  ))}
                </div>
                {indici[indiceTab].length === 0 ? (
                  <p className="text-sm italic text-muted/60 py-10 text-center">Indice vuoto per questa voce.</p>
                ) : (
                  <IndiceList entries={indici[indiceTab]} onGo={goTo} lexical={indiceTab === 'termini'} />
                )}
              </section>
            ) : (
              <>
                {/* Cappello della voce */}
                {!filtriAttivi && (
                  <section className="mb-8">
                    {voce.cappello.map((p, i) => (
                      <p
                        key={i}
                        className={cn(
                          'font-serif leading-relaxed text-ink/90 text-justify hyphens-auto mb-3',
                          i === 0 ? 'text-[17px]' : 'text-[15px]',
                        )}
                      >
                        {p}
                      </p>
                    ))}

                    {/* Avvertenza sulla collazione: esplicita, non nascosta */}
                    {daCollazionare > 0 && (
                      <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[12px] font-sans leading-relaxed text-muted/85">
                          <span className="font-bold">{daCollazionare} testi su {voce.testimonia.length}</span> sono
                          trascritti in redazione e attendono riscontro sull'edizione indicata in ciascuna scheda.
                          Le traduzioni sono redazionali. Finché il riscontro non è fatto, i testi antichi di questa
                          voce non vanno citati come edizione.
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {/* Nuclei e testimonianze */}
                {visibleNuclei.length === 0 ? (
                  <p className="text-sm italic text-muted/60 py-16 text-center">
                    Nessuna testimonianza per questi filtri.
                  </p>
                ) : (
                  <div className="space-y-10">
                    {visibleNuclei.map(n => (
                      <section key={n.id} id={`nucleo-${n.id}`} className="scroll-mt-4">
                        <header className="mb-3">
                          <h3 className="font-serif font-bold text-ink text-xl leading-tight mb-1.5">{n.titolo}</h3>
                          <p className="font-serif italic text-[14px] leading-relaxed text-muted/85 text-justify hyphens-auto">
                            {n.cappello}
                          </p>
                        </header>
                        <div className="space-y-4">
                          {n.items.map(t => (
                            <TestimoniumCard
                              key={t.id}
                              t={t}
                              flash={flashId === t.id}
                              onCorpusSearch={onCorpusSearch}
                              onTerm={lemma => { setSearch(lemma); setShowIndici(false); }}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}

                {/* Sintesi + bibliografia */}
                {!filtriAttivi && (
                  <>
                    <section className="mt-12 pt-6 border-t border-border/40">
                      <div className={cn(EYEBROW, 'text-accent/70 mb-3 flex items-center gap-1.5')}>
                        <Sparkles className="h-3.5 w-3.5" /> Sintesi
                      </div>
                      {voce.sintesi.map((p, i) => (
                        <p key={i} className="font-serif text-[15px] leading-relaxed text-ink/90 text-justify hyphens-auto mb-3">
                          {p}
                        </p>
                      ))}
                    </section>

                    <section className="mt-8 pt-6 border-t border-border/40">
                      <div className={cn(EYEBROW, 'text-muted/50 mb-3 flex items-center gap-1.5')}>
                        <BookOpen className="h-3.5 w-3.5" /> Bibliografia
                      </div>
                      <ul className="space-y-1.5">
                        {voce.bibliografia.map(b => (
                          <li key={b} className="font-serif text-[13.5px] leading-snug text-muted/85 pl-4 -indent-4">
                            {b}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-6 text-[11px] font-sans text-muted/50">
                        Voce a cura di {voce.redazione} · aggiornata al {voce.aggiornamento} ·{' '}
                        <code className="font-mono">{voce.id}</code>
                      </p>
                    </section>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
