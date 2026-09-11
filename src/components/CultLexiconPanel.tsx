import React, { useEffect, useMemo, useState } from 'react';
import { Monumento } from '../types';
import { cn } from '../lib/utils';
import { buildCultIndex, CultLemmaStats } from '../lib/cultIndex';
import { cultFamilyShort } from '../lib/cultLexicon';
import { ResolvedVocab, buildLessicoLares } from '../lib/lessicoLaresOverlay';
import { caricaVocabCondiviso } from '../lib/lessicoLaresStore';
import { LemmaLetterario, PercorsoLetterario, lessicoLetterario, risolviTutte, toolboxLetterario } from '../lib/litSources';
import { LaresGrid } from './LaresGrid';
import { caricaLitDatasetCondiviso } from '../lib/litStore';
import { Tags, ExternalLink, ChevronRight, ChevronDown, Search, ScrollText, Pencil } from 'lucide-react';

interface Props {
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
  /** apre una testimonianza nella sezione Fonti letterarie */
  onVaiAllaFonte?: (testimoniumId: string) => void;
  /** editing sbloccato: mostra l'accesso all'editor del vocabolario */
  canWrite?: boolean;
  onApriVocabolario?: () => void;
}

type GroupBy = 'family' | 'lemma' | 'lares';

const foldForSearch = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Stessi stili dei campi di ricerca/tendina usati altrove nell'app (indice epiteti).
const FIELD_BASE =
  'bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-lg font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 transition-all duration-300';
const FIELD_STYLE = { backgroundColor: 'var(--card)', color: 'var(--ink)' } as const;

export const CultLexiconPanel: React.FC<Props> = ({ monumenti, onSelectMonumento, onVaiAllaFonte, canWrite, onApriVocabolario }) => {
  const [search, setSearch] = useState('');
  const [regione, setRegione] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('family');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Vocabolario risolto (seed ⊕ overlay); parte dal seed e si aggiorna appena
  // l'overlay è caricato, così la vista non aspetta la rete per comparire.
  const [vocab, setVocab] = useState<ResolvedVocab>(() => buildLessicoLares());
  useEffect(() => {
    let vivo = true;
    caricaVocabCondiviso().then(({ vocab: v }) => { if (vivo) setVocab(v); });
    return () => { vivo = false; };
  }, []);

  const index = useMemo(
    () => buildCultIndex(monumenti, { regione: regione || undefined, vocab }),
    [monumenti, regione, vocab],
  );
  const byId = useMemo(() => {
    const m = new Map<number, Monumento>();
    monumenti.forEach(x => m.set(x.id, x));
    return m;
  }, [monumenti]);

  // Il conteggio letterario è accostato, non sommato; il filtro per regione non lo tocca.
  const [letterario, setLetterario] = useState<Map<string, LemmaLetterario>>(new Map());
  // Stesso accostamento sull'asse LARES.
  const [percorsiLett, setPercorsiLett] = useState<Map<string, PercorsoLetterario>>(new Map());
  useEffect(() => {
    let vivo = true;
    caricaLitDatasetCondiviso().then(({ dataset }) => {
      if (!vivo) return;
      const risolte = risolviTutte(dataset.testimonia, dataset.opere);
      setLetterario(lessicoLetterario(risolte));
      setPercorsiLett(toolboxLetterario(risolte));
    });
    return () => { vivo = false; };
  }, []);

  const occorrenzeLetterarie = [...letterario.values()].reduce((n, l) => n + l.occorrenze.length, 0);

  const tokens = foldForSearch(search).split(/\s+/).filter(Boolean);

  const matchLemma = (l: CultLemmaStats): boolean => {
    if (familyFilter && l.family !== familyFilter) return false;
    if (tokens.length === 0) return true;
    const hay = foldForSearch([l.lemma, l.subFunction, l.family, ...l.forms].join(' '));
    return tokens.some(t => hay.includes(t));
  };

  const filteredLemmata = index.lemmata.filter(matchLemma);

  const toggle = (key: string) =>
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const schede = (n: number) => `${n} ${n === 1 ? 'scheda' : 'schede'}`;
  const atts = (n: number) => `${n} att.`;

  // Riga = elenco, non grafico: lemma, conteggio, sotto-funzione, Logeion. La
  // famiglia è un pallino, non il riempimento di una barra. Stesso impianto
  // dell'indice epiteti e della bibliografia.
  const renderLemmaRow = (l: CultLemmaStats) => {
    const key = `${l.family}::${l.lemma}`;
    const open = expanded.has(key);
    const lett = letterario.get(l.lemma);
    return (
      <div key={key} className="rounded-sm">
        <button
          onClick={() => toggle(key)}
          className="w-full flex items-baseline gap-3 px-2 py-1.5 text-left rounded-sm hover:bg-sidebar/50 transition-colors"
        >
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0 self-center"
            style={{ backgroundColor: vocab.familyColor(l.family) }}
            title={cultFamilyShort(l.family)}
          />

          <span
            className="font-greek text-ink/85 text-base shrink-0 w-[8rem] truncate"
            lang="grc"
            title={l.lemma}
          >
            {l.lemma}
          </span>

          <span className="shrink-0 w-10 text-right text-xs font-sans text-muted/80 tabular-nums">
            {l.count}
          </span>

          {/* Conteggio epigrafico e conteggio letterario, separati. */}
          <span
            className="shrink-0 w-9 text-right text-xs font-sans tabular-nums text-muted/60"
            title={lett ? `${lett.occorrenze.length} nei testi letterari` : undefined}
          >
            {lett ? `+${lett.occorrenze.length}` : ''}
          </span>

          {l.subFunction && (
            <span className="flex-1 hidden sm:block text-xs font-serif italic text-muted/70 truncate">
              {l.subFunction}
            </span>
          )}
          <span className="flex-1 sm:hidden" />

          {l.lemmaRef && (
            <a
              href={l.lemmaRef}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className="shrink-0 text-accent hover:opacity-70 self-center"
              title="Logeion"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          <ChevronRight
            className={cn('shrink-0 h-3.5 w-3.5 text-muted/60 self-center transition-transform', open && 'rotate-90')}
          />
        </button>

        {open && (
          <div className="ml-5 mt-0.5 mb-1.5 px-3 py-2 rounded-sm bg-sidebar/40 border border-border/30">
            <div className="mb-1.5">
              <span className="text-[10px] font-sans uppercase tracking-widest text-muted/50">
                {schede(l.schedeCount)} · {atts(l.count)}
              </span>
              {l.forms.length > 0 && (
                <span className="ml-2 font-greek text-sm text-muted/80" lang="grc">
                  {l.forms.join('  ·  ')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
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
                    {r.cert === 'low' && <span className="text-muted/60" title="forma integrata">[ ]</span>}
                    {r.formula && <span className="text-muted/60" title="#formula">✦</span>}
                  </button>
                );
              })}
            </div>

            {lett && (
              <div className="mt-2.5 pt-2 border-t border-border/30">
                <div className="flex items-baseline gap-1.5 mb-1">
                  <ScrollText className="h-3 w-3 shrink-0 self-center text-muted/50" />
                  <span className="text-[10px] font-sans uppercase tracking-widest text-muted/60">
                    Nei testi
                  </span>
                  <span className="text-[10px] font-sans text-muted/50 tabular-nums">
                    {lett.occorrenze.length}
                  </span>
                  {lett.forme.length > 0 && (
                    <span className="ml-1.5 font-greek text-sm text-muted/70" lang={lett.occorrenze[0]?.lingua}>
                      {lett.forme.join('  ·  ')}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {lett.occorrenze.map((o, i) => (
                    <button
                      key={`${o.testimoniumId}-${i}`}
                      disabled={!onVaiAllaFonte}
                      onClick={() => onVaiAllaFonte?.(o.testimoniumId)}
                      title={[o.cita, o.forma].filter(Boolean).join(' · ')}
                      className={cn(
                        'text-xs font-sans inline-flex items-baseline gap-1 transition-colors',
                        onVaiAllaFonte ? 'text-muted/80 hover:text-accent' : 'text-muted/40',
                      )}
                    >
                      <span className="font-serif italic">{o.cita}</span>
                      {o.forma && <span className="font-greek text-muted/60" lang={o.lingua}>{o.forma}</span>}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-serif italic text-muted/50 mt-1.5 leading-snug">
                  Occorrenze in un testo, fuori dal conteggio delle attestazioni.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Lemmi solo letterari: in un blocco a parte, senza conteggio epigrafico.
  const notiSullaPietra = new Set(index.lemmata.map(l => l.lemma));
  const soloNeiTesti = [...letterario.values()]
    .filter(l => !notiSullaPietra.has(l.lemma))
    .filter(l => {
      if (familyFilter && l.family !== familyFilter) return false;
      if (tokens.length === 0) return true;
      const hay = foldForSearch([l.lemma, l.subFunction || '', l.family, ...l.forme].join(' '));
      return tokens.some(t => hay.includes(t));
    })
    .sort((a, b) => b.occorrenze.length - a.occorrenze.length || a.lemma.localeCompare(b.lemma));

  const renderSoloNeiTesti = (lemmi: LemmaLetterario[]) => {
    if (lemmi.length === 0) return null;
    return (
      <div className="mt-3 pt-2.5 border-t border-dashed border-border/50">
        <div className="flex items-baseline gap-1.5 mb-1.5 pl-2">
          <ScrollText className="h-3 w-3 shrink-0 self-center text-muted/50" />
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted/70">
            Solo nei testi
          </span>
          <span className="text-[10px] font-sans text-muted/50 tabular-nums">{lemmi.length}</span>
          <span className="text-[11px] font-serif italic text-muted/60 ml-1">
            mai sulla pietra
          </span>
        </div>
        <div className="space-y-0.5">
          {lemmi.map(l => (
            <div key={`lit::${l.lemma}`} className="flex items-baseline gap-3 px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full shrink-0 self-center bg-muted/40" />
              <span className="font-greek text-base w-[8rem] shrink-0 truncate text-ink/70"
                lang={l.occorrenze[0]?.lingua} title={l.lemma}>
                {l.lemma}
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1 flex-1">
                {l.occorrenze.map((o, i) => (
                  <button
                    key={`${o.testimoniumId}-${i}`}
                    disabled={!onVaiAllaFonte}
                    onClick={() => onVaiAllaFonte?.(o.testimoniumId)}
                    title={[o.cita, o.forma].filter(Boolean).join(' · ')}
                    className={cn(
                      'text-xs font-sans inline-flex items-baseline gap-1 transition-colors',
                      onVaiAllaFonte ? 'text-muted/80 hover:text-accent' : 'text-muted/40',
                    )}
                  >
                    <span className="font-serif italic">{o.cita}</span>
                    {o.forma && <span className="font-greek text-muted/60" lang={o.lingua}>{o.forma}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // I percorsi LARES coi soli lemmi che passano i filtri (docs/merge-lessico-lares.md).
  const percorsiToRender = index.toolbox
    .map(t => ({ ...t, lemmata: t.lemmata.filter(matchLemma) }))
    .filter(t => t.lemmata.length > 0);
  const senzaPercorso = index.senzaPercorso.filter(matchLemma);

  const familiesToRender = index.families
    .map(f => ({ ...f, lemmata: f.lemmata.filter(matchLemma) }))
    .filter(f => f.lemmata.length > 0 || soloNeiTesti.some(l => l.family === f.id));

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-sans font-bold uppercase tracking-[0.22em] text-accent/70 flex items-center gap-1.5">
            <Tags className="h-3.5 w-3.5" /> Lessico cultuale
          </div>
          <p className="text-[13px] font-serif italic text-muted/75 mt-1.5 leading-relaxed">
            {index.totalAttestations} attestazioni epigrafiche su {index.totalSchede} schede
            {occorrenzeLetterarie > 0 && (
              <>
                {' · '}
                {occorrenzeLetterarie} {occorrenzeLetterarie === 1 ? 'occorrenza' : 'occorrenze'} nei testi, contate a parte.
              </>
            )}
          </p>
        </div>
        {canWrite && onApriVocabolario && (
          <button
            onClick={onApriVocabolario}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/40 bg-accent/10 text-accent text-[10px] font-sans font-bold uppercase tracking-widest hover:bg-accent/20 transition-colors"
          >
            <Pencil className="h-3 w-3" /> Modifica vocabolario
          </button>
        )}
      </div>

      {/* Ricerca / filtri */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtra lemma, forma, sotto-funzione…"
            className={cn(FIELD_BASE, 'w-full pl-9 pr-3 py-2')}
            style={FIELD_STYLE}
          />
        </div>

        <div className="relative">
          <select
            value={regione}
            onChange={e => setRegione(e.target.value)}
            className={cn(FIELD_BASE, 'pl-3 pr-8 py-2 cursor-pointer appearance-none')}
            style={{ ...FIELD_STYLE, WebkitAppearance: 'none' as const, appearance: 'none' as const }}
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
            style={{ ...FIELD_STYLE, WebkitAppearance: 'none' as const, appearance: 'none' as const }}
          >
            <option value="">Tutte le famiglie</option>
            {vocab.families.filter(f => !f.deprecated).map(f => <option key={f.id} value={f.id}>{cultFamilyShort(f.label)}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
        </div>

        {/* raggruppamento primario: due modi, come l'indice epiteti */}
        <div className="inline-flex rounded-lg border border-[var(--border)]/50 dark:border-white/5 overflow-hidden text-[10px] font-sans font-bold uppercase tracking-widest shadow-inner">
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

        {/* la griglia LARES è un'altra lettura, non un terzo raggruppamento: sta fuori */}
        <button
          onClick={() => setGroupBy(g => (g === 'lares' ? 'family' : 'lares'))}
          className={cn(
            'px-3 py-2 rounded-lg border text-[10px] font-sans font-bold uppercase tracking-widest transition-colors',
            groupBy === 'lares'
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-border/50 text-muted hover:text-ink hover:bg-sidebar/60',
          )}
        >
          griglia LARES
        </button>
      </div>

      {filteredLemmata.length === 0 && soloNeiTesti.length === 0 ? (
        <div className="text-sm italic text-muted/60 py-12 text-center">Nessuna attestazione per questi filtri.</div>
      ) : groupBy === 'lares' ? (
        <LaresGrid
          toolbox={vocab.toolbox}
          letterari={new Map([...percorsiLett].map(([k, v]) => [k, v.occorrenze.length]))}
          percorsi={percorsiToRender}
          senzaPercorso={senzaPercorso}
          renderLemmaRow={renderLemmaRow}
          atts={atts}
        />
      ) : groupBy === 'lemma' ? (
        <div className="space-y-0.5">
          {[...filteredLemmata].sort((a, b) => b.count - a.count || a.lemma.localeCompare(b.lemma)).map(renderLemmaRow)}
          {renderSoloNeiTesti(soloNeiTesti)}
        </div>
      ) : (
        <div className="space-y-7">
          {familiesToRender.map(f => {
            const totAtt = f.lemmata.reduce((s, l) => s + l.count, 0);
            return (
              <section key={f.id}>
                <div className="flex items-baseline gap-2.5 mb-2 pb-1 border-b border-border/40">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: vocab.familyColor(f.id) }} />
                  <h3 className="text-sm font-sans font-bold uppercase tracking-[0.15em] text-ink/90">
                    {cultFamilyShort(f.label)}
                  </h3>
                  <span className="text-xs font-sans text-muted/60">
                    {f.lemmata.length} lemmi · {schede(f.schedeCount)} · {atts(totAtt)}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {[...f.lemmata]
                    .sort((a, b) => b.count - a.count || a.lemma.localeCompare(b.lemma))
                    .map(renderLemmaRow)}
                </div>
                {renderSoloNeiTesti(soloNeiTesti.filter(l => l.family === f.id))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
