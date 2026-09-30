import React, { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { formatIlaLabel } from '../lib/xmlUtils';
import { Monumento, VoceLint } from '../types';
import { buildClassificationAudit } from '../lib/epithetIndex';
import { dataNotte, useControlliNotturni } from '../lib/controlliNotturni';
import { BibliographyIndex, BiblioApplyResult, BiblioReplacement } from './BibliographyIndex';

/**
 * CoerenzaPanel — dove il corpus non è uniforme con sé stesso.
 *
 * Riunisce tre controlli che prima stavano in linguette separate:
 *   · Controlli della notte: il lint della repo dati (scripts/lint-corpus.py)
 *     così come l'hanno lasciato i controlli notturni in
 *     revisione/controlli.json, scheda per scheda, con i problemi nuovi in
 *     evidenza. Le forme cultuali non marcate le trasforma in proposte la
 *     routine ila-lessico-candidati: quelle si decidono in Revisione;
 *   · Grafie: varianti grafiche dello stesso valore e classificazione
 *     divinità / epiteti, calcolate qui sulle schede caricate;
 *   · Bibliografia: censimento delle diciture e modifica in blocco.
 * I campi vuoti non sono affar suo: li conta Completezza.
 *
 * Veste da indice a stampa (vedi CultLexiconPanel): niente riquadri, il colore
 * solo sul segno.
 */

const SEC = 'text-muted';
const TER = 'text-muted/60';

type Vista = 'notte' | 'grafie' | 'bibliografia';

interface Props {
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
  /** Apre una scheda da un'etichetta «ILA-018»; false se non c'è. */
  onApriScheda: (etichetta: string) => boolean;
  onVaiARevisione: () => void;
  onBiblioApply: (edits: BiblioReplacement[]) => Promise<BiblioApplyResult>;
  biblioProgress: { done: number; total: number } | null;
}

export function CoerenzaPanel(props: Props) {
  const [vista, setVista] = useState<Vista>('notte');
  const { dati, caricamento, ricarica } = useControlliNotturni();
  const nLint = dati ? dati.lint.errori.length + dati.lint.avvisi.length : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden max-w-6xl mx-auto w-full">
      <div className="shrink-0 mb-5 pb-2 border-b border-border/40">
        <h2 className="font-serif text-xl text-ink">Coerenza</h2>
        <p className={cn('mt-1 font-serif italic text-[13px]', SEC)}>
          Segnalazioni da verificare sulle edizioni a stampa e da correggere nello XML: qui non si modifica niente, tranne la bibliografia in blocco.
        </p>
        <div className="mt-3 flex items-baseline gap-x-5">
          {([
            ['notte', 'Controlli della notte', nLint],
            ['grafie', 'Grafie e classificazione', 0],
            ['bibliografia', 'Bibliografia', 0],
          ] as const).map(([v, label, n]) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={cn('font-serif text-[15px] transition-colors', vista === v ? 'text-accent italic' : 'text-muted hover:text-ink')}
            >
              {label}
              {n ? <span className="ml-1 font-sans not-italic text-[11px] tabular-nums text-muted/60">{n}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {vista === 'notte' && (
        <ControlliDellaNotte
          dati={dati}
          caricamento={caricamento}
          onRicarica={ricarica}
          onApriScheda={props.onApriScheda}
          onVaiARevisione={props.onVaiARevisione}
        />
      )}
      {vista === 'grafie' && <Grafie monumenti={props.monumenti} onSelectMonumento={props.onSelectMonumento} />}
      {vista === 'bibliografia' && (
        <BibliographyIndex
          monumenti={props.monumenti}
          onApply={props.onBiblioApply}
          progress={props.biblioProgress}
          onSelectMonumento={props.onSelectMonumento}
        />
      )}
    </div>
  );
}

// ── Controlli della notte ────────────────────────────────────────────────

const GENERI: { id: VoceLint['genere']; titolo: string; nota?: string }[] = [
  { id: 'altro', titolo: 'Da controllare' },
  { id: 'keywords', titolo: 'Epiteti nel testo ma non negli indici', nota: 'manca la voce fra le keywords «epiteti»: la scheda non compare negli indici di quell\'epiteto' },
  { id: 'lemma', titolo: 'Forme cultuali non marcate', nota: 'la routine del lessico cultuale ne fa proposte, con il frammento XML pronto' },
];

function ControlliDellaNotte({ dati, caricamento, onRicarica, onApriScheda, onVaiARevisione }: {
  dati: ReturnType<typeof useControlliNotturni>['dati'];
  caricamento: boolean;
  onRicarica: () => void;
  onApriScheda: (etichetta: string) => boolean;
  onVaiARevisione: () => void;
}) {
  const [soloNuovi, setSoloNuovi] = useState(false);

  if (caricamento) return <p className={cn('font-serif italic text-[13px]', SEC)}>Caricamento…</p>;
  if (!dati) {
    return (
      <p className={cn('py-10 text-center font-serif italic text-[14px]', TER)}>
        Nessun esito dei controlli notturni nella repo dati: lo porta lì scripts/raccogli-revisione.py alla fine di ogni notte.
      </p>
    );
  }

  const filtra = (l: VoceLint[]) => (soloNuovi ? l.filter(v => v.nuovo) : l);
  const errori = filtra(dati.lint.errori);
  const avvisi = filtra(dati.lint.avvisi);
  const nNuovi = [...dati.lint.errori, ...dati.lint.avvisi].filter(v => v.nuovo).length;

  const Voce = ({ v }: { v: VoceLint }) => (
    <div className="flex items-baseline gap-3 px-1.5 py-[3px] border-b border-border/15">
      <button
        onClick={() => onApriScheda(v.scheda)}
        className="shrink-0 w-16 text-left font-sans text-[11px] tabular-nums text-ink hover:text-accent transition-colors"
      >
        {v.scheda}
      </button>
      <span className="font-serif text-[14px] text-ink">{v.testo}</span>
      <span className="flex-1" />
      {v.nuovo && <span className={cn('shrink-0 font-serif italic text-[12px]', SEC)}>nuovo</span>}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto pr-3 pb-10">
      <div className={cn('mb-5 flex flex-wrap items-baseline gap-x-5 gap-y-1 font-serif text-[13px]', SEC)}>
        <span>
          Lint della repo dati, {dataNotte(dati.data)}: {dati.lint.errori.length} errori, {dati.lint.avvisi.length} avvisi
          {nNuovi ? `, ${nNuovi} nuovi rispetto alla notte prima` : ''}.
        </span>
        {nNuovi > 0 && (
          <label className="flex items-baseline gap-1.5 cursor-pointer">
            <input type="checkbox" checked={soloNuovi} onChange={e => setSoloNuovi(e.target.checked)} className="accent-[var(--accent)] translate-y-[1px]" />
            solo i nuovi
          </label>
        )}
        <button onClick={onRicarica} className={cn('ml-auto font-serif italic text-[12px] hover:text-accent transition-colors', TER)}>ricarica</button>
      </div>

      {errori.length > 0 && (
        <section className="mb-8">
          <h3 className="font-serif text-[15px] text-ink mb-1.5 pb-1 border-b border-border/30 flex items-baseline gap-2">
            <span className="self-center h-1.5 w-1.5 rounded-full bg-danger" aria-hidden />
            Errori
            <span className={cn('font-sans text-[11px]', TER)}>{errori.length}</span>
          </h3>
          {errori.map((v, i) => <Voce key={i} v={v} />)}
        </section>
      )}

      {GENERI.map(g => {
        const lista = avvisi.filter(v => v.genere === g.id);
        if (!lista.length) return null;
        return (
          <section key={g.id} className="mb-8">
            <h3 className="font-serif text-[15px] text-ink mb-0.5 pb-1 border-b border-border/30 flex items-baseline gap-2">
              {g.titolo}
              <span className={cn('font-sans text-[11px]', TER)}>{lista.length}</span>
              {g.id === 'lemma' && (
                <button onClick={onVaiARevisione} className={cn('ml-auto font-serif italic text-[12px] underline decoration-dotted underline-offset-2 hover:text-accent transition-colors', TER)}>
                  vai alle proposte in Revisione
                </button>
              )}
            </h3>
            {g.nota && <p className={cn('mb-1.5 font-serif italic text-[12px] px-1.5', TER)}>{g.nota}</p>}
            {lista.map((v, i) => <Voce key={i} v={v} />)}
          </section>
        );
      })}

      {errori.length === 0 && avvisi.length === 0 && (
        <p className={cn('py-10 text-center font-serif italic text-[14px]', TER)}>
          {soloNuovi ? 'Nessun problema nuovo stanotte.' : 'Il lint non ha trovato niente.'}
        </p>
      )}
    </div>
  );
}

// ── Grafie e classificazione ────────────────────────────────────────────

// Minuscole, niente accenti, sigma finale unificato, spazi collassati: due
// valori con la stessa chiave ma forma grezza diversa sono sospetti.
const norm = (s: string) => s
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/ς/g, 'σ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const CAMPI: { label: string; estrai: (m: Monumento) => string[] }[] = [
  { label: 'Divinità', estrai: m => m.divinita || [] },
  { label: 'Epiteti', estrai: m => m.epiteti || [] },
  { label: 'Onomastica', estrai: m => m.onomastica || [] },
  { label: 'Città', estrai: m => (m.citta ? [m.citta] : []) },
  { label: 'Regione', estrai: m => (m.regione ? [m.regione] : []) },
  { label: 'Tipo oggetto', estrai: m => (m.tipo ? [m.tipo] : []) },
  { label: 'Materiale', estrai: m => (m.materiale ? [m.materiale] : []) },
];

function analizza(monumenti: Monumento[], label: string, estrai: (m: Monumento) => string[]) {
  const gruppi: Record<string, Record<string, number[]>> = {};
  for (const m of monumenti) {
    for (const raw of estrai(m)) {
      const v = (raw || '').trim();
      if (!v) continue;
      const k = norm(v);
      ((gruppi[k] ||= {})[v] ||= []).push(m.id);
    }
  }
  const conflitti = Object.entries(gruppi)
    .filter(([, varianti]) => Object.keys(varianti).length > 1)
    .map(([k, varianti]) => ({
      key: k,
      varianti: Object.entries(varianti)
        .map(([forma, ids]) => ({ forma, ids: [...new Set(ids)] }))
        .sort((a, b) => b.ids.length - a.ids.length),
    }))
    .sort((a, b) => b.varianti.length - a.varianti.length);
  return { label, conflitti, distinti: Object.keys(gruppi).length };
}

function Grafie({ monumenti, onSelectMonumento }: { monumenti: Monumento[]; onSelectMonumento: (m: Monumento) => void }) {
  const rapporti = useMemo(() => CAMPI.map(c => analizza(monumenti, c.label, c.estrai)), [monumenti]);
  const markupLetterale = useMemo(
    () => monumenti.filter(m => (m.testo || '').includes('&lt;persName') || (m.testo || '').includes('&lt;rs')),
    [monumenti],
  );
  const audit = useMemo(() => buildClassificationAudit(monumenti), [monumenti]);
  const naRelated = audit.neverAlone.filter(d => d.relatedNames.length > 0);
  const naPlain = audit.neverAlone.filter(d => d.relatedNames.length === 0);
  const nConflitti = rapporti.reduce((s, r) => s + r.conflitti.length, 0);

  const Schede = ({ ids }: { ids: number[] }) => (
    <span className="inline-flex flex-wrap gap-x-2.5 gap-y-0.5">
      {ids.slice(0, 20).map(id => {
        const m = monumenti.find(x => x.id === id);
        return (
          <button key={id} onClick={() => m && onSelectMonumento(m)}
            className={cn('font-sans text-[11px] tabular-nums hover:text-accent transition-colors', SEC)}>
            {formatIlaLabel(id)}
          </button>
        );
      })}
      {ids.length > 20 && <span className={cn('font-sans text-[11px]', TER)}>+{ids.length - 20}</span>}
    </span>
  );

  const Titolo = ({ children, n, nota }: { children: React.ReactNode; n?: number; nota?: string }) => (
    <h3 className="font-serif text-[15px] text-ink mb-1.5 pb-1 border-b border-border/30 flex items-baseline gap-2">
      {children}
      {n !== undefined && <span className={cn('font-sans text-[11px]', TER)}>{n}</span>}
      {nota && <span className={cn('ml-auto font-serif italic text-[12px] text-right', TER)}>{nota}</span>}
    </h3>
  );

  return (
    <div className="flex-1 overflow-y-auto pr-3 pb-10 space-y-8">
      {markupLetterale.length > 0 && (
        <section>
          <Titolo n={markupLetterale.length} nota="i nomi al loro interno non entrano negli indici">
            <span className="self-center h-1.5 w-1.5 rounded-full bg-danger" aria-hidden />
            Markup scritto come testo
          </Titolo>
          <p className={cn('mb-1.5 font-serif italic text-[12px] px-1.5', TER)}>
            Queste schede contengono &lt;persName&gt; come testo letterale invece che come tag: vanno ricodificate.
          </p>
          <div className="px-1.5"><Schede ids={markupLetterale.map(m => m.id)} /></div>
        </section>
      )}

      <section>
        <Titolo n={nConflitti} nota="stessa forma, grafie diverse: il primo clic apre la prima scheda con quella grafia">
          Varianti grafiche
        </Titolo>
        {nConflitti === 0 && <p className={cn('px-1.5 font-serif italic text-[13px]', TER)}>Nessuna variante grafica.</p>}
        {rapporti.filter(r => r.conflitti.length).map(r => (
          <div key={r.label} className="mb-3">
            <div className={cn('px-1.5 font-serif italic text-[13px]', SEC)}>
              {r.label.toLowerCase()} <span className={cn('font-sans not-italic text-[11px]', TER)}>· {r.distinti} valori, {r.conflitti.length} con varianti</span>
            </div>
            {r.conflitti.map(c => (
              <div key={c.key} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 px-1.5 py-[3px] border-b border-border/15">
                {c.varianti.map(v => (
                  <button key={v.forma} onClick={() => { const m = monumenti.find(x => v.ids.includes(x.id)); if (m) onSelectMonumento(m); }}
                    className="font-serif text-[14px] text-ink hover:text-accent transition-colors">
                    {v.forma}<span className={cn('ml-1 font-sans text-[11px]', TER)}>×{v.ids.length}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
      </section>

      {(naRelated.length > 0 || audit.divVsEpi.length > 0 || naPlain.length > 0) && (
        <section>
          <Titolo nota="da verificare sulle edizioni a stampa">Divinità ed epiteti</Titolo>

          {naRelated.length > 0 && (
            <div className="mb-3">
              <div className={cn('px-1.5 font-serif italic text-[13px]', SEC)}>
                probabile stessa divinità in forma variante <span className={cn('font-sans not-italic text-[11px]', TER)}>· {naRelated.length}</span>
              </div>
              {naRelated.map(d => (
                <div key={d.name} className="px-1.5 py-[3px] border-b border-border/15">
                  <span className="font-serif text-[14px] text-ink">{d.name}</span>
                  <span className={cn('ml-1 font-sans text-[11px]', TER)}>×{d.count}</span>
                  <span className={cn('ml-3 font-serif italic text-[12px]', SEC)}>confronta con {d.relatedNames.join(', ')}</span>
                  <div className="mt-0.5"><Schede ids={d.monumentIds} /></div>
                </div>
              ))}
            </div>
          )}

          {audit.divVsEpi.length > 0 && (
            <div className="mb-3">
              <div className={cn('px-1.5 font-serif italic text-[13px]', SEC)}>
                stessa forma come divinità e come epiteto <span className={cn('font-sans not-italic text-[11px]', TER)}>· {audit.divVsEpi.length}</span>
              </div>
              {audit.divVsEpi.map(t => (
                <div key={t.key} className="px-1.5 py-[3px] border-b border-border/15 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-0.5 items-baseline">
                  <span className={cn('font-serif italic text-[12px]', SEC)}>come divinità</span>
                  <span><span className="font-serif text-[14px] text-ink mr-3">{t.asDivinita.form}</span><Schede ids={t.asDivinita.monumentIds} /></span>
                  <span className={cn('font-serif italic text-[12px]', SEC)}>come epiteto</span>
                  <span><span className="font-serif text-[14px] text-ink mr-3">{t.asEpiteto.form}</span><Schede ids={t.asEpiteto.monumentIds} /></span>
                </div>
              ))}
            </div>
          )}

          {naPlain.length > 0 && (
            <p className={cn('px-1.5 font-serif text-[13px]', SEC)}>
              <span className="italic">Mai attestate da sole</span>
              <span className={TER}> (atteso anche per divinità reali, in un corpus incentrato su Men): </span>
              {naPlain.map((d, i) => <React.Fragment key={d.name}>{i > 0 && ', '}{d.name} <span className={cn('font-sans text-[11px]', TER)}>×{d.count}</span></React.Fragment>)}
            </p>
          )}
        </section>
      )}

      {audit.sharedEpithets.length > 0 && (
        <section>
          <Titolo n={audit.sharedEpithets.length} nota="condivisi davvero, o contaminazione da co-occorrenza">Epiteti condivisi da più divinità</Titolo>
          {audit.sharedEpithets.map(s => (
            <div key={s.epiteto} className="px-1.5 py-[3px] border-b border-border/15">
              <div className="font-serif text-[14px] text-ink italic">{s.epiteto}</div>
              {s.divinita.map(d => (
                <div key={d.name} className="flex flex-wrap items-baseline gap-x-3 pl-3">
                  <span className={cn('font-serif text-[13px] min-w-[8rem]', SEC)}>{d.name} <span className={cn('font-sans text-[11px]', TER)}>×{d.monumentIds.length}</span></span>
                  <Schede ids={d.monumentIds} />
                </div>
              ))}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
