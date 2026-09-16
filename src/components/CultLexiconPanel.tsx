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

// Controlli di filtro: un filetto sotto, niente cornice né incasso. La barra
// non deve leggersi come la toolbar di un'applicazione.
const FIELD_BASE =
  'bg-transparent border-0 border-b border-border/50 rounded-none font-sans text-xs text-ink outline-none ' +
  'focus:border-accent/60 hover:border-border transition-colors';

// Tre soli grigi in tutta la sezione: testo, secondario, terziario.
const SEC = 'text-muted';
const TER = 'text-muted/60';

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

  /** Rimando, in tondo minuto: sigla, forma, riga. Separati da virgola come in un indice. */
  const renderRimandi = (nodes: React.ReactNode[]) =>
    nodes.map((n, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span className={TER}>, </span>}
        {n}
      </React.Fragment>
    ));

  // Voce di lemma, non riga di tabella: lemma, sotto-funzione tra parentesi,
  // conteggio a destra. Nessun colore sul testo, nessuna icona, nessun chevron.
  const renderLemmaRow = (l: CultLemmaStats) => {
    const key = `${l.family}::${l.lemma}`;
    const open = expanded.has(key);
    const lett = letterario.get(l.lemma);
    return (
      <div key={key}>
        <div className="group flex items-baseline gap-2 px-1.5 py-[3px] rounded-sm hover:bg-sidebar/40 transition-colors">
          <button
            onClick={() => toggle(key)}
            className="flex-1 min-w-0 flex items-baseline gap-2 text-left"
          >
            <span
              className={cn('font-greek text-base shrink-0 transition-colors', open ? 'text-accent' : 'text-ink')}
              lang="grc"
            >
              {l.lemma}
            </span>

            {l.subFunction && (
              <span className={cn('font-serif italic text-[13px] truncate', SEC)}>
                ({l.subFunction})
              </span>
            )}

            {/* filetto puntinato dell'indice a stampa: lega il lemma al suo numero */}
            <span className="flex-1 self-center border-b border-dotted border-border/70 mx-1" />

            <span className={cn('shrink-0 font-sans text-xs tabular-nums', SEC)}>{l.count}</span>
            <span
              className={cn('shrink-0 w-8 text-right font-sans text-xs tabular-nums', TER)}
              title={lett ? `${lett.occorrenze.length} occorrenze nei testi letterari, contate a parte` : undefined}
            >
              {lett ? `+${lett.occorrenze.length}` : ''}
            </span>
          </button>

          {l.lemmaRef && (
            <a
              href={l.lemmaRef}
              target="_blank"
              rel="noreferrer"
              title="Logeion"
              className="shrink-0 font-serif text-[10px] align-super text-accent/70 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-accent transition-opacity"
            >
              L
            </a>
          )}
          {!l.lemmaRef && <span className="shrink-0 w-[7px]" />}
        </div>

        {open && (
          <div className="ml-4 pl-3 my-1 border-l border-border/40">
            <p className={cn('font-sans text-[11px] mb-1', TER)}>
              {schede(l.schedeCount)} · {atts(l.count)}
              {l.forms.length > 0 && (
                <span className={cn('ml-2 font-greek text-sm', SEC)} lang="grc">
                  {l.forms.join('  ·  ')}
                </span>
              )}
            </p>

            <p className="text-xs leading-relaxed">
              {renderRimandi(l.refs.map((r, i) => {
                const m = byId.get(r.id);
                return (
                  <button
                    key={`${r.scheda}-${i}`}
                    disabled={!m}
                    onClick={() => m && onSelectMonumento(m)}
                    title={[r.scheda, r.regione, r.line ? `r. ${r.line}` : '', r.form].filter(Boolean).join(' · ')}
                    className={cn('font-sans inline items-baseline transition-colors', m ? `${SEC} hover:text-accent` : TER)}
                  >
                    <span>{r.scheda}</span>
                    {r.form && <span className={cn('ml-1 font-greek', TER)} lang="grc">{r.form}</span>}
                    {r.line && <span className={cn('ml-1', TER)}>r.{r.line}</span>}
                    {r.cert === 'low' && <span className={cn('ml-1', TER)} title="forma integrata">[ ]</span>}
                    {r.formula && <span className={cn('ml-1', TER)} title="#formula">✦</span>}
                  </button>
                );
              }))}
            </p>

            {lett && (
              <div className="mt-2">
                <p className={cn('font-serif italic text-[13px] mb-0.5', SEC)}>
                  nei testi <span className={cn('font-sans not-italic text-[11px] tabular-nums', TER)}>{lett.occorrenze.length}</span>
                  {lett.forme.length > 0 && (
                    <span className={cn('ml-2 font-greek not-italic text-sm', SEC)} lang={lett.occorrenze[0]?.lingua}>
                      {lett.forme.join('  ·  ')}
                    </span>
                  )}
                </p>
                <p className="text-xs leading-relaxed">
                  {renderRimandi(lett.occorrenze.map((o, i) => (
                    <button
                      key={`${o.testimoniumId}-${i}`}
                      disabled={!onVaiAllaFonte}
                      onClick={() => onVaiAllaFonte?.(o.testimoniumId)}
                      title={[o.cita, o.forma].filter(Boolean).join(' · ')}
                      className={cn('inline transition-colors', onVaiAllaFonte ? `${SEC} hover:text-accent` : TER)}
                    >
                      <span className="font-serif italic">{o.cita}</span>
                      {o.forma && <span className={cn('ml-1 font-greek', TER)} lang={o.lingua}>{o.forma}</span>}
                    </button>
                  )))}
                </p>
                <p className={cn('font-serif italic text-[11px] mt-1 leading-snug', TER)}>
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
      <div className="mt-3 pt-2 border-t border-dashed border-border/50">
        <p className={cn('font-serif italic text-[13px] mb-1 pl-1.5', SEC)}>
          solo nei testi, mai sulla pietra{' '}
          <span className={cn('font-sans not-italic text-[11px] tabular-nums', TER)}>{lemmi.length}</span>
        </p>
        <div>
          {lemmi.map(l => (
            <div key={`lit::${l.lemma}`} className="flex items-baseline gap-2 px-1.5 py-[3px]">
              <span className="font-greek text-base shrink-0 text-ink/80" lang={l.occorrenze[0]?.lingua}>
                {l.lemma}
              </span>
              <span className="flex-1 text-xs leading-relaxed">
                {renderRimandi(l.occorrenze.map((o, i) => (
                  <button
                    key={`${o.testimoniumId}-${i}`}
                    disabled={!onVaiAllaFonte}
                    onClick={() => onVaiAllaFonte?.(o.testimoniumId)}
                    title={[o.cita, o.forma].filter(Boolean).join(' · ')}
                    className={cn('inline transition-colors', onVaiAllaFonte ? `${SEC} hover:text-accent` : TER)}
                  >
                    <span className="font-serif italic">{o.cita}</span>
                    {o.forma && <span className={cn('ml-1 font-greek', TER)} lang={o.lingua}>{o.forma}</span>}
                  </button>
                )))}
              </span>
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

  /** I tre modi di leggere lo stesso materiale: link testuali, non pulsanti. */
  const modo = (g: GroupBy, label: string) => (
    <button
      onClick={() => setGroupBy(g)}
      className={cn(
        'font-serif text-[13px] transition-colors',
        groupBy === g ? 'text-accent italic' : `${SEC} hover:text-ink`,
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
      <div className="mb-4 pb-2 border-b border-border/40 flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl text-ink">
          Lessico cultuale
          <span className={cn('ml-3 font-sans text-[11px]', SEC)}>
            {index.totalAttestations} attestazioni su {index.totalSchede} schede
            {occorrenzeLetterarie > 0 && `, ${occorrenzeLetterarie} nei testi a parte`}
          </span>
        </h2>
        {canWrite && onApriVocabolario && (
          <button
            onClick={onApriVocabolario}
            className={cn('shrink-0 font-serif italic text-[13px] hover:text-accent transition-colors', SEC)}
          >
            modifica vocabolario
          </button>
        )}
      </div>

      {/* Ricerca / filtri */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5 items-baseline">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="filtra lemma, forma, sotto-funzione…"
          className={cn(FIELD_BASE, 'flex-1 min-w-[14rem] py-1')}
        />

        <div className="relative">
          <select
            value={regione}
            onChange={e => setRegione(e.target.value)}
            className={cn(FIELD_BASE, 'pr-5 py-1 cursor-pointer appearance-none')}
            style={{ WebkitAppearance: 'none' as const, appearance: 'none' as const }}
          >
            <option value="">tutte le regioni</option>
            {index.regioni.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className={cn('absolute right-1 top-1/2 -translate-y-1/2 text-[9px] pointer-events-none', TER)}>▾</span>
        </div>

        <div className="relative">
          <select
            value={familyFilter}
            onChange={e => setFamilyFilter(e.target.value)}
            className={cn(FIELD_BASE, 'pr-5 py-1 cursor-pointer appearance-none')}
            style={{ WebkitAppearance: 'none' as const, appearance: 'none' as const }}
          >
            <option value="">tutte le famiglie</option>
            {vocab.families.filter(f => !f.deprecated).map(f => <option key={f.id} value={f.id}>{cultFamilyShort(f.label)}</option>)}
          </select>
          <span className={cn('absolute right-1 top-1/2 -translate-y-1/2 text-[9px] pointer-events-none', TER)}>▾</span>
        </div>

        <div className="flex items-baseline gap-1.5">
          {modo('family', 'per famiglia')}
          <span className={TER}>·</span>
          {modo('lemma', 'per lemma')}
          <span className={TER}>·</span>
          {modo('lares', 'griglia LARES')}
        </div>
      </div>

      {filteredLemmata.length === 0 && soloNeiTesti.length === 0 ? (
        <div className={cn('font-serif italic text-sm py-12 text-center', SEC)}>Nessuna attestazione per questi filtri.</div>
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
        <div>
          {[...filteredLemmata].sort((a, b) => b.count - a.count || a.lemma.localeCompare(b.lemma)).map(renderLemmaRow)}
          {renderSoloNeiTesti(soloNeiTesti)}
        </div>
      ) : (
        <div className="space-y-6">
          {familiesToRender.map(f => {
            const totAtt = f.lemmata.reduce((s, l) => s + l.count, 0);
            return (
              <section key={f.id}>
                <div className="flex items-baseline gap-2 mb-1.5 pb-1 border-b border-border/30">
                  <span
                    className="h-2 w-2 rounded-[1px] shrink-0 self-center"
                    style={{ backgroundColor: vocab.familyColor(f.id) }}
                  />
                  <h3 className="font-serif text-[15px] text-ink">{cultFamilyShort(f.label)}</h3>
                  <span className={cn('font-sans text-[11px]', TER)}>
                    {f.lemmata.length} lemmi · {schede(f.schedeCount)} · {atts(totAtt)}
                  </span>
                </div>
                <div>
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
