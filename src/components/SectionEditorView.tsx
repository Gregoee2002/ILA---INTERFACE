import React, { useState, useEffect, useMemo, useRef, useId, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, Database, Save, Loader2, AlertTriangle, Check, X, Plus, Trash2,
  ChevronRight, ChevronUp, ChevronDown, FileText, Search, Download, Sparkles, LogIn, ShieldCheck
} from 'lucide-react';
import { cn, stripAccents } from '../lib/utils';
import { Monumento, OrigDate, Traduzione, Bibliografia, Revision, IconographicFigure, IconographicTrait } from '../types';
import { xmlToMonumenti } from '../lib/xmlUtils';
import { EditionMarkupEditor } from './EditionMarkupEditor';
import { ICONOGRAPHY_LABELS } from '../lib/iconographyLabels';
import { INSCRIPTION_TYPES, OBJECT_TYPES, MATERIALS, EXECUTION_TECHNIQUES, VocabTerm } from '../lib/eagleVocab';
import { extractIndexSuggestions, extractPersonsFromEdition } from '../lib/leidenMarkup';

/** Le 18 sezioni canoniche, ora mappate su campi Monumento (già separati nel corpus). */
export type SectionId =
  | 'title' | 'publication' | 'msIdentifier' | 'support' | 'layout' | 'hand'
  | 'origPlace' | 'origDate' | 'provenance' | 'profile' | 'revisions'
  | 'facsimile' | 'edition' | 'apparatus' | 'translations' | 'commentary'
  | 'bibliography' | 'iconography';

/* ================================================================
 * SectionEditorView — "Officina" di modifica a sezioni EpiDoc
 * Sorgente: file XML esterno oppure scheda dal corpus (server).
 * Le 18 sezioni sono elencate a sinistra; il pannello centrale
 * mostra il form della sezione attiva; il salvataggio riscrive
 * SOLO le sezioni modificate (patch-only, xenoData protetto).
 * ================================================================ */

type Source =
  | { kind: 'db'; filename: string }
  | { kind: 'external'; filename: string };

interface SectionMeta {
  id: SectionId;
  label: string;
  group: 'Intestazione' | 'Storia' | 'Testo' | 'Apparato scientifico';
}

const SECTION_META: SectionMeta[] = [
  { id: 'title',        label: 'Titolo',            group: 'Intestazione' },
  { id: 'publication',  label: 'Pubblicazione',     group: 'Intestazione' },
  { id: 'msIdentifier', label: 'Conservazione',     group: 'Intestazione' },
  { id: 'support',      label: 'Supporto',          group: 'Intestazione' },
  { id: 'layout',       label: 'Impaginazione',     group: 'Intestazione' },
  { id: 'hand',         label: 'Mano',              group: 'Intestazione' },
  { id: 'origPlace',    label: 'Luogo di origine',  group: 'Storia' },
  { id: 'origDate',     label: 'Datazione',         group: 'Storia' },
  { id: 'provenance',   label: 'Provenienza',       group: 'Storia' },
  { id: 'profile',      label: 'Indici',            group: 'Apparato scientifico' },
  { id: 'facsimile',    label: 'Facsimile',         group: 'Apparato scientifico' },
  { id: 'revisions',    label: 'Revisioni',         group: 'Apparato scientifico' },
  { id: 'edition',      label: 'Edizione',          group: 'Testo' },
  { id: 'apparatus',    label: 'Apparato critico',  group: 'Testo' },
  { id: 'translations', label: 'Traduzioni',        group: 'Testo' },
  { id: 'commentary',   label: 'Commento',          group: 'Testo' },
  { id: 'bibliography', label: 'Bibliografia',      group: 'Apparato scientifico' },
  { id: 'iconography',  label: 'Iconografia',       group: 'Apparato scientifico' },
];

const GROUPS: SectionMeta['group'][] = ['Intestazione', 'Storia', 'Testo', 'Apparato scientifico'];

/** Le quattro ripartizioni regionali del CMRDM (assegnate per fascia di numero, vedi xmlUtils),
 *  offerte come suggerimento — il campo resta testo libero per i corpora non-CMRDM. */
const CMRDM_REGIONS = ['Graecia', 'Dacia', 'Italia', 'Asia Minor'];

/** Suggerimenti di testo libero raccolti dai valori già distinti nel corpus in memoria:
 *  riduce le varianti di battitura sullo stesso repository o toponimo tra schede diverse. */
function collectDistinct(monumenti: Monumento[], field: keyof Monumento): string[] {
  const seen = new Set<string>();
  monumenti.forEach(m => {
    const v = (m as any)[field];
    if (typeof v === 'string' && v.trim()) seen.add(v.trim());
  });
  return Array.from(seen).sort((a, b) => a.localeCompare(b, 'it'));
}

/** Campi Monumento che compongono ciascuna sezione (per il diff e per lo stato presente/assente). */
const SECTION_FIELDS: Record<SectionId, (keyof Monumento)[]> = {
  title: ['titolo', 'textTypes'],
  publication: ['authority', 'tm', 'phi', 'corpus', 'numero'],
  msIdentifier: ['luogo_cons', 'msIdnos'],
  support: ['dim', 'materiale', 'materialRef', 'tipo', 'tipo_ref', 'dim_altezza', 'dim_larghezza', 'dim_profondita', 'dim_unita'],
  layout: ['layout_desc', 'scrittura', 'scrittura_ref'],
  hand: ['scrittura_note'],
  origPlace: ['citta', 'luogo_moderno', 'regione', 'place_ref_ancient', 'place_ref_modern', 'origPlace_nota'],
  origDate: ['origDates', 'data', 'data_inizio', 'data_fine'],
  provenance: ['luogo_rit', 'conserv'],
  profile: ['epiteti', 'divinita', 'onomastica', 'imperatori', 'persone'],
  revisions: ['revisions'],
  facsimile: ['facsimile_url', 'facsimile_desc'],
  edition: ['testo', 'anepigr', 'iscrizione'],
  apparatus: ['apparatus'],
  translations: ['traduzioni'],
  commentary: ['note_interne', 'note_interne_rawXml'],
  bibliography: ['bibliografia'],
  iconography: ['iconografia'],
};
const SECTION_FIELDS_FLAT: (keyof Monumento)[] = Array.from(new Set(Object.values(SECTION_FIELDS).flat()));

/** Gli indici (epiteti/divinità/onomastica/imperatori/persone) non sono più campi
 *  liberi: sono sempre lo specchio esatto dei <persName> già codificati nell'edizione.
 *  Nessuna digitazione manuale possibile: per aggiungere una voce all'indice si
 *  codifica il persName nel testo, non il contrario.
 *  Per le persone attestate (listPerson), etnico e nota sono cura editoriale che
 *  non compare nel markup dell'edizione: vengono preservati quando l'xml:id è
 *  ancora referenziato nel testo, e la voce viene rimossa solo se il persName
 *  corrispondente sparisce dal testo. */
function applyDerivedIndices(m: Monumento): Monumento {
  const idx = extractIndexSuggestions(m.testo || '');
  const found = extractPersonsFromEdition(m.testo || '');
  const prevByXmlId = new Map((m.persone || []).map(p => [p.xmlId, p]));
  const persone = found.map(f => {
    const prev = prevByXmlId.get(f.xmlId);
    return {
      xmlId: f.xmlId,
      key: f.key,
      nymRef: f.nymRef,
      name: f.name,
      ethnicRef: prev?.ethnicRef,
      ethnicNymRef: prev?.ethnicNymRef,
      ethnicText: prev?.ethnicText,
      note: prev?.note,
    };
  });
  return { ...m, epiteti: idx.epiteti, divinita: idx.divinita, onomastica: idx.onomastica, imperatori: idx.imperatori, persone };
}

function diffSections(prev: Monumento, next: Monumento): SectionId[] {
  const changed: SectionId[] = [];
  (Object.entries(SECTION_FIELDS) as [SectionId, (keyof Monumento)[]][]).forEach(([section, fields]) => {
    const a = JSON.stringify(fields.map(f => prev[f] ?? null));
    const b = JSON.stringify(fields.map(f => next[f] ?? null));
    if (a !== b) changed.push(section);
  });
  return changed;
}

/* ── micro-componenti UI coerenti col design system ─────────────── */

const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70', className)}>{children}</div>
);

const FieldLabel: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <label className="block text-[11px] font-sans font-semibold uppercase tracking-[0.14em] text-muted mb-1.5">
    {children}
    {hint && <span className="ml-2 normal-case tracking-normal font-normal text-muted/60 italic">{hint}</span>}
  </label>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={cn(
      'w-full bg-white/60 dark:bg-white/5 border border-border/50 rounded-lg px-3 py-2 text-sm text-ink font-serif',
      'focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-all placeholder:text-muted/40 placeholder:italic',
      props.className,
    )}
  />
);

/** Input di testo libero con suggerimenti dai valori già presenti nel corpus (repository,
 *  toponimi…): niente vocabolario controllato, solo un elenco `<datalist>` dei valori distinti
 *  già usati altrove, per evitare varianti di battitura sullo stesso luogo/istituzione. */
const SuggestInput: React.FC<{
  value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; className?: string;
}> = ({ value, onChange, options, placeholder, className }) => {
  const listId = useId();
  return (
    <>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        list={options.length > 0 ? listId : undefined}
        placeholder={placeholder}
        className={cn(
          'w-full bg-white/60 dark:bg-white/5 border border-border/50 rounded-lg px-3 py-2 text-sm text-ink font-serif',
          'focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-all placeholder:text-muted/40 placeholder:italic',
          className,
        )}
      />
      {options.length > 0 && (
        <datalist id={listId}>{options.map(o => <option key={o} value={o} />)}</datalist>
      )}
    </>
  );
};

/** Combobox su un vocabolario EAGLE: mostra le etichette in ITALIANO nel menu a tendina,
 *  ma il valore che finisce nel campo — e quindi salvato — resta il termine inglese/originale
 *  (quello agganciato all'URI EAGLE). Compila da sé il campo Ref quando scegli un termine noto
 *  (mai sovrascrivendo un URI inserito a mano). Resta testo libero per voci non catalogate. */
const TranslatedCombo: React.FC<{
  value: string; onChange: (v: string) => void;
  refValue?: string; onRefChange?: (v: string) => void;
  terms: VocabTerm[]; placeholder?: string;
}> = ({ value, onChange, refValue, onRefChange, terms, placeholder }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const q = stripAccents(value.trim());
  const filtered = q
    ? terms.filter(t => stripAccents(t.label).includes(q) || stripAccents(t.labelIt || '').includes(q) || stripAccents(t.greek || '').includes(q)).slice(0, 40)
    : terms.slice(0, 40);

  const pick = (t: VocabTerm) => {
    onChange(t.label);
    if (t.eagle && onRefChange && !refValue) onRefChange(t.eagle);
    setOpen(false);
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const current = terms.find(t => t.label.toLowerCase() === value.trim().toLowerCase());

  return (
    <div className="relative" ref={wrapRef}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-white/60 dark:bg-white/5 border border-border/50 rounded-lg px-3 py-2 text-sm text-ink font-serif focus:outline-none focus:ring-1 focus:ring-accent/40 placeholder:text-muted/40 placeholder:italic"
      />
      {current?.eagle && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-accent/70 font-sans uppercase tracking-wide pointer-events-none">EAGLE</span>
      )}
      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto custom-scrollbar rounded-lg border border-border/40 bg-white dark:bg-zinc-900 shadow-lg">
          {filtered.map(t => (
            <button
              key={t.id}
              onMouseDown={e => { e.preventDefault(); pick(t); }}
              className="w-full flex items-baseline justify-between gap-2 px-3 py-1.5 text-left hover:bg-accent/8 transition-colors"
            >
              <span className="text-sm font-serif text-ink">{t.labelIt || t.label}</span>
              <span className="text-[10px] text-muted/50 font-mono shrink-0">{t.labelIt ? t.label : (t.greek || '')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    className={cn(
      'w-full bg-white/60 dark:bg-white/5 border border-border/50 rounded-lg px-3 py-2 text-sm text-ink font-serif leading-relaxed',
      'focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-all placeholder:text-muted/40 placeholder:italic custom-scrollbar',
      props.className,
    )}
  />
);

/** Editor di liste di stringhe come chips (epiteti, divinità, textTypes...) */
const ChipListEditor: React.FC<{ values: string[]; onChange: (v: string[]) => void; placeholder?: string; vocabTerms?: VocabTerm[] }> = ({ values, onChange, placeholder, vocabTerms }) => {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const commit = (raw?: string) => {
    const v = (raw ?? draft).trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
    setOpen(false);
  };
  const q = stripAccents(draft.trim());
  const filtered = vocabTerms
    ? (q ? vocabTerms.filter(t => stripAccents(t.label).includes(q) || stripAccents(t.labelIt || '').includes(q)) : vocabTerms).slice(0, 30)
    : [];

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex flex-wrap items-center gap-2 bg-white/40 dark:bg-white/5 border border-border/50 rounded-lg px-2.5 py-2 focus-within:ring-1 focus-within:ring-accent/40 transition-all">
        {values.map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 bg-accent/10 text-accent border border-accent/20 rounded-full px-2.5 py-0.5 text-xs font-serif">
            {v}
            <button onClick={() => onChange(values.filter((_, j) => j !== i))} className="hover:text-red-500 transition-colors" title="Rimuovi">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={e => { setDraft(e.target.value); setOpen(true); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } }}
          onFocus={() => setOpen(true)}
          onBlur={() => commit()}
          placeholder={placeholder || 'Aggiungi e premi Invio…'}
          className="flex-1 min-w-[140px] bg-transparent text-sm font-serif text-ink focus:outline-none placeholder:text-muted/40 placeholder:italic py-0.5"
        />
      </div>
      {open && vocabTerms && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto custom-scrollbar rounded-lg border border-border/40 bg-white dark:bg-zinc-900 shadow-lg">
          {filtered.map(t => (
            <button
              key={t.id}
              onMouseDown={e => { e.preventDefault(); commit(t.label); }}
              className="w-full flex items-baseline justify-between gap-2 px-3 py-1.5 text-left hover:bg-accent/8 transition-colors"
            >
              <span className="text-sm font-serif text-ink">{t.labelIt || t.label}</span>
              <span className="text-[10px] text-muted/50 font-mono shrink-0">{t.labelIt ? t.label : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ================================================================ */

interface Props {
  monumenti: Monumento[];
  effectiveAdmin: boolean;
  currentUserEmail?: string | null;
  onLogin: () => void;
  onSave: (entryId: string, patch: Partial<Monumento>) => Promise<void>;
  onCreate: (m: Monumento) => Promise<string>; // ritorna l'entryId assegnato
  onExport: (m: Monumento) => void;
  /** entryId di una scheda da aprire subito (es. arrivando dal pulsante "Modifica" della vista Catalogo). */
  initialEntryId?: string | null;
  /** Chiamato dopo aver consumato initialEntryId, per evitare che riapra la stessa scheda ad ogni render. */
  onInitialEntryIdConsumed?: () => void;
}

export const SectionEditorView: React.FC<Props> = ({ monumenti, effectiveAdmin, currentUserEmail, onLogin, onSave, onCreate, onExport, initialEntryId, onInitialEntryIdConsumed }) => {
  /* sorgente e caricamento */
  const [source, setSource] = useState<Source | null>(null);
  const [baseModel, setBaseModel] = useState<Monumento | null>(null); // stato al caricamento (per il diff)
  const [model, setModel] = useState<Monumento | null>(null);         // stato editato
  const [dbSearch, setDbSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* editing */
  const [activeSection, setActiveSection] = useState<SectionId>('title');
  const [sanitize, setSanitize] = useState(true); // riservato a un futuro export pulito

  /* salvataggio */
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [saveWarnings, setSaveWarnings] = useState<string[]>([]);

  /* elenco file dal corpus: viene direttamente dai monumenti già in memoria nell'app */
  const dirtySections = useMemo<SectionId[]>(() => {
    if (!baseModel || !model) return [];
    return diffSections(baseModel, model);
  }, [baseModel, model]);

  const loadModel = (m: Monumento, src: Source) => {
    setLoadError(null);
    setBaseModel(m);
    setModel(applyDerivedIndices(JSON.parse(JSON.stringify(m))));
    setSource(src);
    setSaveOk(null); setSaveWarnings([]);
    setActiveSection('title');
  };

  const loadFromDb = (m: Monumento) => {
    loadModel(m, { kind: 'db', filename: m._corpusFile || `${m.corpus || 'CMRDM'}-${m.numero || m.id}` });
  };

  useEffect(() => {
    if (!initialEntryId) return;
    const found = monumenti.find(x => x.entryId === initialEntryId || x.id?.toString() === initialEntryId);
    if (found) loadFromDb(found);
    onInitialEntryIdConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEntryId, monumenti]);

  const loadFromFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = xmlToMonumenti(String(reader.result || ''));
        if (!parsed || parsed.length === 0) { setLoadError('Nessuna scheda TEI valida nel file.'); return; }
        if (parsed.length > 1) { setLoadError('File multi-TEI: l\u2019editor a sezioni lavora su una scheda alla volta. Esporta la singola entry.'); return; }
        // scheda nuova: id/entryId provvisori, verranno confermati alla prima creazione nel corpus
        const usedIds = new Set(monumenti.map(m => m.id).filter(n => typeof n === 'number' && n > 0) as number[]);
        let nextId = usedIds.size > 0 ? Math.max(...Array.from(usedIds)) + 1 : 1;
        while (usedIds.has(nextId)) nextId++;
        const draft: Monumento = { ...parsed[0], id: parsed[0].id || nextId, entryId: parsed[0].entryId || `new-${Date.now()}` };
        loadModel(draft, { kind: 'external', filename: f.name });
      } catch {
        setLoadError('Lettura o parsing del file non riuscita.');
      }
    };
    reader.onerror = () => setLoadError('Lettura del file non riuscita.');
    reader.readAsText(f);
    e.target.value = '';
  };

  const set = <K extends keyof Monumento>(k: K, v: Monumento[K]) =>
    setModel(m => m ? { ...m, [k]: v } : m);

  /** Come `set`, ma per il testo dell'edizione: ricalcola SEMPRE gli indici
   *  derivati nello stesso colpo, così restano fedeli al markup ad ogni battuta. */
  const setEditionText = (xml: string) =>
    setModel(m => m ? applyDerivedIndices({ ...m, testo: xml }) : m);

  /* ── salvataggio: diff dei campi cambiati, patch sul file del corpus ─── */
  const handleSave = async () => {
    if (!model || !baseModel || !source) return;
    if (!effectiveAdmin) { setSaveWarnings(['Devi accedere come amministratore per salvare.']); return; }
    setSaving(true); setSaveOk(null); setSaveWarnings([]);
    try {
      const changed = dirtySections;
      if (source.kind === 'external' || !model.entryId || model.entryId.startsWith('new-')) {
        const assignedId = await onCreate(model);
        const created = { ...model, entryId: assignedId };
        setBaseModel(created); setModel(created);
        setSource({ kind: 'db', filename: model._corpusFile || `${model.corpus || 'CMRDM'}-${model.numero || model.id}` });
        setSaveOk(`Scheda creata nel corpus (entryId: ${assignedId}).`);
      } else {
        // patch: solo i campi effettivamente cambiati, non l'intero oggetto
        const patch: Partial<Monumento> = {};
        SECTION_FIELDS_FLAT.forEach(f => { if (JSON.stringify(baseModel[f]) !== JSON.stringify(model[f])) (patch as any)[f] = (model as any)[f]; });
        await onSave(model.entryId!, patch);
        setBaseModel(JSON.parse(JSON.stringify(model)));
        setSaveOk(`Salvato${changed.length > 0 ? ` — sezioni: ${changed.map(s => SECTION_META.find(x => x.id === s)?.label || s).join(', ')}` : ''}.`);
      }
    } catch (e: any) {
      setSaveWarnings([`Salvataggio non riuscito: ${e.message || e}`]);
    } finally { setSaving(false); }
  };

  const closeFile = () => {
    setSource(null); setBaseModel(null); setModel(null);
    setSaveOk(null); setSaveWarnings([]); setLoadError(null);
  };

  const filteredMonumenti = useMemo(() => {
    const q = dbSearch.trim().toLowerCase();
    const list = q
      ? monumenti.filter(m => [m.titolo, m.corpus, m.numero, m.citta, m._corpusFile].filter(Boolean).some(v => String(v).toLowerCase().includes(q)))
      : monumenti;
    return list.slice(0, 80);
  }, [monumenti, dbSearch]);

  /* suggerimenti di testo libero raccolti dal corpus già in memoria, per i campi
   * di luogo/istituzione che altrimenti non hanno alcun autocompletamento. */
  const suggestions = useMemo(() => ({
    luogo_cons: collectDistinct(monumenti, 'luogo_cons'),
    citta: collectDistinct(monumenti, 'citta'),
    luogo_moderno: collectDistinct(monumenti, 'luogo_moderno'),
    luogo_rit: collectDistinct(monumenti, 'luogo_rit'),
    corpus: collectDistinct(monumenti, 'corpus'),
  }), [monumenti]);

  /* ── stato di ogni sezione per il rail ─────────────────────────── */
  const sectionState = (id: SectionId): 'dirty' | 'present' | 'absent' => {
    if (dirtySections.includes(id)) return 'dirty';
    if (!model) return 'absent';
    const fields = SECTION_FIELDS[id];
    const has = fields.some(f => {
      const v = (model as any)[f];
      return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
    });
    return has ? 'present' : 'absent';
  };

  /* ================================================================
   * RENDER
   * ================================================================ */

  /* — Fase 1: scelta della sorgente — */
  if (!model) {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8 pb-4 border-b border-border/50">
          <Eyebrow className="mb-2">Officina filologica</Eyebrow>
          <h2 className="text-2xl md:text-3xl font-serif font-semibold text-ink">Editor a sezioni</h2>
        </motion.div>

        {!effectiveAdmin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex items-center justify-between gap-3 text-sm text-amber-800 dark:text-amber-400 bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3">
            <span className="flex items-center gap-2.5"><ShieldCheck className="w-4 h-4 shrink-0" /> Puoi sfogliare le schede, ma per salvare serve l’accesso come amministratore.</span>
            <button onClick={onLogin} className="inline-flex items-center gap-1.5 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white hover:shadow-md transition-all">
              <LogIn className="w-3.5 h-3.5" /> Accedi
            </button>
          </motion.div>
        )}

        {loadError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex items-start gap-2.5 text-sm text-red-700 dark:text-red-400 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {loadError}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
          {/* Import esterno */}
          <motion.button
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}
            whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            className="glass-card p-8 text-left flex flex-col gap-3 group relative overflow-hidden"
          >
            <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-accent/0 group-hover:bg-accent/10 blur-2xl transition-all duration-500 pointer-events-none" />
            <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <div className="font-serif font-bold text-ink text-base">Importa file XML</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".xml,text/xml" className="hidden" onChange={loadFromFile} />
          </motion.button>

          {/* Dal corpus */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.12 }}
            className="glass-card p-8 flex flex-col gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="font-serif font-bold text-ink text-base mb-3">Scegli dal corpus</div>
            </div>
            <div className="glass-panel rounded-full flex items-center gap-2.5 pl-4 pr-3 py-1.5 focus-within:ring-1 focus-within:ring-accent/30 transition-all">
              <Search className="w-3.5 h-3.5 text-muted/60 shrink-0" />
              <input
                value={dbSearch}
                onChange={e => setDbSearch(e.target.value)}
                placeholder="Cerca per nome file… (es. AS-069)"
                className="flex-1 bg-transparent text-sm font-serif text-ink focus:outline-none placeholder:text-muted/40 placeholder:italic"
              />
            </div>
            <div className="max-h-56 overflow-y-auto custom-scrollbar -mx-2 px-2">
              {filteredMonumenti.length === 0 && (
                <p className="text-xs text-muted/60 italic py-3 px-1">{monumenti.length === 0 ? 'Nessuna scheda ancora caricata dal corpus.' : 'Nessuna scheda corrisponde alla ricerca.'}</p>
              )}
              {filteredMonumenti.map(m => (
                <button
                  key={m.entryId || m.id}
                  onClick={() => loadFromDb(m)}
                  className="w-full text-left flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent/8 transition-colors group"
                >
                  <FileText className="w-3.5 h-3.5 text-muted/50 group-hover:text-accent transition-colors shrink-0" />
                  <span className="text-sm font-serif text-ink truncate flex-1">
                    {m.corpus && m.numero ? `${m.corpus} ${m.numero}` : m._corpusFile || `#${m.id}`}
                    {m.titolo && <span className="text-muted/60 italic"> — {m.titolo}</span>}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted/30 group-hover:text-accent transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* — Fase 2: editing — */
  const m = model;
  const active = SECTION_META.find(s => s.id === activeSection)!;
  const dirty = dirtySections;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* intestazione file */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 pb-4 border-b border-border/50 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Eyebrow className="mb-2">Officina filologica · {source?.kind === 'db' ? 'Corpus' : 'File esterno'}</Eyebrow>
          <h2 className="text-xl md:text-2xl font-serif font-semibold text-ink flex items-center gap-3 flex-wrap">
            {m.corpus && m.numero ? `${m.corpus} ${m.numero}` : source?.filename}
            {m.titolo && <span className="text-sm font-normal italic text-muted hidden md:inline">— {m.titolo}</span>}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!effectiveAdmin && (
            <button onClick={onLogin} className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400 hover:text-amber-600 transition-colors px-3 py-2">
              <LogIn className="w-3.5 h-3.5" /> Accedi per salvare
            </button>
          )}
          <button onClick={() => onExport(m)} title="Scarica l’XML della scheda con le modifiche correnti"
            className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold uppercase tracking-[0.14em] text-muted hover:text-ink transition-colors px-3 py-2">
            <Download className="w-3.5 h-3.5" /> Esporta
          </button>
          <button onClick={closeFile} className="text-xs font-sans font-semibold uppercase tracking-[0.14em] text-muted hover:text-ink transition-colors px-3 py-2">
            Chiudi scheda
          </button>
          <motion.button
            whileHover={dirty.length > 0 && effectiveAdmin ? { y: -1 } : undefined}
            whileTap={dirty.length > 0 && effectiveAdmin ? { scale: 0.97 } : undefined}
            onClick={handleSave}
            disabled={saving || dirty.length === 0 || !effectiveAdmin}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-sans font-bold uppercase tracking-[0.12em] transition-all shadow-custom',
              dirty.length > 0 && effectiveAdmin
                ? 'bg-accent text-white hover:shadow-lg'
                : 'bg-border/30 text-muted/50 cursor-not-allowed',
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvataggio…' : dirty.length > 0 ? `Salva ${dirty.length} ${dirty.length === 1 ? 'sezione' : 'sezioni'}` : 'Nessuna modifica'}
          </motion.button>
        </div>
      </motion.div>

      {/* esito salvataggio */}
      <AnimatePresence>
        {(saveOk || saveWarnings.length > 0) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 space-y-2 overflow-hidden">
            {saveOk && (
              <div className="flex items-center gap-2.5 text-sm text-accent bg-accent/8 border border-accent/25 rounded-xl px-4 py-2.5 font-serif">
                <Check className="w-4 h-4 shrink-0" /> {saveOk}
              </div>
            )}
            {saveWarnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-amber-800 dark:text-amber-400 bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-2.5 font-serif">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {w}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* ── rail delle 18 sezioni ── */}
        <div className="w-60 shrink-0 glass-panel rounded-2xl p-3 overflow-y-auto custom-scrollbar">
          {GROUPS.map(g => (
            <div key={g} className="mb-3 last:mb-0">
              <div className="text-[9px] font-sans font-bold uppercase tracking-[0.2em] text-muted/50 px-2 mb-1.5">{g}</div>
              {SECTION_META.filter(s => s.group === g).map(s => {
                const st = sectionState(s.id);
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors group',
                      isActive ? 'bg-accent/12 text-accent' : 'hover:bg-accent/6 text-ink',
                    )}
                  >
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
                      st === 'dirty' ? 'bg-amber-500' : st === 'present' ? 'bg-accent/60' : 'bg-transparent border border-muted/30',
                    )} />
                    <span className={cn('text-[13px] font-serif flex-1 truncate', isActive && 'font-semibold')}>{s.label}</span>
                    {st === 'dirty' && <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-amber-600">mod.</span>}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="mt-4 pt-3 border-t border-border/30 px-2">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-muted font-sans">
              <input type="checkbox" checked={sanitize} onChange={e => setSanitize(e.target.checked)} className="accent-[var(--accent,#2da199)] w-3.5 h-3.5" />
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Rimuovi placeholder al salvataggio</span>
            </label>
          </div>
        </div>

        {/* ── pannello della sezione attiva ── */}
        <div className="flex-1 glass-panel rounded-2xl overflow-y-auto custom-scrollbar min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="p-6 md:p-8"
            >
              <div className="mb-6 pb-3 border-b border-border/30">
                <h3 className="font-serif font-bold text-ink text-lg">{active.label}</h3>
              </div>

              {renderSectionForm(activeSection, m, set, setEditionText, suggestions)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

/* ================================================================
 * Form delle singole sezioni
 * ================================================================ */

function renderSectionForm(
  id: SectionId,
  m: Monumento,
  set: <K extends keyof Monumento>(k: K, v: Monumento[K]) => void,
  setEditionText: (xml: string) => void,
  suggestions: { luogo_cons: string[]; citta: string[]; luogo_moderno: string[]; luogo_rit: string[]; corpus: string[] },
) {
  switch (id) {
    case 'title':
      return (
        <div className="space-y-5 max-w-2xl">
          <div>
            <FieldLabel>Titolo descrittivo</FieldLabel>
            <TextInput value={m.titolo || ''} onChange={e => set('titolo', e.target.value)} placeholder="Stele di marmo bianco con rilievo di Men…" />
          </div>
          <div>
            <FieldLabel>Tipologie testuali</FieldLabel>
            <ChipListEditor
              values={m.textTypes || []}
              onChange={v => set('textTypes', v)}
              vocabTerms={INSCRIPTION_TYPES}
              placeholder="es. dedica, legge sacra, confessione…"
            />
          </div>
        </div>
      );

    case 'publication':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
          <div className="md:col-span-2">
            <FieldLabel>Authority</FieldLabel>
            <TextInput value={m.authority || ''} onChange={e => set('authority', e.target.value)} />
          </div>
          <div>
            <FieldLabel hint="mai inventarlo: solo se attestato">TM number</FieldLabel>
            <TextInput value={m.tm || ''} onChange={e => set('tm', e.target.value)} placeholder="—" />
          </div>
          <div>
            <FieldLabel>Link TM</FieldLabel>
            <TextInput value={m.tmLink || ''} onChange={e => set('tmLink', e.target.value)} placeholder="https://www.trismegistos.org/text/…" />
          </div>
          <div>
            <FieldLabel>Corpus</FieldLabel>
            <SuggestInput value={m.corpus || ''} onChange={v => set('corpus', v)} options={suggestions.corpus} placeholder="CMRDM I" />
          </div>
          <div>
            <FieldLabel>Numero</FieldLabel>
            <TextInput value={m.numero || ''} onChange={e => set('numero', e.target.value)} placeholder="69" />
          </div>
          <div className="md:col-span-2 flex gap-6 text-xs text-muted font-serif italic pt-1">
            <span>ID applicativo: <span className="not-italic font-semibold text-ink">{m.id || '—'}</span></span>
            <span>entryId: <span className="not-italic font-semibold text-ink">{m.entryId || '—'}</span></span>
            <span className="text-muted/60">(assegnati automaticamente, non modificabili)</span>
          </div>
        </div>
      );

    case 'msIdentifier':
      return (
        <div className="max-w-2xl">
          <FieldLabel>Repository</FieldLabel>
          <SuggestInput value={m.luogo_cons || ''} onChange={v => set('luogo_cons', v)} options={suggestions.luogo_cons} placeholder="Manisa Museum" />
        </div>
      );

    case 'support':
      return (
        <div className="space-y-5 max-w-3xl">
          <div>
            <FieldLabel>Descrizione del supporto</FieldLabel>
            <TextArea rows={3} value={m.dim || ''} onChange={e => set('dim', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <FieldLabel>Materiale</FieldLabel>
              <TranslatedCombo
                value={m.materiale || ''} onChange={v => set('materiale', v)}
                refValue={m.materialRef || ''} onRefChange={v => set('materialRef', v)}
                terms={MATERIALS} placeholder="marmo, calcare…"
              />
            </div>
            <div>
              <FieldLabel>Ref materiale</FieldLabel>
              <TextInput value={m.materialRef || ''} onChange={e => set('materialRef', e.target.value)} placeholder="https://www.eagle-network.eu/voc/material/lod/48" />
            </div>
            <div>
              <FieldLabel>Tipo oggetto</FieldLabel>
              <TranslatedCombo
                value={m.tipo || ''} onChange={v => set('tipo', v)}
                refValue={m.tipo_ref || ''} onRefChange={v => set('tipo_ref', v)}
                terms={OBJECT_TYPES} placeholder="stele, altare…"
              />
            </div>
            <div>
              <FieldLabel>Ref tipo</FieldLabel>
              <TextInput value={m.tipo_ref || ''} onChange={e => set('tipo_ref', e.target.value)} placeholder="https://www.eagle-network.eu/voc/objtyp/lod/250" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><FieldLabel>Altezza</FieldLabel><TextInput value={m.dim_altezza || ''} onChange={e => set('dim_altezza', e.target.value)} /></div>
            <div><FieldLabel>Larghezza</FieldLabel><TextInput value={m.dim_larghezza || ''} onChange={e => set('dim_larghezza', e.target.value)} /></div>
            <div><FieldLabel>Profondità</FieldLabel><TextInput value={m.dim_profondita || ''} onChange={e => set('dim_profondita', e.target.value)} /></div>
            <div><FieldLabel>Unità</FieldLabel><TextInput value={m.dim_unita || ''} onChange={e => set('dim_unita', e.target.value)} placeholder="cm" /></div>
          </div>
        </div>
      );

    case 'layout':
      return (
        <div className="space-y-5 max-w-2xl">
          <div>
            <FieldLabel>Descrizione del campo epigrafico</FieldLabel>
            <TextArea rows={3} value={m.layout_desc || ''} onChange={e => set('layout_desc', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <FieldLabel>Tecnica di scrittura</FieldLabel>
              <TranslatedCombo
                value={m.scrittura || ''} onChange={v => set('scrittura', v)}
                refValue={m.scrittura_ref || ''} onRefChange={v => set('scrittura_ref', v)}
                terms={EXECUTION_TECHNIQUES} placeholder="inciso a scalpello…"
              />
            </div>
            <div>
              <FieldLabel>Ref tecnica</FieldLabel>
              <TextInput value={m.scrittura_ref || ''} onChange={e => set('scrittura_ref', e.target.value)} />
            </div>
          </div>
        </div>
      );

    case 'hand':
      return (
        <div className="max-w-2xl">
          <FieldLabel>Note paleografiche</FieldLabel>
          <TextArea rows={3} value={m.scrittura_note || ''} onChange={e => set('scrittura_note', e.target.value)} />
        </div>
      );

    case 'origPlace':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
          <div>
            <FieldLabel>Toponimo antico</FieldLabel>
            <SuggestInput value={m.citta || ''} onChange={v => set('citta', v)} options={suggestions.citta} placeholder="Tarsi" />
          </div>
          <div>
            <FieldLabel hint="mai dedotto: solo se certo">URI Pleiades (antico)</FieldLabel>
            <TextInput value={m.place_ref_ancient || ''} onChange={e => set('place_ref_ancient', e.target.value)} placeholder="https://pleiades.stoa.org/places/…" />
          </div>
          <div>
            <FieldLabel>Toponimo moderno</FieldLabel>
            <SuggestInput value={m.luogo_moderno || ''} onChange={v => set('luogo_moderno', v)} options={suggestions.luogo_moderno} placeholder="Kölekoy, Turkey" />
          </div>
          <div>
            <FieldLabel>Ref (moderno)</FieldLabel>
            <TextInput value={m.place_ref_modern || ''} onChange={e => set('place_ref_modern', e.target.value)} />
          </div>
          <div>
            <FieldLabel>Regione</FieldLabel>
            <SuggestInput value={m.regione || ''} onChange={v => set('regione', v)} options={CMRDM_REGIONS} placeholder="Asia Minor" />
          </div>
        </div>
      );

    case 'origDate': {
      const dates: OrigDate[] = m.origDates && m.origDates.length > 0 ? m.origDates : [];
      const update = (i: number, patch: Partial<OrigDate>) =>
        set('origDates', dates.map((d, j) => j === i ? { ...d, ...patch } : d));
      return (
        <div className="space-y-4 max-w-3xl">
          {dates.length === 0 && <p className="text-sm text-muted italic font-serif">Nessuna datazione. Se Lane non data, il campo si omette — mai stimare.</p>}
          {dates.map((d, i) => (
            <div key={i} className="glass-card p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <FieldLabel>Testo della datazione</FieldLabel>
                  <TextInput value={d.testo || ''} onChange={e => update(i, { testo: e.target.value })} />
                </div>
                <button onClick={() => set('origDates', dates.filter((_, j) => j !== i))} className="mt-6 p-1.5 text-muted/50 hover:text-red-500 transition-colors" title="Rimuovi datazione">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Da (notBefore)</FieldLabel><TextInput value={d.notBeforeCustom || ''} onChange={e => update(i, { notBeforeCustom: e.target.value })} /></div>
                <div><FieldLabel>A (notAfter)</FieldLabel><TextInput value={d.notAfterCustom || ''} onChange={e => update(i, { notAfterCustom: e.target.value })} /></div>
              </div>
            </div>
          ))}
          <button
            onClick={() => set('origDates', [...dates, { datingMethod: '#julian', testo: '' }])}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent/70 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Aggiungi datazione
          </button>
        </div>
      );
    }

    case 'provenance':
      return (
        <div className="space-y-5 max-w-2xl">
          <div>
            <FieldLabel>Luogo di ritrovamento</FieldLabel>
            <SuggestInput value={m.luogo_rit || ''} onChange={v => set('luogo_rit', v)} options={suggestions.luogo_rit} />
          </div>
          <div>
            <FieldLabel>Osservazione autoptica</FieldLabel>
            <TextInput value={m.conserv || ''} onChange={e => set('conserv', e.target.value)} placeholder="Nessuna." />
          </div>
        </div>
      );

    case 'profile': {
      const IndexGroup: React.FC<{ label: string; values: string[]; empty: string }> = ({ label, values, empty }) => (
        <div>
          <FieldLabel>{label}</FieldLabel>
          {values.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {values.map(v => (
                <span key={v} className="inline-flex items-center bg-accent/10 text-accent border border-accent/20 rounded-full px-2.5 py-0.5 text-xs font-serif">
                  {v}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted/50 italic">{empty}</p>
          )}
        </div>
      );
      return (
        <div className="space-y-5 max-w-3xl">
          <p className="text-[11px] text-muted/60 italic -mt-1">
            Indice a sola lettura, specchio dei <span className="font-mono not-italic text-[10px]">&lt;persName&gt;</span> codificati in Edizione.
          </p>
          <IndexGroup label="Epiteti" values={m.epiteti || []} empty="Nessun <rs type=“epithet”> ancora codificato nel testo." />
          <IndexGroup label="Divinità" values={m.divinita || []} empty="Nessun persName type=“divine” ancora codificato nel testo." />
          <IndexGroup label="Onomastica" values={m.onomastica || []} empty="Nessun persName type=“attested” ancora codificato nel testo." />
          <IndexGroup label="Imperatori" values={m.imperatori || []} empty="Nessun persName type=“ruler/emperor” ancora codificato nel testo." />
          {m.persone && m.persone.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <FieldLabel>Persone attestate (listPerson)</FieldLabel>
              <div className="space-y-1.5">
                {m.persone.map((p, i) => (
                  <div key={i} className="text-sm font-serif text-ink flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-accent/50" />{p.name}{p.key && <span className="text-muted italic text-xs">({p.key})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'facsimile':
      return (
        <div className="space-y-5 max-w-2xl">
          <div>
            <FieldLabel>URL immagine</FieldLabel>
            <TextInput value={m.facsimile_url || ''} onChange={e => set('facsimile_url', e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <FieldLabel>Didascalia</FieldLabel>
            <TextInput value={m.facsimile_desc || ''} onChange={e => set('facsimile_desc', e.target.value)} />
          </div>
        </div>
      );

    case 'revisions': {
      const revs: Revision[] = m.revisions || [];
      const update = (i: number, patch: Partial<Revision>) => set('revisions', revs.map((r, j) => j === i ? { ...r, ...patch } : r));
      return (
        <div className="space-y-3 max-w-3xl">
          {revs.map((r, i) => (
            <div key={i} className="flex items-start gap-3">
              <TextInput className="w-36" type="date" value={r.date || ''} onChange={e => update(i, { date: e.target.value })} />
              <TextInput className="w-28" value={r.who || ''} onChange={e => update(i, { who: e.target.value })} placeholder="#GG" />
              <TextInput className="flex-1" value={r.note || ''} onChange={e => update(i, { note: e.target.value })} placeholder="Descrizione della modifica…" />
              <button onClick={() => set('revisions', revs.filter((_, j) => j !== i))} className="p-2 text-muted/50 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button
            onClick={() => set('revisions', [...revs, { date: new Date().toISOString().slice(0, 10), who: '#GG', note: '' }])}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent/70 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Aggiungi revisione
          </button>
        </div>
      );
    }

    case 'edition':
      return (
        <EditionMarkupEditor
          value={m.testo || ''}
          onChange={setEditionText}
          anepigrafo={m.anepigr}
        />
      );

    case 'apparatus': {
      const entries = Array.isArray(m.apparatus) ? m.apparatus : [];
      const isRaw = typeof m.apparatus === 'string' && m.apparatus.trim().length > 0;
      if (isRaw) {
        return (
          <div className="max-w-3xl">
            <FieldLabel>Apparato</FieldLabel>
            <TextArea rows={6} value={m.apparatus as string} onChange={e => set('apparatus', e.target.value)} />
          </div>
        );
      }
      const update = (i: number, patch: Partial<{ loc: string; note: string }>) =>
        set('apparatus', entries.map((r, j) => j === i ? { ...r, ...patch } : r));
      return (
        <div className="space-y-3 max-w-3xl">
          {entries.map((a, i) => (
            <div key={i} className="flex items-start gap-3">
              <TextInput className="w-20" value={a.loc} onChange={e => update(i, { loc: e.target.value })} placeholder="r. 1" />
              <TextInput className="flex-1" value={a.note} onChange={e => update(i, { note: e.target.value })} placeholder="Μὲς lapis pro Μὴν…" />
              <button onClick={() => set('apparatus', entries.filter((_, j) => j !== i))} className="p-2 text-muted/50 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button
            onClick={() => set('apparatus', [...entries, { loc: '', note: '' }])}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent/70 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Aggiungi nota di apparato
          </button>
        </div>
      );
    }

    case 'translations': {
      const trads: Traduzione[] = m.traduzioni || [];
      const update = (i: number, patch: Partial<Traduzione>) => set('traduzioni', trads.map((t, j) => j === i ? { ...t, ...patch } : t));
      return (
        <div className="space-y-4 max-w-3xl">
          {trads.map((t, i) => (
            <div key={i} className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="w-24">
                  <FieldLabel>Lingua</FieldLabel>
                  <TextInput value={t.lang} onChange={e => update(i, { lang: e.target.value })} placeholder="it" />
                </div>
                <button onClick={() => set('traduzioni', trads.filter((_, j) => j !== i))} className="p-1.5 text-muted/50 hover:text-red-500 transition-colors mt-4"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div>
                <FieldLabel>Traduzione</FieldLabel>
                <TextArea rows={5} value={t.testo} onChange={e => update(i, { testo: e.target.value })} />
              </div>
              <div>
                <FieldLabel>Nota</FieldLabel>
                <TextInput value={t.note} onChange={e => update(i, { note: e.target.value })} />
              </div>
            </div>
          ))}
          <button
            onClick={() => set('traduzioni', [...trads, { lang: 'it', testo: '', note: '' }])}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent/70 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Aggiungi traduzione
          </button>
        </div>
      );
    }

    case 'commentary':
      return (
        <div className="max-w-3xl">
          <FieldLabel>Commento</FieldLabel>
          <TextArea rows={8} value={m.note_interne || ''} onChange={e => { set('note_interne', e.target.value); set('note_interne_rawXml', undefined); }} />
          {m.note_interne_rawXml && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 italic mt-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Il commento contiene markup TEI (ptr, foreign…): modificandolo qui verrà riscritto come testo semplice.
            </p>
          )}
        </div>
      );

    case 'bibliography': {
      const bibl: Bibliografia[] = m.bibliografia || [];
      // Convenzione di Lane: la lista è piatta, ma la prima voce che inizia
      // con "Cf." segna il passaggio dalle edizioni precedenti del testo ai
      // riferimenti di confronto. Nessun campo XML nuovo: si legge/scrive
      // solo il testo, quindi il round-trip resta valido come oggi.
      const isCf = (b: Bibliografia) => /^cf\.?\s/i.test((b.titolo || '').trim());
      const cfIndex = bibl.findIndex(isCf);
      const update = (i: number, titolo: string) =>
        set('bibliografia', bibl.map((b, j) => j === i ? { titolo, punti_rif: b.punti_rif } : b)); // modificando si perde il rawXml, intenzionale
      const remove = (i: number) => set('bibliografia', bibl.filter((_, j) => j !== i));
      const move = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= bibl.length) return;
        const next = [...bibl];
        [next[i], next[j]] = [next[j], next[i]];
        set('bibliografia', next);
      };
      const addAt = (index: number, titolo: string) => {
        const next = [...bibl];
        next.splice(index, 0, { titolo });
        set('bibliografia', next);
      };

      const renderRow = (b: Bibliografia, i: number) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex flex-col mt-1.5">
            <button
              onClick={() => move(i, -1)}
              disabled={i === 0}
              title="Sposta su"
              className="p-0.5 text-muted/50 hover:text-accent disabled:opacity-20 disabled:hover:text-muted/50 transition-colors"
            ><ChevronUp className="w-3.5 h-3.5" /></button>
            <button
              onClick={() => move(i, 1)}
              disabled={i === bibl.length - 1}
              title="Sposta giù"
              className="p-0.5 text-muted/50 hover:text-accent disabled:opacity-20 disabled:hover:text-muted/50 transition-colors"
            ><ChevronDown className="w-3.5 h-3.5" /></button>
          </div>
          <TextInput className="flex-1" value={b.titolo} onChange={e => update(i, e.target.value)} />
          {b.rawXml && <span title="Contiene markup TEI: la modifica lo converte in testo semplice" className="mt-2.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500/70" /></span>}
          <button onClick={() => remove(i)} className="p-2 text-muted/50 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      );

      const editions = cfIndex === -1 ? bibl.map((b, i) => ({ b, i })) : bibl.slice(0, cfIndex).map((b, i) => ({ b, i }));
      const comparisons = cfIndex === -1 ? [] : bibl.slice(cfIndex).map((b, i) => ({ b, i: i + cfIndex }));

      return (
        <div className="space-y-6 max-w-3xl">
          <div className="space-y-3">
            <FieldLabel>Edizioni</FieldLabel>
            {editions.length === 0 && <p className="text-xs text-muted/60 italic">Nessuna edizione precedente registrata.</p>}
            {editions.map(({ b, i }) => renderRow(b, i))}
            <button
              onClick={() => addAt(cfIndex === -1 ? bibl.length : cfIndex, '')}
              className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent/70 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Aggiungi edizione
            </button>
          </div>
          <div className="space-y-3 border-t border-line/40 pt-4">
            <FieldLabel>Bibliografia (cfr.)</FieldLabel>
            <p className="text-[11px] text-muted/60">Le voci che iniziano con "Cf." separano le edizioni precedenti del testo dai riferimenti di confronto, come nel testo di Lane.</p>
            {comparisons.length === 0 && <p className="text-xs text-muted/60 italic">Nessun riferimento di confronto.</p>}
            {comparisons.map(({ b, i }) => renderRow(b, i))}
            <button
              onClick={() => addAt(bibl.length, cfIndex === -1 ? 'Cf. ' : '')}
              className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent/70 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Aggiungi confronto (cf.)
            </button>
          </div>
        </div>
      );
    }

    case 'iconography':
      return <IconographyEditor m={m} set={set} />;

    default:
      return null;
  }
}


/* ================================================================
 * Editor iconografico — vocabolario controllato da iconographyLabels
 * Ogni campo pesca SOLO dalla propria categoria del vocabolario:
 * funzione cultuale, tipo di figura, identificativo figura, tipo di
 * tratto, elemento del tratto (a cascata sul tipo scelto).
 * ================================================================ */

// "Funzione cultuale" (iconografia) usa il vocabolario di iconographyLabels.ts —
// lo stesso namespace già usato dai dati esistenti e dal pannello di
// visualizzazione pubblica (IconographyPanel), NON gli id EAGLE di
// INSCRIPTION_TYPES (quelli restano il vocabolario per i textTypes del titolo).
const FUNCTION_IDS = ['votive', 'lex_sacra', 'confession', 'honorific', 'funerary'];

// Mappa dagli id EAGLE (INSCRIPTION_TYPES, usati in textTypes) all'id corrispondente
// di iconographyLabels — serve solo al suggerimento automatico qui sotto.
const EAGLE_TO_FUNCTION: Record<string, string> = {
  dedication: 'votive', sacredlaw: 'lex_sacra', confession: 'confession',
  honorary: 'honorific', epitaph: 'funerary',
};

// Sinonimi (italiano/inglese, spogliati di accenti) per riconoscere nei textTypes
// del titolo un valore compatibile con la funzione iconografica. Serve solo a
// SUGGERIRE — mai a scrivere da sola: la scelta finale resta dello studioso.
const FUNCTION_SYNONYMS: Record<string, string[]> = {
  votive: ['dedication', 'votiv', 'dedica'],
  lex_sacra: ['sacred law', 'lex sacra', 'legge sacra'],
  confession: ['confession'],
  honorific: ['honorary', 'honorific', 'onorari', 'honour', 'honor'],
  funerary: ['epitaph', 'funerary', 'funerari', 'sepolcr', 'epitaffio'],
};

/** Deriva un suggerimento di funzione dai textTypes del titolo (mai una scrittura automatica).
 *  Prima cerca una corrispondenza esatta con un id/label EAGLE di INSCRIPTION_TYPES (mappato
 *  al vocabolario iconografico), poi ripiega sui sinonimi per i textTypes scritti liberamente. */
function suggestFunctionFromTextTypes(textTypes: string[] | undefined): string | null {
  for (const raw of textTypes || []) {
    const t = stripAccents(raw);
    const exact = INSCRIPTION_TYPES.find(term => stripAccents(term.label) === t || stripAccents(term.id) === t);
    if (exact && EAGLE_TO_FUNCTION[exact.id]) return EAGLE_TO_FUNCTION[exact.id];
  }
  for (const raw of textTypes || []) {
    const t = stripAccents(raw);
    for (const [key, synonyms] of Object.entries(FUNCTION_SYNONYMS)) {
      if (synonyms.some(s => t.includes(s))) return key;
    }
  }
  return null;
}
const FIGURE_TYPE_KEYS = ['deity', 'secondary', 'worshipper', 'animal', 'symbol'];
const FIGURE_KEY_OPTIONS = ['Men', 'crescent', 'Nike', 'eagle', 'Attis', 'Helios'];
// Posizione COMPOSITIVA della figura nel rilievo — proprietà della figura
// (figure.place), non più un "trait" fisico: vedi nota in types.ts.
const PLACE_KEYS = ['upper_left', 'upper_right', 'lower_left', 'lower_right', 'top_centre'];
// `technique` è stata rimossa da questo vocabolario: è già codificata a
// livello di intero supporto in layoutDesc/layout/rs[@ref=.../voc/writing/]
// (vedi i file CMRDM reali) — tenerla anche qui per singola figura duplicava
// il dato con rischio di divergenza, senza reale valore informativo.
const TRAIT_TYPE_KEYS = ['headgear', 'lunar', 'held_object', 'mount', 'dress', 'gesture'];
const TRAIT_KEY_OPTIONS: Record<string, string[]> = {
  headgear: ['phrygian_cap', 'radiate_crown', 'crescent_crown'],
  lunar: ['crescent_shoulders', 'crescent_cap', 'full_moon', 'crescent'],
  held_object: ['pine_cone', 'torch', 'patera', 'sceptre', 'wreath', 'staff', 'bucranium'],
  mount: ['bull', 'horse', 'cock'],
  dress: ['military', 'himation', 'chiton', 'belted_tunic'],
  gesture: ['hands_raised'],
};

const vocabLabel = (k: string) => {
  return ICONOGRAPHY_LABELS[k] || k;
};

/** Select rigoroso: solo valori della categoria (niente testo libero, niente valori fuori vocabolario).
 *  `allowEmpty` lascia il placeholder selezionabile — per campi davvero opzionali (es. posizione
 *  compositiva) dove serve poter tornare a "non specificato"; per i campi obbligatori (funzione,
 *  tipo, categoria) resta disabilitato così una scelta fatta non può ripiegare sul vuoto. */
const VocabSelect: React.FC<{ value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; allowEmpty?: boolean }> = ({ value, onChange, options, placeholder, allowEmpty }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{ colorScheme: 'light dark' }}
    className="w-full bg-white/60 dark:bg-white/5 border border-border/50 rounded-lg px-3 py-2 text-sm text-ink font-serif focus:outline-none focus:ring-1 focus:ring-accent/40"
  >
    <option value="" disabled={!allowEmpty}>{placeholder || 'Seleziona…'}</option>
    {options.map(k => <option key={k} value={k}>{vocabLabel(k)}</option>)}
  </select>
);

/** Combo libera con suggerimenti dalla categoria: per figure con nome proprio non ancora in vocabolario (es. un orante). */
const VocabCombo: React.FC<{ value: string; onChange: (v: string) => void; options: string[]; listId: string; placeholder?: string }> = ({ value, onChange, options, listId, placeholder }) => (
  <div className="relative">
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      list={listId}
      placeholder={placeholder}
      className="w-full bg-white/60 dark:bg-white/5 border border-border/50 rounded-lg px-3 py-2 text-sm text-ink font-serif focus:outline-none focus:ring-1 focus:ring-accent/40 placeholder:text-muted/40 placeholder:italic"
    />
    <datalist id={listId}>{options.map(k => <option key={k} value={k}>{vocabLabel(k)}</option>)}</datalist>
    {value && ICONOGRAPHY_LABELS[value] && (
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-accent/70 italic pointer-events-none">{ICONOGRAPHY_LABELS[value]}</span>
    )}
  </div>
);

const IconographyEditor: React.FC<{ m: Monumento; set: <K extends keyof Monumento>(k: K, v: Monumento[K]) => void }> = ({ m, set }) => {
  const ico = m.iconografia || { figures: [] };
  const update = (patch: Partial<typeof ico>) => set('iconografia', { ...ico, ...patch });
  const updateFigure = (fi: number, patch: Partial<IconographicFigure>) =>
    update({ figures: ico.figures.map((f, i) => i === fi ? { ...f, ...patch } : f) });
  const updateTrait = (fi: number, ti: number, patch: Partial<IconographicTrait>) =>
    updateFigure(fi, { traits: ico.figures[fi].traits.map((t, i) => i === ti ? { ...t, ...patch } : t) });

  const suggestedFunction = suggestFunctionFromTextTypes(m.textTypes);
  const functionConflict = ico.function && suggestedFunction && ico.function !== suggestedFunction;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* ── 1. Funzione cultuale ── */}
      <section>
        <Eyebrow className="mb-2">1 · Funzione</Eyebrow>
        <FieldLabel>Funzione cultuale</FieldLabel>
        <VocabSelect
          value={ico.function || ''}
          onChange={v => update({ function: v || undefined })}
          options={FUNCTION_IDS}
          placeholder="Nessuna funzione selezionata"
        />
        {!ico.function && suggestedFunction && (
          <div className="mt-2 flex items-center gap-2.5 text-xs bg-accent/8 border border-accent/20 rounded-lg px-3 py-2">
            <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="text-ink flex-1">
              Il titolo suggerisce <span className="font-semibold">«{vocabLabel(suggestedFunction)}»</span> — coerente con i tipi testuali indicati.
            </span>
            <button onClick={() => update({ function: suggestedFunction })}
              className="shrink-0 text-[10px] font-sans font-bold uppercase tracking-[0.1em] text-accent hover:text-accent/70 transition-colors">
              Usa
            </button>
          </div>
        )}
        {functionConflict && (
          <div className="mt-2 flex items-start gap-2.5 text-xs bg-amber-500/8 border border-amber-500/25 rounded-lg px-3 py-2 text-amber-800 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Funzione impostata su «{vocabLabel(ico.function!)}», ma il titolo suggerisce «{vocabLabel(suggestedFunction!)}».
              Se è voluto (es. rilievo votivo con testo onorario) va bene così — altrimenti controlla il titolo o questo campo.
            </span>
          </div>
        )}
      </section>

      {/* ── 2. Figure ── */}
      <section>
        <Eyebrow className="mb-2">2 · Figure</Eyebrow>
        {ico.figures.length === 0 && (
          <p className="text-sm text-muted italic font-serif mb-3">Nessuna figura codificata. Aggiungine una se il monumento reca una scena figurata (divinità, oranti, simboli…).</p>
        )}
        <div className="space-y-4">
          {ico.figures.map((fig, fi) => (
            <div key={fi} className="glass-card p-4 space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-accent/10 text-accent border border-accent/20 flex items-center justify-center text-[11px] font-sans font-bold shrink-0 mt-1.5">
                  {fi + 1}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                  <div>
                    <FieldLabel>Tipo di figura</FieldLabel>
                    <VocabSelect value={fig.type} onChange={v => updateFigure(fi, { type: v })} options={FIGURE_TYPE_KEYS} placeholder="Scegli il tipo…" />
                  </div>
                  <div>
                    <FieldLabel>Identificativo</FieldLabel>
                    <VocabCombo value={fig.key} onChange={v => updateFigure(fi, { key: v })} options={FIGURE_KEY_OPTIONS} listId={`dl-figkey-${fi}`} placeholder="es. dedicante, Men…" />
                  </div>
                  <div>
                    <FieldLabel>Posizione nella composizione</FieldLabel>
                    <VocabSelect value={fig.place || ''} onChange={v => updateFigure(fi, { place: v || undefined })} options={PLACE_KEYS} placeholder="Non specificata" allowEmpty />
                  </div>
                </div>
                <button onClick={() => update({ figures: ico.figures.filter((_, i) => i !== fi) })}
                  className="p-1.5 mt-5 text-muted/50 hover:text-red-500 transition-colors" title="Rimuovi figura">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* ── 3. Tratti di questa figura ── */}
              <div className="pl-9 pt-1 border-t border-border/20">
                <div className="text-[9px] font-sans font-bold uppercase tracking-[0.2em] text-muted/50 mb-2 pt-2">Tratti</div>
                {fig.traits.length === 0 && (
                  <p className="text-xs text-muted/50 italic font-serif mb-2">Nessun tratto — solo tipo, identificativo e posizione, se bastano a descrivere la figura.</p>
                )}
                <div className="space-y-2">
                  {fig.traits.map((t, ti) => (
                    <div key={ti} className="flex items-center gap-2">
                      <div className="w-36 shrink-0">
                        <VocabSelect
                          value={t.type}
                          onChange={v => updateTrait(fi, ti, { type: v, key: '' })} // cambio categoria: azzera l'elemento, non è più valido
                          options={TRAIT_TYPE_KEYS}
                          placeholder="Categoria…"
                        />
                      </div>
                      <div className="flex-1">
                        <VocabSelect
                          value={t.key}
                          onChange={v => updateTrait(fi, ti, { key: v })}
                          options={TRAIT_KEY_OPTIONS[t.type] || []}
                          placeholder={t.type ? 'Elemento…' : 'Scegli prima la categoria'}
                        />
                      </div>
                      <select
                        value={t.hand || ''}
                        onChange={e => updateTrait(fi, ti, { hand: e.target.value || undefined })}
                        title="Mano (per oggetti tenuti)"
                        style={{ colorScheme: 'light dark' }}
                        className="w-20 shrink-0 bg-white/60 dark:bg-white/5 border border-border/50 rounded-lg px-2 py-2 text-xs text-ink font-sans focus:outline-none focus:ring-1 focus:ring-accent/40"
                      >
                        <option value="">—</option>
                        <option value="right">dx</option>
                        <option value="left">sx</option>
                      </select>
                      <button onClick={() => updateFigure(fi, { traits: fig.traits.filter((_, i) => i !== ti) })}
                        className="p-1.5 text-muted/40 hover:text-red-500 transition-colors shrink-0" title="Rimuovi tratto">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => updateFigure(fi, { traits: [...fig.traits, { type: 'held_object', key: '' }] })}
                    className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent/70 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Aggiungi tratto
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() => update({ figures: [...ico.figures, { n: ico.figures.length + 1, type: 'deity', key: '', traits: [] }] })}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent/70 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Aggiungi figura
          </button>
        </div>
      </section>

      {/* ── 4. Nota libera ── */}
      <section>
        <Eyebrow className="mb-2">4 · Nota</Eyebrow>
        <FieldLabel hint="per elementi non copribili dal vocabolario controllato — mai un ripiego per evitare di scegliere un tratto">Nota iconografica</FieldLabel>
        <TextArea rows={3} value={ico.note || ''} onChange={e => update({ note: e.target.value || undefined })} />
      </section>
    </div>
  );
};

export default SectionEditorView;