import React, { useMemo, useState } from 'react';
import {
  X, Plus, Trash2, Save, ChevronRight, ChevronUp, ChevronDown, AlertTriangle,
  BookMarked, Library, ShieldCheck, Loader2, Check, ScrollText, Link2, List,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  LitDataset, Saggio, Opera, Testimonium, Nucleo, TerminNotevole, LinkEsterno,
  Genere, GENERI, GENERE_LABELS, TIPI, TIPO_LABELS,
  LARES_GRID, CAMPO_COLOR, LaresCampo, LaresAmbito,
  RefType, REFTYPE_LABELS, opereById, risolviTutte, citaBreve, sigleDelSaggio,
} from '../lib/litSources';
import {
  FonteDati, verificaIntegrita, nuovaOpera, nuovoSaggio, nuovoNucleo,
  nuovoTestimonium, nuovoTestimoniumId, nuovoOperaId,
} from '../lib/litStore';
import { LiteraryMarkupEditor } from './LiteraryMarkupEditor';

/**
 * LiterarySourcesEditor — la redazione delle fonti letterarie.
 *
 * Quattro registri, che sono i quattro livelli del modello:
 *  - OPERE: l'indice bibliografico. Un'opera si scrive una volta e serve
 *    tutte le sue testimonianze.
 *  - TESTIMONIANZE: i passi. Vivono da sé, non dentro un saggio.
 *  - SAGGI: le trattazioni, che RICHIAMANO le testimonianze per id e le
 *    raggruppano in nuclei tematici.
 *  - CONTROLLI: i rimandi che nessun tipo TypeScript può verificare (opere
 *    che non risolvono, saggi che richiamano passi inesistenti, markup
 *    malformato). Sono gli errori che si commettono davvero redigendo.
 *
 * Il testo antico si marca con LiteraryMarkupEditor, cioè con lo stesso
 * sistema dell'edizione epigrafica: è la ragione per cui una divinità marcata
 * qui finisce negli stessi indici di una marcata sulla pietra.
 */

interface Props {
  dataset: LitDataset;
  onChange: (d: LitDataset) => void;
  onSalva: (messaggio: string) => void;
  onChiudi: () => void;
  fonte: FonteDati;
  sporco: boolean;
  salvando: boolean;
  errore?: string | null;
}

type Sezione = 'opere' | 'testimonianze' | 'saggi' | 'controlli';

/* ───────────────────────────────────────────────────────── campi base ───── */

const LABEL = 'block text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-muted/70 mb-1';
const INPUT =
  'w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-lg px-3 py-2 text-sm text-ink font-serif outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all placeholder:text-muted/35 placeholder:italic';

const Campo: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; className?: string; lang?: string; mono?: boolean;
}> = ({ label, value, onChange, placeholder, hint, className, lang, mono }) => (
  <div className={className}>
    <label className={LABEL}>{label}{hint && <span className="ml-1.5 normal-case tracking-normal font-normal italic text-muted/50">{hint}</span>}</label>
    <input value={value} lang={lang} placeholder={placeholder} onChange={e => onChange(e.target.value)}
      className={cn(INPUT, mono && 'font-mono text-xs')} />
  </div>
);

const Area: React.FC<{
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; hint?: string;
}> = ({ label, value, onChange, rows = 4, placeholder, hint }) => (
  <div>
    <label className={LABEL}>{label}{hint && <span className="ml-1.5 normal-case tracking-normal font-normal italic text-muted/50">{hint}</span>}</label>
    <textarea rows={rows} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
      className={cn(INPUT, 'leading-relaxed custom-scrollbar')} />
  </div>
);

const Scelta: React.FC<{
  label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; className?: string;
}> = ({ label, value, onChange, options, className }) => (
  <div className={className}>
    <label className={LABEL}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} className={cn(INPUT, 'cursor-pointer')}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const ListaTesti: React.FC<{
  label: string; values: string[]; onChange: (v: string[]) => void; rows?: number; placeholder?: string; hint?: string;
}> = ({ label, values, onChange, rows = 3, placeholder, hint }) => (
  <div>
    <label className={LABEL}>{label}{hint && <span className="ml-1.5 normal-case tracking-normal font-normal italic text-muted/50">{hint}</span>}</label>
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2 items-start">
          <textarea rows={rows} value={v} placeholder={placeholder}
            onChange={e => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
            className={cn(INPUT, 'leading-relaxed custom-scrollbar flex-1')} />
          <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="p-2 text-muted/40 hover:text-red-500 transition-colors shrink-0" title="Elimina">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, ''])}
        className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] text-accent hover:opacity-70 transition-opacity">
        <Plus className="h-3 w-3" /> Aggiungi
      </button>
    </div>
  </div>
);

const ListaInline: React.FC<{ label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string }> =
  ({ label, values, onChange, placeholder }) => (
    <Campo label={label} value={values.join(', ')} placeholder={placeholder} hint="separati da virgola"
      onChange={v => onChange(v.split(',').map(x => x.trim()).filter(Boolean))} />
  );

const ListaLink: React.FC<{ label: string; values: LinkEsterno[]; onChange: (v: LinkEsterno[]) => void }> =
  ({ label, values, onChange }) => (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="space-y-2">
        {values.map((l, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={l.label} placeholder="Perseus / Scaife"
              onChange={e => onChange(values.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              className={cn(INPUT, 'w-44 shrink-0')} />
            <input value={l.url} placeholder="https://…"
              onChange={e => onChange(values.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
              className={cn(INPUT, 'flex-1 font-mono text-xs')} />
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="p-2 text-muted/40 hover:text-red-500 transition-colors shrink-0" title="Elimina">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...values, { label: '', url: '' }])}
          className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] text-accent hover:opacity-70 transition-opacity">
          <Link2 className="h-3 w-3" /> Aggiungi link
        </button>
      </div>
    </div>
  );

const Sezioncina: React.FC<{ titolo: string; children: React.ReactNode; nota?: string }> = ({ titolo, children, nota }) => (
  <section className="space-y-3 pt-5 mt-5 border-t border-border/30 first:pt-0 first:mt-0 first:border-0">
    <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-ink/70">{titolo}</h4>
    {nota && <p className="text-[12px] font-serif italic text-muted/70 leading-snug -mt-1">{nota}</p>}
    {children}
  </section>
);

/* ═══════════════════════════════════════════════════ editor delle opere ══ */

const OpereEditor: React.FC<{ dataset: LitDataset; onChange: (d: LitDataset) => void }> = ({ dataset, onChange }) => {
  const [apertaId, setApertaId] = useState<string | null>(null);

  const usoDi = useMemo(() => {
    const m = new Map<string, number>();
    dataset.testimonia.forEach(t => m.set(t.operaId, (m.get(t.operaId) || 0) + 1));
    return m;
  }, [dataset.testimonia]);

  const patch = (id: string, fn: (o: Opera) => Opera) =>
    onChange({ ...dataset, opere: dataset.opere.map(o => (o.id === id ? fn(o) : o)) });

  const aggiungi = () => {
    const o = nuovaOpera(dataset.opere);
    onChange({ ...dataset, opere: [...dataset.opere, o] });
    setApertaId(o.id);
  };

  const ordinate = [...dataset.opere].sort((a, b) => a.datazioneSort - b.datazioneSort || a.autore.localeCompare(b.autore, 'it'));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[13px] font-serif italic text-muted/80 max-w-2xl leading-relaxed">
          L'indice delle opere spogliate. Autore, lingua, genere, datazione, edizione e testo online si
          scrivono qui una volta sola: le testimonianze li ereditano e aggiungono soltanto il locus.
        </p>
        <button type="button" onClick={aggiungi}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white hover:shadow-md transition-all">
          <Plus className="h-3 w-3" /> Nuova opera
        </button>
      </div>

      <div className="rounded-xl border border-border/40 overflow-hidden">
        {ordinate.map(o => {
          const uso = usoDi.get(o.id) || 0;
          const aperta = apertaId === o.id;
          return (
            <div key={o.id} className="border-b border-border/25 last:border-0">
              <button type="button" onClick={() => setApertaId(aperta ? null : o.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sidebar/50 transition-colors">
                <ChevronRight className={cn('h-3.5 w-3.5 text-muted/40 transition-transform shrink-0', aperta && 'rotate-90')} />
                <span className="font-serif text-[15px] text-ink flex-1 min-w-0 truncate">
                  {o.autore || <span className="italic text-muted/50">senza autore</span>}
                  {o.titolo && <span className="italic">, {o.titolo}</span>}
                </span>
                <span className="text-[11px] font-sans text-muted/60 shrink-0">{o.datazione || '—'}</span>
                <span className={cn('text-[10px] font-sans tabular-nums shrink-0', uso ? 'text-accent' : 'text-amber-600 dark:text-amber-400')}>
                  {uso} passi
                </span>
              </button>

              {aperta && (
                <div className="px-4 pb-5 pt-1 space-y-3 bg-sidebar/25">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Campo label="Autore" value={o.autore} onChange={v => patch(o.id, x => ({ ...x, autore: v }))} placeholder="Esiodo" />
                    <Campo label="Abbreviazione autore" value={o.autoreAbbr} onChange={v => patch(o.id, x => ({ ...x, autoreAbbr: v }))} placeholder="Hes." />
                    <Campo label="Titolo" value={o.titolo} onChange={v => patch(o.id, x => ({ ...x, titolo: v }))} placeholder="Teogonia" />
                    <Campo label="Sigla dell'opera" value={o.titoloAbbr} onChange={v => patch(o.id, x => ({ ...x, titoloAbbr: v }))}
                      placeholder="Th." hint="vuota per Strabone, Pausania…" />
                    <Campo label="Titolo originale" value={o.titoloOriginale || ''} lang={o.lingua}
                      onChange={v => patch(o.id, x => ({ ...x, titoloOriginale: v || undefined }))} placeholder="Θεογονία" />
                    <Scelta label="Lingua" value={o.lingua} onChange={v => patch(o.id, x => ({ ...x, lingua: v as 'grc' | 'lat' }))}
                      options={[{ v: 'grc', l: 'greco' }, { v: 'lat', l: 'latino' }]} />
                    <Scelta label="Tipo di fonte" value={o.refType} onChange={v => patch(o.id, x => ({ ...x, refType: v as RefType }))}
                      options={(['lit', 'ins', 'pap'] as RefType[]).map(r => ({ v: r, l: `${r} — ${REFTYPE_LABELS[r]}` }))} />
                    <Scelta label="Genere" value={o.genere} onChange={v => patch(o.id, x => ({ ...x, genere: v as Genere }))}
                      options={GENERI.map(g => ({ v: g, l: GENERE_LABELS[g] }))} />
                    <Campo label="Datazione" value={o.datazione} onChange={v => patch(o.id, x => ({ ...x, datazione: v }))}
                      placeholder="fine VIII – inizio VII sec. a.C." />
                    <Campo label="Anno per l'ordinamento" value={String(o.datazioneSort)} mono
                      onChange={v => patch(o.id, x => ({ ...x, datazioneSort: Number(v) || 0 }))}
                      placeholder="-700" hint="negativo = a.C." />
                  </div>
                  <Campo label="Edizione di riferimento" value={o.edizione} onChange={v => patch(o.id, x => ({ ...x, edizione: v }))}
                    placeholder="ed. M. L. West, Oxford 1966" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Campo label="CTS URN" value={o.ctsUrn || ''} mono hint="identificatore citabile"
                      onChange={v => patch(o.id, x => ({ ...x, ctsUrn: v || undefined }))} placeholder="urn:cts:greekLit:tlg0020.tlg001" />
                    <Campo label="TLG / PHI" value={o.tlg || ''} mono
                      onChange={v => patch(o.id, x => ({ ...x, tlg: v || undefined }))} placeholder="TLG 0020.001" />
                  </div>
                  <ListaLink label="Testo online" values={o.links || []} onChange={v => patch(o.id, x => ({ ...x, links: v.length ? v : undefined }))} />
                  <Area label="Nota sull'opera" rows={2} value={o.nota || ''} hint="tradizione, attribuzione, problemi di testo"
                    onChange={v => patch(o.id, x => ({ ...x, nota: v || undefined }))} />

                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <span className={LABEL}>identificatore</span>
                      <code className="font-mono text-[11px] text-muted/70">{o.id}</code>
                      {uso === 0 && (
                        <button type="button"
                          onClick={() => patch(o.id, x => ({ ...x, id: nuovoOperaId(x.autoreAbbr, x.titoloAbbr, dataset.opere.filter(y => y.id !== x.id)) }))}
                          className="text-[10px] font-sans uppercase tracking-wide text-accent hover:opacity-70">
                          rigenera
                        </button>
                      )}
                    </div>
                    <button type="button" disabled={uso > 0}
                      onClick={() => { onChange({ ...dataset, opere: dataset.opere.filter(x => x.id !== o.id) }); setApertaId(null); }}
                      title={uso > 0 ? `Citata da ${uso} testimonianze: prima vanno spostate` : 'Elimina l\'opera'}
                      className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] text-muted/50 hover:text-red-500 disabled:opacity-30 disabled:hover:text-muted/50 transition-colors">
                      <Trash2 className="h-3 w-3" /> Elimina
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {ordinate.length === 0 && <p className="px-4 py-8 text-center text-sm italic text-muted/60">Nessuna opera nell'indice.</p>}
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════ editor della testimonianza ══ */

const TestimoniumEditor: React.FC<{
  t: Testimonium; dataset: LitDataset;
  onChange: (t: Testimonium) => void;
  onElimina: () => void;
}> = ({ t, dataset, onChange, onElimina }) => {
  const opera = dataset.opere.find(o => o.id === t.operaId);
  const lingua = opera?.lingua || 'grc';
  const richiamata = dataset.saggi.filter(s => s.nuclei.some(n => n.testimonia.includes(t.id)));

  const setTermine = (i: number, w: TerminNotevole) =>
    onChange({ ...t, termini: t.termini.map((x, j) => (j === i ? w : x)) });

  const ordinate = [...dataset.opere].sort((a, b) => a.autore.localeCompare(b.autore, 'it'));

  return (
    <div className="space-y-1">
      <Sezioncina titolo="Fonte">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Scelta label="Opera" value={t.operaId} onChange={v => onChange({ ...t, operaId: v })} className="md:col-span-2"
            options={[
              ...(opera ? [] : [{ v: t.operaId, l: `— opera inesistente (${t.operaId || 'nessuna'}) —` }]),
              ...ordinate.map(o => ({ v: o.id, l: `${o.autore}, ${o.titolo}` })),
            ]} />
          <Campo label="Locus" value={t.locus} onChange={v => onChange({ ...t, locus: v })} placeholder="371–374" />
        </div>
        {opera ? (
          <p className="text-[12px] font-serif italic text-muted/70 leading-snug">
            {opera.datazione} · {GENERE_LABELS[opera.genere]} · {opera.lingua === 'grc' ? 'greco' : 'latino'} ·{' '}
            {t.edizioneSpecifica || opera.edizione}
          </p>
        ) : (
          <p className="text-[12px] font-sans text-red-600 dark:text-red-400">
            Nessuna opera collegata: la testimonianza resta senza datazione, genere ed edizione.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Identificatore</label>
            <div className="flex gap-2">
              <input value={t.id} onChange={e => onChange({ ...t, id: e.target.value })} className={cn(INPUT, 'font-mono text-xs')} />
              <button type="button" title="Rigenera dall'opera e dal locus"
                onClick={() => onChange({ ...t, id: nuovoTestimoniumId(t.operaId, t.locus, dataset.testimonia.filter(x => x.id !== t.id)) })}
                className="shrink-0 px-3 rounded-lg border border-border/50 text-[10px] font-sans uppercase tracking-wide text-accent hover:bg-sidebar/60 transition-colors">
                rigenera
              </button>
            </div>
          </div>
          <Campo label="Edizione diversa da quella dell'opera" value={t.edizioneSpecifica || ''} hint="raro"
            onChange={v => onChange({ ...t, edizioneSpecifica: v || undefined })} />
        </div>
      </Sezioncina>

      <Sezioncina titolo="Testo antico" nota="Stesso markup dell'edizione epigrafica: ciò che marchi qui entra negli indici del database.">
        <LiteraryMarkupEditor value={t.testo} lingua={lingua} onChange={v => onChange({ ...t, testo: v })} />
      </Sezioncina>

      <Sezioncina titolo="Traduzione">
        <Area label="Traduzione italiana" rows={5} value={t.traduzione} onChange={v => onChange({ ...t, traduzione: v })} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Campo label="Traduttore" value={t.traduttore} onChange={v => onChange({ ...t, traduttore: v })} />
          <Scelta label="Collazione" value={t.collazione} onChange={v => onChange({ ...t, collazione: v as Testimonium['collazione'] })}
            options={[
              { v: 'da-collazionare', l: 'da collazionare' },
              { v: 'verificato', l: 'verificato sull\'edizione' },
            ]} />
        </div>
      </Sezioncina>

      <Sezioncina titolo="Analisi">
        <div>
          <label className={LABEL}>Tipologia della testimonianza</label>
          <div className="flex flex-wrap gap-1.5">
            {TIPI.map(x => {
              const on = t.tipo.includes(x);
              return (
                <button key={x} type="button"
                  onClick={() => onChange({ ...t, tipo: on ? t.tipo.filter(y => y !== x) : [...t.tipo, x] })}
                  className={cn('px-2 py-1 rounded-md text-[11px] font-sans transition-colors border',
                    on ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border/40 text-muted/70 hover:text-ink')}>
                  {TIPO_LABELS[x]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={LABEL}>
            Marcatori concettuali LARES
            <span className="ml-1.5 normal-case tracking-normal font-normal italic text-muted/50">
              i nove della griglia; il toolbox si applica invece nel markup, parola per parola
            </span>
          </label>
          <div className="space-y-1.5">
            {LARES_GRID.map(c => (
              <div key={c.campo} className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-sans uppercase tracking-wide w-32 shrink-0" style={{ color: CAMPO_COLOR[c.campo] }}>
                  {c.label}
                </span>
                {c.ambiti.map(a => {
                  const on = t.lares.some(m => m.ambito === a.id);
                  return (
                    <button key={a.id} type="button" title={a.en}
                      onClick={() => onChange({
                        ...t,
                        lares: on ? t.lares.filter(m => m.ambito !== a.id)
                          : [...t.lares, { campo: c.campo as LaresCampo, ambito: a.id as LaresAmbito }],
                      })}
                      className={cn('px-2 py-1 rounded-md text-[11px] font-sans transition-colors border', !on && 'border-border/40 text-muted/70 hover:text-ink')}
                      style={on ? { borderColor: CAMPO_COLOR[c.campo], color: CAMPO_COLOR[c.campo], backgroundColor: `color-mix(in srgb, ${CAMPO_COLOR[c.campo]} 12%, transparent)` } : undefined}>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <Area label="Commento" rows={8} value={t.commento} onChange={v => onChange({ ...t, commento: v })}
          hint="che cosa il passo fa alla costruzione della divinità, non che cosa dice" />
      </Sezioncina>

      <Sezioncina titolo="Termini notevoli">
        <div className="space-y-2">
          {t.termini.map((w, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input value={w.forma} lang={lingua} placeholder="forma attestata"
                onChange={e => setTermine(i, { ...w, forma: e.target.value })}
                className={cn(INPUT, 'w-40 shrink-0', lingua === 'grc' && 'font-greek')} />
              <input value={w.lemma} lang={lingua} placeholder="lemma"
                onChange={e => setTermine(i, { ...w, lemma: e.target.value })}
                className={cn(INPUT, 'w-40 shrink-0', lingua === 'grc' && 'font-greek')} />
              <input value={w.nota || ''} placeholder="perché è notevole"
                onChange={e => setTermine(i, { ...w, nota: e.target.value || undefined })}
                className={cn(INPUT, 'flex-1')} />
              <button type="button" onClick={() => onChange({ ...t, termini: t.termini.filter((_, j) => j !== i) })}
                className="p-2 text-muted/40 hover:text-red-500 transition-colors shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...t, termini: [...t.termini, { forma: '', lemma: '' }] })}
            className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] text-accent hover:opacity-70 transition-opacity">
            <Plus className="h-3 w-3" /> Aggiungi termine
          </button>
        </div>
      </Sezioncina>

      <Sezioncina titolo="Entità nominate" nota="Ciò che è già marcato nel testo entra negli indici da sé: qui si registra solo quello che il markup non copre.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ListaInline label="Divinità" values={t.divinita || []} placeholder="Selene, Helios"
            onChange={v => onChange({ ...t, divinita: v.length ? v : undefined })} />
          <ListaInline label="Personaggi mitici" values={t.personaggi || []} placeholder="Endimione"
            onChange={v => onChange({ ...t, personaggi: v.length ? v : undefined })} />
          <ListaInline label="Figure storiche" values={t.figure || []} placeholder="Caracalla"
            onChange={v => onChange({ ...t, figure: v.length ? v : undefined })} />
          <ListaInline label="Luoghi" values={t.luoghi || []} placeholder="Carre"
            onChange={v => onChange({ ...t, luoghi: v.length ? v : undefined })} />
        </div>
      </Sezioncina>

      <Sezioncina titolo="Rimandi">
        <ListaLink label="Link di questo passo" values={t.links || []}
          onChange={v => onChange({ ...t, links: v.length ? v : undefined })} />
        <ListaTesti label="Bibliografia" rows={2} values={t.bibliografia || []}
          onChange={v => onChange({ ...t, bibliografia: v.length ? v : undefined })} />
      </Sezioncina>

      <div className="pt-5 mt-5 border-t border-border/30 flex items-center justify-between gap-4">
        <span className="text-[11px] font-sans text-muted/50">
          {richiamata.length > 0
            ? `Richiamata da: ${richiamata.map(s => s.lemma).join(', ')}`
            : 'Non richiamata da nessun saggio — si legge solo dall\'elenco.'}
        </span>
        <button type="button" onClick={onElimina}
          className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] text-muted/50 hover:text-red-500 transition-colors">
          <Trash2 className="h-3 w-3" /> Elimina testimonianza
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════ elenco delle testimonianze ════ */

const TestimonianzeEditor: React.FC<{ dataset: LitDataset; onChange: (d: LitDataset) => void }> = ({ dataset, onChange }) => {
  const [apertoId, setApertoId] = useState<string | null>(null);
  const [filtroOpera, setFiltroOpera] = useState('');
  const risolte = useMemo(() => risolviTutte(dataset.testimonia, dataset.opere), [dataset]);

  const aggiungi = () => {
    const t = nuovoTestimonium(filtroOpera || dataset.opere[0]?.id || '', dataset.testimonia);
    onChange({ ...dataset, testimonia: [...dataset.testimonia, t] });
    setApertoId(t.id);
  };

  const elimina = (id: string) =>
    onChange({
      ...dataset,
      testimonia: dataset.testimonia.filter(x => x.id !== id),
      // e via anche i richiami dai saggi, o resterebbero rimandi ciechi
      saggi: dataset.saggi.map(s => ({
        ...s,
        nuclei: s.nuclei.map(n => ({ ...n, testimonia: n.testimonia.filter(x => x !== id) })),
      })),
    });

  const visibili = risolte
    .filter(t => !filtroOpera || t.operaId === filtroOpera)
    .sort((a, b) => a.datazioneSort - b.datazioneSort || a.autore.localeCompare(b.autore, 'it'));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-serif italic text-muted/80 max-w-xl leading-relaxed">
          I passi. Vivono da sé: un saggio li richiama, non li contiene.
        </p>
        <div className="flex items-center gap-2">
          <select value={filtroOpera} onChange={e => setFiltroOpera(e.target.value)} className={cn(INPUT, 'text-xs py-1.5 w-56 cursor-pointer')}>
            <option value="">Tutte le opere</option>
            {dataset.opere.map(o => <option key={o.id} value={o.id}>{o.autore}, {o.titolo}</option>)}
          </select>
          <button type="button" onClick={aggiungi} disabled={dataset.opere.length === 0}
            title={dataset.opere.length === 0 ? 'Prima serve almeno un\'opera nell\'indice' : undefined}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white disabled:opacity-40 hover:shadow-md transition-all">
            <Plus className="h-3 w-3" /> Nuova testimonianza
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 overflow-hidden">
        {visibili.map(t => {
          const aperto = apertoId === t.id;
          const grezza = dataset.testimonia.find(x => x.id === t.id)!;
          return (
            <div key={t.id} className="border-b border-border/25 last:border-0">
              <button type="button" onClick={() => setApertoId(aperto ? null : t.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sidebar/50 transition-colors">
                <ChevronRight className={cn('h-3.5 w-3.5 text-muted/40 transition-transform shrink-0', aperto && 'rotate-90')} />
                <span className="font-serif text-[14px] text-ink flex-1 min-w-0 truncate">
                  {t.operaRef.id ? <>{t.autore}, <span className="italic">{t.opera}</span> {t.locus}</>
                    : <span className="text-red-600 dark:text-red-400">opera non collegata — {t.id}</span>}
                </span>
                <span className="text-[11px] font-sans text-muted/50 shrink-0 hidden sm:block">{t.datazione}</span>
                {t.collazione === 'da-collazionare' && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
              </button>
              {aperto && (
                <div className="px-4 pb-6 pt-1 bg-sidebar/25">
                  <TestimoniumEditor
                    t={grezza} dataset={dataset}
                    onChange={next => onChange({ ...dataset, testimonia: dataset.testimonia.map(x => (x.id === t.id ? next : x)) })}
                    onElimina={() => { elimina(t.id); setApertoId(null); }}
                  />
                </div>
              )}
            </div>
          );
        })}
        {visibili.length === 0 && <p className="px-4 py-8 text-center text-sm italic text-muted/60">Nessuna testimonianza.</p>}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════ editor del saggio ══════ */

const SaggioEditor: React.FC<{
  saggio: Saggio; dataset: LitDataset; onChange: (s: Saggio) => void; onElimina: () => void;
}> = ({ saggio, dataset, onChange, onElimina }) => {
  const [tab, setTab] = useState<'intestazione' | 'nuclei'>('intestazione');
  const opere = opereById(dataset.opere);
  const sigle = sigleDelSaggio(saggio);
  const risolte = useMemo(() => risolviTutte(dataset.testimonia, dataset.opere), [dataset]);

  const patchNucleo = (id: string, fn: (n: Nucleo) => Nucleo) =>
    onChange({ ...saggio, nuclei: saggio.nuclei.map(n => (n.id === id ? fn(n) : n)) });

  const sposta = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= saggio.nuclei.length) return;
    const next = [...saggio.nuclei];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...saggio, nuclei: next });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1 border-b border-border/40 pb-2">
        {([['intestazione', 'Intestazione'], ['nuclei', 'Nuclei tematici']] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={cn('px-2.5 py-1.5 rounded-md text-[10px] font-sans font-bold uppercase tracking-widest transition-colors',
              tab === id ? 'bg-accent/10 text-accent' : 'text-muted hover:text-ink')}>
            {label}{id === 'nuclei' && <span className="ml-1.5 opacity-50 tabular-nums">{saggio.nuclei.length}</span>}
          </button>
        ))}
        <span className="flex-1" />
        <button type="button" onClick={onElimina}
          className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] text-muted/40 hover:text-red-500 transition-colors">
          <Trash2 className="h-3 w-3" /> Elimina saggio
        </button>
      </div>

      {tab === 'intestazione' && (
        <div className="space-y-1">
          <Sezioncina titolo="Lemma" nota="Le voci LARES sono voci di lemma, non di divinità: il titolo è la parola.">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Campo label="Lemma" value={saggio.lemma} onChange={v => onChange({ ...saggio, lemma: v })} placeholder="Selene" />
              <Campo label="Forma greca" value={saggio.lemmaGreco || ''} lang="grc"
                onChange={v => onChange({ ...saggio, lemmaGreco: v || undefined })} placeholder="Σελήνη / Μήνη" />
              <Campo label="Traslitterazione" value={saggio.traslitterazione || ''}
                onChange={v => onChange({ ...saggio, traslitterazione: v || undefined })} placeholder="Selḗnē" />
            </div>
            <Campo label="Sottotitolo" value={saggio.sottotitolo} onChange={v => onChange({ ...saggio, sottotitolo: v })}
              placeholder="la luna divinizzata nelle fonti greche e latine" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Campo label="Identificatore" value={saggio.id} onChange={v => onChange({ ...saggio, id: v })} mono />
              <Campo label="Redazione" value={saggio.redazione} onChange={v => onChange({ ...saggio, redazione: v })} />
              <Campo label="Aggiornamento" value={saggio.aggiornamento} onChange={v => onChange({ ...saggio, aggiornamento: v })} placeholder="2026-08-31" />
            </div>
          </Sezioncina>

          <Sezioncina titolo="Morfologia ed etimologia" nota="Le due sezioni di apertura delle schede LARES. Facoltative: si mostrano solo se scritte.">
            <Area label="Morfologia" rows={2} value={saggio.morfologia || ''} hint="forme, flessione, varianti"
              onChange={v => onChange({ ...saggio, morfologia: v || undefined })} />
            <ListaTesti label="Etimologia" rows={4} values={saggio.etimologia || []}
              onChange={v => onChange({ ...saggio, etimologia: v.length ? v : undefined })} />
          </Sezioncina>

          <Sezioncina titolo="Cappello" nota="I paragrafi introduttivi: il primo è quello che si legge in grande.">
            <ListaTesti label="Paragrafi" values={saggio.cappello} onChange={v => onChange({ ...saggio, cappello: v })} rows={5} />
          </Sezioncina>

          <Sezioncina titolo="Discussione" nota="Che cosa i testi dicono e che cosa tacciono.">
            <ListaTesti label="Paragrafi" values={saggio.sintesi} onChange={v => onChange({ ...saggio, sintesi: v })} rows={5} />
          </Sezioncina>

          <Sezioncina titolo="Bibliografia">
            <ListaTesti label="Corpora" rows={2} values={saggio.bibliografiaCorpora || []}
              onChange={v => onChange({ ...saggio, bibliografiaCorpora: v.length ? v : undefined })} />
            <ListaTesti label="Studi" rows={2} values={saggio.bibliografia} onChange={v => onChange({ ...saggio, bibliografia: v })} />
          </Sezioncina>

          <Sezioncina titolo="Ponte con il corpus epigrafico"
            nota="Le chiavi con cui il saggio pesca le iscrizioni dal catalogo: sono i «key» normalizzati del markup, non stringhe di ricerca.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ListaInline label="Divinità" values={saggio.chiaviCorpus?.divinita || []} placeholder="Men"
                onChange={v => onChange({ ...saggio, chiaviCorpus: { ...saggio.chiaviCorpus, divinita: v } })} />
              <ListaInline label="Epiteti" values={saggio.chiaviCorpus?.epiteti || []} placeholder="Tyrannos, Askaenos"
                onChange={v => onChange({ ...saggio, chiaviCorpus: { ...saggio.chiaviCorpus, epiteti: v } })} />
            </div>
          </Sezioncina>
        </div>
      )}

      {tab === 'nuclei' && (
        <div className="space-y-4">
          <p className="text-[13px] font-serif italic text-muted/80 max-w-2xl leading-relaxed">
            I nuclei sono una scelta redazionale, non un dato calcolato: raggruppano le testimonianze
            secondo una tesi sul materiale, e determinano sia l'ordine della vista Lettura sia le sigle
            T1, T2… che valgono solo dentro questo saggio.
          </p>

          {saggio.nuclei.map((n, i) => (
            <div key={n.id} className="rounded-xl border border-border/40 p-4 space-y-3 bg-[var(--card)]/40">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1">
                  <button type="button" onClick={() => sposta(i, -1)} disabled={i === 0}
                    className="text-muted/40 hover:text-accent disabled:opacity-20 transition-colors"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => sposta(i, 1)} disabled={i === saggio.nuclei.length - 1}
                    className="text-muted/40 hover:text-accent disabled:opacity-20 transition-colors"><ChevronDown className="h-3.5 w-3.5" /></button>
                </div>
                <div className="flex-1 space-y-3">
                  <Campo label="Titolo" value={n.titolo} onChange={v => patchNucleo(n.id, x => ({ ...x, titolo: v }))}
                    placeholder="I. Genealogia e statuto divino" />
                  <Area label="Cappello" rows={3} value={n.cappello} onChange={v => patchNucleo(n.id, x => ({ ...x, cappello: v }))} />
                  <div>
                    <label className={LABEL}>
                      Testimonianze richiamate
                      <span className="ml-1.5 normal-case tracking-normal font-normal italic text-muted/50">nell'ordine di lettura</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {risolte
                        .slice()
                        .sort((a, b) => a.datazioneSort - b.datazioneSort)
                        .map(t => {
                          const dentro = n.testimonia.includes(t.id);
                          const altrove = !dentro && saggio.nuclei.some(m => m.id !== n.id && m.testimonia.includes(t.id));
                          return (
                            <button key={t.id} type="button"
                              onClick={() => patchNucleo(n.id, x => ({
                                ...x,
                                testimonia: dentro ? x.testimonia.filter(s => s !== t.id) : [...x.testimonia, t.id],
                              }))}
                              title={`${citaBreve(t)}${altrove ? ' — già in un altro nucleo di questo saggio' : ''}`}
                              className={cn('px-2 py-1 rounded-md text-[11px] font-sans transition-colors border max-w-[16rem] truncate',
                                dentro ? 'border-accent/40 bg-accent/10 text-accent'
                                  : altrove ? 'border-border/30 text-muted/30'
                                    : 'border-border/40 text-muted/70 hover:text-ink')}>
                              {dentro && <span className="font-bold mr-1">{sigle.get(t.id)}</span>}
                              {citaBreve(t) || t.id}
                            </button>
                          );
                        })}
                      {risolte.length === 0 && <span className="text-[12px] italic text-muted/50">Nessuna testimonianza catalogata.</span>}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => onChange({ ...saggio, nuclei: saggio.nuclei.filter(x => x.id !== n.id) })}
                  className="p-2 text-muted/40 hover:text-red-500 transition-colors shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}

          <button type="button" onClick={() => onChange({ ...saggio, nuclei: [...saggio.nuclei, nuovoNucleo(saggio)] })}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white hover:shadow-md transition-all">
            <Plus className="h-3 w-3" /> Nuovo nucleo
          </button>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════ il pannello ════ */

export const LiterarySourcesEditor: React.FC<Props> = ({
  dataset, onChange, onSalva, onChiudi, fonte, sporco, salvando, errore,
}) => {
  const [sezione, setSezione] = useState<Sezione>('testimonianze');
  const [saggioId, setSaggioId] = useState<string | null>(dataset.saggi[0]?.id || null);
  const [messaggio, setMessaggio] = useState('');
  const [nuovoLemma, setNuovoLemma] = useState('');

  const problemi = useMemo(() => verificaIntegrita(dataset), [dataset]);
  const errori = problemi.filter(p => p.severita === 'errore');
  const saggio = dataset.saggi.find(s => s.id === saggioId) || null;

  const SEZIONI: { id: Sezione; label: string; icon: React.ReactNode; badge: number }[] = [
    { id: 'opere', label: 'Opere', icon: <Library className="h-3.5 w-3.5" />, badge: dataset.opere.length },
    { id: 'testimonianze', label: 'Testimonianze', icon: <List className="h-3.5 w-3.5" />, badge: dataset.testimonia.length },
    { id: 'saggi', label: 'Saggi', icon: <ScrollText className="h-3.5 w-3.5" />, badge: dataset.saggi.length },
    { id: 'controlli', label: 'Controlli', icon: <ShieldCheck className="h-3.5 w-3.5" />, badge: problemi.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onChiudi} />
      <div className="relative w-full h-full md:h-[92vh] md:w-[96vw] max-w-[1500px] bg-parchment border border-border md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        <div className="shrink-0 px-5 md:px-8 py-4 border-b border-border/40 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 shrink-0" style={{ color: 'var(--lit)' }} />
            <h2 className="font-serif font-bold text-ink text-lg leading-none">Redazione delle fonti letterarie</h2>
            <span className={cn('text-[10px] font-sans uppercase tracking-wide px-1.5 py-0.5 rounded-sm',
              fonte === 'archivio' ? 'text-accent bg-accent/10' : 'text-amber-600 dark:text-amber-400 bg-amber-500/10')}>
              {fonte === 'archivio' ? 'archivio' : 'seme compilato'}
            </span>
          </div>

          <span className="flex-1" />

          <input value={messaggio} onChange={e => setMessaggio(e.target.value)}
            placeholder="Descrivi la modifica (facoltativo)" className={cn(INPUT, 'w-full md:w-72 text-xs py-1.5')} />
          <button type="button"
            onClick={() => onSalva(messaggio.trim() || 'Fonti letterarie: aggiornamento redazionale')}
            disabled={salvando || !sporco || errori.length > 0}
            title={errori.length > 0 ? `${errori.length} errori di integrità da risolvere in «Controlli»` : undefined}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white disabled:opacity-40 hover:shadow-md transition-all">
            {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {salvando ? 'Salvataggio…' : sporco ? 'Salva' : 'Salvato'}
          </button>
          <button type="button" onClick={onChiudi} className="p-2 text-muted hover:text-ink transition-colors" title="Chiudi">
            <X className="h-4 w-4" />
          </button>
        </div>

        {errore && (
          <div className="shrink-0 px-5 md:px-8 py-2 bg-red-500/10 border-b border-red-500/25 text-[12px] font-sans text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {errore}
          </div>
        )}
        {fonte === 'seme' && (
          <div className="shrink-0 px-5 md:px-8 py-2 bg-amber-500/[0.07] border-b border-amber-500/20 text-[12px] font-serif text-muted/85 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            Stai lavorando sul seme compilato nel bundle: nessuno ha ancora salvato un archivio. Il primo salvataggio lo crea sulla repo dati.
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-56 shrink-0 bg-sidebar border-b md:border-b-0 md:border-r border-border p-4 md:p-5 md:overflow-y-auto custom-scrollbar">
            <nav className="flex md:block gap-1.5 md:space-y-1.5">
              {SEZIONI.map(s => (
                <button key={s.id} type="button" onClick={() => setSezione(s.id)}
                  className={cn('w-full text-left px-3.5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center gap-2',
                    sezione === s.id ? 'nav-pill-active text-accent' : 'text-muted hover:text-ink')}>
                  {s.icon}<span className="flex-1">{s.label}</span>
                  <span className="opacity-50 tabular-nums">{s.badge}</span>
                </button>
              ))}
            </nav>

            {sezione === 'saggi' && (
              <div className="mt-6 hidden md:block">
                <div className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-muted/40 mb-2">Saggi</div>
                <div className="space-y-0.5">
                  {dataset.saggi.map(s => (
                    <button key={s.id} type="button" onClick={() => setSaggioId(s.id)}
                      className={cn('w-full text-left px-2.5 py-1.5 rounded-md text-[13px] font-serif transition-colors',
                        saggioId === s.id ? 'bg-accent/10 text-accent' : 'text-ink/80 hover:bg-sidebar/80')}>
                      {s.lemma}
                      <span className="block text-[10px] font-sans text-muted/50">
                        {s.nuclei.reduce((n, x) => n + x.testimonia.length, 0)} richiami
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-1.5">
                  <input value={nuovoLemma} onChange={e => setNuovoLemma(e.target.value)} placeholder="Nuovo saggio"
                    className={cn(INPUT, 'text-xs py-1.5')} />
                  <button type="button" disabled={!nuovoLemma.trim()}
                    onClick={() => {
                      const s = nuovoSaggio(nuovoLemma.trim(), dataset.saggi);
                      onChange({ ...dataset, saggi: [...dataset.saggi, s] });
                      setSaggioId(s.id); setNuovoLemma('');
                    }}
                    className="shrink-0 px-2 rounded-lg bg-accent text-white disabled:opacity-30 transition-all">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 md:p-8">
            {sezione === 'opere' && <OpereEditor dataset={dataset} onChange={onChange} />}
            {sezione === 'testimonianze' && <TestimonianzeEditor dataset={dataset} onChange={onChange} />}

            {sezione === 'saggi' && (saggio ? (
              <SaggioEditor
                saggio={saggio}
                dataset={dataset}
                onChange={next => onChange({ ...dataset, saggi: dataset.saggi.map(s => (s.id === saggio.id ? next : s)) })}
                onElimina={() => {
                  onChange({ ...dataset, saggi: dataset.saggi.filter(s => s.id !== saggio.id) });
                  setSaggioId(dataset.saggi.find(s => s.id !== saggio.id)?.id || null);
                }}
              />
            ) : (
              <p className="text-sm italic text-muted/60 py-16 text-center">Nessun saggio selezionato.</p>
            ))}

            {sezione === 'controlli' && (
              <div className="space-y-3 max-w-3xl">
                <p className="text-[13px] font-serif italic text-muted/80 leading-relaxed">
                  Controlli di coerenza fra oggetti: rimandi che non risolvono, identificatori duplicati,
                  markup malformato. Con errori aperti il salvataggio resta bloccato — gli avvisi no,
                  quelli sono lavoro dichiarato.
                </p>
                {problemi.length === 0 ? (
                  <p className="text-sm font-serif italic text-accent flex items-center gap-2 py-8">
                    <Check className="h-4 w-4" /> Nessun problema: rimandi, identificatori e markup sono coerenti.
                  </p>
                ) : (
                  problemi.map((p, i) => (
                    <div key={i} className={cn('flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 border text-[13px] font-serif',
                      p.severita === 'errore'
                        ? 'text-red-700 dark:text-red-400 bg-red-500/8 border-red-500/25'
                        : 'text-amber-800 dark:text-amber-400 bg-amber-500/8 border-amber-500/25')}>
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        <span className="font-mono not-italic text-[10px] opacity-60 mr-2">{p.dove}</span>
                        {p.messaggio}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiterarySourcesEditor;
