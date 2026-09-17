import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  LitDataset, Opera, Saggio, TestimoniumRisolto, Genere, LaresCampo, IndexEntry, IndiceKey,
  GENERE_LABELS, TIPO_LABELS, AMBITO_LABELS, CAMPO_COLOR, LARES_GRID, REFTYPE_LABELS, REFTYPE_SEZIONI,
  INDICE_LABELS,
  risolviTutte, buildIndici, citaBreve, citaCts, foldForSearch, searchableOf, saggioToTei,
  saggioStats, opereSpogliate, sigleDelSaggio, testimoniaDelSaggio, perCronologia,
  catalogoOccorrenze, arcoCronologico, markupIndexOf, testoPiano,
} from '../lib/litSources';
import { caricaLitDataset, salvaLitDataset, clonaDataset, FonteDati, SEME } from '../lib/litStore';
import { MarkupText } from './MarkupText';
import { LiterarySourcesEditor } from './LiterarySourcesEditor';
import { ToolboxIndex, AmbitiIndex } from './LaresMarkersIndex';

/**
 * LiterarySourcesPanel — la sezione «Fonti letterarie».
 *
 * Lo spoglio delle fonti antiche sulla divinità lunare, con la stessa
 * grammatica del catalogo epigrafico: elenco filtrabile, click su una riga,
 * scheda a tutta pagina. Quattro viste sullo stesso materiale:
 *
 *   OPERE          l'indice bibliografico: che cosa è stato spogliato
 *   TESTIMONIANZE  l'elenco dei passi — l'equivalente dell'elenco delle schede
 *   INDICI         le rubriche trasversali, sul modello del lessico LARES;
 *                  quelle di divinità, epiteti e lessico cultuale sono
 *                  ricavate dal markup, cioè dagli stessi dati del corpus
 *   SAGGI          le trattazioni discorsive (Selene…), che RICHIAMANO le
 *                  testimonianze invece di contenerle
 *
 * Modello dati: src/lib/litSources.ts · markup: src/lib/litMarkup.ts ·
 * griglie LARES: src/lib/laresToolbox.ts · norme: docs/fonti-letterarie-modello.md.
 */

interface Props {
  /** con la redazione sbloccata compare il pulsante «Redigi» */
  editingUnlocked?: boolean;
  /** testimonianza da aprire all'ingresso (dal blocco «Nelle fonti letterarie» del corpus) */
  apriTestimonianza?: string | null;
  /** consuma il bersaglio, così tornando nella sezione non si riapre da solo */
  onTestimonianzaAperta?: () => void;
}

// Controlli di filtro: un filetto sotto, niente cornice né incasso — come nel
// Lessico cultuale. La barra non deve leggersi come la toolbar di un programma.
const FIELD_BASE =
  'bg-transparent border-0 border-b border-border/50 rounded-none font-sans text-xs text-ink outline-none ' +
  'focus:border-accent/60 hover:border-border transition-colors';

// Maiuscola iniziale a ciò che dà un nome — viste, comandi, opzioni di menu,
// intestazioni di colonna, placeholder imperativi; minuscolo a ciò che continua
// una frase: i complementi («ordina per · cronologia»), le didascalie, i conteggi.

// Tre soli grigi in tutta la sezione: testo, secondario, terziario.
const SEC = 'text-muted';
const TER = 'text-muted/60';

/** I modi di leggere lo stesso materiale sono rimandi testuali, non pulsanti. */
const Modo: React.FC<{ attivo: boolean; onClick: () => void; title?: string; children: React.ReactNode }> =
  ({ attivo, onClick, title, children }) => (
    <button
      onClick={onClick}
      title={title}
      className={cn('font-serif text-[13px] transition-colors', attivo ? 'text-accent italic' : `${SEC} hover:text-ink`)}
    >
      {children}
    </button>
  );

/** Separatore fra rimandi. */
const Punto: React.FC = () => <span className={TER}>·</span>;
/** Stessa griglia di colonne dell'elenco schede del catalogo. */
const GRID = 'md:grid md:grid-cols-[2.4fr_1.1fr_1fr] xl:grid-cols-[2.4fr_1.1fr_1fr_2.4fr] gap-3';
const GRID_OPERE = 'md:grid md:grid-cols-[2.6fr_1.2fr_1fr_5rem] gap-3';

type Vista = 'opere' | 'testimonianze' | 'indici' | 'saggi';
type VistaSaggio = 'lettura' | 'elenco' | 'indici';
type Ordine = 'cronologia' | 'autore' | 'opera';

const LINGUA_LABEL: Record<'grc' | 'lat', string> = { grc: 'greco', lat: 'latino' };

/** Prime parole del testo antico, per la colonna di anteprima. */
const incipit = (t: TestimoniumRisolto, max = 110) => {
  const piano = testoPiano(t.testo).replace(/\s+/g, ' ').trim();
  return piano.length > max ? `${piano.slice(0, max)}…` : piano;
};

/** Quadratino di colore: il colore resta dov'è un segno, non una parola. */
const Segno: React.FC<{ color: string; title?: string }> = ({ color, title }) => (
  <span title={title} className="h-2 w-2 rounded-[1px] shrink-0 self-center" style={{ backgroundColor: color }} />
);


const SCHEDA_SECTIONS = [
  { id: 'testo', label: 'Testo e traduzione' },
  { id: 'commento', label: 'Commento' },
  { id: 'analisi', label: 'Analisi e indici' },
  { id: 'rimandi', label: 'Rimandi e bibliografia' },
] as const;

type SchedaSection = typeof SCHEDA_SECTIONS[number]['id'];

const SchedaTestimonium: React.FC<{
  t: TestimoniumRisolto;
  sigla?: string;
  nucleoTitolo?: string;
  onClose: () => void;
  onFiltra: (patch: { genere?: Genere; opera?: string; search?: string }) => void;
}> = ({ t, sigla, nucleoTitolo, onClose, onFiltra }) => {
  const [sezione, setSezione] = useState<SchedaSection>('testo');
  const mk = markupIndexOf(t);
  const cts = citaCts(t);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const dettagli: { label: string; value: string; onClick?: () => void }[] = [
    { label: 'Autore', value: t.autore, onClick: () => { onFiltra({ search: t.autore }); onClose(); } },
    { label: 'Opera', value: t.opera, onClick: () => { onFiltra({ opera: t.operaId }); onClose(); } },
    { label: 'Locus', value: t.locus },
    { label: 'Datazione', value: t.datazione },
    { label: 'Genere', value: GENERE_LABELS[t.genere], onClick: () => { onFiltra({ genere: t.genere }); onClose(); } },
    { label: 'Lingua', value: LINGUA_LABEL[t.lingua] },
    { label: 'Tipo di fonte', value: REFTYPE_LABELS[t.refType] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <div onClick={onClose} className="absolute inset-0 bg-ink/80 backdrop-blur-sm" />
      <div className="relative w-full lg:w-[95vw] max-w-[1400px] bg-parchment shadow-2xl overflow-hidden flex flex-col h-full lg:h-[90vh] border border-border lg:rounded-2xl">
        <div className="flex h-full flex-col md:flex-row overflow-y-auto md:overflow-hidden">

          {/* Rail dei metadati */}
          <div className="w-full md:w-56 bg-sidebar border-b md:border-b-0 md:border-r border-border p-5 md:p-6 flex flex-col shrink-0 md:overflow-y-auto custom-scrollbar">
            <div className="mb-10">
              <button onClick={onClose}
                className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-muted flex items-center gap-2 hover:text-accent transition-colors">
                <X className="h-4 w-4" /> Torna all'elenco
              </button>
            </div>

            <div className="space-y-8">
              <div className="border-l-2 pl-4" style={{ borderColor: 'var(--lit)' }}>
                <span className="text-2xl font-light italic leading-none block">{sigla || citaBreve(t)}</span>
                <span className="block mt-2 font-sans field-label">{t.autoreAbbr}</span>
              </div>

              <nav className="space-y-1.5 -mx-1">
                {SCHEDA_SECTIONS.map(({ id, label }) => (
                  <button key={id} onClick={() => setSezione(id)}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200',
                      sezione === id ? 'nav-pill-active text-accent' : 'text-muted hover:text-ink',
                    )}>
                    {label}
                  </button>
                ))}
              </nav>

              <section className="space-y-4">
                <h4 className="font-sans field-label opacity-85 pb-2 border-b border-border/40">Dettagli</h4>
                <dl className="space-y-3">
                  {dettagli.map(d => (
                    <div key={d.label}>
                      <dt className="text-[9px] font-sans font-bold uppercase text-muted tracking-tighter">{d.label}</dt>
                      {d.onClick ? (
                        <button onClick={d.onClick}
                          className="text-xs font-semibold text-ink mt-0.5 font-serif hover:text-accent transition-colors block text-left">
                          {d.value}
                        </button>
                      ) : (
                        <dd className="text-xs font-semibold text-ink mt-0.5 font-serif">{d.value}</dd>
                      )}
                    </div>
                  ))}
                </dl>
              </section>

              <section className="pt-5 border-t border-border/40">
                <h4 className="font-sans field-label opacity-85 pb-2 mb-3">Edizione</h4>
                <p className="text-[11px] font-serif text-muted leading-snug">{t.edizione}</p>
                <p className="text-[11px] font-serif text-muted/60 leading-snug mt-1">Traduzione: {t.traduttore}</p>
                {t.collazione === 'da-collazionare' && (
                  <p className="mt-3 font-serif italic text-[11px] leading-snug text-warning">
                    Testo da collazionare sull'edizione.
                  </p>
                )}
                {cts && <p className="mt-3 text-[9px] font-mono text-muted/60 break-all" title="Riferimento canonico CTS">{cts}</p>}
                <p className="mt-2 text-[9px] font-mono text-muted/60 break-all">{t.id}</p>
              </section>
            </div>
          </div>

          {/* Corpo */}
          <div className="flex-1 min-h-0 bg-parchment p-6 md:p-12 lg:p-16 md:overflow-y-auto custom-scrollbar">
            <div className="max-w-3xl">
              {/* Senza `uppercase`: i titoli dei nuclei contengono greco, e il
                  maiuscolo automatico del browser produce forme scorrette
                  (Μήν → ΜΉΝ), perché il greco maiuscolo non porta l'accento. */}
              <div className="text-[10px] font-sans font-bold tracking-[0.3em] mb-2" style={{ color: 'var(--lit)' }}>
                {nucleoTitolo || 'Testimonianza'}
              </div>
              <h2 className="font-serif font-bold text-ink text-2xl md:text-3xl leading-tight mb-1">
                {t.autore}, <span className="italic">{t.opera}</span> {t.locus}
              </h2>
              <p className="text-xs font-sans text-muted mb-8">
                {citaBreve(t)} · {t.datazione} · {GENERE_LABELS[t.genere]}
              </p>

              {sezione === 'testo' && (
                <div className="animate-in fade-in duration-200 space-y-7">
                  <div>
                    <h3 className="field-label mb-3">Testo</h3>
                    <blockquote
                      className={cn('leading-[1.9] pl-4 border-l-2', t.lingua === 'grc' ? 'font-greek text-[17px]' : 'font-serif text-[17px]')}
                      style={{ borderColor: 'color-mix(in srgb, var(--lit) 45%, transparent)' }}
                    >
                      <MarkupText testo={t.testo} lang={t.lingua} />
                    </blockquote>
                    {mk.marcature > 0 && (
                      <p className="text-[10px] font-sans text-muted/60 mt-2 pl-4">
                        {mk.marcature} marcature nel testo — passa sopra le parole evidenziate.
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="field-label mb-3">Traduzione</h3>
                    <p className="whitespace-pre-wrap font-serif italic text-[16px] leading-relaxed text-ink/80 pl-4">
                      {t.traduzione}
                    </p>
                  </div>
                </div>
              )}

              {sezione === 'commento' && (
                <div className="animate-in fade-in duration-200">
                  <p className="font-serif text-[16px] leading-[1.75] text-ink/90 text-justify hyphens-auto">{t.commento}</p>
                </div>
              )}

              {sezione === 'analisi' && (
                <div className="animate-in fade-in duration-200 space-y-8">
                  <div>
                    <h3 className="field-label mb-3">Tipologia della testimonianza</h3>
                    <p className={cn('font-serif text-[14px]', t.tipo.length ? 'text-ink/85' : `italic ${SEC}`)}>
                      {t.tipo.length ? t.tipo.map(x => TIPO_LABELS[x]).join(' · ') : 'non classificata'}
                    </p>
                  </div>

                  <div>
                    <h3 className="field-label mb-3">Marcatori concettuali LARES</h3>
                    {t.lares.length === 0 ? (
                      <p className={cn('font-serif italic text-[14px]', SEC)}>nessuno</p>
                    ) : (
                      <ul className="space-y-1">
                        {t.lares.map((m, i) => (
                          <li key={`${m.ambito}-${i}`} className="flex items-baseline gap-2 text-[14px] font-serif">
                            <Segno color={CAMPO_COLOR[m.campo]} title={`campo: ${m.campo}`} />
                            <span className={SEC}>{m.campo}</span>
                            <span className={TER}>→</span>
                            <span className="text-ink/85">{AMBITO_LABELS[m.ambito]}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {mk.toolbox.length > 0 && (
                    <div>
                      <h3 className="field-label mb-3">Toolbox LARES nel testo</h3>
                      <ul className="space-y-1.5">
                        {mk.toolbox.map((x, i) => (
                          <li key={i} className="flex flex-wrap items-baseline gap-x-2.5 text-[14px]">
                            <span className={cn(t.lingua === 'grc' ? 'font-greek' : 'font-serif italic')} lang={t.lingua}>{x.testo}</span>
                            <span className={cn('text-[12px] font-sans', SEC)}>{x.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {t.termini.length > 0 && (
                    <div>
                      <h3 className="field-label mb-3">Termini notevoli</h3>
                      <ul className="space-y-2">
                        {t.termini.map(w => (
                          <li key={w.forma} className="flex flex-wrap items-baseline gap-x-2.5">
                            <span className={cn(t.lingua === 'grc' ? 'font-greek text-[16px]' : 'font-serif text-[15px] italic', 'text-cult')} lang={t.lingua}>
                              {w.forma}
                            </span>
                            {w.lemma !== w.forma && (
                              <span className={cn(t.lingua === 'grc' ? 'font-greek' : 'font-serif italic', 'text-[14px] text-muted/60')} lang={t.lingua}>
                                ({w.lemma})
                              </span>
                            )}
                            {w.nota && <span className={cn('text-[13px] font-serif italic', SEC)}>— {w.nota}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {mk.cultuale.length > 0 && (
                    <div>
                      <h3 className="field-label mb-3">Lessico cultuale marcato</h3>
                      <ul className="space-y-1.5">
                        {mk.cultuale.map((c, i) => (
                          <li key={i} className="flex flex-wrap items-baseline gap-x-2.5 text-[14px]">
                            <span className={cn(t.lingua === 'grc' ? 'font-greek text-[16px]' : 'font-serif italic', 'text-cult')} lang={t.lingua}>{c.forma}</span>
                            <span className={cn('font-greek text-[14px]', TER)} lang="grc">({c.lemma})</span>
                            {c.family && <span className={cn('text-[12px] font-sans', SEC)}>{c.family}</span>}
                            {c.subFunction && <span className={cn('text-[12px] font-serif italic', SEC)}>{c.subFunction}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(['divinita', 'personaggi', 'figure', 'luoghi'] as const).some(k => (t[k] || []).length > 0) && (
                    <div>
                      <h3 className="field-label mb-3">Entità nominate</h3>
                      <dl className="space-y-2">
                        {([
                          ['divinita', 'Divinità'], ['personaggi', 'Personaggi'],
                          ['figure', 'Figure storiche'], ['luoghi', 'Luoghi'],
                        ] as const).map(([k, label]) =>
                          (t[k] || []).length > 0 ? (
                            <div key={k} className="flex flex-wrap items-baseline gap-2">
                              <dt className="text-[9px] font-sans font-bold uppercase text-muted tracking-tighter w-28 shrink-0">{label}</dt>
                              <dd className="text-[14px] font-serif text-ink/85">{(t[k] || []).join(' · ')}</dd>
                            </div>
                          ) : null,
                        )}
                      </dl>
                    </div>
                  )}
                </div>
              )}

              {sezione === 'rimandi' && (
                <div className="animate-in fade-in duration-200 space-y-8">
                  <div>
                    <h3 className="field-label mb-3">Testo online</h3>
                    {t.links.length > 0 ? (
                      <div className="flex flex-col items-start gap-1.5">
                        {t.links.map(l => (
                          <a key={l.url} href={l.url} target="_blank" rel="noreferrer"
                            className="text-[13px] font-serif text-accent hover:opacity-70">
                            {l.label}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[14px] font-serif italic text-muted">Nessun testo online registrato per quest'opera.</p>
                    )}
                  </div>

                  <div>
                    <h3 className="field-label mb-3">Bibliografia</h3>
                    {t.bibliografia && t.bibliografia.length > 0 ? (
                      <ul className="space-y-1.5">
                        {t.bibliografia.map(b => (
                          <li key={b} className="font-serif text-[14px] leading-snug text-muted pl-4 -indent-4">{b}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[14px] font-serif italic text-muted">
                        Solo l'edizione di riferimento, indicata nella colonna a lato.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const IndiceList: React.FC<{
  entries: IndexEntry[];
  onGo: (id: string) => void;
  /** l'indice contiene parole di lingua antica: la resa segue `entry.lingua` */
  lexical?: boolean;
}> = ({ entries, onGo, lexical }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
    {entries.map(e => {
      // L'indice dei termini mescola lemmi greci e latini: font greco e
      // `lang="grc"` valgono solo per i primi, o «luna» e «Noctiluca»
      // finirebbero marcati come greco per i lettori di schermo.
      const grc = lexical && e.lingua === 'grc';
      return (
        <div key={e.key} className="flex items-baseline gap-2 py-0.5">
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
              className={cn('hidden md:block shrink-0 max-w-[10rem] truncate text-[11px] italic', TER, grc ? 'font-greek' : 'font-sans')}
              lang={lexical ? e.lingua : undefined}
              title={e.detail}
            >
              {e.detail}
            </span>
          )}
          <span className="flex-1 self-center border-b border-dotted border-border/70 mx-1" />
          <span className="shrink-0 flex flex-wrap gap-x-1.5 justify-end max-w-[14rem]">
            {e.refs.map((r, i) => (
              <button key={r.id} onClick={() => onGo(r.id)} title={r.label}
                className={cn('font-serif text-[12px] italic truncate max-w-[9rem] transition-colors', SEC, 'hover:text-accent')}>
                {i > 0 && <span className={TER}>, </span>}{r.label}
              </button>
            ))}
          </span>
        </div>
      );
    })}
  </div>
);


const SaggioView: React.FC<{
  saggio: Saggio;
  tutte: TestimoniumRisolto[];
  opere: Opera[];
  onChiudi: () => void;
  onApri: (id: string) => void;
}> = ({ saggio, tutte, opere, onChiudi, onApri }) => {
  // Il saggio si apre in LETTURA: è discorso, non elenco. L'elenco esiste
  // al livello sopra, per tutte le testimonianze.
  const [vista, setVista] = useState<VistaSaggio>('lettura');

  const suoi = useMemo(() => testimoniaDelSaggio(saggio, tutte), [saggio, tutte]);
  const sigle = useMemo(() => sigleDelSaggio(saggio), [saggio]);
  const stats = useMemo(() => saggioStats(saggio, tutte), [saggio, tutte]);
  const indici = useMemo(() => buildIndici(suoi), [suoi]);
  const catalogo = useMemo(() => catalogoOccorrenze(suoi), [suoi]);
  const [indiceTab, setIndiceTab] = useState<IndiceKey>('opere');
  const byId = useMemo(() => new Map(suoi.map(t => [t.id, t])), [suoi]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onChiudi]);

  const exportTei = () => {
    const blob = new Blob([saggioToTei(saggio, tutte, opere)], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${saggio.id}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const VISTE: { id: VistaSaggio; label: string }[] = [
    { id: 'lettura', label: 'Lettura' },
    { id: 'elenco', label: 'Elenco' },
    { id: 'indici', label: 'Indici' },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="shrink-0 px-6 md:px-10 pt-4 pb-3 md:pt-6 md:pb-4 border-b border-border/30">
        <div className="max-w-6xl mx-auto w-full">
          <button onClick={onChiudi}
            className={cn('font-serif italic text-[13px] mb-1.5 md:mb-2 transition-colors', SEC, 'hover:text-accent')}>
            ‹ Torna ai saggi
          </button>

          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div>
              <h2 className="font-serif font-bold text-ink text-2xl sm:text-3xl md:text-4xl leading-none">
                {saggio.lemma}
                {saggio.lemmaGreco && (
                  <span className="font-greek text-lg sm:text-2xl md:text-3xl text-cult ml-2 md:ml-3 font-normal" lang="grc">
                    {saggio.lemmaGreco}
                  </span>
                )}
              </h2>
              <p className="font-serif italic text-muted text-[13px] md:text-[15px] mt-1 md:mt-1.5">{saggio.sottotitolo}</p>
            </div>

            <div className="flex items-baseline gap-1.5 pb-1">
              {VISTE.map((v, i) => (
                <React.Fragment key={v.id}>
                  {i > 0 && <Punto />}
                  <Modo attivo={vista === v.id} onClick={() => setVista(v.id)}>{v.label}</Modo>
                </React.Fragment>
              ))}
              <span className={cn('mx-1', TER)}>|</span>
              <button onClick={exportTei}
                title="Esporta il saggio in TEI EpiDoc (impianto compatibile con il lessico LARES)"
                className={cn('font-serif text-[13px] transition-colors', SEC, 'hover:text-accent')}>
                Esporta TEI
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {/* ══ LETTURA ══ */}
        {vista === 'lettura' && (
          <div className="max-w-6xl mx-auto w-full px-6 md:px-10 py-6 flex gap-8">
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-0 space-y-5">
                <div>
                  <div className={cn('font-serif italic text-[13px] mb-2', SEC)}>Nuclei tematici</div>
                  <nav className="space-y-0.5">
                    {saggio.nuclei.map(n => (
                      <button key={n.id}
                        onClick={() => document.getElementById(`nucleo-${n.id}`)?.scrollIntoView({ block: 'start' })}
                        className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-sidebar/60 transition-colors group">
                        <span className="block font-serif text-[13px] leading-snug text-ink/80 group-hover:text-accent transition-colors">
                          {n.titolo}
                        </span>
                        <span className="text-[10px] font-sans text-muted/60">{n.testimonia.length} testim.</span>
                      </button>
                    ))}
                  </nav>
                </div>
                <div className="pt-4 border-t border-border/30">
                  <div className={cn('font-serif italic text-[13px] mb-2', SEC)}>Modello</div>
                  <p className="text-[11px] font-sans text-muted leading-relaxed">
                    Struttura sul modello delle voci di{' '}
                    <a href="https://lares-lexicon.unibo.it/en/" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      LARES
                    </a>
                    , lessico dell'acculturazione religiosa antica (Bologna – Helsinki – Kraków – Complutense).
                  </p>
                </div>
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              {saggio.morfologia && (
                <section className="mb-6">
                  <div className={cn('font-serif italic text-[13px] mb-2', SEC)}>Morfologia</div>
                  <p className="font-serif text-[15px] leading-relaxed text-ink/90">{saggio.morfologia}</p>
                </section>
              )}

              {(saggio.etimologia || []).length > 0 && (
                <section className="mb-6">
                  <div className={cn('font-serif italic text-[13px] mb-2', SEC)}>Etimologia</div>
                  {(saggio.etimologia || []).map((p, i) => (
                    <p key={i} className="font-serif text-[15px] leading-relaxed text-ink/90 text-justify hyphens-auto mb-2">{p}</p>
                  ))}
                </section>
              )}

              <section className="mb-8">
                {saggio.cappello.map((p, i) => (
                  <p key={i} className={cn('font-serif leading-relaxed text-ink/90 text-justify hyphens-auto mb-3', i === 0 ? 'text-[17px]' : 'text-[15px]')}>
                    {p}
                  </p>
                ))}

                {stats.daCollazionare > 0 && (
                  <p className={cn('mt-4 pl-3 border-l-2 border-warning/40 font-serif text-[13px] leading-relaxed', SEC)}>
                    {stats.daCollazionare} testi su {stats.testimonianze} sono trascritti in redazione e attendono
                    riscontro sull'edizione indicata in ciascuna scheda; le traduzioni sono redazionali. Finché il
                    riscontro non è fatto, i testi antichi di questo saggio non vanno citati come edizione.
                  </p>
                )}
              </section>

              <div className="space-y-10">
                {saggio.nuclei.map(n => (
                  <section key={n.id} id={`nucleo-${n.id}`} className="scroll-mt-4">
                    <header className="mb-3">
                      <h3 className="font-serif font-bold text-ink text-xl leading-tight mb-1.5">{n.titolo}</h3>
                      <p className="font-serif italic text-[14px] leading-relaxed text-muted text-justify hyphens-auto">{n.cappello}</p>
                    </header>
                    <div className="space-y-6">
                      {n.testimonia.map(id => byId.get(id)).filter((t): t is TestimoniumRisolto => !!t).map(t => (
                        <TestimoniumCard key={t.id} t={t} sigla={sigle.get(t.id)} onOpen={() => onApri(t.id)} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <section className="mt-12 pt-6 border-t border-border/40">
                <div className={cn('font-serif italic text-[13px] mb-3', SEC)}>Discussione</div>
                {saggio.sintesi.map((p, i) => (
                  <p key={i} className="font-serif text-[15px] leading-relaxed text-ink/90 text-justify hyphens-auto mb-3">{p}</p>
                ))}
              </section>

              {/* Il «Catalogue of occurrences» delle schede LARES: qui non si
                  scrive, si calcola dalle testimonianze del saggio. */}
              {catalogo.length > 0 && (
                <section className="mt-8 pt-6 border-t border-border/40">
                  <div className={cn('font-serif italic text-[13px] mb-3', SEC)}>Catalogo delle occorrenze</div>
                  {catalogo.map(g => (
                    <div key={g.refType} className="mb-3">
                      <div className={cn('font-serif text-[13px] mb-1', SEC)}>{REFTYPE_SEZIONI[g.refType]}</div>
                      <ul className="space-y-0.5">
                        {g.righe.map(r => (
                          <li key={r} className="font-serif text-[13.5px] text-ink/80">{r}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}

              <section className="mt-8 pt-6 border-t border-border/40">
                <div className={cn('font-serif italic text-[13px] mb-3', SEC)}>Bibliografia</div>
                {(saggio.bibliografiaCorpora || []).length > 0 && (
                  <>
                    <div className={cn('font-serif italic text-[13px] mb-1', SEC)}>Corpora</div>
                    <ul className="space-y-1.5 mb-3">
                      {(saggio.bibliografiaCorpora || []).map(b => (
                        <li key={b} className="font-serif text-[13.5px] leading-snug text-muted pl-4 -indent-4">{b}</li>
                      ))}
                    </ul>
                    <div className={cn('font-serif italic text-[13px] mb-1', SEC)}>Studi</div>
                  </>
                )}
                <ul className="space-y-1.5">
                  {saggio.bibliografia.map(b => (
                    <li key={b} className="font-serif text-[13.5px] leading-snug text-muted pl-4 -indent-4">{b}</li>
                  ))}
                </ul>
                <p className="mt-6 text-[11px] font-sans text-muted/60">
                  Saggio a cura di {saggio.redazione} · aggiornato al {saggio.aggiornamento} ·{' '}
                  <code className="font-mono">{saggio.id}</code>
                </p>
              </section>
            </div>
          </div>
        )}

        {/* ══ ELENCO delle sole testimonianze del saggio ══ */}
        {vista === 'elenco' && (
          <div className="max-w-6xl mx-auto w-full px-6 md:px-10 py-6">
            <div>
              <p className={cn('mb-2 pb-1.5 border-b border-border/40 font-sans text-[11px]', SEC)}>
                {suoi.length} testimonianze richiamate dal saggio · {stats.arco}
              </p>
              {suoi.map(t => (
                <RigaTestimonianza key={t.id} t={t} sigla={sigle.get(t.id)} onApri={() => onApri(t.id)} />
              ))}
            </div>
          </div>
        )}

        {/* ══ INDICI del saggio ══ */}
        {vista === 'indici' && (
          <div className="max-w-6xl mx-auto w-full px-6 md:px-10 py-6">
            <RubricheIndici indici={indici} testimonia={suoi} tab={indiceTab} setTab={setIndiceTab} onGo={onApri} />
          </div>
        )}
      </div>
    </div>
  );
};

/** Il passo dentro il saggio: sigla, riferimento, testo. Come in una pagina a
 *  stampa, non è una card: dal riquadro resta solo il rientro del testo antico. */
const TestimoniumCard: React.FC<{ t: TestimoniumRisolto; sigla?: string; onOpen: () => void }> = ({ t, sigla, onOpen }) => (
  <article>
    <button onClick={onOpen} title="Apri la scheda"
      className="w-full flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-left group">
      {sigla && <span className={cn('shrink-0 font-sans text-[11px] tabular-nums', SEC)}>{sigla}</span>}
      <h4 className="font-serif text-[15px] leading-tight text-ink group-hover:text-accent transition-colors">
        {t.autore}, <span className="italic">{t.opera}</span> {t.locus}
      </h4>
      <span className={cn('font-sans text-[11px]', TER)}>{t.datazione}</span>
    </button>

    <div className="mt-1.5 space-y-2.5">
      <blockquote className={cn('leading-[1.75] pl-3 border-l', t.lingua === 'grc' ? 'font-greek text-[15px]' : 'font-serif text-[15px]')}
        style={{ borderColor: 'color-mix(in srgb, var(--lit) 45%, transparent)' }}>
        <MarkupText testo={t.testo} lang={t.lingua} />
      </blockquote>
      <div className="whitespace-pre-wrap font-serif italic text-[14px] leading-relaxed text-ink/75 pl-3">{t.traduzione}</div>
      <p className="font-serif text-[14px] leading-relaxed text-ink/90 text-justify hyphens-auto">{t.commento}</p>
    </div>
  </article>
);

const RigaTestimonianza: React.FC<{ t: TestimoniumRisolto; sigla?: string; onApri: () => void }> = ({ t, sigla, onApri }) => (
  <div onClick={onApri}
    className={cn('block cursor-pointer border-b border-border/30 py-3 md:py-4 group items-center hover:bg-sidebar/40 transition-colors', GRID)}>
    <div className="min-w-0">
      <div className="font-serif text-[15px] leading-tight text-ink group-hover:text-accent transition-colors truncate">
        {sigla && <span className={cn('font-sans text-[11px] tabular-nums mr-2 align-middle', SEC)}>{sigla}</span>}
        {t.autore}, <span className="italic font-normal">{t.opera}</span> {t.locus}
      </div>
      <div className={cn('font-sans text-[11px] mt-0.5 truncate', TER)}>
        {citaBreve(t)}{t.collazione === 'da-collazionare' && ' · da collazionare'}
      </div>
    </div>
    <div className={cn('font-sans text-[12px] mt-1 md:mt-0', SEC)}>{t.datazione}</div>
    <div className={cn('font-serif text-[13px] mt-1 md:mt-0', SEC)}>{GENERE_LABELS[t.genere]}</div>
    <div className={cn('hidden xl:block min-w-0 truncate', TER, t.lingua === 'grc' ? 'font-greek text-[13px]' : 'font-serif text-[13px] italic')}
      lang={t.lingua} title={incipit(t, 400)}>
      {incipit(t)}
    </div>
  </div>
);

/**
 * Le rubriche. Otto sono elenchi di voci — opere, autori, divinità, luoghi… —
 * e restano tali: sono liste di nomi, e una lista di nomi si legge come lista.
 * Le due griglie LARES no: sono classificazioni, e la domanda che si fa loro è
 * dove si addensa la marcatura. Prendono quindi la grafica della vista «Lessico
 * cultuale» (LaresMarkersIndex), e con essa il filtro, le barre e i passi che si
 * aprono sotto la riga.
 */
const RubricheIndici: React.FC<{
  indici: ReturnType<typeof buildIndici>;
  testimonia: TestimoniumRisolto[];
  tab: IndiceKey;
  setTab: (k: IndiceKey) => void;
  onGo: (id: string) => void;
}> = ({ indici, testimonia, tab, setTab, onGo }) => (
  <>
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-5 pb-1.5 border-b border-border/40">
      {(Object.keys(INDICE_LABELS) as IndiceKey[]).map((k, i) => (
        <React.Fragment key={k}>
          {i > 0 && <Punto />}
          <span className={cn(indici[k].length === 0 && 'opacity-50')}>
            <Modo attivo={tab === k} onClick={() => setTab(k)}>
              {INDICE_LABELS[k]}
              <span className={cn('ml-1 font-sans text-[11px] tabular-nums', TER)}>{indici[k].length}</span>
            </Modo>
          </span>
        </React.Fragment>
      ))}
    </div>
    {tab === 'toolbox' ? (
      <ToolboxIndex testimonia={testimonia} onGo={onGo} />
    ) : tab === 'ambiti' ? (
      <AmbitiIndex testimonia={testimonia} onGo={onGo} />
    ) : indici[tab].length === 0 ? (
      <p className={cn('font-serif italic text-sm py-10 text-center', SEC)}>
        Indice vuoto: si riempie marcando il testo delle testimonianze.
      </p>
    ) : (
      <IndiceList entries={indici[tab]} onGo={onGo} lexical={tab === 'termini' || tab === 'cultuale'} />
    )}
  </>
);


export const LiterarySourcesPanel: React.FC<Props> = ({ editingUnlocked, apriTestimonianza, onTestimonianzaAperta }) => {
  const [dataset, setDataset] = useState<LitDataset>(SEME);
  const [fonte, setFonte] = useState<FonteDati>('seme');
  const [caricando, setCaricando] = useState(true);

  const [vista, setVista] = useState<Vista>('opere');
  const [aperto, setAperto] = useState<string | null>(null);
  const [saggioId, setSaggioId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [operaFilter, setOperaFilter] = useState('');
  const [genereFilter, setGenereFilter] = useState<'' | Genere>('');
  const [campoFilter, setCampoFilter] = useState<'' | LaresCampo>('');
  const [ordine, setOrdine] = useState<Ordine>('cronologia');
  const [indiceTab, setIndiceTab] = useState<IndiceKey>('opere');

  // Editor
  const [editorAperto, setEditorAperto] = useState(false);
  const [bozza, setBozza] = useState<LitDataset | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroreSalvataggio, setErroreSalvataggio] = useState<string | null>(null);

  // Arrivo da una pagina del corpus: si apre la scheda richiesta e si sposta
  // la vista sull'elenco, così chiudendola si resta in un contesto sensato.
  useEffect(() => {
    if (!apriTestimonianza) return;
    setVista('testimonianze');
    setSaggioId(null);
    setAperto(apriTestimonianza);
    onTestimonianzaAperta?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apriTestimonianza]);

  useEffect(() => {
    let vivo = true;
    caricaLitDataset().then(r => {
      if (!vivo) return;
      setDataset(r.dataset);
      setFonte(r.fonte);
      setCaricando(false);
    });
    return () => { vivo = false; };
  }, []);

  const tutte = useMemo(() => risolviTutte(dataset.testimonia, dataset.opere), [dataset]);
  const opere = useMemo(() => opereSpogliate(tutte, dataset.opere), [tutte, dataset.opere]);
  const indici = useMemo(() => buildIndici(tutte), [tutte]);
  const saggio = useMemo(() => dataset.saggi.find(s => s.id === saggioId) || null, [dataset.saggi, saggioId]);

  const resetFiltri = () => { setSearch(''); setOperaFilter(''); setGenereFilter(''); setCampoFilter(''); };

  const tokens = foldForSearch(search).split(/\s+/).filter(Boolean);
  const filtrate = useMemo(() => {
    const ok = (t: TestimoniumRisolto) => {
      if (operaFilter && t.operaId !== operaFilter) return false;
      if (genereFilter && t.genere !== genereFilter) return false;
      if (campoFilter && !t.lares.some(m => m.campo === campoFilter)) return false;
      if (tokens.length === 0) return true;
      const hay = searchableOf(t);
      return tokens.every(x => hay.includes(x));
    };
    const out = tutte.filter(ok);
    return out.sort((a, b) => {
      if (ordine === 'autore') return a.autore.localeCompare(b.autore, 'it') || a.datazioneSort - b.datazioneSort;
      if (ordine === 'opera') return a.opera.localeCompare(b.opera, 'it') || a.locus.localeCompare(b.locus, 'it');
      return perCronologia(a, b);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutte, operaFilter, genereFilter, campoFilter, search, ordine]);

  const filtriAttivi = !!(search || operaFilter || genereFilter || campoFilter);
  const generiPresenti = useMemo(
    () => Array.from(new Set<Genere>(tutte.map(t => t.genere))).sort((a, b) => GENERE_LABELS[a].localeCompare(GENERE_LABELS[b], 'it')),
    [tutte],
  );

  const apriScheda = useCallback((id: string) => setAperto(id), []);
  const testimoniumAperto = aperto ? tutte.find(t => t.id === aperto) || null : null;
  const siglaAperta = saggio && testimoniumAperto ? sigleDelSaggio(saggio).get(testimoniumAperto.id) : undefined;
  const nucleoAperto = saggio && testimoniumAperto
    ? saggio.nuclei.find(n => n.testimonia.includes(testimoniumAperto.id))
    : undefined;

  const salva = async (messaggio: string) => {
    if (!bozza) return;
    setSalvando(true);
    setErroreSalvataggio(null);
    try {
      await salvaLitDataset(bozza, messaggio);
      setDataset(bozza);
      setFonte('archivio');
      setBozza(clonaDataset(bozza));
    } catch (e: any) {
      setErroreSalvataggio(e?.message || 'Salvataggio fallito.');
    } finally {
      setSalvando(false);
    }
  };

  if (caricando) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted/60" />
      </div>
    );
  }

  if (saggio) {
    return (
      <>
        <SaggioView
          saggio={saggio}
          tutte={tutte}
          opere={dataset.opere}
          onChiudi={() => setSaggioId(null)}
          onApri={apriScheda}
        />
        {testimoniumAperto && (
          <SchedaTestimonium
            t={testimoniumAperto}
            sigla={siglaAperta}
            nucleoTitolo={nucleoAperto?.titolo}
            onClose={() => setAperto(null)}
            onFiltra={patch => {
              setSaggioId(null);
              setVista('testimonianze');
              resetFiltri();
              if (patch.genere) setGenereFilter(patch.genere);
              if (patch.opera) setOperaFilter(patch.opera);
              if (patch.search) setSearch(patch.search);
            }}
          />
        )}
      </>
    );
  }

  const VISTE: { id: Vista; label: string }[] = [
    { id: 'opere', label: 'Opere' },
    { id: 'testimonianze', label: 'Testimonianze' },
    { id: 'indici', label: 'Indici' },
    { id: 'saggi', label: 'Saggi' },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Testata */}
      <div className="shrink-0 px-6 md:px-10 pt-4 pb-3 md:pt-6 md:pb-4 border-b border-border/30">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h2 className="font-serif text-xl text-ink">
              Fonti letterarie
              <span className={cn('ml-3 font-sans text-[11px]', SEC)}>
                {tutte.length} testimonianze da {opere.length} opere, {arcoCronologico(tutte)}
              </span>
            </h2>

            <div className="flex items-baseline gap-1.5">
              {VISTE.map((v, i) => (
                <React.Fragment key={v.id}>
                  {i > 0 && <Punto />}
                  <Modo attivo={vista === v.id} onClick={() => setVista(v.id)}>{v.label}</Modo>
                </React.Fragment>
              ))}
              {editingUnlocked && (
                <>
                  <span className={cn('mx-1', TER)}>|</span>
                  <button
                    onClick={() => { setBozza(clonaDataset(dataset)); setEditorAperto(true); }}
                    title="Apri la redazione delle fonti letterarie"
                    className={cn('font-serif italic text-[13px] transition-colors', SEC, 'hover:text-accent')}>
                    Redigi
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Filtri: solo sull'elenco delle testimonianze */}
          {vista === 'testimonianze' && (
            <div className="flex items-center gap-2 mt-3 md:mt-4">
              <div className="flex-1 min-w-0 flex flex-nowrap md:flex-wrap items-center gap-2 overflow-x-auto md:overflow-visible custom-scrollbar pb-1 md:pb-0">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Filtra autore, testo, termine, commento…"
                  className={cn(FIELD_BASE, 'w-52 shrink-0 md:flex-1 md:w-auto md:min-w-[14rem] md:max-w-md py-1')} />

                <div className="relative shrink-0">
                  <select value={operaFilter} onChange={e => setOperaFilter(e.target.value)}
                    className={cn(FIELD_BASE, 'pr-5 py-1 cursor-pointer appearance-none max-w-[16rem]')}
                    style={{ WebkitAppearance: 'none' as const, appearance: 'none' as const }}>
                    <option value="">Tutte le opere</option>
                    {opere.map(({ opera }) => <option key={opera.id} value={opera.id}>{opera.autore}, {opera.titolo}</option>)}
                  </select>
                  <span className={cn('absolute right-1 top-1/2 -translate-y-1/2 text-[9px] pointer-events-none', TER)}>▾</span>
                </div>

                <div className="relative shrink-0">
                  <select value={genereFilter} onChange={e => setGenereFilter(e.target.value as Genere | '')}
                    className={cn(FIELD_BASE, 'pr-5 py-1 cursor-pointer appearance-none')}
                    style={{ WebkitAppearance: 'none' as const, appearance: 'none' as const }}>
                    <option value="">Tutti i generi</option>
                    {generiPresenti.map(g => <option key={g} value={g}>{GENERE_LABELS[g]}</option>)}
                  </select>
                  <span className={cn('absolute right-1 top-1/2 -translate-y-1/2 text-[9px] pointer-events-none', TER)}>▾</span>
                </div>

                {/* I quattro campi LARES: il colore sta nel quadratino, non nel testo. */}
                <div className="shrink-0 flex items-baseline gap-2.5">
                  {LARES_GRID.map(c => (
                    <button key={c.campo} onClick={() => setCampoFilter(f => (f === c.campo ? '' : c.campo))}
                      title={`LARES · ${c.label} (${c.en})`}
                      className={cn('flex items-baseline gap-1 font-serif text-[13px] transition-colors',
                        campoFilter === c.campo ? 'text-accent italic' : `${SEC} hover:text-ink`)}>
                      <Segno color={CAMPO_COLOR[c.campo]} />
                      {c.label}
                    </button>
                  ))}
                </div>

                {filtriAttivi && (
                  <button onClick={resetFiltri}
                    className={cn('shrink-0 font-serif italic text-[13px] transition-colors', TER, 'hover:text-accent')}>
                    Azzera
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Corpo */}
      <div className={cn('flex-1 min-h-0 flex flex-col', vista === 'testimonianze' || vista === 'opere' ? 'overflow-hidden p-6 md:p-10' : 'overflow-y-auto custom-scrollbar')}>

        {/* ══ OPERE ══ */}
        {vista === 'opere' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 max-w-6xl mx-auto w-full">
            <div className={cn('mb-1 pb-1.5 border-b border-border/40 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 font-sans text-[11px]', SEC)}>
              <span>{opere.length} opere spogliate</span>
              <span className={cn('font-serif italic', TER)}>in ordine cronologico</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-3">
              <div className={cn('hidden md:grid', GRID_OPERE, 'border-b border-border/50 py-2 font-sans text-[11px] sticky top-0 bg-parchment z-10', TER)}>
                <div>Autore e opera</div>
                <div>Datazione</div>
                <div>Genere</div>
                <div className="text-right">Passi</div>
              </div>
              {opere.map(({ opera, stats }) => (
                <div key={opera.id}
                  onClick={() => { resetFiltri(); setOperaFilter(opera.id); setVista('testimonianze'); }}
                  className={cn('block cursor-pointer border-b border-border/30 py-3 md:py-4 group items-center hover:bg-sidebar/40 transition-colors', GRID_OPERE)}>
                  <div className="min-w-0">
                    <div className="font-serif text-[15px] leading-tight text-ink group-hover:text-accent transition-colors truncate">
                      {opera.autore}, <span className="italic">{opera.titolo}</span>
                    </div>
                    <div className={cn('font-sans text-[11px] mt-0.5 truncate', TER)}>
                      {opera.edizione}{opera.ctsUrn ? ' · CTS' : ''}
                    </div>
                  </div>
                  <div className={cn('font-sans text-[12px] mt-1 md:mt-0', SEC)}>{opera.datazione}</div>
                  <div className={cn('font-serif text-[13px] mt-1 md:mt-0', SEC)}>
                    {GENERE_LABELS[opera.genere]}<span className={TER}> · {LINGUA_LABEL[opera.lingua]}</span>
                  </div>
                  <div className={cn('font-sans text-[12px] tabular-nums md:text-right mt-1 md:mt-0', SEC)}
                    title={stats.loci.join(' · ')}>
                    {stats.testimonianze}
                  </div>
                </div>
              ))}
              {opere.length === 0 && <p className={cn('font-serif italic text-sm py-16 text-center', SEC)}>Nessuna opera spogliata.</p>}
            </div>
          </div>
        )}

        {/* ══ TESTIMONIANZE ══ */}
        {vista === 'testimonianze' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 max-w-6xl mx-auto w-full">
            <div className={cn('mb-1 pb-1.5 border-b border-border/40 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 font-sans text-[11px]', SEC)}>
              <span>{filtrate.length} testimonianze</span>
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className={TER}>ordina per</span>
                {(['cronologia', 'autore', 'opera'] as Ordine[]).map((o, i) => (
                  <React.Fragment key={o}>
                    {i > 0 && <Punto />}
                    <Modo attivo={ordine === o} onClick={() => setOrdine(o)}>{o}</Modo>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-3">
              <div className={cn('hidden md:grid', GRID, 'border-b border-border/50 py-2 font-sans text-[11px] sticky top-0 bg-parchment z-10', TER)}>
                <div>Fonte</div>
                <div>Datazione</div>
                <div>Genere</div>
                <div className="hidden xl:block">Testo</div>
              </div>

              {filtrate.length === 0 ? (
                <p className={cn('font-serif italic text-sm py-16 text-center', SEC)}>Nessuna testimonianza per questi filtri.</p>
              ) : (
                filtrate.map(t => <RigaTestimonianza key={t.id} t={t} onApri={() => setAperto(t.id)} />)
              )}
            </div>
          </div>
        )}

        {/* ══ INDICI ══ */}
        {vista === 'indici' && (
          <div className="max-w-6xl mx-auto w-full px-6 md:px-10 py-6">
            <RubricheIndici indici={indici} testimonia={tutte} tab={indiceTab} setTab={setIndiceTab} onGo={setAperto} />
          </div>
        )}

        {/* ══ SAGGI ══ */}
        {vista === 'saggi' && (
          <div className="max-w-5xl mx-auto w-full px-6 md:px-10 py-6">
            <div>
              <div className={cn('mb-1 pb-1.5 border-b border-border/40 flex items-baseline justify-between gap-2 font-sans text-[11px]', SEC)}>
                <span>{dataset.saggi.length} {dataset.saggi.length === 1 ? 'saggio' : 'saggi'}</span>
                <span className={cn('font-serif italic', TER)}>{dataset.inPreparazione.length} in preparazione</span>
              </div>

              <div>
                {dataset.saggi.map(s => {
                  const st = saggioStats(s, tutte);
                  return (
                    <button key={s.id} onClick={() => setSaggioId(s.id)}
                      className="w-full text-left border-b border-border/30 py-4 group hover:bg-sidebar/40 transition-colors px-2 -mx-2 rounded-sm">
                      <h3 className="font-serif text-2xl leading-none text-ink group-hover:text-accent transition-colors">
                        {s.lemma}
                        {s.lemmaGreco && <span className="font-greek text-xl text-cult ml-2.5" lang="grc">{s.lemmaGreco}</span>}
                      </h3>
                      <p className={cn('font-serif italic text-[14px] mt-1.5', SEC)}>{s.sottotitolo}</p>
                      <p className={cn('mt-2 font-sans text-[11px] tabular-nums', TER)}>
                        {st.testimonianze} testimonianze · {st.opere} opere · {st.nuclei} nuclei · {st.termini} termini · {st.arco}
                        {st.daCollazionare > 0 && (
                          <span className="text-warning"> · {st.daCollazionare} da collazionare</span>
                        )}
                      </p>
                    </button>
                  );
                })}

                {/* Ciò che manca fa parte dell'indice quanto ciò che c'è. */}
                <div className="pt-6">
                  <div className={cn('font-serif italic text-[13px] mb-2', SEC)}>In preparazione</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    {dataset.inPreparazione.map(v => (
                      <div key={v.lemma} className="border-b border-border/20 py-2">
                        <span className={cn('font-serif text-[15px]', SEC)}>{v.lemma}</span>
                        {v.lemmaGreco && <span className={cn('font-greek text-[14px] ml-2', TER)} lang="grc">{v.lemmaGreco}</span>}
                        <p className={cn('font-sans text-[11px] leading-snug mt-0.5', TER)}>{v.nota}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {testimoniumAperto && (
        <SchedaTestimonium
          t={testimoniumAperto}
          onClose={() => setAperto(null)}
          onFiltra={patch => {
            setVista('testimonianze');
            resetFiltri();
            if (patch.genere) setGenereFilter(patch.genere);
            if (patch.opera) setOperaFilter(patch.opera);
            if (patch.search) setSearch(patch.search);
          }}
        />
      )}

      {editorAperto && bozza && (
        <LiterarySourcesEditor
          dataset={bozza}
          onChange={setBozza}
          onSalva={salva}
          onChiudi={() => { setEditorAperto(false); setErroreSalvataggio(null); }}
          fonte={fonte}
          sporco={JSON.stringify(bozza) !== JSON.stringify(dataset)}
          salvando={salvando}
          errore={erroreSalvataggio}
        />
      )}
    </div>
  );
};
