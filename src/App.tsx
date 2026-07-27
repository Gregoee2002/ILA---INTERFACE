import React, { useState, useMemo, useEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Scroll, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  X,
  Database,
  Trash2,
  Languages,
  Plus,
  Edit2,
  Save,
  LogIn,
  LogOut,
  Sparkles,
  Loader2,
  WifiOff,
  BarChart2,
  Clock,
  Columns,
  Upload,
  Book,
  Calendar,
  Download,
  AlertCircle,
  Menu,
  Settings,
  Info,
  Hash,
  FileJson,
  FileText,
  Moon,
  Sun,
  Monitor,
  Tag as TagIcon,
  Filter,
  Check,
  AlertTriangle,
  Feather
} from 'lucide-react';
import { cn } from './lib/utils';
import { Monumento, FilterState, SortField, Traduzione, Bibliografia, Appunto } from './types';
import { RAW_DATA } from './data';
import { monumentiToXml, xmlToMonumenti } from './lib/xmlUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PleiadesMap } from './components/PleiadesMap';
import { MapView } from './components/MapView';
import { IconographyPanel } from './components/IconographyPanel';
import { CooccurrenceHeatmap } from './components/CooccurrenceHeatmap';
import { SectionEditorView } from './components/SectionEditorView';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

type AppView = 'home' | 'catalog' | 'stats' | 'timeline' | 'health' | 'map' | 'heatmap' | 'editor';

// Curve condivise: stessa "fisica" per tutte le micro-animazioni del progetto
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN = [0.7, 0, 0.84, 0] as const;
const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 500, damping: 40 };
const SPRING_SOFT = { type: 'spring' as const, stiffness: 300, damping: 30 };

// Helper: fade+slide standard per l'ingresso di sezioni al momento in cui entrano nel viewport
const scrollReveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: EASE_OUT },
};

// Helper: dissolvenza pura (nessuno spostamento) per il cambio di "livello"
// nella navigazione divinità → epiteti → attestazioni
const fadeSwap = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.4, ease: EASE_OUT },
};

// Helper: Normalize Greek text for searching (rough)
const normalizeGreek = (text: string) => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/ς/g, "σ") // Sigma normalization
    .toLowerCase();
};

const formatDate = (val?: number) => {
  if (val === undefined || val === null || isNaN(val)) return '-';
  const abs = Math.abs(val);
  return val < 0 ? `${abs} a.C.` : `${val} d.C.`;
};

const formatDateRange = (start?: number, end?: number) => {
  if (start === undefined && end === undefined) return '-';
  // Treat 0 as "not set" — avoids showing "0 d.C." for uninitialized dates
  if ((start === undefined || start === 0) && (end === undefined || end === 0)) return '-';
  if (start !== undefined && end !== undefined && start === end && start !== 0) return formatDate(start);
  if (start !== undefined && end !== undefined) {
    if (start < 0 && end > 0) return `${Math.abs(start)} a.C. - ${end} d.C.`;
    const s = start !== 0 ? formatDate(start) : '';
    const e = end !== 0 ? formatDate(end) : '';
    if (s && e) return `${s} - ${e}`;
    return s || e || '-';
  }
  if (start !== undefined && start !== 0) return formatDate(start);
  if (end !== undefined && end !== 0) return formatDate(end);
  return '-';
};

const getLocationName = (m: Monumento) => {
  if (m.citta && m.regione) return `${m.citta}, ${m.regione.toUpperCase()}`;
  return m.citta || m.regione || 'N/A';
};

const getDisplayTitle = (m: Monumento) => {
  return m.titolo || m.citta || m.regione || `Scheda #${m.id}`;
};

const stripXml = (s?: any) => {
  if (!s) return '';
  if (Array.isArray(s)) {
    const mapped = s.map(item => {
      if (typeof item === 'object' && item !== null) {
        const loc = item.loc || '';
        const note = item.note || '';
        return loc ? `${loc}: ${note}` : note;
      }
      return String(item);
    }).join(' ');
    return mapped.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
  if (typeof s === 'object') {
    return '';
  }
  const str = String(s);
  return str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
};

const hasApparatusContent = (val?: { loc: string; note: string }[] | string) => {
  if (!val) return false;
  if (Array.isArray(val)) return val.length > 0;
  return val.trim().length > 0 && val.trim().toUpperCase() !== 'DA_COMPILARE';
};

// Format a bibliographic key like "herrmann1965b" → "Herrmann 1965b"
// All-caps if author part is ≤3 chars (e.g. "cdl" → "CDL")
const formatBiblKey = (raw: string): string => {
  if (!raw || raw.length > 40 || raw.includes(' ')) return raw;
  const m = raw.match(/^([a-zA-Z]+?)(\d{4})([a-zA-Z]*)$/);
  if (!m) return raw.charAt(0).toUpperCase() + raw.slice(1);
  const [, author, year, suffix] = m;
  const fmt = author.length <= 3
    ? author.toUpperCase()
    : author.charAt(0).toUpperCase() + author.slice(1).toLowerCase();
  return `${fmt} ${year}${suffix}`;
};

// Helper per le card della griglia statistiche
// ── MetaField ─────────────────────────────────────────────────────────────
// Campo di input riutilizzabile con autocompletamento da lista suggestions

const MetaField = ({
  label, value, onChange, suggestions = [], placeholder = '', mono = false
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions?: string[];
  placeholder?: string;
  mono?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  ).slice(0, 8);
  const inputClass = `w-full text-xs p-2.5 border border-[var(--border)]/50 rounded-xl outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] transition-all duration-300 text-ink ${mono ? 'font-mono text-[10px]' : 'font-serif'}`;

  return (
    <div className="space-y-1 mb-3 relative">
      <label className="field-label">{label}</label>
      <input
        className={inputClass}
        style={{ backgroundColor: 'var(--card)' }}
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-[var(--card)] border border-[var(--border)]/60 rounded-xl shadow-[0_8px_24px_rgba(var(--shadow-color),0.16)] max-h-40 overflow-y-auto">
          {filtered.map(s => (
            <button
              key={s}
              className="w-full text-left px-2 py-1.5 text-xs font-serif hover:bg-accent hover:text-white transition-colors"
              onMouseDown={() => { onChange(s); setOpen(false); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const getTintClass = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rem = Math.abs(hash % 4) + 1;
  return `glass-card-tint-${rem}`;
};

const StatsCard = ({ name, count, regions, badge, onClick }: {
  name: string; count: number; regions: number; badge: string; onClick: () => void;
  key?: string | number;
}) => (
  <div
    onClick={onClick}
    className={cn("p-6 group cursor-pointer", getTintClass(name))}
  >
    <div className="flex justify-between items-start mb-4">
      <span className="text-lg font-bold text-ink font-serif leading-tight">{name}</span>
      <span className="bg-accent text-white text-[10px] px-2 py-1 font-bold rounded-sm group-hover:scale-110 transition-transform shrink-0 ml-2">
        {count} OCC.
      </span>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase text-muted">
        <MapPin className="h-3 w-3" />
        <span>{regions} {regions === 1 ? 'Regione' : 'Regioni'}</span>
      </div>
      <span className="text-[8px] font-sans font-bold uppercase tracking-widest text-accent/50 border border-accent/20 px-1.5 py-0.5 rounded-sm">
        {badge}
      </span>
    </div>
  </div>
);

// Card "protagonista" per una divinità: nome, occorrenze, regioni, numero di epiteti
const DivinityCard = ({ name, count, regions, epithetCount, onClick }: {
  name: string; count: number; regions: number; epithetCount: number; onClick: () => void;
  key?: string | number;
}) => (
  <motion.div
    onClick={onClick}
    whileHover={{ y: -3 }}
    transition={SPRING_SOFT}
    className={cn("p-6 group cursor-pointer relative overflow-hidden", getTintClass(name))}
  >
    <div className="flex justify-between items-start mb-4">
      <span className="text-xl font-bold text-ink font-serif italic leading-tight">{name}</span>
      <span className="bg-accent text-white text-[10px] px-2 py-1 font-bold rounded-sm group-hover:scale-110 transition-transform shrink-0 ml-2">
        {count} OCC.
      </span>
    </div>
    <div className="flex items-center gap-4 text-[10px] font-sans font-bold uppercase text-muted relative z-10">
      <span className="flex items-center gap-1.5">
        <MapPin className="h-3 w-3" />
        {regions} {regions === 1 ? 'Regione' : 'Regioni'}
      </span>
      <span className="flex items-center gap-1.5">
        <TagIcon className="h-3 w-3" />
        {epithetCount} {epithetCount === 1 ? 'Epiteto' : 'Epiteti'}
      </span>
    </div>
    <div className="absolute -bottom-3 -right-1 text-[76px] font-serif italic text-accent/[0.06] leading-none select-none pointer-events-none group-hover:text-accent/[0.1] transition-colors">
      {name.charAt(0)}
    </div>
  </motion.div>
);

// Grafo ramificato "obsidian": nodo centrale (la divinità) + epiteti disposti in
// cerchio attorno, collegati da linee che si disegnano in ingresso. Ogni nodo
// epiteto è cliccabile e porta alle attestazioni.
const DivinityGraph = ({ divinity, epithets, onSelectEpithet }: {
  divinity: { name: string; count: number; regions: number };
  epithets: { name: string; count: number }[];
  onSelectEpithet: (name: string) => void;
  key?: string | number;
}) => {
  const n = epithets.length;
  const R = 36; // raggio dei nodi in % del contenitore
  const nodes = epithets.map((e, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
    return { ...e, x: 50 + R * Math.cos(angle), y: 50 + R * Math.sin(angle) };
  });

  return (
    <motion.div {...fadeSwap} className="flex-1 flex flex-col overflow-hidden">
      <div className="mb-4 flex items-center gap-3 text-[10px] font-sans font-bold uppercase tracking-widest text-muted">
        <span>{divinity.count} occorrenze</span>
        <span className="text-border">·</span>
        <span>{divinity.regions} {divinity.regions === 1 ? 'regione' : 'regioni'}</span>
        <span className="text-border">·</span>
        <span>{epithets.length} {epithets.length === 1 ? 'epiteto' : 'epiteti'} co-occorrenti</span>
      </div>

      <div className="relative flex-1 min-h-[480px]">
        {/* Linee di collegamento, disegnate in ingresso */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          {nodes.map((node, i) => (
            <motion.line
              key={node.name}
              x1="50%" y1="50%"
              x2={`${node.x}%`} y2={`${node.y}%`}
              stroke="var(--accent)"
              strokeOpacity={0.25}
              strokeWidth={1}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.05 * i, ease: EASE_OUT }}
            />
          ))}
        </svg>

        {/* Nodo centrale: la divinità */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <div className="w-36 h-36 rounded-full flex flex-col items-center justify-center text-center px-3 border-2 border-accent/40 bg-[var(--card)]/90 backdrop-blur-xl shadow-[0_0_40px_-8px_rgba(var(--shadow-color),0.4)]">
            <span className="text-2xl font-bold font-serif italic text-accent leading-tight">{divinity.name}</span>
            <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-muted mt-1">Divinità</span>
          </div>
        </motion.div>

        {/* Nodi satellite: gli epiteti */}
        {nodes.map((node, i) => (
          <motion.button
            key={node.name}
            onClick={() => onSelectEpithet(node.name)}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 + 0.05 * i, ease: EASE_OUT }}
            whileHover={{ scale: 1.08 }}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center text-center px-3 py-3 rounded-full w-24 h-24 group border border-accent/30 bg-[var(--card)]/90 backdrop-blur-md shadow-[0_8px_24px_-8px_rgba(var(--shadow-color),0.25)] hover:border-accent hover:shadow-[0_0_24px_-4px_rgba(var(--shadow-color),0.5)] transition-all"
          >
            <span className="text-xs font-bold font-serif italic text-ink group-hover:text-accent transition-colors leading-tight">{node.name}</span>
            <span className="text-[9px] font-sans font-bold text-muted mt-1">{node.count}×</span>
          </motion.button>
        ))}

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted/40 text-sm italic text-center px-8">
            Nessun epiteto co-occorrente per questa divinità nello stesso monumento.
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Helper per la lista attestazioni
const AttestationList = ({
  label, context, items, monumenti, onSelectMonumento
}: {
  label: string;
  context?: string; // es. il nome della divinità di appartenenza, per il breadcrumb
  items: Monumento[];
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
  key?: string | number;
}) => (
  <motion.div {...fadeSwap} className="flex-1 flex flex-col overflow-hidden">
    <div className="mb-6 border-b border-border pb-2">
      <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-1.5">
        {context ? <>{context} <ChevronRight className="inline h-3 w-3 -mt-0.5 mx-0.5" /> Elenco monumenti</> : 'Elenco monumenti'}
      </div>
      <h3 className="text-2xl font-serif italic text-accent">Attestazioni per: "{label}"</h3>
    </div>
    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {items.map((m, i) => (
          <motion.div
            key={m.entryId || `idx-${m.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(i, 12) * 0.03, ease: EASE_OUT }}
            onClick={() => onSelectMonumento(m)}
            className={cn("p-5 cursor-pointer group", getTintClass(m.titolo || m.citta || String(m.id)))}
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {m.regione && (
                <span className="text-[9px] font-sans font-bold bg-accent/10 text-accent px-1.5 rounded-sm uppercase tracking-widest">{m.regione}</span>
              )}
              {m.citta && (
                <span className="text-[9px] font-sans font-bold text-muted uppercase tracking-widest">{m.citta}</span>
              )}
            </div>
            <div className="text-base font-bold font-serif text-ink group-hover:text-accent transition-colors leading-snug mb-1.5">{getDisplayTitle(m)}</div>
            <div className="text-xs italic text-muted line-clamp-2 mb-3">"{stripXml(m.testo) || '[Anepigrafe]'}"</div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {m.divinita && m.divinita.length > 0 && (
                  <span className="text-[9px] font-serif italic text-accent/70 truncate">{m.divinita.join(', ')}</span>
                )}
                {m.epiteti && m.epiteti.length > 0 && (
                  <span className="text-[9px] font-sans text-muted/70 truncate">[{m.epiteti.join(', ')}]</span>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-border group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </motion.div>
        ))}
      </div>
      {items.length === 0 && (
        <div className="text-center py-12 text-muted/40 text-sm italic">Nessuna attestazione trovata.</div>
      )}
    </div>
  </motion.div>
);

function EpithetStats({ monumenti, onSelectMonumento }: { monumenti: Monumento[], onSelectMonumento: (m: Monumento) => void }) {
  const [activeTab, setActiveTab] = useState<'divinita' | 'onomastica'>('divinita');
  const [selectedDivinity, setSelectedDivinity] = useState<string | null>(null);
  const [selectedEpithet, setSelectedEpithet] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null); // solo per l'onomastica

  // ── Statistiche divinità, con epiteti co-occorrenti e relativo conteggio ──
  const divstats = useMemo(() => {
    const counts: Record<string, number> = {};
    const regions: Record<string, Set<string>> = {};
    const coEpiteti: Record<string, Record<string, number>> = {};
    monumenti.forEach(m => {
      m.divinita?.forEach(d => {
        counts[d] = (counts[d] || 0) + 1;
        if (!regions[d]) regions[d] = new Set();
        if (!coEpiteti[d]) coEpiteti[d] = {};
        if (m.regione) regions[d].add(m.regione);
        // Epiteti co-occorrenti nella stessa epigrafe, con conteggio per il grafo
        m.epiteti?.forEach(e => {
          coEpiteti[d][e] = (coEpiteti[d][e] || 0) + 1;
        });
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        regions: regions[name]?.size || 0,
        epiteti: Object.entries(coEpiteti[name] || {})
          .map(([ename, ecount]) => ({ name: ename, count: ecount }))
          .sort((a, b) => b.count - a.count)
      }))
      .sort((a, b) => b.count - a.count);
  }, [monumenti]);

  // ── Statistiche onomastica ────────────────────────────────────────────────
  const onostats = useMemo(() => {
    const counts: Record<string, number> = {};
    const regions: Record<string, Set<string>> = {};
    monumenti.forEach(m => {
      m.onomastica?.forEach(o => {
        counts[o] = (counts[o] || 0) + 1;
        if (!regions[o]) regions[o] = new Set();
        if (m.regione) regions[o].add(m.regione);
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, regions: regions[name]?.size || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [monumenti]);

  const totalDivinita = divstats.length;
  const totalOnomastica = onostats.length;
  const totalEpiteti = useMemo(() => {
    const set = new Set<string>();
    divstats.forEach(d => d.epiteti.forEach(e => set.add(e.name)));
    return set.size;
  }, [divstats]);

  const selectedDivinityStats = useMemo(
    () => divstats.find(d => d.name === selectedDivinity) || null,
    [divstats, selectedDivinity]
  );

  // ── Monumenti per l'epiteto selezionato (nel contesto della divinità) ─────
  const monumentsForEpithet = useMemo(() => {
    if (!selectedDivinity || !selectedEpithet) return [];
    return monumenti.filter(m => m.divinita?.includes(selectedDivinity) && m.epiteti?.includes(selectedEpithet));
  }, [monumenti, selectedDivinity, selectedEpithet]);

  // ── Monumenti per l'onomastica selezionata ─────────────────────────────────
  const monumentsForOnomastica = useMemo(() => {
    if (!selected) return [];
    return monumenti.filter(m => m.onomastica?.includes(selected));
  }, [monumenti, selected]);

  const anySelection = activeTab === 'divinita' ? !!selectedDivinity : !!selected;

  // Risale di un livello: attestazioni → grafo → griglia divinità (o, per
  // l'onomastica, direttamente attestazioni → griglia)
  const goBack = () => {
    if (activeTab === 'divinita') {
      if (selectedEpithet) setSelectedEpithet(null);
      else setSelectedDivinity(null);
    } else {
      setSelected(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div {...scrollReveal} className="mb-8 flex justify-between items-end">
        <div>
          <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-2">Statistiche del Corpus</div>
          <h2 className="text-4xl font-bold italic mb-2">Divinità &amp; Onomastica</h2>
          <div className="ornament-rule !my-0 mb-3 max-w-[6rem] mx-0" />
          <p className="text-sm text-muted font-serif">
            {activeTab === 'divinita'
              ? (selectedDivinity
                  ? 'Epiteti co-occorrenti con questa divinità nel corpus.'
                  : 'Le divinità attestate nel corpus. Seleziona una divinità per esplorarne gli epiteti.')
              : 'Frequenza e distribuzione geografica delle persone attestate.'}
          </p>
        </div>
        {anySelection && (
          <button
            onClick={goBack}
            className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent border border-accent px-4 py-2 hover:bg-accent hover:text-white transition-all"
          >
            ← Indietro
          </button>
        )}
      </motion.div>

      {/* Tab selector */}
      {!anySelection && (
        <div className="flex gap-0 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab('divinita')}
            className={cn(
              "px-6 py-3 text-[11px] font-sans font-bold uppercase tracking-widest border-b-2 transition-all",
              activeTab === 'divinita'
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            Divinità
            <span className="ml-2 text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-sm font-bold">
              {totalDivinita}
            </span>
            <span className="ml-1.5 text-[9px] text-muted/50 font-sans font-normal normal-case tracking-normal">
              {totalEpiteti} epiteti
            </span>
          </button>
          <button
            onClick={() => setActiveTab('onomastica')}
            className={cn(
              "px-6 py-3 text-[11px] font-sans font-bold uppercase tracking-widest border-b-2 transition-all",
              activeTab === 'onomastica'
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            Onomastica
            <span className="ml-2 text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-sm font-bold">
              {totalOnomastica}
            </span>
          </button>
        </div>
      )}

      {/* Contenuto: dissolvenza tra i livelli di navigazione */}
      <AnimatePresence mode="wait">
        {activeTab === 'divinita' && !selectedDivinity && (
          <motion.div key="divinita-grid" {...fadeSwap} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pr-4 custom-scrollbar px-2">
            {divstats.map(s => (
              <DivinityCard
                key={s.name}
                name={s.name}
                count={s.count}
                regions={s.regions}
                epithetCount={s.epiteti.length}
                onClick={() => setSelectedDivinity(s.name)}
              />
            ))}
            {divstats.length === 0 && (
              <div className="col-span-4 text-center py-12 text-muted/40 text-sm italic">
                Nessuna divinità estratta. Verifica che il corpus contenga tag &lt;persName type="divine"&gt;.
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'divinita' && selectedDivinity && !selectedEpithet && selectedDivinityStats && (
          <DivinityGraph
            key="divinita-graph"
            divinity={selectedDivinityStats}
            epithets={selectedDivinityStats.epiteti}
            onSelectEpithet={(name) => setSelectedEpithet(name)}
          />
        )}

        {activeTab === 'divinita' && selectedDivinity && selectedEpithet && (
          <AttestationList
            key="divinita-attestations"
            label={selectedEpithet}
            context={selectedDivinity}
            items={monumentsForEpithet}
            monumenti={monumenti}
            onSelectMonumento={onSelectMonumento}
          />
        )}

        {activeTab === 'onomastica' && !selected && (
          <motion.div key="onomastica-grid" {...fadeSwap} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pr-4 custom-scrollbar px-2">
            {onostats.map(s => (
              <StatsCard
                key={s.name}
                name={s.name}
                count={s.count}
                regions={s.regions}
                badge="ATTESTAZIONE"
                onClick={() => setSelected(s.name)}
              />
            ))}
            {onostats.length === 0 && (
              <div className="col-span-4 text-center py-12 text-muted/40 text-sm italic">
                Nessun nome di persona estratto. Verifica che il corpus contenga tag &lt;persName type="attested"&gt;.
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'onomastica' && selected && (
          <AttestationList
            key="onomastica-attestations"
            label={selected}
            items={monumentsForOnomastica}
            monumenti={monumenti}
            onSelectMonumento={onSelectMonumento}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  CORPUS HEALTH — cruscotto di coerenza
//  Aggrega i valori distinti dei campi controllati e segnala potenziali
//  varianti dello stesso termine (stessa forma normalizzata ma grafia
//  diversa), che spezzano l'indicizzazione e le statistiche.
// ─────────────────────────────────────────────────────────────────────────
function CorpusHealth({ monumenti, onSelectMonumento }: { monumenti: Monumento[], onSelectMonumento: (m: Monumento) => void }) {
  // Normalizza una stringa per il raggruppamento: minuscole, niente accenti,
  // sigma finale unificato, spazi collassati. Due valori che collassano sulla
  // stessa chiave normalizzata ma differiscono nella forma grezza sono sospetti.
  const norm = (s: string) => s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ς/g, 'σ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const analyzeField = (
    label: string,
    extractor: (m: Monumento) => string[]
  ) => {
    // Mappa: chiave normalizzata → { variante grezza → [id monumenti] }
    const groups: Record<string, Record<string, number[]>> = {};
    monumenti.forEach(m => {
      extractor(m).forEach(raw => {
        const v = (raw || '').trim();
        if (!v) return;
        const k = norm(v);
        if (!groups[k]) groups[k] = {};
        if (!groups[k][v]) groups[k][v] = [];
        groups[k][v].push(m.id);
      });
    });
    // Conflitti = chiavi normalizzate con più di una variante grezza
    const conflicts = Object.entries(groups)
      .filter(([, variants]) => Object.keys(variants).length > 1)
      .map(([k, variants]) => ({
        key: k,
        variants: Object.entries(variants)
          .map(([form, ids]) => ({ form, ids: Array.from(new Set(ids)) }))
          .sort((a, b) => b.ids.length - a.ids.length)
      }))
      .sort((a, b) => b.variants.length - a.variants.length);
    const distinctCount = Object.keys(groups).length;
    return { label, conflicts, distinctCount };
  };

  const reports = useMemo(() => [
    analyzeField('Divinità', m => m.divinita || []),
    analyzeField('Epiteti', m => m.epiteti || []),
    analyzeField('Onomastica', m => m.onomastica || []),
    analyzeField('Città', m => m.citta ? [m.citta] : []),
    analyzeField('Regione', m => m.regione ? [m.regione] : []),
    analyzeField('Tipo oggetto', m => m.tipo ? [m.tipo] : []),
    analyzeField('Materiale', m => m.materiale ? [m.materiale] : []),
  ], [monumenti]);

  // Entry con campi essenziali mancanti — segnalazione, non auto-riempimento
  const missing = useMemo(() => {
    const noDivinita = monumenti.filter(m => !m.divinita || m.divinita.length === 0);
    const noDate = monumenti.filter(m => m.data_inizio === undefined && m.data_fine === undefined);
    const noBiblio = monumenti.filter(m => !m.bibliografia || m.bibliografia.length === 0);
    const noCitta = monumenti.filter(m => !m.citta || !m.citta.trim());
    const escapedMarkup = monumenti.filter(m => (m.testo || '').includes('&lt;persName') || (m.testo || '').includes('&lt;rs'));
    return { noDivinita, noDate, noBiblio, noCitta, escapedMarkup };
  }, [monumenti]);

  const totalConflicts = reports.reduce((s, r) => s + r.conflicts.length, 0);

  const jumpToFirst = (ids: number[]) => {
    const m = monumenti.find(x => ids.includes(x.id));
    if (m) onSelectMonumento(m);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <motion.div {...scrollReveal} className="mb-8">
        <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-2">Controllo qualità</div>
        <h2 className="text-4xl font-bold italic mb-2">Coerenza del Corpus</h2>
        <div className="ornament-rule !my-0 mb-3 max-w-[6rem] mx-0" />
        <p className="text-sm text-muted font-serif">
          Controllo automatico delle varianti grafiche e dei campi mancanti. Nessun dato viene modificato: le segnalazioni vanno verificate e corrette a mano.
        </p>
      </motion.div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2">
        {/* Riepilogo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="text-3xl font-bold">{totalConflicts}</div>
            <div className="text-[10px] font-sans uppercase tracking-widest text-muted mt-1">Conflitti di grafia</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-3xl font-bold">{missing.escapedMarkup.length}</div>
            <div className="text-[10px] font-sans uppercase tracking-widest text-muted mt-1">Markup non valido</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-3xl font-bold">{missing.noDivinita.length}</div>
            <div className="text-[10px] font-sans uppercase tracking-widest text-muted mt-1">Senza divinità</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-3xl font-bold">{missing.noDate.length}</div>
            <div className="text-[10px] font-sans uppercase tracking-widest text-muted mt-1">Senza datazione</div>
          </div>
        </div>

        {/* Markup escaped — errore bloccante per il parser */}
        {missing.escapedMarkup.length > 0 && (
          <div className="border-l-2 border-red-500 pl-4">
            <h3 className="font-bold text-sm mb-2 text-red-600">⚠ Markup EpiDoc non interpretato</h3>
            <p className="text-xs text-muted font-serif mb-3">
              Questi file contengono <code>&amp;lt;persName&amp;gt;</code> come testo letterale invece di veri tag XML. Le divinità e gli epiteti al loro interno NON vengono indicizzati. Vanno ricodificati.
            </p>
            <div className="flex flex-wrap gap-2">
              {missing.escapedMarkup.map(m => (
                <button key={m.id} onClick={() => onSelectMonumento(m)}
                  className="text-xs font-sans border border-red-300 text-red-700 px-2 py-1 hover:bg-red-50 transition-colors">
                  #{m.id} {m.corpus} {m.numero}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conflitti di grafia per campo */}
        {reports.filter(r => r.conflicts.length > 0).map(report => (
          <div key={report.label}>
            <h3 className="font-bold text-sm mb-1">
              {report.label}
              <span className="ml-2 text-[10px] font-sans font-normal text-muted uppercase tracking-widest">
                {report.distinctCount} valori distinti · {report.conflicts.length} conflitti
              </span>
            </h3>
            <div className="space-y-3 mt-3">
              {report.conflicts.map(conflict => (
                <div key={conflict.key} className="rounded-xl border border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/10 backdrop-blur-md p-4 shadow-sm">
                  <div className="text-[10px] font-sans uppercase tracking-widest text-amber-700/80 mb-2">
                    Stessa forma, grafie diverse:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {conflict.variants.map(v => (
                      <button key={v.form} onClick={() => jumpToFirst(v.ids)}
                        className="text-xs font-sans rounded-md border border-border/60 bg-white/40 dark:bg-black/10 px-2 py-1.5 hover:border-accent hover:text-accent transition-colors">
                        <span className="font-serif text-sm font-semibold">{v.form}</span>
                        <span className="ml-2 text-[10px] text-muted">×{v.ids.length}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {totalConflicts === 0 && missing.escapedMarkup.length === 0 && (
          <div className="border border-border/60 p-6 text-center">
            <div className="text-sm font-serif text-muted">Nessun conflitto di grafia rilevato nel corpus.</div>
          </div>
        )}

        {/* Liste campi mancanti */}
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { title: 'Senza bibliografia', list: missing.noBiblio },
            { title: 'Senza città', list: missing.noCitta },
          ].map(({ title, list }) => list.length > 0 && (
            <div key={title}>
              <h3 className="font-bold text-sm mb-2">{title} <span className="text-[10px] font-sans font-normal text-muted">({list.length})</span></h3>
              <div className="flex flex-wrap gap-2">
                {list.slice(0, 40).map(m => (
                  <button key={m.id} onClick={() => onSelectMonumento(m)}
                    className="text-xs font-sans border border-border/60 px-2 py-1 hover:border-accent hover:text-accent transition-colors">
                    #{m.id}
                  </button>
                ))}
                {list.length > 40 && <span className="text-xs text-muted self-center">+{list.length - 40} altre</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LegendaDropdown() {
  const [open, setOpen] = useState(false);
  const items = [
    { sample: <span className="underline decoration-2 underline-offset-2 font-serif italic text-ink">Aa</span>, label: 'nome proprio' },
    { sample: <span className="font-serif font-bold text-accent">Aa</span>, label: 'divinità' },
    { sample: <span className="font-serif italic text-accent">Aa</span>, label: 'epiteto' },
    { sample: <span className="font-serif text-muted/50">[Aa]</span>, label: 'integrazione editoriale' },
  ];
  return (
    <div className="relative px-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest text-muted/50 hover:text-muted/80 transition-colors"
      >
        Legenda
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3 w-3" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-sans text-muted bg-sidebar/40 border border-border/30 rounded-md px-3 py-2.5 w-fit">
              {items.map((it, i) => (
                <span key={i} className="flex items-center gap-1.5">{it.sample} {it.label}</span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Fase lunare reale, condivisa tra landing screen e IconRail
function getMoonPhase() {
  const synodic = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const age = (((Date.now() - knownNewMoon) / 86400000) % synodic + synodic) % synodic;
  const phase = age / synodic; // 0=nuova, 0.5=piena
  const illum = (1 - Math.cos(2 * Math.PI * phase)) / 2; // 0..1
  const waxing = phase < 0.5;

  const halfDay = 0.5;
  const qFirst = synodic * 0.25, qFull = synodic * 0.5, qLast = synodic * 0.75;
  let name: string;
  if (age < halfDay || age > synodic - halfDay) name = 'Luna nuova';
  else if (Math.abs(age - qFirst) < halfDay) name = 'Primo quarto';
  else if (Math.abs(age - qFull) < halfDay) name = 'Luna piena';
  else if (Math.abs(age - qLast) < halfDay) name = 'Ultimo quarto';
  else if (age < qFirst) name = 'Crescente';
  else if (age < qFull) name = 'Gibbosa crescente';
  else if (age < qLast) name = 'Gibbosa calante';
  else name = 'Calante';

  return { name, illum, waxing, day: Math.round(age) };
}

function MoonDisc({ illum, waxing, size = 24, opacity = 0.55 }: { illum: number; waxing: boolean; size?: number; opacity?: number }) {
  const r = 9, cx = 12, cy = 12;
  // Coloriamo la porzione in OMBRA, non quella illuminata: il bianco/sfondo
  // che resta a vista è la luna visibile (illuminata), il riempimento
  // accent è l'ombra — non il contrario. L'ombra sta dal lato opposto
  // rispetto a dove la luce cresce/cala, quindi si costruisce con la
  // frazione complementare (1 - illum) e il verso di "waxing" invertito.
  const shadowFrac = 1 - illum;
  const shadowWaxing = !waxing;
  const rx = r * Math.abs(2 * shadowFrac - 1);
  const sweep1 = shadowWaxing ? 1 : 0;
  const sweep2 = shadowFrac < 0.5 ? 1 - sweep1 : sweep1;
  const d = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweep1} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep2} ${cx} ${cy - r} Z`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1" />
      <path d={d} fill="var(--accent)" fillOpacity={opacity} />
    </svg>
  );
}

const RAIL_HOME_MOON = getMoonPhase();
const RAIL_ITEMS: { view: AppView; label: string; icon: React.ReactNode }[] = [
  { view: 'home', label: 'Home', icon: <MoonDisc illum={RAIL_HOME_MOON.illum} waxing={RAIL_HOME_MOON.waxing} size={16} opacity={0.7} /> },
  { view: 'catalog', label: 'Catalogo', icon: <Book className="h-4 w-4" /> },
  { view: 'map', label: 'Mappa', icon: <MapPin className="h-4 w-4" /> },
  { view: 'timeline', label: 'Cronologia', icon: <Clock className="h-4 w-4" /> },
  { view: 'stats', label: 'Statistiche Epiteti', icon: <BarChart2 className="h-4 w-4" /> },
  { view: 'heatmap', label: 'Heatmap Co-occorrenze', icon: <Columns className="h-4 w-4" /> },
  { view: 'health', label: 'Coerenza', icon: <Check className="h-4 w-4" /> },
  { view: 'editor', label: 'Editor XML', icon: <Feather className="h-4 w-4" /> },
];

function IconRail({
  activeView, onNavigate, theme, setTheme, isDarkModeActive,
  showSettings, setShowSettings, currentUser, loginWithGoogle, logout,
}: {
  activeView: AppView; onNavigate: (v: AppView) => void;
  theme: 'light' | 'dark' | 'system'; setTheme: (t: 'light' | 'dark' | 'system') => void; isDarkModeActive: boolean;
  showSettings: boolean; setShowSettings: (v: boolean | ((s: boolean) => boolean)) => void;
  currentUser: User | null; loginWithGoogle: () => void; logout: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Fase lunare reale: ciclo sinodico medio 29.53059 giorni, ancorato al novilunio del 6 gen 2000 18:14 UTC
  const moon = useMemo(() => getMoonPhase(), []);

  return (
    <>
      {/* Overlay per chiudere cliccando fuori */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-40 bg-ink/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setExpanded(false)}
          />
        )}
      </AnimatePresence>

      <motion.nav
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        animate={{ width: expanded ? 216 : 56 }}
        transition={SPRING_SOFT}
        className="fixed inset-y-0 left-0 z-50 flex flex-col items-stretch bg-[var(--card)]/95 dark:bg-[var(--card)]/90 backdrop-blur-xl border-r border-border/40 overflow-hidden shadow-[4px_0_24px_-8px_rgba(var(--shadow-color),0.15)]"
      >
        <div className={cn("flex items-center h-14 shrink-0", expanded ? "px-4 justify-start" : "justify-center")}>
          <span
            className="text-sm font-bold tracking-[0.15em] text-accent whitespace-nowrap"
            style={{ fontFamily: '"Cinzel", serif' }}
          >
            ILA
          </span>
        </div>

        <div className="flex-1 flex flex-col gap-1 px-2 py-2 overflow-y-auto">
          {RAIL_ITEMS.map(item => {
            const active = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => { onNavigate(item.view); setExpanded(false); }}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 h-10 px-3 rounded-lg shrink-0 transition-colors relative",
                  active ? "bg-accent/10 text-accent" : "text-muted hover:bg-accent/5 hover:text-accent"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="rail-active-indicator"
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent"
                    transition={SPRING_SNAPPY}
                  />
                )}
                <span className="w-4 h-4 shrink-0 flex items-center justify-center">{item.icon}</span>
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.15 }}
                      className="text-[11px] font-sans font-bold uppercase tracking-widest whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        {/* Controlli globali: tema, impostazioni, account — sempre a portata, non più duplicati altrove */}
        <div className="shrink-0 flex flex-col gap-1 px-2 py-2 border-t border-border/30">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={isDarkModeActive ? "Modalità Giorno" : "Modalità Notte"}
            className="flex items-center gap-3 h-10 px-3 rounded-lg shrink-0 text-muted hover:bg-accent/5 hover:text-accent transition-colors"
          >
            <span className="w-4 h-4 shrink-0 flex items-center justify-center">
              {isDarkModeActive ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </span>
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}
                  className="text-[11px] font-sans font-bold uppercase tracking-widest whitespace-nowrap"
                >
                  {isDarkModeActive ? "Modalità Giorno" : "Modalità Notte"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={() => setShowSettings(s => !s)}
            title="Impostazioni"
            className={cn("flex items-center gap-3 h-10 px-3 rounded-lg shrink-0 transition-colors", showSettings ? "bg-accent/10 text-accent" : "text-muted hover:bg-accent/5 hover:text-accent")}
          >
            <span className="w-4 h-4 shrink-0 flex items-center justify-center"><Settings className="h-4 w-4" /></span>
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}
                  className="text-[11px] font-sans font-bold uppercase tracking-widest whitespace-nowrap"
                >
                  Impostazioni
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={currentUser ? logout : loginWithGoogle}
            title={currentUser ? (currentUser.email === 'gabrielegregorio123@gmail.com' ? "Admin — Disconnetti" : `${currentUser.email} — Disconnetti`) : "Accedi come amministratore"}
            className="flex items-center gap-3 h-10 px-3 rounded-lg shrink-0 text-muted hover:bg-accent/5 hover:text-accent transition-colors"
          >
            <span className="w-4 h-4 shrink-0 flex items-center justify-center">
              {currentUser ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            </span>
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}
                  className="text-[11px] font-sans font-bold uppercase tracking-widest whitespace-nowrap truncate"
                >
                  {currentUser ? (currentUser.email === 'gabrielegregorio123@gmail.com' ? 'Admin' : currentUser.email) : 'Accedi'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Fase lunare corrente — omaggio a Men */}
        <div className="shrink-0 px-2 pb-4 pt-2 flex items-center gap-3 border-t border-border/30 mx-2" title={`${moon.name} — giorno ${moon.day} del ciclo`}>
          <div className="w-6 mx-auto flex items-center justify-center" style={{ marginLeft: expanded ? 4 : 'auto' }}>
            <MoonDisc illum={moon.illum} waxing={moon.waxing} size={24} />
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="min-w-0"
              >
                <div className="text-[9px] font-sans font-bold uppercase tracking-widest text-muted/70 whitespace-nowrap">{moon.name}</div>
                <div className="text-[8px] font-sans text-muted/50 whitespace-nowrap">Mensis dies {moon.day}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>
    </>
  );
}

function HomeView({ monumenti, onNavigate, onSearch }: { monumenti: Monumento[], onNavigate: (view: AppView) => void, onSearch: (q: string) => void }) {
  const [homeQuery, setHomeQuery] = useState('');
  const [launching, setLaunching] = useState<AppView | null>(null);
  const [launchStage, setLaunchStage] = useState<'lit' | 'zoom' | null>(null);
  const stats = useMemo(() => {
    const regioni = new Set(monumenti.map(m => m.regione).filter(Boolean));
    const citta = new Set(monumenti.map(m => m.citta).filter(Boolean));
    const dateInizio = monumenti.map(m => m.data_inizio).filter((d): d is number => typeof d === 'number');
    const dateFine = monumenti.map(m => m.data_fine).filter((d): d is number => typeof d === 'number');
    const minData = dateInizio.length ? Math.min(...dateInizio) : null;
    const maxData = dateFine.length ? Math.max(...dateFine) : null;
    return {
      totale: monumenti.length,
      regioni: regioni.size,
      citta: citta.size,
      rangeLabel: minData !== null && maxData !== null
        ? `${minData < 0 ? `${Math.abs(minData)} a.C.` : `${minData} d.C.`} – ${maxData < 0 ? `${Math.abs(maxData)} a.C.` : `${maxData} d.C.`}`
        : '—'
    };
  }, [monumenti]);

  const heroSection: { view: AppView; label: string; desc: string; icon: React.ReactNode } =
    { view: 'catalog', label: 'Catalogo', desc: 'Sfoglia e filtra tutte le schede epigrafiche del corpus.', icon: <Book className="h-6 w-6 md:h-7 md:w-7" /> };

  const sections: { view: AppView; label: string; desc: string; icon: React.ReactNode }[] = [
    { view: 'map', label: 'Mappa', desc: 'I siti di ritrovamento, geolocalizzati sul territorio antico.', icon: <MapPin className="h-5 w-5" /> },
    { view: 'timeline', label: 'Cronologia', desc: 'Le iscrizioni disposte lungo la sequenza temporale.', icon: <Clock className="h-5 w-5" /> },
    { view: 'stats', label: 'Statistiche Epiteti', desc: 'Frequenza e distribuzione degli epiteti di Men.', icon: <BarChart2 className="h-5 w-5" /> },
    { view: 'heatmap', label: 'Heatmap Co-occorrenze', desc: 'Quali epiteti e attributi ricorrono insieme.', icon: <Columns className="h-5 w-5" /> },
    { view: 'health', label: 'Coerenza', desc: "Controlli di qualità e coerenza sui dati del corpus.", icon: <Check className="h-5 w-5" /> },
    { view: 'editor', label: 'Editor XML', desc: 'Modifica le schede EpiDoc sezione per sezione, con riscrittura chirurgica.', icon: <Feather className="h-5 w-5" /> },
  ];

  const launchCard = (view: AppView) => {
    setLaunching(view);
    setLaunchStage('lit');
    setTimeout(() => setLaunchStage('zoom'), 620);
    setTimeout(() => onNavigate(view), 620 + 350);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar relative">
      {/* Hero: narrativa+ricerca a sinistra, wordmark a bilanciare lo spazio a destra */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 items-center mb-8">
        <div>
          <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-2">Benvenuto</div>
          <p className="text-base md:text-lg font-serif italic text-ink/85 leading-relaxed max-w-2xl mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
            ut labore et dolore magna aliqua, ut enim ad minim veniam.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); if (homeQuery.trim()) onSearch(homeQuery.trim()); }}
            className="glass-panel rounded-full flex items-center gap-3 pl-5 pr-2 py-1.5 shadow-inner focus-within:ring-1 focus-within:ring-accent/30 transition-all max-w-xl"
          >
            <Search className="h-3.5 w-3.5 text-muted shrink-0" />
            <input
              type="text"
              value={homeQuery}
              onChange={(e) => setHomeQuery(e.target.value)}
              placeholder="Cerca un'iscrizione, un luogo, un termine…"
              className="flex-1 bg-transparent border-none outline-none text-xs font-serif italic text-ink placeholder:text-muted/60 py-1"
            />
            <button
              type="submit"
              disabled={!homeQuery.trim()}
              className="shrink-0 font-sans text-[9px] font-bold uppercase tracking-[0.1em] text-ink bg-accent px-4 py-2 rounded-full hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Cerca
            </button>
          </form>
        </div>

        {/* Wordmark + sottotitolo, spostato in alto a destra come da riferimento */}
        <div className="hidden lg:flex flex-col items-end text-right pr-6 pt-2 self-start select-none">
          <span
            className="text-7xl xl:text-8xl font-bold tracking-[0.12em] leading-none mb-4 text-accent/50"
            style={{ fontFamily: '"Cinzel", serif' }}
          >
            ILA
          </span>
          <p className="text-2xl italic font-serif text-ink/60 leading-tight">Index lunae antiquae</p>
          <p className="text-sm font-sans font-bold uppercase tracking-[0.15em] text-muted/50 mt-3">Database Epigrafico</p>
        </div>
      </div>

      {/* Catalogo in risalto: card scura, contrasto forte, identità distinta dalla griglia sottostante */}
      <motion.button
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{
          opacity: launching && launching !== 'catalog' ? 0 : (launchStage === 'zoom' && launching === 'catalog' ? 0 : 1),
          y: 0,
          scale: launching === 'catalog' ? 1.015 : 1,
        }}
        transition={{
          opacity: launchStage === 'zoom' && launching === 'catalog'
            ? { duration: 0.35, ease: EASE_IN }
            : { duration: 0.6, delay: 0.1 },
          scale: { duration: 0.45, ease: EASE_OUT },
          y: { duration: 0.6, delay: 0.1, ease: EASE_OUT },
        }}
        whileHover={!launching ? { y: -4 } : undefined}
        whileTap={{ scale: 0.99 }}
        disabled={!!launching}
        onClick={() => launchCard(heroSection.view)}
        className="relative w-full max-w-3xl mx-auto mb-8 text-left group overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 62%, black), color-mix(in srgb, var(--accent) 42%, black))',
          boxShadow: `
            inset 0 3px 8px rgba(0,0,0,0.45),
            inset 0 -2px 4px rgba(255,255,255,0.06),
            inset 0 1px 0 rgba(0,0,0,0.3),
            0 10px 30px -8px rgba(0,0,0,0.35)
          `,
        }}
      >
        {/* Doppio bordo — bacino lustrale: anello esterno a filo, anello interno arretrato */}
        <div className="absolute inset-0 rounded-2xl border border-white/30 pointer-events-none" />
        <div className="absolute inset-[7px] rounded-xl border border-white/[0.06] pointer-events-none" style={{ boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.45)' }} />
        {/* Motivo brand in filigrana, più leggibile sullo sfondo scuro */}
        <span
          className="absolute -right-4 -top-8 text-[9rem] leading-none text-white/[0.07] select-none pointer-events-none"
          style={{ fontFamily: '"Cinzel", serif' }}
        >
          {'\u263E'}
        </span>
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 18% 25%, rgba(255,255,255,0.16), transparent 60%)' }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: launching === 'catalog' && launchStage !== 'zoom' ? 1 : 0,
            scale: launching === 'catalog' ? 1.4 : 0.6,
          }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        />
        <div className="relative flex items-center gap-4 md:gap-5 px-7 py-7 md:px-10 md:py-9">
          <motion.div
            className="relative w-14 h-14 shrink-0 rounded-full bg-white/10 text-white flex items-center justify-center ring-1 ring-white/25 group-hover:bg-white/20 group-hover:ring-white/40 transition-all"
            animate={launching === 'catalog' && launchStage === 'lit' ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            {heroSection.icon}
          </motion.div>
          <div className="flex-1">
            <div className="text-[9px] font-sans font-bold uppercase tracking-[0.22em] text-white/70 mb-1">Punto di partenza</div>
            <div className="font-serif font-bold text-white text-2xl mb-1">{heroSection.label}</div>
            <p className="text-sm text-white/70 leading-snug">{heroSection.desc}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
        </div>
        <motion.div
          className="absolute inset-0 rounded-[inherit] border border-white/50 pointer-events-none"
          initial={false}
          animate={{ opacity: launching === 'catalog' && launchStage !== 'zoom' ? 1 : 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        />
      </motion.button>


      {/* Accessi rapidi */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-3"
      >
        Strumenti database
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className={cn("relative z-0 rounded-2xl glass-panel", launchStage ? "overflow-visible" : "overflow-hidden")}
      >
        <div className="relative z-10 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
            {sections.map((s, i) => (
              <motion.button
                key={s.view}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{
                  opacity: launching && launching !== s.view ? 0 : (launchStage === 'zoom' ? 0 : 1),
                  y: 0,
                  scale: launching === s.view ? 1.04 : 1,
                }}
                transition={{
                  opacity: launchStage === 'zoom'
                    ? { duration: 0.35, ease: EASE_IN }
                    : { duration: launching ? 0.4 : 0.6, delay: launching ? 0 : 0.15 + i * 0.12 },
                  scale: { duration: 0.45, ease: EASE_OUT },
                  y: { duration: 0.6, delay: 0.15 + i * 0.12, ease: EASE_OUT },
                }}
                style={launching === s.view ? { zIndex: 30 } : undefined}
                whileHover={!launching ? { y: -3 } : undefined}
                whileTap={{ scale: 0.96 }}
                disabled={!!launching}
                onClick={() => launchCard(s.view)}
                className="glass-card p-4 text-left flex flex-col gap-2.5 group relative overflow-hidden"
              >
                {/* Illuminazione contestuale: luce radiale che si accende dal centro al click */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at 30% 20%, rgba(45,161,153,0.35), rgba(45,161,153,0.08) 45%, transparent 70%)',
                  }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{
                    opacity: launching === s.view && launchStage !== 'zoom' ? 1 : 0,
                    scale: launching === s.view ? 1.4 : 0.6,
                  }}
                  transition={{ duration: 0.6, ease: EASE_OUT }}
                />
                <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-accent/0 group-hover:bg-accent/10 blur-2xl transition-all duration-500 pointer-events-none" />
                <motion.div
                  className="relative w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent/20 transition-colors [&>svg]:h-4 [&>svg]:w-4"
                  animate={launching === s.view && launchStage === 'lit' ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.6, ease: EASE_OUT }}
                >
                  {s.icon}
                </motion.div>
                <div className="relative">
                  <div className="font-serif font-bold text-ink text-sm mb-0.5">{s.label}</div>
                  <p className="text-[11px] text-muted leading-snug">{s.desc}</p>
                </div>
                {/* Bordo accent che si dissolve dolcemente insieme alla luce */}
                <motion.div
                  className="absolute inset-0 rounded-[inherit] border border-accent/60 pointer-events-none"
                  initial={false}
                  animate={{ opacity: launching === s.view && launchStage !== 'zoom' ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                />
              </motion.button>
            ))}
            </div>
          </div>
        </motion.div>
    </div>
  );
}

function Timeline({ monumenti, onSelect }: { monumenti: Monumento[], onSelect: (m: Monumento) => void }) {
  const sorted = useMemo(() => {
    return monumenti
      .filter(m => m.data_inizio !== undefined)
      .sort((a, b) => (a.data_inizio || 0) - (b.data_inizio || 0));
  }, [monumenti]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <motion.div {...scrollReveal} className="mb-8 pb-4 border-b border-border/50">
        <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-2">Sequenza temporale</div>
        <h2 className="text-4xl font-bold italic mb-2">Cronologia Storica</h2>
        <p className="text-sm text-muted font-serif">Visualizzazione sequenziale dei monumenti datati (a.C. - d.C.).</p>
      </motion.div>

      {sorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="text-sm font-serif italic text-muted mb-1">Nessun monumento datato nel corpus.</div>
            <p className="text-xs text-muted/70 font-sans">Le entry compariranno qui non appena verrà compilato il campo datazione (data_inizio).</p>
          </div>
        </div>
      ) : (
      <div className="flex-1 overflow-x-auto overflow-y-auto relative custom-scrollbar min-h-0">
            <motion.div
                 initial={{ left: '-10px', opacity: 0 }}
                 animate={{ left: 0, opacity: 1 }}
                 className="relative h-full flex items-center pr-20"
            >
              <div className="relative w-full h-[1px] bg-border flex items-center">
                {/* Century Markers */}
                {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map(c => (
                  <div 
                    key={c} 
                    className="absolute flex flex-col items-center"
                    style={{ left: `${((c + 4) / 8) * 100}%` }}
                  >
                    <div className="h-3 w-[1px] bg-border mb-3" />
                    <span className="text-[10px] font-sans font-bold text-muted/40 uppercase tracking-widest">
                      {c < 0 ? `${Math.abs(c)} a.C.` : `${c + 1} d.C.`}
                    </span>
                  </div>
                ))}

                {/* Monument Points */}
                {sorted.map((m, i) => (
                  <motion.div
                    key={m.entryId || `idx-${m.id}`}
                    whileHover={{ scale: 1.2, zIndex: 10 }}
                    className="absolute flex flex-col items-center cursor-pointer group"
                    style={{ 
                      left: `${(( (m.data_inizio || 0) / 100 + 4) / 8) * 100}%`,
                      top: i % 2 === 0 ? '-60px' : '20px'
                    }}
                    onClick={() => onSelect(m)}
                  >
                    <div className="h-3 w-3 rounded-full bg-accent border-2 border-parchment shadow-sm" />
                    <div className="mt-2 text-[9px] font-sans font-bold bg-parchment p-1 border border-border whitespace-nowrap shadow-sm max-w-[120px] overflow-hidden text-ellipsis">
                      #{m.id} {m.citta || m.regione || 'N/A'}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
      )}
        </div>
      );
    }


const EpiDocRenderer = ({ xml, query }: { xml: string; query: string }) => {
  const [hoveredInfo, setHoveredInfo] = useState<{ text: string; x: number; y: number } | null>(null);

  const parsedDoc = useMemo(() => {
    try {
      if (!xml) return null;
      const parser = new DOMParser();
      // 1. Try application/xml first with namespace wrapping
      const doc = parser.parseFromString(
        '<root xmlns="http://www.tei-c.org/ns/1.0">' + xml + '</root>',
        'application/xml'
      );
      const hasError = doc.querySelector('parsererror') || 
                       doc.getElementsByTagName('parsererror').length > 0 || 
                       doc.getElementsByTagNameNS('*', 'parsererror').length > 0;
      if (!hasError) {
        return { type: 'xml', doc };
      }
    } catch (e) {}

    // 2. Fallback to permissive HTML parsing
    try {
      const parser = new DOMParser();
      return { 
        type: 'html', 
        doc: parser.parseFromString(xml, 'text/html') 
      };
    } catch (e) {
      return null;
    }
  }, [xml]);

  const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const tooltipEl = target.closest('[data-epidoc-tooltip]');
    if (tooltipEl) {
      const text = tooltipEl.getAttribute('data-epidoc-tooltip') || '';
      const rect = tooltipEl.getBoundingClientRect();
      setHoveredInfo({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 8
      });
    } else {
      setHoveredInfo(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const tooltipEl = target.closest('[data-epidoc-tooltip]');
    if (tooltipEl) {
      const text = tooltipEl.getAttribute('data-epidoc-tooltip') || '';
      const rect = tooltipEl.getBoundingClientRect();
      setHoveredInfo({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 8
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredInfo(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const tooltipEl = target.closest('[data-epidoc-tooltip]');
    if (tooltipEl) {
      const text = tooltipEl.getAttribute('data-epidoc-tooltip') || '';
      const rect = tooltipEl.getBoundingClientRect();
      setHoveredInfo({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 8
      });
    }
  };

  const renderNode = (node: Node, key: number | string): any => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      // Collapse whitespace-only nodes (indentation/newlines between tags)
      // but preserve single spaces that carry semantic meaning
      const collapsed = text.replace(/[\n\r\t]/g, ' ').replace(/  +/g, ' ');
      if (!collapsed.trim()) return null;
      return <Highlight key={key} text={collapsed} query={query} />;
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const localName = (el.localName || el.tagName || '').toLowerCase();
      
      const nAttr = el.getAttribute('n') || '';
      const typeAttr = el.getAttribute('type') || '';
      const keyAttr = el.getAttribute('key') || '';
      const nymRefAttr = el.getAttribute('nymRef') || el.getAttribute('nymref') || '';
      const refAttr = el.getAttribute('ref') || '';
      const reasonAttr = el.getAttribute('reason') || '';
      const quantityAttr = el.getAttribute('quantity') || '';
      const breakAttr = el.getAttribute('break') || '';
      let langAttr = '';
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        if (attr.localName === 'lang' || attr.name === 'xml:lang' || attr.name === 'lang') {
          langAttr = attr.value;
          break;
        }
      }

      switch (localName) {
        case 'lb': {
          // linenum style: fixed-width monospace gutter, hanging left using negative margin
          const lineNumSpan = (
            <span
              key={key + '-n'}
              className="text-muted/40 text-[9px] select-none inline-block w-8 -ml-8 pr-2 text-right leading-none"
              style={{ fontFamily: 'monospace', fontStyle: 'normal', fontWeight: 'normal' }}
            >
              {nAttr}
            </span>
          );
          if (breakAttr === 'no') {
            // Word continues across lines: add a hyphen, break the line, and show the line number in the margin
            return (
              <span key={key}>
                <span className="text-muted/40 select-none">-</span>
                <br />
                {lineNumSpan}
              </span>
            );
          }
          if (nAttr === '1') {
            // First line: no preceding newline, just show number
            return <span key={key}>{lineNumSpan}</span>;
          }
          // Subsequent lines: newline then number
          return (
            <span key={key}>
              <br />
              {lineNumSpan}
            </span>
          );
        }
        case 'div': {
          if (typeAttr === 'textpart') {
            return (
              <div key={key} className="mb-8">
                <div
                  className="text-[9px] font-bold uppercase tracking-widest text-accent mb-3"
                  style={{ fontFamily: 'monospace', fontStyle: 'normal' }}
                >{nAttr}</div>
                {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
              </div>
            );
          }
          return <span key={key}>{Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}</span>;
        }
        case 'supplied': {
          const cert = el.getAttribute('cert') || '';
          const evidence = el.getAttribute('evidence') || '';
          let open = '[';
          let close = ']';
          let cls = 'text-muted/70 hover:bg-black/5 dark:hover:bg-white/5 px-0.5 rounded transition-colors cursor-help inline';
          let tooltip = 'Testo integrato (lacuna)';
          if (reasonAttr === 'omitted') {
            open = '⟨'; close = '⟩';
            tooltip = 'Testo omesso dal lapicida';
          } else if (reasonAttr === 'undefined' || evidence === 'previouseditor') {
            open = '⟦'; close = '⟧';
            tooltip = 'Testo letto da editore precedente (fonte non reperibile)';
            cls = 'text-muted/50 hover:bg-black/5 dark:hover:bg-white/5 px-0.5 rounded transition-colors cursor-help inline';
          } else if (reasonAttr === 'subaudible') {
            open = '('; close = ')';
            tooltip = 'Termine sottinteso aggiunto dal traduttore';
            cls = 'text-muted/60 italic hover:bg-black/5 dark:hover:bg-white/5 px-0.5 rounded transition-colors cursor-help inline';
          } else if (reasonAttr === 'lost') {
            tooltip = cert === 'low' ? 'Integrazione incerta (lacuna)' : 'Testo integrato (lacuna)';
          }
          const suffix = (reasonAttr === 'lost' && cert === 'low') ? '?' : '';
          return (
            <span key={key} className={cls} data-epidoc-tooltip={tooltip}>
              {open}{Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}{suffix}{close}
            </span>
          );
        }
        case 'gap': {
          let gapText = '[---]';
          let tooltipText = 'Lacuna nel testo';
          if (reasonAttr === 'illegible') {
            tooltipText = 'Testo illeggibile';
            if (quantityAttr && !Number.isNaN(Number(quantityAttr))) {
              gapText = '·'.repeat(Number(quantityAttr));
            } else {
              gapText = '·····';
            }
          } else if (quantityAttr) {
            gapText = `[- ca. ${quantityAttr} -]`;
          }
          return (
            <span 
              key={key} 
              data-epidoc-tooltip={tooltipText}
              className="tracking-widest text-muted hover:bg-black/5 dark:hover:bg-white/5 px-0.5 rounded transition-colors cursor-help inline-block"
              style={{ fontFamily: 'monospace', fontStyle: 'normal' }}
            >
              {gapText}
            </span>
          );
        }
        case 'choice': {
          let corrEl = null;
          let sicEl = null;
          Array.from(node.childNodes).forEach((child: any) => {
            if (child.nodeType === Node.ELEMENT_NODE) {
               const c = child as Element;
               const childName = (c.localName || c.tagName || '').toLowerCase();
               if (childName === 'corr') corrEl = c;
               if (childName === 'sic') sicEl = c;
            }
          });
          const corr = corrEl ? corrEl.textContent || '' : '';
          const sic = sicEl ? sicEl.textContent || '' : '';
          const tooltipText = sic ? `Correzione editoriale (su lapide: "${sic}")` : 'Correzione editoriale';
          return (
            <span 
              key={key} 
              data-epidoc-tooltip={tooltipText}
              className="border-b border-dotted border-accent hover:bg-accent/10 px-0.5 rounded transition-all cursor-help inline"
            >
              <Highlight text={corr} query={query} />
            </span>
          );
        }
        case 'persname': {
          let className = 'cursor-help transition-all hover:bg-accent/10 px-0.5 rounded inline';
          let tooltipLabel = 'Persona';
          if (typeAttr === 'attested') {
            className += ' underline decoration-dotted decoration-accent underline-offset-2';
            tooltipLabel = keyAttr ? `Persona attestata: ${keyAttr}` : 'Persona attestata';
          } else if (typeAttr === 'divine') {
            className += ' font-bold text-accent';
            tooltipLabel = keyAttr ? `Divinità: ${keyAttr}` : 'Divinità';
          } else if (typeAttr === 'ruler') {
            className += ' italic font-semibold text-accent/80';
            tooltipLabel = keyAttr ? `Sovrano: ${keyAttr}` : 'Sovrano';
          } else if (typeAttr === 'emperor') {
            className += ' font-semibold text-accent/70';
            tooltipLabel = keyAttr ? `Imperatore: ${keyAttr}` : 'Imperatore';
          } else if (keyAttr) {
            tooltipLabel = `Persona: ${keyAttr}`;
          }

          if (refAttr) {
            tooltipLabel += ` (Ref: ${refAttr})`;
            if (refAttr.startsWith('#')) {
              // Usually a local reference to a listPerson entry
              className += ' font-medium text-accent hover:underline';
            }
          }

          return (
            <span 
              key={key} 
              className={className}
              data-epidoc-tooltip={tooltipLabel}
            >
              {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
            </span>
          );
        }
        case 'name': {
          if (nymRefAttr) {
            const tooltipText = `Nome normalizzato (lemma: ${nymRefAttr})`;
            return (
              <span 
                key={key}
                data-epidoc-tooltip={tooltipText}
                className="hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors px-0.5 rounded cursor-help inline"
              >
                {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
              </span>
            );
          }
          break;
        }
        case 'placename': {
          let className = 'italic cursor-help hover:bg-accent/5 transition-colors px-0.5 rounded inline';
          let tooltipText = 'Nome di luogo';
          // Normalise IGCyr-style type values to standard EpiDoc types
          const normalizedType = typeAttr === 'ancientFindspot' ? 'ancient'
            : typeAttr === 'modernSpot' || typeAttr === 'modernFindspot' ? 'modern'
            : typeAttr;
          if (normalizedType === 'ethnic') {
            tooltipText = nymRefAttr ? `Etnico geografico: ${nymRefAttr}` : 'Etnico geografico';
          } else if (normalizedType === 'ancient') {
            tooltipText = keyAttr || refAttr ? `Luogo antico: ${keyAttr || refAttr}` : 'Luogo antico';
          } else if (normalizedType === 'modern') {
            tooltipText = keyAttr || refAttr ? `Luogo moderno: ${keyAttr || refAttr}` : 'Luogo moderno';
          } else if (refAttr) {
            tooltipText = `Luogo (rif: ${refAttr})`;
          }
          // Always generate a link if ref is an HTTP URI
          if (refAttr && refAttr.startsWith('http')) {
            return (
              <a key={key} href={refAttr} target="_blank" rel="noreferrer"
                className="italic text-accent hover:underline cursor-pointer inline"
                data-epidoc-tooltip={tooltipText || `Apri: ${refAttr}`}>
                {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
              </a>
            );
          } else if (false) {
            // placeholder to preserve else-if structure
          }

          return (
            <span 
              key={key} 
              className={className}
              data-epidoc-tooltip={tooltipText}
            >
              {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
            </span>
          );
        }

        case 'del': {
          // <del rend="erasure"> — testo cancellato (damnatio memoriae)
          const rendAttr = el.getAttribute('rend') || '';
          if (rendAttr === 'erasure') {
            return (
              <span
                key={key}
                className="line-through text-muted/50 decoration-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors px-0.5 rounded cursor-help inline"
                data-epidoc-tooltip="Testo cancellato (erasura)"
              >
                {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
              </span>
            );
          }
          return <span key={key}>{Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}</span>;
        }
        case 'expan': {
          // <expan><abbr>X</abbr><ex>ypsilon</ex></expan> → X(ypsilon)
          const abbrEl = Array.from(node.childNodes).find((c: any) => c.localName === 'abbr');
          const exEl = Array.from(node.childNodes).find((c: any) => c.localName === 'ex');
          const abbrText = abbrEl ? (abbrEl as Element).textContent || '' : '';
          const exText = exEl ? (exEl as Element).textContent || '' : '';
          return (
            <span
              key={key}
              className="hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-help inline"
              data-epidoc-tooltip={`Abbreviazione espansa: ${abbrText}(${exText})`}
            >
              {abbrText}
              {exText && <span className="text-muted/60">({exText})</span>}
            </span>
          );
        }
        case 'abbr': {
          // standalone <abbr> outside <expan>
          return (
            <span key={key} className="cursor-help inline" data-epidoc-tooltip="Abbreviazione">
              {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
            </span>
          );
        }
        case 'ex': {
          // <ex> inside <expan> — already handled by expan case, but as fallback:
          return (
            <span key={key} className="text-muted/60 inline">
              ({Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))})
            </span>
          );
        }
        case 'surplus': {
          // <surplus> — lettera in più per errore del lapicida → {testo}
          return (
            <span
              key={key}
              className="text-muted/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-help inline"
              data-epidoc-tooltip="Lettera erronea del lapicida (surplus)"
            >
              {'{'}
              {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
              {'}'}
            </span>
          );
        }
        case 'rs': {
          let className = 'italic hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors px-0.5 rounded cursor-help inline';
          let tooltipText = 'Termine semantico';
          if (typeAttr === 'epithet') {
            className = 'font-bold italic text-accent hover:bg-accent/10 transition-colors px-0.5 rounded cursor-help inline';
            tooltipText = 'Epiteto divino';
          } else if (typeAttr === 'official') {
            className = 'italic text-muted hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors px-0.5 rounded cursor-help inline';
            tooltipText = 'Titolo ufficiale';
          } else if (typeAttr === 'religious_terms') {
            className = 'italic text-accent/70 hover:bg-accent/10 transition-colors px-0.5 rounded cursor-help inline';
            tooltipText = 'Termine religioso';
          } else if (typeAttr === 'office') {
            className = 'font-semibold text-muted hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors px-0.5 rounded cursor-help inline';
            tooltipText = keyAttr ? `Carica/Ufficio: ${keyAttr}` : 'Carica istituzionale';
          } else if (typeAttr === 'monuList') {
            className = 'italic text-muted/70 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors px-0.5 rounded cursor-help inline';
            tooltipText = keyAttr ? `Monumento/Contesto: ${keyAttr}` : 'Monumento';
          } else if (typeAttr === 'execution') {
            className = 'italic hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors px-0.5 rounded cursor-help inline';
            tooltipText = keyAttr ? `Tecnica esecutiva: ${keyAttr}` : 'Tecnica esecutiva';
          } else if (typeAttr === 'months') {
            tooltipText = nymRefAttr ? `Mese: ${nymRefAttr}` : 'Mese';
          } else if (typeAttr) {
            tooltipText = `Termine semantico: ${typeAttr}`;
          }

          return (
            <span 
              key={key} 
              className={className}
              data-epidoc-tooltip={tooltipText}
            >
              {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
            </span>
          );
        }
        case 'unclear': {
           const tooltipText = 'Lettura incerta';
           return (
             <span 
               key={key} 
               className="underline decoration-dotted decoration-ink/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors px-0.5 rounded cursor-help inline"
               data-epidoc-tooltip={tooltipText}
             >
               {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
             </span>
           );
        }
        case 'space': {
           const tooltipText = 'Spazio intenzionale (vacat)';
           return (
             <span 
               key={key} 
               className="text-muted/60 mx-1 cursor-help hover:bg-black/5 dark:hover:bg-white/5 px-0.5 rounded transition-colors inline-block"
              style={{ fontFamily: 'monospace', fontStyle: 'italic' }}
               data-epidoc-tooltip={tooltipText}
             >
               vac.
             </span>
           );
        }
        case 'num': {
           const val = el.getAttribute('value') || '';
           const tooltipText = val ? `Valore numerico: ${val}` : 'Numero';
           return (
             <span 
               key={key}
               data-epidoc-tooltip={tooltipText}
               className="hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors px-0.5 rounded cursor-help inline"
             >
               {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
             </span>
           );
        }
        case 'foreign': {
          const rendAttr = el.getAttribute('rend') || '';
          if (langAttr === 'grc') {
            return (
              <span key={key} className="italic font-serif inline"
                data-epidoc-tooltip="Termine greco">
                {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
              </span>
            );
          } else if (rendAttr === 'italic' || langAttr) {
            // <foreign rend="italic"> o qualsiasi altra lingua
            return (
              <span key={key} className="italic inline"
                data-epidoc-tooltip={langAttr ? `Termine in lingua: ${langAttr}` : 'Termine straniero'}>
                {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
              </span>
            );
          }
          // fallthrough: render children
          return <span key={key} className="inline">
            {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
          </span>;
        }
        case 'ab': {
          return (
            <span key={key} className="epidoc-ab whitespace-pre-wrap block">
              {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
            </span>
          );
        }
        case 'lg': {
          const metAttr = el.getAttribute('met') || '';
          return (
            <div key={key} className="epidoc-lg mt-2 mb-2"
              data-epidoc-tooltip={metAttr ? `Testo metrico: ${metAttr}` : undefined}>
              {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
            </div>
          );
        }
        case 'l': {
          const lnAttr = el.getAttribute('n') || '';
          const metAttr = el.getAttribute('met') || '';
          return (
            <div key={key} className="epidoc-l flex items-baseline gap-1 leading-loose">
              {lnAttr && (
                <span className="text-muted/30 text-[8px] select-none shrink-0 w-4 text-right"
                  style={{ fontFamily: 'monospace' }}
                  data-epidoc-tooltip={metAttr || undefined}>
                  {lnAttr}
                </span>
              )}
              <span>{Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}</span>
            </div>
          );
        }
        case 'head': {
          // Ignora silenziosamente — le intestazioni di sezione sono gestite dall'interfaccia
          return null;
        }
        case 'date': {
          const calAttr = el.getAttribute('calendar') || '';
          const durAttr = el.getAttribute('dur') || '';
          const tooltip = calAttr ? `Calendario: ${calAttr}` : durAttr ? `Durata: ${durAttr}` : '';
          return (
            <span key={key}
              className={tooltip ? 'cursor-help hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors px-0.5 rounded inline' : 'inline'}
              data-epidoc-tooltip={tooltip || undefined}>
              {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
            </span>
          );
        }
        case 'g': {
          return <span key={key} className="inline">
            {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
          </span>;
        }
        case 'w': {
          // <w lemma="..."> — parola con lemma, mostra contenuto con tooltip opzionale
          const lemmaAttr = el.getAttribute('lemma') || '';
          return (
            <span key={key}
              className={lemmaAttr ? 'cursor-help inline' : 'inline'}
              data-epidoc-tooltip={lemmaAttr ? `Lemma: ${lemmaAttr}` : undefined}>
              {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
            </span>
          );
        }
        case 'seg': {
          // <seg part="I|M|F"> — segmento di parola, passthrough trasparente
          const partAttr = el.getAttribute('part') || '';
          return (
            <span key={key} className="inline"
              data-epidoc-tooltip={partAttr ? `Segmento parola (${partAttr === 'I' ? 'inizio' : partAttr === 'M' ? 'medio' : partAttr === 'F' ? 'fine' : partAttr})` : undefined}>
              {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
            </span>
          );
        }
        case 'lem':
        case 'rdg': {
          return <span key={key} className="inline">
            {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
          </span>;
        }
        case 'ref': {
          const refType = el.getAttribute('type') || '';
          const refTarget = el.getAttribute('target') || '';
          const text = el.textContent || '';
          if (refType === 'inscription') {
            // Cross-reference a un'altra iscrizione
            return (
              <span key={key}
                className="font-mono text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-sm border border-accent/20 cursor-help inline mx-0.5"
                data-epidoc-tooltip={`Rimando a: ${text}`}>
                {text}
              </span>
            );
          } else if (refTarget && refTarget.startsWith('http')) {
            return (
              <a key={key} href={refTarget} target="_blank" rel="noreferrer"
                className="text-accent hover:underline inline">
                {text || refTarget}
              </a>
            );
          }
          return <span key={key} className="inline">
            {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
          </span>;
        }
        case 'geogname': {
          // <geogName> — nome geografico, corsivo con tooltip
          const geoType = el.getAttribute('type') || '';
          const geoKey = el.getAttribute('key') || '';
          return (
            <span key={key} className="italic cursor-help inline"
              data-epidoc-tooltip={geoType ? `${geoType}: ${geoKey || el.textContent}` : undefined}>
              {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
            </span>
          );
        }
        case 'root': {
          return <span key={key}>{Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}</span>;
        }
      }
      return <span key={key}>{Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}</span>;
    }
    return null;
  };
  
  if (!parsedDoc) return <Highlight text={xml} query={query} />;
  
  const rootNode = parsedDoc.type === 'html' ? parsedDoc.doc.body : parsedDoc.doc.documentElement;
  
  return (
    <div 
      className="relative pl-8 epidoc-renderer leading-loose opacity-90 select-text"
      style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'inherit' }}
      onMouseOver={handleMouseOver}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {Array.from(rootNode.childNodes).map((child: any, i) => renderNode(child, i))}
      
      {hoveredInfo && (
        <div 
          className="fixed z-50 px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 text-white text-[11px] font-medium rounded shadow-xl font-sans transition-all max-w-xs pointer-events-none"
          style={{
            left: `${hoveredInfo.x}px`,
            top: `${hoveredInfo.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {hoveredInfo.text}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-[4px] w-2 h-2 bg-neutral-900 border-r border-b border-neutral-850 rotate-45" />
        </div>
      )}
    </div>
  );
};


const Highlight = ({ text, query }: { text: string; query: string; key?: string | number }) => {
  if (!query.trim()) return <>{text}</>;
  const parts = query.trim().split(/\s+/).filter(part => !['and', 'or', 'not'].includes(part.toLowerCase()));
  if (parts.length === 0) return <>{text}</>;
  
  const escaped = parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const textParts = text.split(regex);
  // Use a fresh regex for test to avoid /g flag stateful lastIndex bug
  const testRegex = new RegExp(`(${escaped})`, 'i');
  
  return (
    <>
      {textParts.map((part, i) => 
        testRegex.test(part) ? (
          <mark key={i} className="bg-accent/20 text-ink ring-1 ring-accent/30 rounded-sm px-0.5">{part}</mark>
        ) : part
      )}
    </>
  );
};

const NoteWithTags = ({ 
  text, 
  query, 
  onTagClick, 
  monumenti, 
  onSelectMonumento 
}: { 
  text: string; 
  query: string; 
  onTagClick?: (tag: string) => void;
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
}) => {
  const parts = text.split(/(@\d+|#[\w\d]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const id = parseInt(part.slice(1));
          const m = monumenti.find(mon => mon.id === id);
          if (m) {
            return (
              <button 
                key={i} 
                onClick={(e) => { e.stopPropagation(); onSelectMonumento(m); }}
                className="relative inline-flex items-center gap-2 px-3 py-1 mx-1.5 bg-sidebar border border-accent/20 text-accent font-serif text-[13px] hover:bg-accent hover:text-white transition-all group align-middle shadow-sm mb-1 cursor-pointer"
                style={{
                  clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)'
                }}
                title={`Vai a: ${m.titolo}`}
              >
                <span className="text-[9px] opacity-50 font-sans font-bold border-r border-accent/20 pr-2 leading-none">#{id}</span>
                <span className="font-bold tracking-tight italic whitespace-nowrap">{m.titolo || m.citta || 'Monumento'}</span>
              </button>
            );
          }
        }
        if (part.startsWith('#')) {
          return (
            <button 
              key={i} 
              onClick={(e) => { e.stopPropagation(); onTagClick?.(part); }}
              className="text-accent hover:text-ink font-bold transition-colors mx-0.5"
            >
              {part}
            </button>
          );
        }
        const greekParts = part.split(/(«[^»]*»)/g);
        return (
          <span key={i} className="inline m-0 p-0">
            {greekParts.map((gp, gIdx) => {
              if (gp.startsWith('«') && gp.endsWith('»')) {
                const greekWord = gp.slice(1, -1);
                return (
                  <span key={gIdx} className="font-serif italic text-ink/95 font-medium px-0.5 bg-accent/5 rounded-sm" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    <Highlight text={greekWord} query={query} />
                  </span>
                );
              }
              return <Highlight key={gIdx} text={gp} query={query} />;
            })}
          </span>
        );
      })}
    </>
  );
};

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' && window.localStorage ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch {
      // ignore
    }
  }
};

// ── sanitizeEntryId ────────────────────────────────────────────────────────
// Usato per generare ID validi e puliti da filename o dati grezzi.
function sanitizeEntryId(raw: string): string {
  const cleaned = raw
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // accenti -> lettera base
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (cleaned || 'entry').slice(0, 128);
}

export default function App() {
  type ThemePreference = 'light' | 'dark' | 'system';
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const saved = safeStorage.getItem('theme-preference') as ThemePreference;
    return saved || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (t: ThemePreference) => {
      let isDark = false;
      if (t === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = t === 'dark';
      }
      
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);
    safeStorage.setItem('theme-preference', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const isDarkModeActive = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);


  const [monumenti, setMonumenti] = useState<Monumento[]>([]);

  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const landingMoon = useMemo(() => getMoonPhase(), []);
  const [activeView, setActiveView] = useState<AppView>('home');
  const [editorTargetEntryId, setEditorTargetEntryId] = useState<string | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);

  const goHome = () => {
    setActiveView('home');
    setHasNavigated(false);
  };
  const [showSettings, setShowSettings] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const [compareList, setCompareList] = useState<Monumento[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [exportFlash, setExportFlash] = useState<'xml' | 'pdf' | null>(null);
  const flashExport = (kind: 'xml' | 'pdf') => {
    setExportFlash(kind);
    setTimeout(() => setExportFlash(f => (f === kind ? null : f)), 1400);
  };

  const toggleSelect = (m: Monumento) => {
    const key = m.entryId || m.id;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredMonumenti.map(m => m.entryId || m.id)));
  const deselectAll = () => setSelectedIds(new Set());
  const selectedMonumenti = monumenti.filter(m => selectedIds.has(m.entryId || m.id));
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    corpus: '',
    numero: '',
    regione: '',
    citta: '',
    tipo: '',
    materiale: '',
    onlyInscr: false,
    onlyAnep: false,
    onlyHasTrad: false,
    onlyNoTrad: false,
    selectedEpiteti: [],
    dateRange: [-500, 500],
    searchMode: 'AND',
  });
  
  const [miniSearchResults, setMiniSearchResults] = useState<any[]>([]);
  const [showMiniSearch, setShowMiniSearch] = useState(false);

  useEffect(() => {
    if (filters.searchText.trim().length > 2) {
      fetch(`/api/search?q=${encodeURIComponent(filters.searchText)}`)
        .then(res => res.json())
        .then(data => setMiniSearchResults(data))
        .catch(console.error);
    } else {
      setMiniSearchResults([]);
    }
  }, [filters.searchText]);
  
  const [selectedMonumento, setSelectedMonumento] = useState<Monumento | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const isEditing = false;
  const isCreating = false;
  const setIsEditing = (val: any) => {};
  const setIsCreating = (val: any) => {};
  const [translating, setTranslating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });

  // Advanced Import System States
  const [metaForm, setMetaForm] = useState({
    titolo: '',
    regione: '', corpus: '', numero: '',
    citta: '', luogo_moderno: '', luogo_rit: '', conserv: '',
    materiale: '', materialRef: '', tipo: '', tipo_ref: '',
    dim_altezza: '', dim_larghezza: '', dim_profondita: '', dim_unita: 'metre',
    place_ref_ancient: '', place_ref_modern: '',
    facsimile_url: '', facsimile_desc: '',
  });
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    if (selectedMonumento) {
      setMetaForm({
        titolo: selectedMonumento.titolo || '',
        regione: selectedMonumento.regione || '',
        corpus: selectedMonumento.corpus || '',
        numero: selectedMonumento.numero || '',
        citta: selectedMonumento.citta || '',
        luogo_moderno: selectedMonumento.luogo_moderno || '',
        luogo_rit: selectedMonumento.luogo_rit || '',
        conserv: selectedMonumento.conserv || '',
        materiale: selectedMonumento.materiale || '',
        materialRef: selectedMonumento.materialRef || '',
        tipo: selectedMonumento.tipo || '',
        tipo_ref: selectedMonumento.tipo_ref || '',
        dim_altezza: selectedMonumento.dim_altezza || '',
        dim_larghezza: selectedMonumento.dim_larghezza || '',
        dim_profondita: selectedMonumento.dim_profondita || '',
        dim_unita: selectedMonumento.dim_unita || 'metre',
        place_ref_ancient: selectedMonumento.place_ref_ancient || '',
        place_ref_modern: selectedMonumento.place_ref_modern || '',
        facsimile_url: selectedMonumento.facsimile_url || '',
        facsimile_desc: selectedMonumento.facsimile_desc || '',
      });
    }
  }, [selectedMonumento]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  // Conferma "Riordina ID" — NON usa window.confirm(): nelle preview embeddate
  // (es. iframe sandboxato di AI Studio) i dialoghi nativi del browser
  // (confirm/alert/prompt) vengono spesso bloccati silenziosamente, senza
  // errore visibile — il click sembra "non fare nulla". Un dialogo interno
  // funziona sempre, indipendentemente dal contesto di rendering.
  const [showReindexConfirm, setShowReindexConfirm] = useState(false);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importFileSize, setImportFileSize] = useState<number>(0);
  const [importFileType, setImportFileType] = useState<'xml' | 'json' | null>(null);
  const [parsedMonuments, setParsedMonuments] = useState<Monumento[] | null>(null);
  const [importMergeMode, setImportMergeMode] = useState<'overwrite' | 'merge_auto' | 'merge_skip' | 'merge_replace'>('merge_auto');
  const [importStep, setImportStep] = useState<'upload' | 'config' | 'loading' | 'success' | 'error'>('upload');
  const [importErrorMsg, setImportErrorMsg] = useState<string>('');
  const [corpusFilesList, setCorpusFilesList] = useState<{ filename: string; size: number; modified: string }[]>([]);
  const [loadingCorpusFiles, setLoadingCorpusFiles] = useState(false);
  const [importActiveTab, setImportActiveTab] = useState<'import' | 'files'>('import');

  // Autocomplete support for note fields
  const [suggestions, setSuggestions] = useState<{ type: '@' | '#', items: any[] } | null>(null);
  const [suggestionField, setSuggestionField] = useState<string | null>(null);
  const [suggestionTarget, setSuggestionTarget] = useState<'monument' | 'appunto' | null>(null);

  const allHashtags = useMemo(() => {
    const tags = new Set<string>();
    monumenti.forEach(m => m.note_interne?.match(/#[\w\d]+/g)?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [monumenti]);

  const handleAutocomplete = (val: string, pos: number, field: string, target: 'monument' | 'appunto') => {
    const lastChar = val.substring(0, pos).split(/[\s\n]/).pop() || '';
    if (lastChar.startsWith('@')) {
      const query = lastChar.slice(1).toLowerCase();
      const items = monumenti.filter(m => 
        m.id.toString().includes(query) || 
        m.titolo?.toLowerCase().includes(query) ||
        m.citta?.toLowerCase().includes(query)
      ).slice(0, 10);
      setSuggestions({ type: '@', items });
      setSuggestionField(field);
      setSuggestionTarget(target);
    } else if (lastChar.startsWith('#')) {
      const query = lastChar.slice(1).toLowerCase();
      const items = allHashtags.filter(t => t.toLowerCase().includes('#' + query)).slice(0, 10);
      setSuggestions({ type: '#', items });
      setSuggestionField(field);
      setSuggestionTarget(target);
    } else {
      setSuggestions(null);
      setSuggestionField(null);
      setSuggestionTarget(null);
    }
  };

  const applyAutocompleteSuggestion = (item: any, field: string, currentValue: string, textarea: HTMLTextAreaElement, setter: (val: string) => void) => {
    const pos = textarea.selectionStart;
    const before = currentValue.substring(0, pos);
    const after = currentValue.substring(pos);
    const words = before.split(/([\s\n])/);
    const lastWord = words[words.length - 1];
    
    let replacement = '';
    if (suggestions?.type === '@') {
      replacement = `@${item.id} `;
    } else {
      replacement = `${item} `;
    }

    words[words.length - 1] = replacement;
    const newVal = words.join('') + after;
    setter(newVal);
    setSuggestions(null);
    setSuggestionField(null);
    
    setTimeout(() => {
      const newPos = before.length - lastWord.length + replacement.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };
  
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Reset sub-states when modal closes
  useEffect(() => {
    if (!selectedMonumento) {
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setEditForm({});
    }
  }, [selectedMonumento]);



  const fetchCorpusFiles = async () => {
    setLoadingCorpusFiles(true);
    try {
      const res = await fetch('/api/corpus/files');
      if (res.ok) {
        const data = await res.json();
        setCorpusFilesList(data);
      }
    } catch (e) {
      console.error("Failed to load corpus files list", e);
    } finally {
      setLoadingCorpusFiles(false);
    }
  };

  useEffect(() => {
    if (isImportModalOpen && importActiveTab === 'files') {
      fetchCorpusFiles();
    }
  }, [isImportModalOpen, importActiveTab]);

  // Primary Data Loader
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const resMon = await fetch('/api/monumenti');
        if (resMon.ok) {
          const data = await resMon.json();
          setMonumenti(data);
        } else {
          setMonumenti(RAW_DATA);
        }
      } catch (err) {
        console.warn("Failed to load from local API, using RAW_DATA", err);
        setMonumenti(RAW_DATA);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const effectiveAdmin = !!currentUser && currentUser.email === 'gabrielegregorio123@gmail.com';

  const regions = useMemo(() => Array.from(new Set(monumenti.map(m => m.regione).filter(Boolean).map(s => s.trim()))).sort(), [monumenti]);
  const corpora = useMemo(() => Array.from(new Set(monumenti.map(m => m.corpus).filter(Boolean).map(s => s.trim()))).sort(), [monumenti]);
  const numbers = useMemo(() => Array.from(new Set(monumenti.map(m => m.numero).filter(Boolean).map(s => s.trim()))).sort(), [monumenti]);
  const cities = useMemo(() => Array.from(new Set(monumenti.map(m => m.citta).filter(Boolean).map(s => s.trim()))).sort(), [monumenti]);
  const types = useMemo(() => Array.from(new Set(monumenti.map(m => m.tipo).filter(Boolean).map(s => s.trim()))).sort(), [monumenti]);
  const materials = useMemo(() => Array.from(new Set(monumenti.map(m => m.materiale).filter(Boolean).map(s => s.trim()))).sort(), [monumenti]);

  // Optimized: Map monument IDs to pre-calculated normalized search strings to avoid repeating this during keystrokes
  const normalizedSearchMap = useMemo(() => {
    const map = new Map<number | string, string>();
    monumenti.forEach(m => {
      const textToNormalize = `
        ${m.id} 
        ${m.titolo || ''} 
        ${m.corpus || ''}
        ${m.numero || ''}
        ${m.citta || ''} 
        ${m.regione || ''} 
        ${m.testo || ''} 
        ${m.tipo || ''} 
        ${m.materiale || ''}
        ${m.epiteti?.join(' ') || ''}
        ${m.divinita?.join(' ') || ''}
        ${(m as any).imperatori?.join(' ') || ''}
        ${m.onomastica?.join(' ') || ''}
        ${m.note_interne || ''}
        ${stripXml(m.apparatus)}
        ${m.traduzioni?.map(t => `${t.testo || ''} ${t.note || ''}`).join(' ') || ''}
        ${m.bibliografia?.map(b => b.titolo || '').join(' ') || ''}
      `;
      map.set(m.id, normalizeGreek(textToNormalize));
    });
    return map;
  }, [monumenti]);

  const filteredMonumenti = useMemo(() => {
    const query = filters.searchText.toLowerCase().trim();
    const queryParts = query ? query.split(/\s+/) : [];
    const queryPartsNormalized = queryParts.map(p => normalizeGreek(p));

    return monumenti
      .filter(m => {
        // Advanced Search Logic (AND/OR/NOT)
        let matchesSearch = true;
        if (queryPartsNormalized.length > 0) {
          const mNorm = normalizedSearchMap.get(m.id) || '';
          let currentMode: 'AND' | 'OR' | 'NOT' = filters.searchMode;
          
          if (filters.searchMode === 'AND') {
            matchesSearch = queryPartsNormalized.every(partNorm => {
              if (partNorm === 'and') { currentMode = 'AND'; return true; }
              if (partNorm === 'or') { currentMode = 'OR'; return true; }
              if (partNorm === 'not') { currentMode = 'NOT'; return true; }
              
              const matchesPart = mNorm.includes(partNorm);
              if (currentMode === 'NOT') return !matchesPart;
              return matchesPart;
            });
          } else {
            matchesSearch = queryPartsNormalized.some(partNorm => {
              if (partNorm === 'and' || partNorm === 'or' || partNorm === 'not') return false;
              return mNorm.includes(partNorm);
            });
          }
        }
        
        const matchesRegione = !filters.regione || m.regione === filters.regione;
        const matchesCorpus = !filters.corpus || m.corpus === filters.corpus;
        const matchesNumero = !filters.numero || m.numero === filters.numero;
        const matchesCitta = !filters.citta || m.citta === filters.citta;
        const matchesTipo = !filters.tipo || m.tipo === filters.tipo;
        const matchesMateriale = !filters.materiale || m.materiale === filters.materiale;
        
        const matchesInscr = !filters.onlyInscr || m.iscrizione;
        const matchesAnep = !filters.onlyAnep || m.anepigr;
        
        const hasTrad = m.traduzioni && m.traduzioni.some(t => t.testo && t.testo.trim().length > 0);
        const matchesHasTrad = !filters.onlyHasTrad || hasTrad;
        const matchesNoTrad = !filters.onlyNoTrad || !hasTrad;

        const matchesDate = (!m.data_inizio || !m.data_fine) || (m.data_inizio >= filters.dateRange[0] && m.data_fine <= filters.dateRange[1]);

        return matchesSearch && matchesRegione && matchesCorpus && matchesNumero && matchesCitta && matchesTipo && matchesMateriale && matchesInscr && matchesAnep && matchesHasTrad && matchesNoTrad && matchesDate;
      })
      .sort((a, b) => {
        if (sortField === 'citta') {
          const locA = `${a.regione || ''} ${a.citta || ''}`.trim();
          const locB = `${b.regione || ''} ${b.citta || ''}`.trim();
          return sortOrder === 'asc' ? locA.localeCompare(locB) : locB.localeCompare(locA);
        }

        const valA = a[sortField];
        const valB = b[sortField];
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
  }, [monumenti, filters, sortField, sortOrder, normalizedSearchMap]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filters, showMiniSearch]);


  const totalPages = Math.ceil(filteredMonumenti.length / ITEMS_PER_PAGE);
  const paginatedMonumenti = filteredMonumenti.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const reindexMonumenti = async (dataToReindex?: Monumento[]) => {
    if (!effectiveAdmin) {
      alert("Solo l'amministratore (gabrielegregorio123@gmail.com) può riordinare gli ID.");
      return;
    }
    const data = dataToReindex || monumenti;
    if (data.length === 0) {
      alert("Nessun monumento da riordinare.");
      return;
    }
    
    // Sort by current ID to preserve relative order before re-assigning
    const reindexed = [...data]
      .sort((a, b) => a.id - b.id)
      .map((m, index) => ({
        ...m,
        id: index + 1
      }));
    
    try {
      setImportStatus({ type: 'loading', message: 'Riordino ID in corso...' });
      const res = await fetch('/api/monumenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reindexed)
      });
      if (res.ok) {
        setMonumenti(reindexed);
        if (selectedMonumento) {
          const updatedSelected = reindexed.find(m => m.entryId === selectedMonumento.entryId);
          if (updatedSelected) setSelectedMonumento(updatedSelected);
        }
        setImportStatus({ type: 'success', message: 'ID riordinati con successo!' });
        setTimeout(() => setImportStatus({ type: 'idle', message: '' }), 3000);
      } else {
        throw new Error("Errore nel salvataggio dei dati riordinati.");
      }
    } catch (err: any) {
      console.error("Reindex error", err);
      setImportStatus({ type: 'error', message: `Errore: ${err.message}` });
    }
  };

  const handleImportFileSelect = async (file: File) => {
    if (!file) return;
    setImportFileName(file.name);
    setImportFileSize(file.size);
    setImportStep('loading');
    setImportErrorMsg('');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || text.trim() === '') {
          throw new Error("Il file inserito è vuoto.");
        }
        
        let loadedMonuments: Monumento[] = [];
        let detectedType: 'xml' | 'json' = 'xml';
        
        if (file.name.endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{')) {
          detectedType = 'json';
          try {
            const parsed = JSON.parse(text);
            loadedMonuments = Array.isArray(parsed) ? parsed : [parsed];
            
            if (loadedMonuments.length === 0) {
              throw new Error("Nessun monumento presente nel file JSON.");
            }
            
            const hasEssentialFields = loadedMonuments.some(m => m && (m.id !== undefined || m.titolo !== undefined || m.testo !== undefined));
            if (!hasEssentialFields) {
              throw new Error("Il file JSON non sembra corrispondere allo schema delle schede epigrafiche.");
            }
          } catch (jsonErr: any) {
            throw new Error(`Errore di decodifica JSON: ${jsonErr.message}`);
          }
        } else {
          detectedType = 'xml';
          try {
            const parsed = xmlToMonumenti(text);
            loadedMonuments = Array.isArray(parsed) ? parsed : [parsed];
            if (loadedMonuments.length === 0) {
              throw new Error("Nessuna scheda epigrafica valida rilevata all'interno del file XML TEI.");
            }
            // Write the raw XML to the corpus dir via server, preserving the original filename.
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            await fetch('/api/corpus/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify([{ filename: file.name, content: text }])
            });
            // CRITICAL: tag each parsed monument with the physical file just written, so
            // executeImport patches THAT file instead of creating a second one via
            // buildFilename() — this was the source of the duplicate "old" entry on import.
            loadedMonuments.forEach(m => { (m as any)._corpusFile = safeName; });
          } catch (xmlErr: any) {
            throw new Error(`Errore di elaborazione XML: ${xmlErr.message}`);
          }
        }
        
        // Assign sequential ids: preserve existing ones, fill gaps for new entries
        const existingIds = new Set(monumenti.map(m => m.id).filter(Boolean));
        let nextId = monumenti.length > 0 ? Math.max(...monumenti.map(m => m.id)) + 1 : 1;
        const getNextId = () => { while (existingIds.has(nextId)) nextId++; return nextId++; };

        const sanitized = loadedMonuments.map((m, index) => ({
          // Preserve the physical corpus file path (set above for XML imports) so the
          // server patches the existing file rather than creating a duplicate.
          _corpusFile: (m as any)._corpusFile,
          // Identity — preserve existing app id, assign new sequential one if missing
          id: m.id || getNextId(),
          entryId: m.entryId || `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          // Core descriptive
          titolo: m.titolo || `Scheda #${m.id || index + 1}`,
          regione: m.regione || '',
          citta: m.citta || '',
          tipo: m.tipo || '',
          tipo_ref: m.tipo_ref || '',
          materiale: m.materiale || '',
          materialRef: m.materialRef || '',
          corpus: m.corpus || '',
          numero: m.numero || '',
          // Dimensions
          dim: m.dim || '',
          dim_altezza: m.dim_altezza || '',
          dim_larghezza: m.dim_larghezza || '',
          dim_profondita: m.dim_profondita || '',
          dim_unita: m.dim_unita || 'metre',
          // Location
          luogo_cons: m.luogo_cons || '',
          luogo_rit: m.luogo_rit || '',
          luogo_moderno: m.luogo_moderno || '',
          place_ref_ancient: m.place_ref_ancient || '',
          place_ref_modern: m.place_ref_modern || '',
          origPlace_nota: m.origPlace_nota || '',
          conserv: m.conserv || '',
          // Dates
          data_inizio: m.data_inizio !== undefined ? Number(m.data_inizio) : undefined,
          data_fine: m.data_fine !== undefined ? Number(m.data_fine) : undefined,
          data: m.data || '',
          origDates: Array.isArray(m.origDates) ? m.origDates : [],
          // Physical description
          layout_desc: m.layout_desc || '',
          scrittura: m.scrittura || '',
          scrittura_ref: m.scrittura_ref || '',
          scrittura_note: m.scrittura_note || '',
          msIdnos: Array.isArray(m.msIdnos) ? m.msIdnos : [],
          // Identifiers
          tm: m.tm || '',
          phi: Array.isArray(m.phi) ? m.phi : [],
          authority: m.authority || '',
          // Facsimile
          facsimile_url: m.facsimile_url || '',
          facsimile_desc: m.facsimile_desc || '',
          // Text content (preserve raw XML)
          testo: m.testo || '',
          iscrizione: m.iscrizione || false,
          anepigr: m.anepigr || false,
          textTypes: (Array.isArray(m.textTypes) ? m.textTypes : []).filter(tt => tt.toLowerCase() !== 'iscrizione greca'),
          epiteti: Array.isArray(m.epiteti) ? m.epiteti : [],
          divinita: Array.isArray(m.divinita) ? m.divinita : [],
          imperatori: Array.isArray((m as any).imperatori) ? (m as any).imperatori : [],
          revisions: Array.isArray((m as any).revisions) ? (m as any).revisions : [],
          apparatus: m.apparatus || '',
          testo_tradotto: Array.isArray(m.apparatus)
            ? (m.apparatus as any[]).map((e: any) => `${e.loc}: ${e.note}`).join('\n')
            : (m.apparatus || ''),
          traduzioni: Array.isArray(m.traduzioni) ? m.traduzioni : [],
          note_interne: m.note_interne || '',
          note_interne_rawXml: m.note_interne_rawXml || '',
          bibliografia: Array.isArray(m.bibliografia) ? m.bibliografia : [],
        }));
        
        setParsedMonuments(sanitized);
        setImportFileType(detectedType);
        setImportStep('config');
      } catch (err: any) {
        console.error("Parse error", err);
        setImportErrorMsg(err.message || "Errore sconosciuto di importazione.");
        setImportStep('error');
      }
    };
    
    reader.onerror = () => {
      setImportErrorMsg("Errore durante la lettura fisica del file.");
      setImportStep('error');
    };
    reader.readAsText(file);
  };

  const executeImport = async () => {
    if (!effectiveAdmin) {
      alert("Solo l'amministratore (gabrielegregorio123@gmail.com) può importare dati.");
      return;
    }
    if (!parsedMonuments || parsedMonuments.length === 0) return;
    setImportStep('loading');
    
    try {
      let finalDataset: Monumento[] = [];
      
      if (importMergeMode === 'overwrite') {
        finalDataset = parsedMonuments;
      } 
      else if (importMergeMode === 'merge_auto') {
        finalDataset = [...monumenti];
        parsedMonuments.forEach(m => {
          finalDataset.push({
            ...m,
            entryId: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`
          });
        });
      }
      else if (importMergeMode === 'merge_skip') {
        const existingFbs = new Set(monumenti.map(m => m.entryId).filter(Boolean));
        finalDataset = [...monumenti];
        
        parsedMonuments.forEach(m => {
          if (m.entryId && existingFbs.has(m.entryId)) {
            // Already exists - skip
          } else {
            finalDataset.push(m);
            if (m.entryId) existingFbs.add(m.entryId);
          }
        });
      }
      else if (importMergeMode === 'merge_replace') {
        const parsedMap = new Map<string, Monumento>();
        parsedMonuments.forEach(m => {
          if (m.entryId) parsedMap.set(m.entryId, m);
        });
        
        finalDataset = monumenti.map(m => {
          if (m.entryId && parsedMap.has(m.entryId)) {
            const replacement = parsedMap.get(m.entryId)!;
            return {
              ...replacement,
              _corpusFile: m._corpusFile // Preserve existing physical file path if present
            };
          }
          return m;
        });
        
        const currentFbs = new Set(monumenti.map(m => m.entryId).filter(Boolean));
        parsedMonuments.forEach(m => {
          if (!m.entryId || !currentFbs.has(m.entryId)) {
            finalDataset.push(m);
          }
        });
      }
      
      // Preserve existing ids; assign sequential ids only to new (id-less) entries
      const usedIds = new Set(finalDataset.map(m => m.id).filter(n => n > 0));
      let nextSeq = usedIds.size > 0 ? Math.max(...Array.from(usedIds)) + 1 : 1;
      const getFreeId = () => { while (usedIds.has(nextSeq)) nextSeq++; usedIds.add(nextSeq); return nextSeq; };
      const reindexed = finalDataset.map(m => (m.id && m.id > 0) ? m : { ...m, id: getFreeId() });
      
      const res = await fetch('/api/monumenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reindexed)
      });
      
      if (res.ok) {
        // CRITICAL: re-fetch from server after the patch cycle. The server writes
        // ids/entryIds into the XML files and attaches _corpusFile — using the
        // in-memory dataset here leaves the UI (tag rendering, indexing) stale
        // until a manual page reload.
        const freshRes = await fetch('/api/monumenti');
        const fresh = freshRes.ok ? await freshRes.json() : reindexed;

        setMonumenti(fresh);
        safeStorage.setItem('star_data_initialized', 'true');
        setImportStep('success');
      } else {
        throw new Error("Impossibile salvare i dati importati sul server backend.");
      }
    } catch (err: any) {
      console.error("Execution import error", err);
      setImportErrorMsg(err.message || "Riscontrato errore di scrittura salvando i dati.");
      setImportStep('error');
    }
  };

  /* Crea una singola scheda nuova (usata dal Section Editor per gli import esterni) */
  const createMonumentoFromEditor = async (draft: Monumento): Promise<string> => {
    if (!effectiveAdmin) throw new Error("Devi accedere come amministratore per creare nuove schede.");
    const usedIds = new Set(monumenti.map(m => m.id).filter(n => typeof n === 'number' && n > 0) as number[]);
    let nextSeq = usedIds.size > 0 ? Math.max(...Array.from(usedIds)) + 1 : 1;
    while (usedIds.has(nextSeq)) nextSeq++;
    const entryId = sanitizeEntryId(`gen-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const created: Monumento = { ...draft, id: nextSeq, entryId };

    const updated = [...monumenti, created];
    setMonumenti(updated);
    try {
      await fetch('/api/monumenti', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    } catch (errSync) {
      console.warn("Background file sync failed", errSync);
    }
    return entryId;
  };

  const handleSaveMetadata = async (entryId: string, metadata: any) => {
    if (!effectiveAdmin) {
      alert("Solo l'amministratore (gabrielegregorio123@gmail.com) può modificare i dati.");
      return;
    }
    try {
      const target = monumenti.find(m => m.entryId === entryId);
      if (!target) return;

      const testXml = monumentiToXml([{ ...target, ...metadata }]);
      const parser = new DOMParser();
      const xmldoc = parser.parseFromString(testXml, 'application/xml');
      if (xmldoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error("I dati modificati producono XML non valido. Controlla i valori inseriti.");
      }

      const updatedMon = { ...target, ...metadata };
      const finalEntryId = entryId;
      const finalUpdated = monumenti.map(m => m.entryId === entryId ? updatedMon : m);

      setMonumenti(finalUpdated);
      const updatedSelected = finalUpdated.find(m => m.entryId === finalEntryId);
      if (updatedSelected) setSelectedMonumento(updatedSelected);

      try {
        await fetch('/api/monumenti', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalUpdated)
        });
      } catch (errSync) {
        console.warn("Background file sync failed", errSync);
      }
    } catch (err) {
      console.error("Save metadata error", err);
      alert("Errore durante il salvataggio dei dati.");
    }
  };

  const exportSingleRecord = async (m: Monumento) => {
    try {
      if (m._corpusFile) {
        const res = await fetch(`/api/corpus/file/${encodeURIComponent(m._corpusFile)}`);
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = m._corpusFile;
          link.click();
          URL.revokeObjectURL(url);
          return;
        }
      }
    } catch (err) {
      console.warn("Could not download original XML file, falling back to local state-generated XML", err);
    }

    const xmlStr = monumentiToXml([m]);
    const blob = new Blob([xmlStr], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CMRDM-${m.corpus || 'XX'}-${String(m.id).padStart(3, '0')}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!effectiveAdmin || !selectedMonumento) {
      alert("Solo l'amministratore (gabrielegregorio123@gmail.com) può eliminare le schede.");
      return;
    }
    try {
      const targetId = selectedMonumento.entryId;
      if (!targetId) return;

      const updated = monumenti.filter(m => m.entryId !== targetId);

      setMonumenti(updated);
      setSelectedMonumento(null);
      setShowDeleteConfirm(false);

      // Best-effort background local sync
      try {
        await fetch('/api/monumenti', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
      } catch (errSync) {
        console.warn("Background file delete sync failed", errSync);
      }
    } catch (err) {
      console.error("Delete error", err);
      alert("Errore durante l'eliminazione della scheda.");
    }
  };

  const handleTranslate = async () => {
    if (!effectiveAdmin) {
      alert("Solo l'amministratore (gabrielegregorio123@gmail.com) può generare e salvare traduzioni.");
      return;
    }
    if (!selectedMonumento?.testo || !selectedMonumento.entryId) return;
    setTranslating(true);
    try {
      // Strip XML tags before sending to AI — raw EpiDoc markup confuses translation
      const cleanText = selectedMonumento.testo
        .replace(/<supplied[^>]*>/g, '[').replace(/<\/supplied>/g, ']')
        .replace(/<gap[^>]*\/>/g, '[---]')
        .replace(/<gap[^>]*>[\s\S]*?<\/gap>/g, '[---]')
        .replace(/<lb[^>]*\/>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ').trim();
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, targetLang: 'Italian' })
      });
      const data = await res.json();
      if (data.translation) {
        const newTrad = { lang: 'IT (AI)', testo: data.translation, note: 'Gemini AI Translation' };
        const updatedTrad = [...(selectedMonumento.traduzioni || []), newTrad];
        const updatedMonumento = { ...selectedMonumento, traduzioni: updatedTrad };
        
        const updatedAll = monumenti.map(m => m.entryId === selectedMonumento.entryId ? updatedMonumento : m);
        setMonumenti(updatedAll);
        setSelectedMonumento(updatedMonumento);

        // Best-effort background local sync
        try {
          await fetch('/api/monumenti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedAll)
          });
        } catch (errSync) {
          console.warn("Background file translate sync failed", errSync);
        }
      }
    } catch (err) {
      console.error("Translation fail", err);
      alert("Errore durante la traduzione automatica.");
    } finally {
      setTranslating(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const exportFilteredData = (forceAll = false) => {
    const toExport = (!forceAll && selectedIds.size > 0) ? selectedMonumenti : filteredMonumenti;
    const label = (!forceAll && selectedIds.size > 0) ? `selezione-${selectedIds.size}` : 'catalogo';
    const xmlStr = monumentiToXml(toExport);
    const blob = new Blob([xmlStr], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cmdm-export-${label}-${new Date().toISOString().split('T')[0]}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadBackup = async () => {
    try {
      const res = await fetch('/api/corpus/backup');
      if (!res.ok) throw new Error('Backup non disponibile');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `teiCorpus-${new Date().toISOString().split('T')[0]}.xml`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Errore nel download del backup corpus.');
    }
  };

  const exportToPDF = (forceAll = false) => {
    const toExport = (!forceAll && selectedIds.size > 0) ? selectedMonumenti : filteredMonumenti;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('ILA - Index lunae antiquae', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Catalogo esportato il ${new Date().toLocaleDateString()} - ${toExport.length} schede`, 14, 30);
    
    const tableData = toExport.map(m => [
      m.id.toString(),
      m.corpus || '-',
      m.numero || '-',
      m.citta || '-',
      m.tipo || '-',
      m.materiale || '-'
    ]);
    
    autoTable(doc, {
      startY: 40,
      head: [['ID', 'Corpus', 'Numero', 'Città', 'Tipologia', 'Materiale']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [150, 140, 120] }, // A more "sepia" or parchment-like color matching the app
      styles: { fontSize: 8, font: 'helvetica' }
    });
    
    doc.save(`star-catalogo-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const importXml = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!effectiveAdmin || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    setImportStatus({ type: 'loading', message: 'Leggendo il file...' });
    
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) throw new Error("File vuoto o illeggibile.");
        let data = xmlToMonumenti(content);
        if (!Array.isArray(data)) data = [data];

        setImportStatus({ type: 'loading', message: `Salvataggio di ${data.length} schede...` });
        
        const combined = [...monumenti];

        data.forEach((parsedItem: any) => {
          const fId = parsedItem.entryId || (parsedItem.corpus ? `cor-${parsedItem.corpus}-${parsedItem.numero || Date.now()}` : `local-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
          parsedItem.entryId = fId;

          // Replace duplicate if entryId is already present
          const duplicateIdx = combined.findIndex(m => m.entryId === fId);
          if (duplicateIdx > -1) {
            combined[duplicateIdx] = { ...combined[duplicateIdx], ...parsedItem };
          } else {
            combined.push(parsedItem);
          }
        });

        // Preserve existing ids; assign new sequential ids only where missing
        const takenIds = new Set(combined.map(m => m.id).filter(n => n > 0));
        let seq = takenIds.size > 0 ? Math.max(...Array.from(takenIds)) + 1 : 1;
        const finalData = combined.map(m => {
          if (m.id && m.id > 0) return m;
          while (takenIds.has(seq)) seq++;
          takenIds.add(seq);
          return { ...m, id: seq };
        });

        const res = await fetch('/api/monumenti', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalData)
        });
        
        if (res.ok) {
          // Re-fetch from server so the UI reflects the patched XML files
          const freshRes = await fetch('/api/monumenti');
          const fresh = freshRes.ok ? await freshRes.json() : finalData;

          setMonumenti(fresh);
          setImportStatus({ type: 'success', message: `Importazione completata: ${finalData.length} schede.` });
          e.target.value = '';
        } else {
          throw new Error("Errore durante il salvataggio sul server.");
        }
        
        setTimeout(() => setImportStatus({ type: 'idle', message: '' }), 10000);
      } catch (err: any) {
        console.error("Import error", err);
        setImportStatus({ type: 'error', message: `Errore: ${err.message || "Caricamento fallito."}` });
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      setImportStatus({ type: 'error', message: "Errore durante la lettura del file." });
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-parchment gap-10 px-6">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl font-bold tracking-[0.15em] text-accent/40" style={{ fontFamily: '"Cinzel", serif' }}>ILA</span>
          <div className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-widest text-muted/60">
            <Loader2 className="h-3 w-3 animate-spin text-accent" /> Caricamento del corpus…
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
          {[0, 1, 2].map(i => (
            <div key={i} className="glass-card p-4 h-24 relative overflow-hidden">
              <motion.div
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: i * 0.15 }}
              />
              <div className="h-3 w-8 bg-border/40 rounded-sm mb-3" />
              <div className="h-2.5 w-3/4 bg-border/40 rounded-sm mb-2" />
              <div className="h-2 w-1/2 bg-border/30 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex h-screen w-full flex-col bg-parchment text-ink font-serif overflow-hidden relative pl-14">
      <IconRail
        activeView={activeView}
        onNavigate={(v) => { setActiveView(v); setHasNavigated(true); }}
        theme={theme}
        setTheme={setTheme}
        isDarkModeActive={isDarkModeActive}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        currentUser={currentUser}
        loginWithGoogle={loginWithGoogle}
        logout={logout}
      />
      <div className="digital-seal">CDA</div>

      <AnimatePresence>
        {showLanding && (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-parchment"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 15% 10%, rgba(127,168,150,0.07), transparent 38%), radial-gradient(circle at 85% 90%, rgba(31,131,119,0.05), transparent 40%)'
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE_OUT }}
              className="relative z-10 flex flex-col items-center text-center max-w-lg px-8"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 0.85, scale: 1 }}
                transition={{ duration: 1, ease: EASE_OUT }}
                className="mb-6"
              >
                <MoonDisc illum={landingMoon.illum} waxing={landingMoon.waxing} size={64} opacity={0.7} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-[11px] font-sans uppercase tracking-[0.3em] text-muted mb-4"
              >
                Index lunae antiquae
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, letterSpacing: '0.4em' }}
                animate={{ opacity: 1, letterSpacing: '0.15em' }}
                transition={{ delay: 0.35, duration: 1.1, ease: EASE_OUT }}
                className="text-6xl md:text-7xl font-bold text-accent leading-none mb-12"
                style={{ fontFamily: '"Cinzel", serif' }}
              >
                ILA
              </motion.h1>

              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                onClick={() => setShowLanding(false)}
                className="font-sans text-xs font-bold uppercase tracking-[0.15em] text-parchment bg-accent px-9 py-4 rounded-full shadow-[0_8px_24px_rgba(31,131,119,0.25)] hover:bg-accent/90 hover:shadow-[0_10px_28px_rgba(31,131,119,0.32)] transition-all duration-300"
              >
                Entra nel catalogo
              </motion.button>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.55 }}
                transition={{ delay: 1.1, duration: 0.8 }}
                className="flex flex-col items-center gap-1.5 text-[10px] font-sans tracking-[0.1em] text-muted mt-10"
              >
                <span>A cura di Gabriele Gregorio</span>
                <span>MMXXVI</span>
                <span className="italic opacity-70 mt-1" style={{ fontFamily: 'Georgia, serif' }}>Dis Manibus</span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editorial Header — superfluo in home, dove restano solo i tre controlli essenziali */}
      {activeView !== 'home' && (
      <header className={cn(
        "mx-2.5 md:mx-5 lg:mx-6 mt-4 mb-2 rounded-2xl bg-[var(--card)]/85 dark:bg-[var(--card)]/70 backdrop-blur-xl border border-[var(--border)]/60 dark:border-[var(--border)]/50 shrink-0 gap-4 min-h-fit shadow-[0_12px_40px_-12px_rgba(var(--shadow-color),0.18),_inset_0_1px_2px_rgba(255,255,255,0.5)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5),_inset_0_1px_1px_rgba(255,255,255,0.08)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between transition-all duration-500 relative sticky top-2 z-30",
        hasNavigated ? "px-5 py-2.5" : "px-8 md:px-10 py-6"
      )}>
        {/* Soft bottom glow/blur to give relief (rilievo) */}
        <div className="absolute -bottom-4 inset-x-12 h-8 bg-accent/10 dark:bg-accent/5 blur-2xl rounded-full opacity-50 pointer-events-none -z-10" />
        {!hasNavigated && (
        <div className="flex flex-col">
          <div className="flex items-center gap-4">
            <button onClick={goHome} className="text-4xl md:text-5xl font-bold tracking-[0.15em] text-accent leading-none hover:opacity-80 transition-opacity cursor-pointer" style={{ fontFamily: '"Cinzel", serif' }} title="Torna alla home">ILA</button>
            <div className="hidden lg:block h-14 w-[1px] bg-accent/20 mx-2" />
          </div>
          <div className="mt-2 lg:mt-4 flex flex-col items-start">
            <p className="text-lg md:text-xl italic text-muted font-serif text-ink/70 leading-tight">Index lunae antiquae</p>
            <p className="text-[11px] md:text-[12px] font-sans font-bold uppercase tracking-[0.15em] text-muted/60 leading-none mt-2 whitespace-nowrap">Database Epigrafico</p>
          </div>
        </div>
        )}
        {hasNavigated && (
          <button
            onClick={goHome}
            className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity cursor-pointer text-accent"
            title="Torna alla home"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-lg font-bold tracking-[0.1em] leading-none" style={{ fontFamily: '"Cinzel", serif' }}>ILA</span>
          </button>
        )}
        {activeView === 'catalog' && (
          <button
            onClick={() => setShowFilterPanel(s => !s)}
            className={cn(
              "flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-full border transition-all duration-300 shrink-0 min-w-[180px] lg:min-w-[240px]",
              showFilterPanel
                ? "border-accent/50 bg-[var(--card)] ring-1 ring-accent/30 shadow-inner"
                : "border-[var(--border)]/50 bg-[var(--card)]/80 hover:bg-[var(--card)] shadow-inner"
            )}
          >
            <Search className="h-3.5 w-3.5 text-muted/50 shrink-0" />
            <span className={cn("text-xs font-serif italic truncate flex-1 text-left", filters.searchText ? "text-ink not-italic font-sans font-bold" : "text-muted/60")}>
              {filters.searchText || "Cerca testo, luoghi, tipi…"}
            </span>
            <motion.span animate={{ rotate: showFilterPanel ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
              <ChevronDown className="h-3.5 w-3.5 text-muted/50" />
            </motion.span>
          </button>
        )}
        {effectiveAdmin && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-muted">
            <button onClick={() => setIsImportModalOpen(true)} className="text-muted flex items-center gap-1 hover:text-accent transition-colors">
              <Upload className="h-3 w-3" /> Importa
            </button>
            <button onClick={exportFilteredData} className="text-muted flex items-center gap-1 border-l border-border/60 pl-4 hover:text-accent transition-colors">
              <Download className="h-3 w-3" /> Esporta XML
            </button>
            <button onClick={() => setShowReindexConfirm(true)} className="text-muted flex items-center gap-1 border-l border-border/60 pl-4 hover:text-accent transition-colors">
              <Hash className="h-3 w-3" /> Riordina ID
            </button>
            {importStatus.type !== 'idle' && (
              <div className={cn(
                "flex items-center gap-2 border-l border-border/60 pl-4 text-[9px] font-bold uppercase tracking-widest",
                importStatus.type === 'loading' && "text-accent",
                importStatus.type === 'success' && "text-green-600",
                importStatus.type === 'error' && "text-red-600"
              )}>
                {importStatus.type === 'loading' && <Loader2 className="h-2 w-2 animate-spin" />}
                {importStatus.message}
              </div>
            )}
          </div>
        )}
          
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Authentication Buttons */}
            {currentUser ? (
              <div className="flex items-center gap-2 text-muted text-[10px] bg-sidebar/50 border border-border/40 py-1 px-2.5 rounded-lg">
                <span className="font-semibold normal-case truncate max-w-[120px] md:max-w-[160px]" title={currentUser.email || ""}>
                  {currentUser.email === 'gabrielegregorio123@gmail.com' ? "Admin" : currentUser.email}
                </span>
                <button
                  onClick={logout}
                  className="hover:text-accent font-bold transition-all ml-1 cursor-pointer flex items-center gap-1"
                  title="Disconnetti"
                >
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent transition-all cursor-pointer font-sans text-[10px] font-bold"
                title="Accedi come gabrielegregorio123@gmail.com per abilitare le modifiche"
              >
                <LogIn className="h-3 w-3" /> Accedi (Admin)
              </button>
            )}

            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-2 hover:text-accent transition-colors p-2 rounded-full"
              title={isDarkModeActive ? "Modalità Giorno" : "Modalità Notte"}
            >
              {isDarkModeActive ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={cn("flex items-center gap-2 hover:text-accent transition-colors p-2 rounded-full", showSettings && "bg-sidebar")}
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
      </header>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Settings Overlay */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="glass-panel absolute right-0 top-0 bottom-0 w-80 border-t-0 border-r-0 border-b-0 z-40 p-10 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.25em] text-muted">Gestione Dati</h3>
                <button onClick={() => setShowSettings(false)}><X className="h-4 w-4" /></button>
              </div>

              <div className="space-y-10">
                <section>
                  <h4 className="text-[10px] font-bold uppercase text-muted mb-4 tracking-widest">Personalizzazione</h4>
                  <div className="space-y-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mb-2 block">Tema Predefinito</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => setTheme('light')}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 border rounded-sm transition-all",
                          theme === 'light' ? "border-accent bg-accent/5 text-accent" : "border-border hover:border-accent/50"
                        )}
                      >
                        <Sun className="h-4 w-4" />
                        <span className="text-[9px] font-bold uppercase">Giorno</span>
                      </button>
                      <button 
                        onClick={() => setTheme('dark')}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 border rounded-sm transition-all",
                          theme === 'dark' ? "border-accent bg-accent/5 text-accent" : "border-border hover:border-accent/50"
                        )}
                      >
                        <Moon className="h-4 w-4" />
                        <span className="text-[9px] font-bold uppercase">Notte</span>
                      </button>
                      <button 
                        onClick={() => setTheme('system')}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 border rounded-sm transition-all",
                          theme === 'system' ? "border-accent bg-accent/5 text-accent" : "border-border hover:border-accent/50"
                        )}
                      >
                        <Monitor className="h-4 w-4" />
                        <span className="text-[9px] font-bold uppercase">Sistema</span>
                      </button>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-bold uppercase text-muted mb-4 tracking-widest">Gestione Locale</h4>
                  <div className="space-y-4">
                    <button 
                      onClick={() => { setIsImportModalOpen(true); setShowSettings(false); }}
                      className="w-full text-left py-2 font-sans text-xs hover:text-accent flex items-center gap-2"
                    >
                      <Upload className="h-3.5 w-3.5" /> Pannello di Importazione Avanzato
                    </button>
                    <button onClick={exportFilteredData} className="w-full text-left py-2 font-sans text-xs hover:text-accent flex items-center gap-2">
                      <FileJson className="h-3.5 w-3.5" /> Esporta Catalogo Corrente (XML)
                    </button>
                    <button onClick={downloadBackup} className="w-full text-left py-2 font-sans text-xs hover:text-accent flex items-center gap-2">
                      <Download className="h-3.5 w-3.5" /> Scarica Backup teiCorpus
                    </button>
                    <button onClick={exportToPDF} className="w-full text-left py-2 font-sans text-xs hover:text-accent flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" /> Esporta Catalogo Corrente (PDF)
                    </button>
                  </div>
                  <p className="text-[9px] text-muted italic mt-2 leading-relaxed">
                    Tutte le modifiche salvate aggiornano automaticamente il file locale sul server.
                  </p>
                </section>

                <section>
                   <h4 className="text-[10px] font-bold uppercase text-muted mb-4 tracking-widest">Informazioni Sistema</h4>
                   <div className="flex items-center gap-2 text-xs opacity-60">
                      <Info className="h-3 w-3" />
                      <span>Versione 2.1.0-beta</span>
                   </div>
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Catalog View - Tendina filtri, ancorata sotto la pillola di ricerca in header */}
        <AnimatePresence>
          {activeView === 'catalog' && showFilterPanel && (
            <>
              <motion.div
                className="fixed inset-0 z-20 bg-ink/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setShowFilterPanel(false)}
              />
              <motion.aside
                id="catalog-sidebar"
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={SPRING_SOFT}
                className="hidden md:flex absolute z-30 top-2 left-2.5 md:left-5 lg:left-6 flex-col w-80 lg:w-96 max-h-[calc(100%-1rem)] p-8 rounded-2xl bg-[var(--card)]/95 dark:bg-[var(--card)]/90 backdrop-blur-xl border border-[var(--border)]/60 dark:border-[var(--border)]/50 shadow-[0_20px_50px_-12px_rgba(var(--shadow-color),0.28)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] overflow-y-auto custom-scrollbar"
              >
            {/* Soft bottom glow/blur to match the header relief effect */}
            <div className="absolute -bottom-4 inset-x-12 h-8 bg-accent/5 dark:bg-accent/2 blur-2xl rounded-full opacity-40 pointer-events-none -z-10" />

            <div className="flex flex-col h-full">
                <h2 className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.25em] text-muted flex items-center gap-2">
                   Ricerca Catalogo
                </h2>
                <div className="ornament-rule !my-0 mb-6 max-w-[4rem] mx-0" />
                
                <div className="space-y-7 flex-1">
              <div className="relative group animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <label className="block field-label">Ricerca Intelligente</label>
                  <div className="flex bg-sidebar border border-border p-0.5 rounded-sm">
                    <button
                      onClick={() => setShowMiniSearch(!showMiniSearch)}
                      className={cn("px-2 py-0.5 text-[8px] font-bold transition-all border-r border-border/50", showMiniSearch ? "text-accent" : "text-muted hover:text-ink")}
                      title="Mostra risultati MiniSearch"
                    >
                      MINISEARCH {showMiniSearch ? 'ON' : 'OFF'}
                    </button>
                    <button 
                      onClick={() => setFilters(f => ({ ...f, searchMode: 'AND' }))}
                      className={cn("px-2 py-0.5 text-[8px] font-bold transition-all", filters.searchMode === 'AND' ? "bg-accent text-white" : "text-muted hover:text-ink")}
                    >
                      AND
                    </button>
                    <button 
                      onClick={() => setFilters(f => ({ ...f, searchMode: 'OR' }))}
                      className={cn("px-2 py-0.5 text-[8px] font-bold transition-all", filters.searchMode === 'OR' ? "bg-accent text-white" : "text-muted hover:text-ink")}
                    >
                      OR
                    </button>
                  </div>
                </div>
                
                <div className="relative bg-[var(--card)]/80 dark:bg-[var(--card)]/60 backdrop-blur-md border border-[var(--border)]/50 dark:border-[var(--border)]/40 rounded-xl px-3.5 py-2 shadow-inner group-focus-within:border-accent/50 group-focus-within:ring-1 group-focus-within:ring-accent/30 transition-all duration-300 hover:bg-[var(--card)] dark:hover:bg-[var(--card)]/80 flex items-center min-h-[42px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50" />
                  <input 
                    type="text" 
                    placeholder="Cerca testo, luoghi, tipi..."
                    className="w-full bg-transparent py-1 pl-6 font-sans text-xs outline-none transition-colors placeholder:opacity-50"
                    value={filters.searchText}
                    onChange={(e) => setFilters(f => ({ ...f, searchText: e.target.value }))}
                  />
                </div>
                
                {/* Pannello Debug MiniSearch */}
                {showMiniSearch && filters.searchText.trim().length > 2 && (
                  <div className="mt-3 p-3 bg-accent/5 border border-accent/20 rounded-xl max-h-48 overflow-y-auto">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">Risultati MiniSearch (Debug)</h4>
                    {miniSearchResults.length > 0 ? (
                      <ul className="space-y-2">
                        {miniSearchResults.slice(0, 20).map(res => (
                          <li key={res.id} className="text-[11px] font-sans border-b border-border/30 pb-1">
                            <span className="font-bold mr-1">{res.id}</span>
                            <span className="text-muted/70 mr-2">(score: {res.score?.toFixed(1)})</span>
                            <span className="italic text-ink/80">{res.match ? Object.keys(res.match).join(', ') : ''}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-muted italic">Nessun risultato da MiniSearch</div>
                    )}
                  </div>
                )}
              </div>

              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                 <label className="mb-2 block field-label">Range Cronologico</label>
                 <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      className="w-24 bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 text-xs font-sans rounded-xl px-3 py-2.5 outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all duration-300 hover:bg-[var(--sidebar)] dark:hover:bg-black/40"
                      style={{ backgroundColor: 'var(--card)', color: 'var(--ink)' }}
                      value={filters.dateRange[0]}
                      onChange={e => setFilters(f => ({ ...f, dateRange: [parseInt(e.target.value) || 0, f.dateRange[1]] }))}
                    />
                    <span className="text-muted text-[10px] font-sans font-bold uppercase tracking-wider">al</span>
                    <input 
                      type="number" 
                      className="w-24 bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 text-xs font-sans rounded-xl px-3 py-2.5 outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all duration-300 hover:bg-[var(--sidebar)] dark:hover:bg-black/40"
                      style={{ backgroundColor: 'var(--card)', color: 'var(--ink)' }}
                      value={filters.dateRange[1]}
                      onChange={e => setFilters(f => ({ ...f, dateRange: [f.dateRange[0], parseInt(e.target.value) || 0] }))}
                    />
                 </div>
              </div>

              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="mb-2 block field-label">Regione Geografica</label>
                <div className="relative">
                  <select 
                    className="w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-xl pl-3 pr-8 py-2.5 font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 cursor-pointer appearance-none transition-all duration-300"
                    style={{ backgroundColor: 'var(--card)', color: 'var(--ink)', WebkitAppearance: 'none' as const, appearance: 'none' as const }}
                    value={filters.regione}
                    onChange={(e) => setFilters(f => ({ ...f, regione: e.target.value }))}
                  >
                    <option value="" className="bg-parchment dark:bg-sidebar text-ink">Tutte le Regioni</option>
                    {regions.map(r => <option key={r} value={r} className="bg-parchment dark:bg-sidebar text-ink">{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="mb-2 block field-label">Corpus</label>
                <div className="relative">
                  <select 
                    className="w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-xl pl-3 pr-8 py-2.5 font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 cursor-pointer appearance-none transition-all duration-300"
                    style={{ backgroundColor: 'var(--card)', color: 'var(--ink)', WebkitAppearance: 'none' as const, appearance: 'none' as const }}
                    value={filters.corpus}
                    onChange={(e) => setFilters(f => ({ ...f, corpus: e.target.value }))}
                  >
                    <option value="" className="bg-parchment dark:bg-sidebar text-ink">Tutti i Corpora</option>
                    {corpora.map(c => <option key={c} value={c} className="bg-parchment dark:bg-sidebar text-ink">{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="mb-2 block field-label">Numero</label>
                <div className="relative">
                  <select 
                    className="w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-xl pl-3 pr-8 py-2.5 font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 cursor-pointer appearance-none transition-all duration-300"
                    style={{ backgroundColor: 'var(--card)', color: 'var(--ink)', WebkitAppearance: 'none' as const, appearance: 'none' as const }}
                    value={filters.numero}
                    onChange={(e) => setFilters(f => ({ ...f, numero: e.target.value }))}
                  >
                    <option value="" className="bg-parchment dark:bg-sidebar text-ink">Tutti i Numeri</option>
                    {numbers.map(n => <option key={n} value={n} className="bg-parchment dark:bg-sidebar text-ink">{n}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="mb-2 block field-label">Città / Località</label>
                <div className="relative">
                  <select 
                    className="w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-xl pl-3 pr-8 py-2.5 font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 cursor-pointer appearance-none transition-all duration-300"
                    style={{ backgroundColor: 'var(--card)', color: 'var(--ink)', WebkitAppearance: 'none' as const, appearance: 'none' as const }}
                    value={filters.citta}
                    onChange={(e) => setFilters(f => ({ ...f, citta: e.target.value }))}
                  >
                    <option value="" className="bg-parchment dark:bg-sidebar text-ink">Tutte le Città</option>
                    {cities.map(c => <option key={c} value={c} className="bg-parchment dark:bg-sidebar text-ink">{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="mb-2 block field-label">Tipologia Monumento</label>
                <div className="relative">
                  <select 
                    className="w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-xl pl-3 pr-8 py-2.5 font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 cursor-pointer appearance-none transition-all duration-300"
                    style={{ backgroundColor: 'var(--card)', color: 'var(--ink)', WebkitAppearance: 'none' as const, appearance: 'none' as const }}
                    value={filters.tipo}
                    onChange={(e) => setFilters(f => ({ ...f, tipo: e.target.value }))}
                  >
                    <option value="" className="bg-parchment dark:bg-sidebar text-ink">Tutte le Tipologie</option>
                    {types.map(t => <option key={t} value={t} className="bg-parchment dark:bg-sidebar text-ink">{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="mb-2 block field-label">Materiale</label>
                <div className="relative">
                  <select 
                    className="w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-xl pl-3 pr-8 py-2.5 font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 cursor-pointer appearance-none transition-all duration-300"
                    style={{ backgroundColor: 'var(--card)', color: 'var(--ink)', WebkitAppearance: 'none' as const, appearance: 'none' as const }}
                    value={filters.materiale}
                    onChange={(e) => setFilters(f => ({ ...f, materiale: e.target.value }))}
                  >
                    <option value="" className="bg-parchment dark:bg-sidebar text-ink">Tutti i Materiali</option>
                    {materials.map(m => <option key={m} value={m} className="bg-parchment dark:bg-sidebar text-ink">{m}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="block field-label mb-3">Gestione Traduzioni</label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div 
                      className={cn("w-3.5 h-3.5 border border-border flex items-center justify-center transition-colors group-hover:border-accent", filters.onlyHasTrad && "bg-accent border-accent")}
                      onClick={() => setFilters(f => ({ ...f, onlyHasTrad: !f.onlyHasTrad, onlyNoTrad: false }))}
                    >
                      {filters.onlyHasTrad && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="text-[10px] uppercase font-sans font-bold">Con Traduzione</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div 
                      className={cn("w-3.5 h-3.5 border border-border flex items-center justify-center transition-colors group-hover:border-accent", filters.onlyNoTrad && "bg-accent border-accent")}
                      onClick={() => setFilters(f => ({ ...f, onlyNoTrad: !f.onlyNoTrad, onlyHasTrad: false }))}
                    >
                      {filters.onlyNoTrad && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="text-[10px] uppercase font-sans font-bold">Senza Traduzione</span>
                  </label>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  id="reset-filters-btn"
                  onClick={() => setFilters({
                    searchText: '', corpus: '', numero: '', regione: '', citta: '', tipo: '', materiale: '',
                    onlyInscr: false, onlyAnep: false, onlyHasTrad: false, onlyNoTrad: false, selectedEpiteti: [],
                    dateRange: [-500, 500],
                    searchMode: 'AND'
                  })}
                  className="w-full border border-accent py-3 font-sans text-[9px] font-bold uppercase tracking-widest text-accent hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-3 w-3" /> Reset Filtri
                </button>
              </div>
            </div>
          </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <section className="flex-1 flex flex-col p-6 md:p-12 overflow-hidden transition-all duration-500">
        <motion.div
          key={activeView}
          initial={activeView === 'map' ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={activeView === 'map' ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          onAnimationComplete={() => {
            if (activeView === 'map') window.dispatchEvent(new Event('resize'));
          }}
          className="flex-1 flex flex-col min-h-0"
        >
          {activeView === 'home' && (
            <HomeView
              monumenti={monumenti}
              onNavigate={(v) => { setActiveView(v); setHasNavigated(true); }}
              onSearch={(q) => {
                setFilters(f => ({ ...f, searchText: q }));
                setActiveView('catalog');
                setHasNavigated(true);
              }}
            />
          )}
          {activeView === 'catalog' && (
            <>
              {/* Dashboard Stats Row */}
              <div className="mb-6 md:mb-10 bg-[var(--card)]/80 dark:bg-[var(--card)]/60 backdrop-blur-md border border-[var(--border)]/50 dark:border-[var(--border)]/40 rounded-2xl shadow-lg border-l-[4px] border-l-accent pl-6 md:pl-8 py-4 pr-6 relative overflow-hidden group transition-all duration-300 hover:shadow-xl hover:bg-[var(--card)] dark:hover:bg-[var(--card)]/80">
                <div className="absolute inset-0 bg-accent/5 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                <div className="relative z-10 flex items-baseline gap-3">
                  <span className="block text-3xl md:text-4xl font-serif font-semibold leading-none text-ink">{monumenti.length}</span>
                  <span className="text-sm font-serif italic text-muted">voci totali nel corpus</span>
                </div>
              </div>

                {/* Record List */}
                <div className="flex flex-col overflow-hidden min-h-0 max-h-[68vh] glass-panel rounded-2xl shadow-custom">
                  <div className="px-6 pt-6 mb-2 flex items-center justify-between border-b border-border/20 pb-3 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                    <span>Visualizzazione di {filteredMonumenti.length} schede</span>
                    <div className="flex items-center gap-4">
                      <span className="opacity-30 lowercase">Ordina per:</span>
                      <button onClick={() => toggleSort('id')} className={cn("hover:text-accent transition-colors", sortField === 'id' && "text-accent")}>ID</button>
                      <button onClick={() => toggleSort('citta')} className={cn("hover:text-accent transition-colors", (sortField === 'citta' || sortField === 'regione') && "text-accent")}>Località</button>
                    </div>
                  </div>
  
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-6">
                    <div className="grid grid-cols-13 gap-2 border-b border-border py-4 text-[10px] font-bold uppercase tracking-tighter text-muted/60 sticky top-0 bg-parchment/80 backdrop-blur-md z-10 px-2 lg:px-0" style={{gridTemplateColumns: '1.5rem 1fr 1fr 1fr 3fr 2fr 1fr 2fr 1.5rem'}}>
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => selectedIds.size === filteredMonumenti.length ? deselectAll() : selectAll()}
                          className="w-4 h-4 border border-border rounded-sm flex items-center justify-center hover:border-accent transition-colors"
                          title={selectedIds.size === filteredMonumenti.length ? 'Deseleziona tutto' : 'Seleziona tutto'}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {selectedIds.size === filteredMonumenti.length && filteredMonumenti.length > 0 ? (
                              <motion.div
                                key="all"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 600, damping: 25 }}
                                className="w-2.5 h-2.5 bg-accent rounded-xs"
                              />
                            ) : selectedIds.size > 0 ? (
                              <motion.div
                                key="partial"
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                exit={{ scaleX: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="w-2.5 h-0.5 bg-accent/60"
                              />
                            ) : null}
                          </AnimatePresence>
                        </button>
                      </div>
                      <div>ID</div>
                      <div className="hidden lg:block">Corp.</div>
                      <div className="hidden lg:block text-right">N.</div>
                      <div>Località</div>
                      <div className="text-right">Datazione</div>
                      <div>Tipologia</div>
                      <div className="hidden xl:block">Testo</div>
                      <div />
                    </div>
  
                    <div className="space-y-0">
                      <AnimatePresence mode="popLayout">
                        {paginatedMonumenti.map((m, _listIdx) => {
                          const key = m.entryId || `row-${_listIdx}`;
                          const isSelected = selectedIds.has(m.entryId || m.id);
                          return (
                          <motion.div
                            layout
                            key={key}
                            initial={{ opacity: 0 }}
                            animate={{
                              opacity: 1,
                              backgroundColor: isSelected ? 'rgba(45,161,153,0.05)' : 'rgba(0,0,0,0)',
                            }}
                            transition={{ backgroundColor: { duration: 0.25, ease: EASE_OUT }, layout: SPRING_SNAPPY }}
                            whileHover={!isSelected ? { backgroundColor: 'rgba(45,45,45,0.03)' } : undefined}
                            className={cn(
                              "relative grid gap-2 border-b py-4 group items-center px-2 lg:px-0 h-[76px] overflow-hidden [&>div]:min-w-0",
                              isSelected ? "border-accent/20" : "border-border/30 cursor-pointer"
                            )}
                            style={{gridTemplateColumns: '1.5rem 1fr 1fr 1fr 3fr 2fr 1fr 2fr 1.5rem'}}
                            onClick={() => setSelectedMonumento(m)}
                          >
                            {/* Accent bar indicating selection */}
                            <motion.div
                              className="absolute left-0 top-0 bottom-0 bg-accent"
                              initial={false}
                              animate={{ width: isSelected ? 3 : 0, opacity: isSelected ? 1 : 0 }}
                              transition={SPRING_SNAPPY}
                            />
                            {/* Checkbox */}
                            <div className="flex items-center justify-center" onClick={e => { e.stopPropagation(); toggleSelect(m); }}>
                              <motion.div
                                whileTap={{ scale: 0.85 }}
                                animate={{
                                  scale: isSelected ? [1, 1.15, 1] : 1,
                                  backgroundColor: isSelected ? 'rgb(45,161,153)' : 'rgba(0,0,0,0)',
                                  borderColor: isSelected ? 'rgb(45,161,153)' : 'var(--border)',
                                }}
                                transition={{ duration: 0.28, ease: EASE_OUT }}
                                className="w-4 h-4 border rounded-sm flex items-center justify-center cursor-pointer"
                              >
                                <AnimatePresence>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0, opacity: 0 }}
                                      transition={{ type: 'spring', stiffness: 600, damping: 25 }}
                                    >
                                      <Check className="h-2.5 w-2.5 text-white" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            </div>
                            <div>
                              <span className="font-mono text-[10px] font-bold text-accent bg-accent/5 px-1.5 py-0.5 rounded-sm border border-accent/10 tabular-nums">#{m.id.toString().padStart(3, '0')}</span>
                            </div>
                            <div className="hidden lg:block">
                               <span className="text-[9px] font-sans font-bold text-muted/60 uppercase line-clamp-1">{m.corpus || '-'}</span>
                            </div>
                            <div className="hidden lg:block">
                               <span className="text-[9px] font-sans font-bold text-ink/70 tabular-nums block text-right">{m.numero || '-'}</span>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-ink line-clamp-1 group-hover:text-accent transition-colors">{getDisplayTitle(m)}</div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                                {m.regione && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, regione: m.regione })); }}
                                    className="text-[7px] font-sans text-accent font-bold uppercase tracking-wider bg-accent/5 px-1 rounded-xs border border-accent/10 hover:bg-accent hover:text-white transition-all cursor-pointer"
                                  >
                                    {m.regione}
                                  </button>
                                )}
                                {m.citta && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, citta: m.citta })); }}
                                    className="flex items-center gap-1 opacity-70 hover:opacity-100 hover:text-accent transition-all cursor-pointer"
                                  >
                                    <MapPin className="h-1.5 w-1.5 text-muted/50" />
                                    <span className="text-[8px] font-sans text-muted uppercase tracking-tighter">{m.citta}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div>
                               <span className="text-[10px] font-bold text-ink/75 tabular-nums whitespace-nowrap block text-right">{formatDateRange(m.data_inizio, m.data_fine)}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                               <button
                                 onClick={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, tipo: m.tipo })); }}
                                 className="text-[9px] font-bold uppercase text-muted tracking-tighter line-clamp-1 opacity-70 hover:text-accent transition-colors cursor-pointer text-left"
                               >
                                 {m.tipo}
                               </button>
                            </div>
                            <div
                              className="hidden xl:block text-[10px] italic text-muted/50 leading-relaxed font-serif overflow-hidden"
                              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}
                            >
                              {stripXml(m.testo) || '[Anepigrafe]'}
                            </div>
                            <div className="text-right flex justify-end items-center">
                              <ChevronRight className="h-4 w-4 text-border group-hover:text-accent group-hover:translate-x-1 transition-all" />
                            </div>
                          </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
             </div>

                    {/* Selection Bar */}
                    <AnimatePresence>
                      {selectedIds.size > 0 && (
                        <motion.div
                          initial={{ y: 60, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 60, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          className="sticky bottom-0 left-0 right-0 bg-parchment border-t-2 border-accent px-6 py-3 flex items-center justify-between gap-4 shadow-lg z-20"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-sans font-bold text-accent flex items-center gap-1">
                              <AnimatePresence mode="popLayout" initial={false}>
                                <motion.span
                                  key={selectedIds.size}
                                  initial={{ y: -10, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  exit={{ y: 10, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="tabular-nums inline-block"
                                >
                                  {selectedIds.size}
                                </motion.span>
                              </AnimatePresence>
                              {selectedIds.size === 1 ? 'scheda selezionata' : 'schede selezionate'}
                            </span>
                            <button
                              onClick={deselectAll}
                              className="text-[9px] font-sans font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors flex items-center gap-1"
                            >
                              <X className="h-3 w-3" /> Deseleziona
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { exportFilteredData(); flashExport('xml'); }}
                              className="flex items-center gap-1.5 px-4 py-1.5 bg-accent text-white text-[9px] font-sans font-bold uppercase tracking-widest hover:bg-accent/90 transition-colors rounded-sm"
                            >
                              <AnimatePresence mode="wait" initial={false}>
                                {exportFlash === 'xml' ? (
                                  <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_SNAPPY}>
                                    <Check className="h-3 w-3" />
                                  </motion.span>
                                ) : (
                                  <motion.span key="icon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_SNAPPY}>
                                    <Download className="h-3 w-3" />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                              {exportFlash === 'xml' ? 'Esportato' : 'Esporta XML'}
                            </button>
                            <button
                              onClick={() => { exportToPDF(); flashExport('pdf'); }}
                              className="flex items-center gap-1.5 px-4 py-1.5 border border-accent text-accent text-[9px] font-sans font-bold uppercase tracking-widest hover:bg-accent/5 transition-colors rounded-sm"
                            >
                              <AnimatePresence mode="wait" initial={false}>
                                {exportFlash === 'pdf' ? (
                                  <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_SNAPPY}>
                                    <Check className="h-3 w-3" />
                                  </motion.span>
                                ) : (
                                  <motion.span key="icon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_SNAPPY}>
                                    <FileText className="h-3 w-3" />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                              {exportFlash === 'pdf' ? 'Esportato' : 'Esporta PDF'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="mt-8 mb-6 flex items-center justify-between border-t border-border/20 pt-6">
                        <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted">
                          Pagina {currentPage} di {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="p-2 border border-border/40 rounded-sm hover:bg-accent/10 disabled:opacity-20 transition-colors"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          
                          <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) pageNum = i + 1;
                              else if (currentPage <= 3) pageNum = i + 1;
                              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                              else pageNum = currentPage - 2 + i;

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={cn(
                                    "w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-sm border transition-all",
                                    currentPage === pageNum 
                                      ? "bg-accent border-accent text-white" 
                                      : "border-border/40 hover:border-accent text-muted"
                                  )}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="p-2 border border-border/40 rounded-sm hover:bg-accent/10 disabled:opacity-20 transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
             </>
           )}

          {activeView === 'stats' && <EpithetStats monumenti={monumenti} onSelectMonumento={(m) => { setSelectedMonumento(m); setActiveView('catalog'); }} />}
          {activeView === 'heatmap' && (
            <div className="flex-1 overflow-hidden flex flex-col p-6">
              <CooccurrenceHeatmap 
                monumenti={monumenti} 
                onSelectCooccurrence={(r, c) => { 
                  // Could optionally set text search or filters here, for now just show a simple alert or handled externally
                  console.log(`Co-occurrence selected: ${r} + ${c}`);
                }} 
              />
            </div>
          )}
          {activeView === 'health' && <CorpusHealth monumenti={monumenti} onSelectMonumento={(m) => { setSelectedMonumento(m); setActiveView('catalog'); }} />}
          {activeView === 'editor' && (
            <SectionEditorView
              monumenti={monumenti}
              effectiveAdmin={effectiveAdmin}
              currentUserEmail={currentUser?.email}
              onLogin={loginWithGoogle}
              onSave={handleSaveMetadata}
              onCreate={createMonumentoFromEditor}
              onExport={exportSingleRecord}
              initialEntryId={editorTargetEntryId}
              onInitialEntryIdConsumed={() => setEditorTargetEntryId(null)}
            />
          )}
          {activeView === 'timeline' && <Timeline monumenti={monumenti} onSelect={setSelectedMonumento} />}
          {activeView === 'map' && <MapView monumenti={monumenti} onSelectMonumento={(id) => { const m = monumenti.find(x => x.id.toString() === id || x.entryId === id); if (m) { setSelectedMonumento(m); setActiveView('catalog'); } }} />}

          {/* Footer Controls */}
          {activeView === 'catalog' && (
          <footer className="mt-8 flex items-center justify-between border-t border-border pt-6 font-sans text-[10px] font-bold uppercase tracking-[0.3em] text-muted shrink-0">
            <div className="hidden sm:flex gap-6">
              <span className="text-accent underline decoration-2 underline-offset-4">01</span>
              <span className="opacity-30 hover:opacity-100 transition-opacity cursor-pointer">02</span>
              <span className="opacity-30 hover:opacity-100 transition-opacity cursor-pointer">03</span>
              <span className="opacity-20">...</span>
              <span className="opacity-30 hover:opacity-100 transition-opacity cursor-pointer">22</span>
            </div>
            <div className="flex gap-10">
              <span className="cursor-pointer hover:text-accent transition-colors">Prev Record</span>
              <span className="cursor-pointer hover:text-accent transition-colors">Next Record</span>
            </div>
          </footer>
          )}
        </motion.div>
        </section>
      </div>

      {/* Conferma "Riordina ID" — dialogo interno, non window.confirm() */}
      <AnimatePresence>
        {showReindexConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReindexConfirm(false)}
              className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="relative w-full max-w-sm bg-parchment shadow-2xl border border-border rounded-2xl text-ink p-6 space-y-4"
            >
              <div className="flex items-center gap-2 font-sans font-bold uppercase tracking-widest text-xs text-accent">
                <Hash className="h-4 w-4" /> Riordina ID
              </div>
              <p className="text-sm font-serif text-ink/80 leading-relaxed">
                Riorganizzare tutti gli ID in modo sequenziale? Questa operazione riassegna
                l'ID interno di ogni scheda in base all'ordine attuale, senza toccare il
                numero di catalogo (CMRDM) né i file fisici.
              </p>
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => setShowReindexConfirm(false)}
                  className="text-[11px] font-sans font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors px-3 py-2"
                >
                  Annulla
                </button>
                <button
                  onClick={() => { setShowReindexConfirm(false); reindexMonumenti(); }}
                  className="text-[11px] font-sans font-bold uppercase tracking-widest bg-accent text-parchment px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Conferma
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Advanced Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => {
                 setIsImportModalOpen(false);
                 setImportStep('upload');
                 setParsedMonuments(null);
                 setImportFileName('');
                 setImportErrorMsg('');
               }}
               className="absolute inset-0 bg-ink/80 backdrop-blur-sm shadow-xl"
             />
             <motion.div
               initial={{ scale: 0.98, opacity: 0, y: 10 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.98, opacity: 0, y: 10 }}
               className="relative w-full max-w-xl bg-parchment shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-border rounded-2xl text-ink"
             >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-border p-6 bg-sidebar shrink-0">
                  <div className="flex items-center gap-3">
                    <Upload className="h-5 w-5 text-accent" />
                    <div>
                      <h3 className="font-serif text-lg font-bold">Importazione Avanzata</h3>
                      <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted mt-0.5">Tei XML &amp; Nativo JSON</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportStep('upload');
                      setImportActiveTab('import');
                      setParsedMonuments(null);
                      setImportFileName('');
                      setImportErrorMsg('');
                    }}
                    className="p-1 hover:text-accent transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Sub-Tabs */}
                <div className="flex border-b border-border bg-sidebar px-6 text-xs font-sans font-bold uppercase tracking-widest text-muted shrink-0 select-none">
                  <button 
                    onClick={() => setImportActiveTab('import')}
                    className={cn(
                      "py-3 border-b-2 transition-all cursor-pointer mr-6",
                      importActiveTab === 'import' ? "border-accent text-accent" : "border-transparent hover:text-ink"
                    )}
                  >
                    Importa Filtro / Backup
                  </button>
                  <button 
                    onClick={() => setImportActiveTab('files')}
                    className={cn(
                      "py-3 border-b-2 transition-all cursor-pointer",
                      importActiveTab === 'files' ? "border-accent text-accent" : "border-transparent hover:text-ink"
                    )}
                  >
                    EPIDOC XML SINGOLI ({corpusFilesList.length || '...'})
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                  {importActiveTab === 'files' ? (
                    <div className="space-y-4 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted">File di Origine nel Corpus</span>
                        <button 
                          onClick={fetchCorpusFiles}
                          className="text-[9px] font-sans font-bold uppercase tracking-widest text-accent hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Aggiorna
                        </button>
                      </div>

                      {loadingCorpusFiles ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-3">
                          <Loader2 className="h-6 w-6 animate-spin text-accent" />
                          <span className="text-xs font-sans font-bold uppercase tracking-widest text-muted">Caricamento elenco files...</span>
                        </div>
                      ) : corpusFilesList.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted font-serif italic">
                          Nessun file XML trovato nella cartella corpus sul server.
                        </div>
                      ) : (
                        <div className="border border-border rounded-sm overflow-hidden text-xs max-h-[380px] overflow-y-auto custom-scrollbar">
                          <div className="bg-muted/50 text-muted font-sans text-[9px] uppercase font-bold tracking-widest p-2 px-3 border-b border-border/40 grid grid-cols-12 gap-2">
                            <span className="col-span-6">Nome File XML</span>
                            <span className="col-span-3 text-right">Dimensione</span>
                            <span className="col-span-3 text-right">Azioni</span>
                          </div>
                          <div className="divide-y divide-border/20 bg-sidebar font-mono text-[11px]">
                            {corpusFilesList.map((file, idx) => (
                              <div key={idx} className="p-3 px-4 grid grid-cols-12 gap-2 hover:bg-accent/5 transition-colors items-center">
                                <span className="col-span-6 truncate font-sans font-bold text-ink" title={file.filename}>
                                  {file.filename}
                                </span>
                                <span className="col-span-3 text-right text-muted">
                                  {(file.size / 1024).toFixed(1)} KB
                                </span>
                                <span className="col-span-3 text-right">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/corpus/file/${encodeURIComponent(file.filename)}`);
                                        if (res.ok) {
                                          const blob = await res.blob();
                                          const url = URL.createObjectURL(blob);
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.download = file.filename;
                                          link.click();
                                          URL.revokeObjectURL(url);
                                        } else {
                                          alert("Impossibile scaricare il file dal server.");
                                        }
                                      } catch (e) {
                                        console.error(e);
                                        alert("Errore nel download del file.");
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 text-[9px] font-sans font-bold uppercase tracking-widest text-accent hover:text-accent/80 transition-colors cursor-pointer"
                                  >
                                    <Download className="h-3.5 w-3.5" /> Scarica
                                  </button>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-[10px] text-muted italic font-serif leading-relaxed bg-accent/5 p-3.5 border border-accent/20 rounded-sm">
                        Questi file rappresentano le schede epigrafiche fisicamente salvate sul server in formato XML TEI (EpiDoc schema). Scaricandole potrai aprirle o modificarle con strumenti esterni (es. Oxygen XML Editor) mantenendo piena retrocompatibilità.
                      </div>
                    </div>
                  ) : (
                    <>
                      {importStep === 'upload' && (
                    <div 
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-accent', 'bg-accent/5'); }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove('border-accent', 'bg-accent/5'); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-accent', 'bg-accent/5');
                        if (e.dataTransfer.files?.[0]) {
                          handleImportFileSelect(e.dataTransfer.files[0]);
                        }
                      }}
                      className="border-2 border-dashed border-border/60 hover:border-accent hover:bg-accent/5 rounded-lg p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.xml,.json';
                        input.multiple = true;
                        input.onchange = async (e) => {
                          const target = e.target as HTMLInputElement;
                          const files = target.files;
                          // Reset value immediately so selecting the same file again
                          // still fires onchange on a later attempt.
                          if (!files || files.length === 0) { target.value = ''; return; }
                          if (files.length === 1) {
                            handleImportFileSelect(files[0]);
                          } else {
                            // Multiple XML files — import as corpus batch
                            setImportStep('loading');
                            try {
                              const batch = await Promise.all(
                                Array.from(files).filter(f => f.name.endsWith('.xml')).map(async f => ({
                                  filename: f.name,
                                  content: await f.text()
                                }))
                              );
                              const res = await fetch('/api/corpus/import', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(batch)
                              });
                              const result = await res.json();
                              if (result.errors?.length > 0) {
                                setImportErrorMsg(`Importati ${result.imported} file. Errori: ${result.errors.join('; ')}`);
                                setImportStep('error');
                              } else {
                                // Reload monuments from server
                                const resMon = await fetch('/api/monumenti');
                                const data = await resMon.json();

                                setMonumenti(data);
                                setImportStep('success');
                              }
                            } catch (err: any) {
                              setImportErrorMsg(err.message || 'Errore durante importazione batch');
                              setImportStep('error');
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      <div className="p-3 bg-accent/10 rounded-full text-accent">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-sans font-bold uppercase tracking-wide">Trascina qui il file o fai clic per sfogliare</p>
                        <p className="text-[10px] text-muted italic font-serif">Supportato tracciato XML (Schema TEI) o file JSON esportati</p>
                      </div>
                    </div>
                  )}

                  {importStep === 'loading' && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="h-8 w-8 animate-spin text-accent" />
                      <p className="text-xs font-sans font-bold uppercase tracking-widest text-muted">Lettura ed elaborazione archivio in corso...</p>
                    </div>
                  )}

                  {importStep === 'config' && parsedMonuments && (
                    <div className="space-y-4 text-left">
                      <div className="bg-sidebar border border-border p-3 rounded-sm flex justify-between items-center text-xs font-sans">
                        <div>
                          <div className="font-bold text-ink italic mb-1 truncate max-w-[240px]">File: {importFileName}</div>
                          <div className="text-muted text-[9px] uppercase font-bold tracking-widest">
                            {importFileType?.toUpperCase()} &bull; {(importFileSize / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-serif italic text-accent font-bold leading-none">{parsedMonuments.length}</div>
                          <div className="text-[9px] uppercase tracking-widest text-muted font-bold mt-1">Schede Rilevate</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted block">Strategia di Unione Database</label>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            {
                              id: 'merge_auto',
                              title: 'Unisci ed integra (Consigliato)',
                              desc: 'Pianifica schede integrative. Genera nuovi ID automatici per prevenire conflitti salvando le schede esistenti.',
                            },
                            {
                              id: 'overwrite',
                              title: 'Sovrascrivi integralmente (Reset)',
                              desc: 'Sostituisce completamente l\'intero archivio corrente con i contenuti caricati.',
                            },
                            {
                              id: 'merge_skip',
                              title: 'Unisci ed escludi duplicati',
                              desc: 'Ignora e salta i record importati che contengono ID identici a quelli già esistenti.',
                            },
                            {
                              id: 'merge_replace',
                              title: 'Unisci e rimpiazza corrispondenze',
                              desc: 'Aggiorna i record esistenti sovrascrivendo quelli con ID uguali, aggiungendo gli inediti.',
                            }
                          ].map(mode => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setImportMergeMode(mode.id as any)}
                              className={cn(
                                "p-2.5 border rounded-sm text-left transition-all relative flex flex-col gap-1 cursor-pointer",
                                importMergeMode === mode.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <input 
                                  type="radio" 
                                  checked={importMergeMode === mode.id} 
                                  onChange={() => {}} 
                                  className="accent-accent h-3 w-3 cursor-pointer"
                                />
                                <span className="font-sans text-[11px] font-bold text-ink uppercase tracking-tight">{mode.title}</span>
                              </div>
                              <span className="text-[10px] text-muted leading-snug font-serif italic">{mode.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted block">Anteprima Record Identificati</label>
                        <div className="border border-border rounded-sm overflow-hidden text-xs max-h-32 overflow-y-auto custom-scrollbar font-serif">
                          <table className="w-full text-left border-collapse bg-sidebar">
                            <thead>
                              <tr className="bg-muted/50 text-muted font-sans text-[9px] uppercase font-bold tracking-widest border-b border-border/40">
                                <th className="p-1 px-2 w-16">ID</th>
                                <th className="p-1">Riferimento / Titolo</th>
                                <th className="p-1">Provenienza</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parsedMonuments.slice(0, 3).map((m, idx) => (
                                <tr key={idx} className="border-b last:border-b-0 border-border/20">
                                  <td className="p-1 px-2 font-mono text-[10px]">#{m.id}</td>
                                  <td className="p-1">
                                    <div className="font-bold truncate max-w-[150px]">{m.titolo || '[Nessuno]'}</div>
                                    <div className="text-[9px] text-muted italic font-serif truncate max-w-[150px]">{m.corpus || '-'}{m.numero ? ` ${m.numero}` : ''}</div>
                                  </td>
                                  <td className="p-1 text-[10px] text-muted-foreground truncate max-w-[120px]">{m.citta || m.regione || '-'}</td>
                                </tr>
                              ))}
                              {parsedMonuments.length > 3 && (
                                <tr className="bg-parchment/30">
                                  <td colSpan={3} className="p-1 text-center font-sans text-[9px] text-muted italic">
                                    ... ed altri {parsedMonuments.length - 3} record inclusi ...
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {importStep === 'success' && (
                    <div className="py-6 text-center space-y-3">
                      <div className="inline-block p-3 bg-green-500/10 text-green-600 rounded-full mb-1">
                        <Check className="h-6 w-6 text-green-600" />
                      </div>
                      <h4 className="font-serif text-base font-bold">Importazione completata!</h4>
                      <p className="text-xs text-muted max-w-sm mx-auto font-serif italic">
                        Il catalogo epigrafico è stato processato e salvato sul server backend. Le modifiche sono pronte per la consultazione immediata.
                      </p>
                    </div>
                  )}

                  {importStep === 'error' && (
                    <div className="py-6 text-center space-y-3">
                      <div className="inline-block p-3 bg-red-500/10 text-red-600 rounded-full mb-1">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <h4 className="font-serif text-base font-bold text-red-600">Errore elaborazione</h4>
                      <p className="text-xs text-muted max-w-sm mx-auto bg-red-500/5 p-3 border border-red-500/20 font-mono text-left overflow-x-auto text-[10px]">
                        {importErrorMsg}
                      </p>
                      <button 
                        onClick={() => setImportStep('upload')}
                        className="px-4 py-1.5 bg-accent text-white text-[9px] font-sans font-bold uppercase tracking-widest hover:bg-accent/90"
                      >
                        Scegli un altro file
                      </button>
                    </div>
                  )}
                    </>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="border-t border-border p-4 bg-sidebar flex justify-between items-center shrink-0">
                  <div className="text-[10px] text-muted italic font-serif">
                    {importStep === 'config' && parsedMonuments && `${parsedMonuments.length} schede pronte`}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setImportStep('upload');
                        setParsedMonuments(null);
                        setImportFileName('');
                        setImportErrorMsg('');
                      }}
                      className="px-4 py-1.5 border border-border text-[9px] font-sans font-bold uppercase tracking-widest hover:bg-parchment"
                    >
                      {importStep === 'success' ? 'Chiudi' : 'Annulla'}
                    </button>
                    {importStep === 'config' && (
                      <button 
                        onClick={executeImport}
                        className="px-4 py-1.5 bg-accent text-white text-[9px] font-sans font-bold uppercase tracking-widest hover:bg-accent/90 transition-transform"
                      >
                        Carica nel Database
                      </button>
                    )}
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editorial Modal */}
      <AnimatePresence>
        {selectedMonumento && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedMonumento(null)}
               className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
             />
             <motion.div
               initial={{ scale: 0.98, opacity: 0, y: 10 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.98, opacity: 0, y: 10 }}
               className="relative w-full lg:w-[95vw] max-w-[1400px] bg-parchment shadow-2xl overflow-hidden flex flex-col h-full lg:h-[90vh] border border-border lg:rounded-2xl"
             >
                <div className="flex h-full flex-col md:flex-row overflow-hidden">
                  {/* Left Metadata Rail */}
                  <div className="w-full md:w-72 bg-sidebar border-b md:border-b-0 md:border-r border-border p-8 md:p-10 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="mb-10 flex items-center justify-between gap-3">
                      <button 
                        onClick={() => setSelectedMonumento(null)}
                        className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-muted flex items-center gap-2 hover:text-accent transition-colors"
                      >
                        <X className="h-4 w-4" /> Torna al Catalogo
                      </button>
                      {effectiveAdmin && (
                        <button
                          onClick={() => {
                            setEditorTargetEntryId(selectedMonumento.entryId ?? selectedMonumento.id?.toString() ?? null);
                            setSelectedMonumento(null);
                            setActiveView('editor');
                          }}
                          className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-2 hover:opacity-70 transition-opacity"
                          title="Apri questa scheda nell'editor completo"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Modifica
                        </button>
                      )}
                    </div>

                    <div className="space-y-12">
                      <div className="border-l-2 border-accent pl-5">
                         <span className="text-4xl font-light italic leading-none">#{ selectedMonumento.id?.toString().padStart(3, '0') }</span>
                         <span className="block mt-2 font-sans field-label">
                           {selectedMonumento.id ? `Record #${selectedMonumento.id}` : 'Nuovo Record'}
                         </span>
                      </div>

                      <section className="space-y-6">
                        <h4 className="font-sans field-label opacity-85 pb-2 border-b border-border/40">Specifiche Tecniche</h4>
                        <dl className="space-y-4">
                          {[
                            { label: 'Regione', value: selectedMonumento.regione, type: 'regione' },
                            { label: 'Città', value: selectedMonumento.citta, type: 'citta' },
                            { label: 'Corpus', value: selectedMonumento.corpus, type: 'corpus' },
                            { label: 'Numero', value: selectedMonumento.numero, type: '' },
                            { label: 'Datazione', value: formatDateRange(selectedMonumento.data_inizio, selectedMonumento.data_fine), type: '' },
                            { label: 'Tipologia', value: selectedMonumento.tipo, type: 'tipo' },
                            { label: 'Materiale', value: selectedMonumento.materiale, type: '' }
                          ].map(item => (
                            <div key={item.label}>
                              <dt className="text-[9px] font-sans font-bold uppercase text-muted/80 tracking-tighter">{item.label}</dt>
                              {item.type && item.value ? (
                                <button 
                                  onClick={() => { setFilters(f => ({ ...f, [item.type]: item.value })); setSelectedMonumento(null); }}
                                  className="text-xs font-semibold text-ink mt-0.5 font-serif hover:text-accent transition-colors block text-left"
                                >
                                  {item.value}
                                </button>
                              ) : (
                                <dd className="text-xs font-semibold text-ink mt-0.5 font-serif">{item.value || "Non registrato"}</dd>
                              )}
                            </div>
                          ))}
                        </dl>
                      </section>

                      {effectiveAdmin && (
                        <section className="pt-6 border-t border-border/40 mt-6">
                          <button
                            onClick={() => {
                              setEditorTargetEntryId(selectedMonumento.entryId ?? selectedMonumento.id?.toString() ?? null);
                              setSelectedMonumento(null);
                              setActiveView('editor');
                            }}
                            className="w-full py-2 bg-accent hover:bg-accent/90 text-white font-sans text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 shadow-sm rounded-sm"
                          >
                            <Edit2 className="h-3 w-3" /> Modifica nell'Editor a Sezioni
                          </button>
                        </section>
                      )}

                       <div className="pt-6">
                         <p className="text-[10px] font-sans text-muted/40 italic">Rif. Monografia: Lane (1971), Vol I.</p>
                       </div>
                     </div>
                   </div>

                  {/* Main Content Area */}
                  <div className="flex-1 bg-parchment p-8 md:p-16 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 mr-4">
                        {true && (
                          <div className="flex flex-col gap-1 mb-4">
                            {selectedMonumento.regione && (
                              <div className="text-[10px] md:text-xs font-sans font-bold uppercase tracking-[0.3em] text-accent">
                                 {selectedMonumento.regione}
                              </div>
                            )}
                            {selectedMonumento.citta && (
                              <div className="text-xl md:text-2xl font-serif italic text-ink/70">
                                 {selectedMonumento.citta}
                              </div>
                            )}
                          </div>
                        )}
                        {false ? (
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-muted tracking-widest block">Titolo / Denominazione</label>
                              <input 
                                className="text-2xl font-bold text-ink bg-transparent border-b border-accent outline-none w-full font-serif"
                                value={editForm.titolo || ''}
                                onChange={e => setEditForm({ ...editForm, titolo: e.target.value })}
                                placeholder="es. Stele di Men Tyrannos"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted tracking-widest block">Regione / Provincia</label>
                                <input 
                                  className="text-lg font-bold text-accent bg-transparent border-b border-accent outline-none w-full font-sans uppercase tracking-widest"
                                  value={editForm.regione || ''}
                                  list="regione-list"
                                  onChange={e => setEditForm({ ...editForm, regione: e.target.value })}
                                  placeholder="REGIONE"
                                />
                                <datalist id="regione-list">
                                  {regions.map(r => <option key={r} value={r} />)}
                                </datalist>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted tracking-widest block">Città Antica / Provenienza</label>
                                <input 
                                  className="text-lg font-bold text-ink bg-transparent border-b border-border outline-none w-full font-serif"
                                  value={editForm.citta || ''}
                                  list="citta-list"
                                  onChange={e => setEditForm({ ...editForm, citta: e.target.value })}
                                  placeholder="Città / Provenienza"
                                />
                                <datalist id="citta-list">
                                  {cities.map(c => <option key={c} value={c} />)}
                                </datalist>
                              </div>
                            </div>
                            <datalist id="citta-list">
                               {cities.map(c => <option key={c} value={c} />)}
                            </datalist>
                            <div className="flex gap-4">
                              <div className="w-20">
                                <label className="text-[10px] font-bold uppercase text-muted tracking-widest block mb-1">ID</label>
                                <input 
                                  type="number"
                                  className="w-full border-b border-border bg-transparent py-2 text-sm outline-none focus:border-accent transition-colors duration-300 font-mono font-bold"
                                  value={editForm.id || ''}
                                  onChange={e => setEditForm({ ...editForm, id: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] font-bold uppercase text-muted tracking-widest block mb-1">Corpus</label>
                                <input 
                                  className="w-full border-b border-border bg-transparent py-2 text-sm outline-none focus:border-accent transition-colors duration-300 font-serif"
                                  value={editForm.corpus || ''}
                                  list="corpus-list"
                                  onChange={e => setEditForm({ ...editForm, corpus: e.target.value })}
                                  placeholder="es. CMRDM I"
                                />
                                <datalist id="corpus-list">
                                   {Array.from(new Set(monumenti.filter(m => m.corpus).map(m => m.corpus!).filter(Boolean).map(s => s.trim()))).map(c => <option key={c} value={c} />)}
                                </datalist>
                              </div>
                              <div className="w-32">
                                <label className="text-[10px] font-bold uppercase text-muted tracking-widest block mb-1">Numero</label>
                                <input 
                                  className="w-full border-b border-border bg-transparent py-2 text-sm outline-none focus:border-accent transition-colors duration-300 font-serif"
                                  value={editForm.numero || ''}
                                  onChange={e => setEditForm({ ...editForm, numero: e.target.value })}
                                  placeholder="es. 14"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] font-bold uppercase text-muted tracking-widest block mb-1">Datazione</label>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="flex items-center gap-1">
                                    <input 
                                      type="number"
                                      className="w-full border-b border-border bg-transparent py-2 text-[11px] outline-none focus:border-accent transition-colors duration-300"
                                      value={editForm.data_inizio !== undefined ? Math.abs(editForm.data_inizio || 0) : ''}
                                      onChange={e => {
                                        const val = parseInt(e.target.value);
                                        const absVal = isNaN(val) ? 0 : val;
                                        const currentSign = (editForm.data_inizio || 0) < 0 ? -1 : 1;
                                        setEditForm({ ...editForm, data_inizio: absVal * currentSign });
                                      }}
                                      placeholder="Inizio"
                                    />
                                    <select 
                                      className="bg-transparent text-[9px] border-b border-border outline-none py-1.5"
                                      value={(editForm.data_inizio || 0) < 0 ? 'aC' : 'dC'}
                                      onChange={e => {
                                        const abs = Math.abs(editForm.data_inizio || 0);
                                        setEditForm({ ...editForm, data_inizio: e.target.value === 'aC' ? -abs : abs });
                                      }}
                                    >
                                      <option value="aC">a.C.</option>
                                      <option value="dC">d.C.</option>
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <input 
                                      type="number"
                                      className="w-full border-b border-border bg-transparent py-2 text-[11px] outline-none focus:border-accent transition-colors duration-300"
                                      value={editForm.data_fine !== undefined ? Math.abs(editForm.data_fine || 0) : ''}
                                      onChange={e => {
                                        const val = parseInt(e.target.value);
                                        const absVal = isNaN(val) ? 0 : val;
                                        const currentSign = (editForm.data_fine || 0) < 0 ? -1 : 1;
                                        setEditForm({ ...editForm, data_fine: absVal * currentSign });
                                      }}
                                      placeholder="Fine"
                                    />
                                    <select 
                                      className="bg-transparent text-[9px] border-b border-border outline-none py-1.5"
                                      value={(editForm.data_fine || 0) < 0 ? 'aC' : 'dC'}
                                      onChange={e => {
                                        const abs = Math.abs(editForm.data_fine || 0);
                                        setEditForm({ ...editForm, data_fine: e.target.value === 'aC' ? -abs : abs });
                                      }}
                                    >
                                      <option value="aC">a.C.</option>
                                      <option value="dC">d.C.</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                              <div className="flex-1">
                                <label className="text-[10px] font-bold uppercase text-muted tracking-widest block mb-1">Tipologia</label>
                                <input 
                                  className="w-full border-b border-border bg-transparent py-2 text-sm outline-none focus:border-accent transition-colors duration-300 font-serif"
                                  value={editForm.tipo || ''}
                                  onChange={e => setEditForm({ ...editForm, tipo: e.target.value })}
                                  placeholder="es. Altare"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] font-bold uppercase text-muted tracking-widest block mb-1">Materiale</label>
                                <input 
                                  className="w-full border-b border-border bg-transparent py-2 text-sm outline-none focus:border-accent transition-colors duration-300 font-serif"
                                  value={editForm.materiale || ''}
                                  onChange={e => setEditForm({ ...editForm, materiale: e.target.value })}
                                  placeholder="es. Marmo"
                                />
                              </div>
                            </div>

                            <div className="border border-border/60 bg-sidebar/20 p-6 rounded-sm mt-6 space-y-4">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent border-b border-border/30 pb-2">Parametri EpiDoc (TEI) Avanzati</h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">TM (Trismegistos) ID</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300 font-serif"
                                    value={editForm.tm || ''}
                                    onChange={e => setEditForm({ ...editForm, tm: e.target.value })}
                                    placeholder="es. 123456"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Authority (Ente Editore)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300 font-serif"
                                    value={editForm.authority || ''}
                                    onChange={e => setEditForm({ ...editForm, authority: e.target.value })}
                                    placeholder="es. CMRDM"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">PHI ID (separati da virgola)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300 font-serif"
                                    value={editForm.phi?.join(', ') || ''}
                                    onChange={e => setEditForm({ ...editForm, phi: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                    placeholder="es. PH252123, PH351831"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Place Link Antico (Pleiades Ref)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300 font-mono text-[10px]"
                                    value={editForm.place_ref_ancient || ''}
                                    onChange={e => setEditForm({ ...editForm, place_ref_ancient: e.target.value })}
                                    placeholder="es. https://pleiades.stoa.org/places/599799"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Place Link Moderno (GeoNames Ref)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300 font-mono text-[10px]"
                                    value={editForm.place_ref_modern || ''}
                                    onChange={e => setEditForm({ ...editForm, place_ref_modern: e.target.value })}
                                    placeholder="es. https://www.geonames.org/10182607/..."
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-4">
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Altezza (m)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300"
                                    value={editForm.dim_altezza || ''}
                                    onChange={e => setEditForm({ ...editForm, dim_altezza: e.target.value })}
                                    placeholder="es. 0.83"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Larghezza (m)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300"
                                    value={editForm.dim_larghezza || ''}
                                    onChange={e => setEditForm({ ...editForm, dim_larghezza: e.target.value })}
                                    placeholder="es. 1.15"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Profondità (m)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300"
                                    value={editForm.dim_profondita || ''}
                                    onChange={e => setEditForm({ ...editForm, dim_profondita: e.target.value })}
                                    placeholder="es. 0.735"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Unità di Misura</label>
                                  <select 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300"
                                    value={editForm.dim_unita || 'metre'}
                                    onChange={e => setEditForm({ ...editForm, dim_unita: e.target.value })}
                                  >
                                    <option value="metre">Metri (metre)</option>
                                    <option value="cm">Centimetri (cm)</option>
                                    <option value="mm">Millimetri (mm)</option>
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Support / Dimensions Text (Dim)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300 font-serif"
                                    value={editForm.dim || ''}
                                    onChange={e => setEditForm({ ...editForm, dim: e.target.value })}
                                    placeholder="es. Anta di marmo bianco..."
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Scrittura Note (Altezza lettere)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300"
                                    value={editForm.scrittura_note || ''}
                                    onChange={e => setEditForm({ ...editForm, scrittura_note: e.target.value })}
                                    placeholder="es. Altezza delle lettere: 0,015..."
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">MS Identifier / Inventory (separati da | )</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300"
                                    value={editForm.msIdnos?.join(' | ') || ''}
                                    onChange={e => setEditForm({ ...editForm, msIdnos: e.target.value.split('|').map(s => s.trim()).filter(Boolean) })}
                                    placeholder="es. 462a (I.Milet) | 462b (I.Milet)"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Scrittura Tecnica (rs ref)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300"
                                    value={editForm.scrittura || ''}
                                    onChange={e => setEditForm({ ...editForm, scrittura: e.target.value })}
                                    placeholder="es. incisa a scalpello"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Descrizione Layout / Contesto di Reimpiego</label>
                                <textarea 
                                  className="w-full bg-sidebar/30 border border-border/40 p-2 text-xs outline-none min-h-[60px] font-serif"
                                  value={editForm.layout_desc || ''}
                                  onChange={e => setEditForm({ ...editForm, layout_desc: e.target.value })}
                                  placeholder="Inserisci la descrizione del supporto, delle facce incise e del contesto storico-archeologico..."
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">EAGLE Ref Tipo Oggetto (tipo_ref)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300 text-[10px] font-mono"
                                    value={editForm.tipo_ref || ''}
                                    onChange={e => setEditForm({ ...editForm, tipo_ref: e.target.value })}
                                    placeholder="es. https://www.eagle-network.eu/voc/objtyp/lod/189"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">EAGLE Ref Materiale (materialRef)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300 text-[10px] font-mono"
                                    value={editForm.materialRef || ''}
                                    onChange={e => setEditForm({ ...editForm, materialRef: e.target.value })}
                                    placeholder="es. https://www.eagle-network.eu/voc/material/lod/48"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Tipi Testuali (rs textTypes, separati da virgola)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300"
                                    value={editForm.textTypes?.join(', ') || ''}
                                    onChange={e => setEditForm({ ...editForm, textTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                    placeholder="es. decreto, epigrafe onoraria"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Nota Luogo Antico (origPlace_nota)</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300"
                                    value={editForm.origPlace_nota || ''}
                                    onChange={e => setEditForm({ ...editForm, origPlace_nota: e.target.value })}
                                    placeholder="es. re-employed in the theater of Miletus"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Stato di Conservazione (conserv)</label>
                                <textarea 
                                  className="w-full bg-sidebar/30 border border-border/40 p-2 text-xs outline-none min-h-[60px]"
                                  value={editForm.conserv || ''}
                                  onChange={e => setEditForm({ ...editForm, conserv: e.target.value })}
                                  placeholder="Inserisci la descrizione dello stato di conservazione dell'iscrizione..."
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Facsimile URL Grafico / Squeeze Image</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300"
                                    value={editForm.facsimile_url || ''}
                                    onChange={e => setEditForm({ ...editForm, facsimile_url: e.target.value })}
                                    placeholder="es. IG_II(2)_14.jpg"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-muted tracking-wide block mb-1">Facsimile Descrizione</label>
                                  <input 
                                    className="w-full border-b border-border bg-transparent py-1 text-xs outline-none focus:border-accent transition-colors duration-300"
                                    value={editForm.facsimile_desc || ''}
                                    onChange={e => setEditForm({ ...editForm, facsimile_desc: e.target.value })}
                                    placeholder="es. Squeeze of IG II2 14"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {(selectedMonumento.corpus || selectedMonumento.numero) && (
                                <span className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-tighter">
                                  {selectedMonumento.corpus} {selectedMonumento.numero && `n. ${selectedMonumento.numero}`}
                                </span>
                              )}
                              {selectedMonumento.textTypes?.map((tt, idx) => (
                                <span key={idx} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm">
                                  {tt}
                                </span>
                              ))}
                              <button 
                                onClick={() => setCompareList([...compareList, selectedMonumento])}
                                className="text-[9px] font-bold uppercase hover:text-accent transition-colors underline underline-offset-2 ml-1"
                              >
                                + Confronta
                              </button>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-ink leading-tight font-serif">
                              {getDisplayTitle(selectedMonumento)}
                            </h2>
                            <div className="ornament-rule !my-0 mt-3 max-w-[6rem] mx-0" />
                          </div>
                        )}
                      </div>
                      
                      {effectiveAdmin && (
                        <div className="flex flex-col items-end gap-1.5 shrink-0 select-none">
                          <div className="flex gap-2 items-center">
                           {!showDeleteConfirm ? (
                             <>
                               <button 
                                 onClick={() => exportSingleRecord(selectedMonumento)}
                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white font-sans text-[10px] font-bold uppercase tracking-widest hover:bg-accent/90 transition-all rounded-sm shadow-sm"
                                 title="Esporta XML"
                               >
                                 <Download className="h-3.5 w-3.5" /> Esporta XML
                               </button>
                               <button 
                                 onClick={() => setShowDeleteConfirm(true)}
                                 className="p-2 hover:bg-sidebar text-muted hover:text-red-600 transition-all rounded-full"
                                 title="Elimina"
                               >
                                 <Trash2 className="h-5 w-5" />
                               </button>
                             </>
                           ) : (
                             <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                               <span className="text-[10px] font-bold uppercase text-red-600 tracking-widest whitespace-nowrap">Sicuro di voler eliminare?</span>
                               <button 
                                 onClick={() => handleDelete()}
                                 className="px-4 py-1.5 bg-red-600 text-white font-sans text-[9px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors"
                               >
                                 Conferma
                               </button>
                               <button 
                                 onClick={() => setShowDeleteConfirm(false)}
                                 className="px-4 py-1.5 border border-border text-muted font-sans text-[9px] font-bold uppercase tracking-widest hover:bg-sidebar transition-colors"
                               >
                                 Annulla
                               </button>
                             </div>
                           )}
                          </div>
                          <span className="text-[9px] text-muted text-right max-w-[240px] font-sans leading-normal block mt-1 animate-in fade-in italic select-text">
                            Modifica il file in Oxygen XML Editor e reimporta con "Unisci e rimpiazza corrispondenze".
                          </span>
                        </div>
                      )}
                      
                    </div>
                    
                    <p className="font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-accent mb-12">Registro Monografico & Analisi Epigrafica</p>

                    {/* Advanced EpiDoc / TEI Metadata Summary Card (Visible only when not editing) */}
                    {true && (
                      <div className="space-y-8 animate-in fade-in duration-300 mb-12">
                        {/* Facsimile Image Block */}
                        {selectedMonumento.facsimile_url && (
                          <div className="bg-sidebar/40 p-6 border border-border/60 rounded-sm">
                            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-accent block mb-3">Facsimile / Squeeze Image</span>
                            <div className="relative aspect-video max-w-full md:max-w-2xl overflow-hidden bg-zinc-950 border border-border flex items-center justify-center rounded-sm shadow-inner group">
                              <img 
                                src={selectedMonumento.facsimile_url} 
                                alt={selectedMonumento.facsimile_desc || "Squeeze facsimile"} 
                                referrerPolicy="no-referrer"
                                className="max-h-full max-w-full object-contain filter grayscale text-slate-100 p-2 select-none hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  const imgEl = e.target as HTMLElement;
                                  imgEl.style.display = 'none';
                                  const parent = imgEl.parentElement;
                                  if (parent) {
                                    const textDiv = document.createElement('div');
                                    textDiv.className = 'text-center p-6 text-xs text-muted font-sans uppercase tracking-widest';
                                    textDiv.innerHTML = `<span class="italic text-accent block mb-2">[Squeeze Grafico: ${selectedMonumento.facsimile_url}]</span> ${selectedMonumento.facsimile_desc || ''}`;
                                    parent.appendChild(textDiv);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Layout, Supports, Place references, Handwriting references */}
                        <div className="grid md:grid-cols-2 gap-8 border border-border/40 bg-sidebar/20 p-6 md:p-8 rounded-sm font-serif text-xs leading-relaxed text-ink/80">
                          <div>
                            <h4 className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent mb-4 pb-1 border-b border-border/30">Layout & Supporto Materiale</h4>
                            <p className="mb-4 text-ink-70 select-text font-serif leading-relaxed">{selectedMonumento.layout_desc || selectedMonumento.supporto || "Nessun dettaglio aggiuntivo sul layout."}</p>
                            <div className="space-y-2 text-[10px] font-sans border-t border-border/20 pt-3">
                              <div><span className="text-muted uppercase font-bold text-[9px]">Scrittura:</span> <span className="text-ink font-serif italic text-xs">{selectedMonumento.scrittura || "incisa a scalpello"}</span> {selectedMonumento.scrittura_ref && <span className="text-muted/60 font-mono">({selectedMonumento.scrittura_ref})</span>}</div>
                              {selectedMonumento.scrittura_note && <div><span className="text-muted uppercase font-bold text-[9px]">Note paleografiche:</span> <span className="text-ink font-serif text-xs">{selectedMonumento.scrittura_note}</span></div>}
                              
                              <div>
                                <span className="text-muted uppercase font-bold text-[9px]">Tipo oggetto:</span>{' '}
                                <span className="text-ink font-serif italic text-xs capitalize">{selectedMonumento.tipo || "non specificato"}</span>
                                {selectedMonumento.tipo_ref && (
                                  <a href={selectedMonumento.tipo_ref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-accent hover:underline ml-2 align-middle font-mono">
                                    🦅 EAGLE Object Link ↗
                                  </a>
                                )}
                              </div>

                              <div>
                                <span className="text-muted uppercase font-bold text-[9px]">Materiale:</span>{' '}
                                <span className="text-ink font-serif italic text-xs capitalize">{selectedMonumento.materiale || "non specificato"}</span>
                                {selectedMonumento.materialRef && (
                                  <a href={selectedMonumento.materialRef} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-accent hover:underline ml-2 align-middle font-mono">
                                    🦅 EAGLE Material Link ↗
                                  </a>
                                )}
                              </div>

                              {(selectedMonumento.dim_altezza || selectedMonumento.dim_larghezza || selectedMonumento.dim_profondita) ? (
                                <div>
                                  <span className="text-muted uppercase font-bold text-[9px]">Dimensioni:</span>{' '}
                                  <span className="text-ink font-serif italic text-xs">
                                    {`h ${selectedMonumento.dim_altezza || '-'} × l ${selectedMonumento.dim_larghezza || '-'} × p ${selectedMonumento.dim_profondita || '-'} ${selectedMonumento.dim_unita || 'metre'}`}
                                  </span>
                                </div>
                              ) : (
                                selectedMonumento.dim && <div><span className="text-muted uppercase font-bold text-[9px]">Dati di Supporto (Dim):</span> <span className="text-ink font-serif text-xs">{stripXml(selectedMonumento.dim)}</span></div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent mb-4 pb-1 border-b border-border/30">Georeferenziazione & Date Storiche</h4>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-muted uppercase font-bold text-[9px] block">Città Antica (Pleiades)</span>
                                  <span className="font-serif font-semibold text-ink text-xs block truncate" title={selectedMonumento.citta}>{selectedMonumento.citta || "N/A"}</span>
                                  {selectedMonumento.place_ref_ancient && (
                                    <a href={selectedMonumento.place_ref_ancient} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-accent hover:underline font-mono truncate max-w-full mt-1">
                                      🔎 Pleiades Link
                                    </a>
                                  )}
                                </div>
                                <div>
                                  <span className="text-muted uppercase font-bold text-[9px] block">Rinvenimento Moderno</span>
                                  <span className="font-serif font-semibold text-ink text-xs block truncate" title={selectedMonumento.luogo_rit}>{selectedMonumento.luogo_rit || "N/A"}</span>
                                  {selectedMonumento.place_ref_modern && (
                                    <a href={selectedMonumento.place_ref_modern} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-accent hover:underline font-mono truncate max-w-full mt-1">
                                      🌍 GeoNames Link
                                    </a>
                                  )}
                                </div>
                              </div>
                              <PleiadesMap pleiadesUri={selectedMonumento.place_ref_ancient} cityName={selectedMonumento.citta} />
                              
                              {selectedMonumento.origDates && selectedMonumento.origDates.length > 0 ? (
                                <div className="border-t border-border/20 pt-3">
                                  <span className="text-muted uppercase font-bold text-[9px] block mb-2">Original dates di pubblicazione (EpiDoc)</span>
                                  <ul className="space-y-3 font-serif text-[11px] list-disc list-inside text-ink/90 pl-1">
                                    {selectedMonumento.origDates.map((od, i) => (
                                      <li key={i} className="leading-snug">
                                        {od.prefix && (
                                          <span
                                            className="font-mono font-bold text-accent/60 text-[9px] uppercase tracking-wider mr-2 not-italic"
                                            style={{ fontStyle: 'normal' }}
                                          >
                                            {od.prefix}
                                          </span>
                                        )}
                                        <span className="font-medium text-xs select-all text-ink">{od.testo}</span>
                                        {od.notBeforeCustom && (
                                          <span className="text-muted text-[10px] font-sans ml-1 not-italic" style={{ fontStyle: 'normal' }}>
                                            ({od.datingMethod || '#julian'}: {od.notBeforeCustom} / {od.notAfterCustom || ''})
                                          </span>
                                        )}
                                        {(od as any).evidence && (
                                          <span className="text-[8px] font-sans font-bold uppercase tracking-widest text-muted/50 ml-1 border border-border/40 px-1 rounded-sm">
                                            {(od as any).evidence.replace(/-/g, ' ')}
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <div className="border-t border-border/20 pt-3 text-[10px] text-muted italic">
                                  Nessuna datazione avanzata EpiDoc inserita nel file XML.
                                </div>
                              )}

                              {selectedMonumento.conserv && (
                                <div className="border-t border-border/20 pt-3 text-[10px]">
                                  <span className="text-muted uppercase font-bold text-[9px] block mb-1">Stato di Conservazione</span>
                                  <span className="font-serif italic text-xs text-ink/90 whitespace-pre-wrap">{selectedMonumento.conserv}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-16">
                      {/* Technical Notes / Epithets */}
                      <section className="grid md:grid-cols-2 gap-12">
                         <div className="space-y-5">
                            {/* Divinità */}
                            {selectedMonumento.divinita && selectedMonumento.divinita.length > 0 && (
                              <div>
                                <h3 className="text-xs font-bold uppercase text-muted tracking-widest mb-2">Divinità</h3>
                                <div className="flex flex-wrap gap-2">
                                  {selectedMonumento.divinita.map(d => (
                                    <button
                                      key={d}
                                      onClick={() => { setFilters(f => ({ ...f, searchText: d })); setSelectedMonumento(null); }}
                                      className="border border-accent bg-accent/10 text-accent px-3 py-1 text-xs font-bold rounded-full font-serif hover:bg-accent hover:text-white transition-all cursor-pointer"
                                    >
                                      {d}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Epiteti */}
                            <div>
                              <h3 className="text-xs font-bold uppercase text-muted tracking-widest mb-2">Epiteti</h3>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {selectedMonumento.epiteti && selectedMonumento.epiteti.length > 0 ? (
                                  selectedMonumento.epiteti.map(e => (
                                    <button
                                      key={e}
                                      onClick={() => { setFilters(f => ({ ...f, searchText: e })); setSelectedMonumento(null); }}
                                      className="border border-accent/20 bg-accent/5 text-accent px-3 py-1 text-xs italic rounded-full font-serif hover:bg-accent hover:text-white transition-all cursor-pointer"
                                    >
                                      {e}
                                    </button>
                                  ))
                                ) : (
                                  <span className="text-muted text-xs italic font-serif">Nessun epiteto nel file XML</span>
                                )}
                              </div>
                            </div>
                            {/* Onomastica */}
                            {selectedMonumento.onomastica && selectedMonumento.onomastica.length > 0 && (
                              <div>
                                <h3 className="text-xs font-bold uppercase text-muted tracking-widest mb-2 font-sans">Onomastica</h3>
                                <div className="flex flex-wrap gap-2">
                                  {selectedMonumento.onomastica.map(o => (
                                    <button key={o}
                                      onClick={() => { setFilters(f => ({ ...f, searchText: o })); setSelectedMonumento(null); }}
                                      className="border border-border text-ink/70 px-3 py-1 text-xs font-serif hover:border-accent hover:text-accent transition-all cursor-pointer rounded-full"
                                    >{o}</button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Prosopografia (Personae) */}
                            {selectedMonumento.persone && selectedMonumento.persone.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-border/20">
                                <h3 className="text-xs font-bold uppercase text-accent tracking-widest mb-3 font-sans">Prosopografia</h3>
                                <div className="space-y-4">
                                  {selectedMonumento.persone.map((p, idx) => (
                                    <div key={p.xmlId || idx} className="bg-white/40 dark:bg-black/20 p-4 border border-border/50 text-sm">
                                      <div className="flex items-baseline gap-2 mb-1">
                                        <span className="font-serif font-bold text-ink text-base">{p.name || p.nymRef || 'Sconosciuto'}</span>
                                        {(p.key || p.xmlId) && <span className="text-[10px] text-muted font-mono tracking-tight">#{p.key || p.xmlId}</span>}
                                      </div>
                                      
                                      {(p.ethnicText || p.ethnicRef) && (
                                        <div className="text-xs text-muted mb-2 font-serif">
                                          <span className="font-sans font-semibold uppercase text-[9px] tracking-wider mr-1">Etnico:</span>
                                          {p.ethnicRef ? (
                                            <a href={p.ethnicRef} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                                              {p.ethnicText || 'Link'}
                                            </a>
                                          ) : (
                                            p.ethnicText
                                          )}
                                        </div>
                                      )}
                                      
                                      {p.note && (
                                        <p className="text-xs text-ink/80 leading-relaxed border-l-2 border-accent/20 pl-3 italic font-serif">
                                          {p.note}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Imperatori */}
                            {(selectedMonumento as any).imperatori?.length > 0 && (
                              <div>
                                <h3 className="text-xs font-bold uppercase text-muted tracking-widest mb-2">Imperatori</h3>
                                <div className="flex flex-wrap gap-2">
                                  {(selectedMonumento as any).imperatori.map((imp: string) => (
                                    <button key={imp}
                                      onClick={() => { setFilters(f => ({ ...f, searchText: imp })); setSelectedMonumento(null); }}
                                      className="border border-accent/40 text-accent/70 px-3 py-1 text-xs font-serif hover:border-accent hover:text-accent transition-all cursor-pointer rounded-full"
                                    >{imp}</button>
                                  ))}
                                </div>
                              </div>
                            )}
                         </div>
                         <div>
                            <h3 className="text-xs font-bold uppercase text-muted tracking-widest mb-4">Note Interne</h3>
                            {false ? (
                               <div className="relative">
                                 <textarea 
                                   id="monument-note-textarea"
                                   className="w-full border-b border-border bg-transparent py-1 text-sm outline-none resize-none font-serif"
                                   rows={2}
                                   value={editForm.note_interne || ''}
                                   onChange={e => {
                                      setEditForm({ ...editForm, note_interne: e.target.value });
                                      handleAutocomplete(e.target.value, e.target.selectionStart, 'note_interne', 'monument');
                                   }}
                                 />
                                 {suggestions && suggestionField === 'note_interne' && (
                                   <div className="absolute top-full left-0 bg-parchment border border-border shadow-2xl z-50 w-64 rounded-sm divide-y divide-border/50 max-h-40 overflow-y-auto">
                                      {suggestions.items.map((item, idx) => (
                                        <button 
                                          key={idx}
                                          className="w-full text-left px-4 py-2 text-xs hover:bg-accent hover:text-white transition-colors flex flex-col"
                                          onClick={() => applyAutocompleteSuggestion(item, 'note_interne', editForm.note_interne || '', document.getElementById('monument-note-textarea') as HTMLTextAreaElement, (val) => setEditForm({ ...editForm, note_interne: val }))}
                                        >
                                           {suggestions.type === '@' ? (
                                             <>
                                               <span className="font-bold">@{item.id} {item.titolo}</span>
                                               <span className="opacity-70 text-[10px]">{item.citta}</span>
                                             </>
                                           ) : (
                                             <span className="font-bold">{item}</span>
                                           )}
                                        </button>
                                      ))}
                                   </div>
                                 )}
                               </div>
                            ) : (
                               <p className="text-xs leading-relaxed text-muted/80 font-serif whitespace-pre-wrap">
                                  {selectedMonumento.note_interne ? (
                                    <NoteWithTags 
                                      text={selectedMonumento.note_interne} 
                                      query={filters.searchText}
                                      monumenti={monumenti}
                                      onSelectMonumento={(m) => { setSelectedMonumento(m); }}
                                      onTagClick={(tag) => {
                                        setFilters(f => ({ ...f, searchText: tag }));
                                        setSelectedMonumento(null);
                                      }} 
                                    />
                                  ) : "Nessuna nota di ricerca interna."}
                                </p>
                            )}
                         </div>
                      </section>

                      <IconographyPanel monumento={selectedMonumento} />

                      <section>
                         <h3 className="text-xl font-bold mb-6 italic flex items-center gap-4">
                           <div className="flex items-center gap-4 shrink-0">
                             <div className="h-[1px] w-8 bg-border/40" />
                             <div className="w-1.5 h-1.5 rotate-45 border border-accent/40" />
                           </div>
                           Trascrizione Testuale
                           <div className="flex-1 h-[1px] bg-border/20" />
                           {effectiveAdmin && selectedMonumento.testo && (
                             <button 
                               onClick={handleTranslate}
                               disabled={translating}
                               className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-widest text-accent hover:underline disabled:opacity-50"
                             >
                               {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                               Traduzione AI (Italiano)
                             </button>
                           )}
                         </h3>
                         {false ? (
                           <div className="space-y-6">
                             <div>
                               <label className="text-[10px] font-bold uppercase text-muted tracking-widest block mb-2">Testo Epigrafico</label>
                               <textarea 
                                 className="w-full bg-sidebar/50 border border-border p-8 font-mono text-base outline-none min-h-[200px]"
                                 value={editForm.testo || ''}
                                 onChange={e => setEditForm({ ...editForm, testo: e.target.value, iscrizione: e.target.value.length > 0 })}
                               />
                             </div>
                             <div>
                               <div className="flex items-center gap-2 mb-2">
                                 <label className="text-[10px] font-bold uppercase text-muted tracking-widest block font-sans">Traduzione Italiana</label>
                                 <Info className="h-3 w-3 text-muted/40" title="Inserisci qui la traduzione ufficiale o definitiva del testo epigrafico." />
                               </div>
                               <textarea 
                                 className="w-full bg-sidebar/50 border border-border p-8 font-serif text-base outline-none min-h-[150px] focus:ring-1 focus:ring-accent/20 transition-all"
                                 value={editForm.traduzioni?.find(t => t.lang?.toLowerCase() === 'it' || t.lang === 'IT')?.testo || ''}
                                 onChange={e => {
                                   const text = e.target.value;
                                   const trList = [...(editForm.traduzioni || [])];
                                   const itIdx = trList.findIndex(t => t.lang?.toLowerCase() === 'it' || t.lang === 'IT');
                                   if (itIdx !== -1) {
                                     trList[itIdx] = { ...trList[itIdx], testo: text };
                                   } else {
                                     trList.push({ lang: 'it', testo: text, note: 'Traduzione italiana' });
                                   }
                                   setEditForm({ ...editForm, traduzioni: trList });
                                 }}
                                 placeholder="Inserisci la traduzione testuale in italiano..."
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-2 font-sans">
                                  <label className="text-[10px] font-bold uppercase text-muted tracking-widest block font-sans">Apparatus Critico</label>
                                  <Info className="h-3 w-3 text-muted/40" title="Inserisci qui le varianti di lettura e l'apparato critico." />
                                </div>
                                <textarea 
                                  className="w-full bg-sidebar/50 border border-border p-8 font-mono text-xs outline-none min-h-[120px] focus:ring-1 focus:ring-accent/20 transition-all font-sans"
                                  value={editForm.apparatus || ''}
                                  onChange={e => setEditForm({ ...editForm, apparatus: e.target.value })}
                                  placeholder="Inserisci l'apparato critico..."
                               />
                             </div>
                           </div>
                         ) : (
                           <div className="space-y-8">
                             {/* Legenda markup: menu a tendina discreto */}
                             <LegendaDropdown />
                             <div className="bg-sidebar/50 border border-border p-8 md:p-12 text-base md:text-xl text-ink/90 shadow-inner relative"
                     style={{ fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: '2' }}>
                                <div className="absolute top-0 left-0 p-4 opacity-5 bg-border pointer-events-none">
                                  <Scroll className="h-20 w-20" />
                                </div>
                                <div className="relative z-10 max-w-[58ch] mx-auto pl-10 border-l-2 border-border/40">
                                  {selectedMonumento.testo ? (
                                    <EpiDocRenderer xml={selectedMonumento.testo} query={filters.searchText} />
                                  ) : <span className="opacity-40 italic">[Anepigrafe]</span>}
                                </div>
                             </div>
                             {selectedMonumento.traduzioni?.find(t => { const l = t.lang?.toLowerCase() || ''; return l === 'it' || l.startsWith('it ('); })?.testo && (
                               <div className="bg-sidebar/30 border-l-4 border-accent p-8 font-serif text-lg italic leading-relaxed text-ink/80 block mb-6">
                                 <div className="text-[9px] font-sans font-bold uppercase tracking-widest text-muted mb-2 font-semibold">Traduzione Italiana</div>
                                 <Highlight text={stripXml(selectedMonumento.traduzioni.find(t => { const l = t.lang?.toLowerCase() || ''; return l === 'it' || l.startsWith('it ('); })?.testo)} query={filters.searchText} />
                               </div>
                             )}
                             {hasApparatusContent(selectedMonumento.apparatus) ? (
                               <div className="bg-sidebar/20 border border-border/40 p-6 rounded-sm font-sans text-xs leading-relaxed text-muted block">
                                 <div className="text-[9px] font-sans font-bold uppercase tracking-widest text-muted mb-2 font-semibold">Apparatus Critico</div>
                                 <Highlight text={stripXml(selectedMonumento.apparatus)} query={filters.searchText} />
                               </div>
                             ) : null}
                           </div>
                         )}
                      </section>

                      {/* Bibliography */}
                      <section>
                         <h3 className="text-xl font-bold mb-6 italic flex items-center gap-3">
                           <div className="h-px w-8 bg-border" /> Bibliografia
                         </h3>
                         {false ? (
                            <div className="space-y-4">
                               {(editForm.bibliografia || []).map((b, i) => (
                                 <div key={i} className="flex gap-2">
                                    <input 
                                      className="flex-1 border-b border-border text-xs outline-none"
                                      placeholder="Titolo / Riferimento"
                                      value={b.titolo}
                                      onChange={e => {
                                        const newB = [...(editForm.bibliografia || [])];
                                        newB[i].titolo = e.target.value;
                                        setEditForm({ ...editForm, bibliografia: newB });
                                      }}
                                    />
                                    <input 
                                      className="w-24 border-b border-border text-xs outline-none"
                                      placeholder="Pagine"
                                      value={b.punti_rif || ''}
                                      onChange={e => {
                                        const newB = [...(editForm.bibliografia || [])];
                                        newB[i].punti_rif = e.target.value;
                                        setEditForm({ ...editForm, bibliografia: newB });
                                      }}
                                    />
                                    <button onClick={() => setEditForm({ ...editForm, bibliografia: editForm.bibliografia?.filter((_, idx) => idx !== i) })} className="text-accent"><X className="h-3 w-3" /></button>
                                 </div>
                               ))}
                               <button 
                                 onClick={() => setEditForm({ ...editForm, bibliografia: [...(editForm.bibliografia || []), { titolo: '' }] })}
                                 className="text-[9px] font-bold uppercase text-accent flex items-center gap-1 font-sans"
                               >
                                 <Plus className="h-3 w-3" /> Aggiungi Riferimento
                               </button>
                            </div>
                         ) : (
                            <>
                              {selectedMonumento.bibliografia && selectedMonumento.bibliografia.length === 1 && selectedMonumento.bibliografia[0].titolo.length > 60 ? (
                                // Voce prosa unica (stile IGCyr) — testo fluente
                                <p className="text-xs font-serif text-ink/80 leading-relaxed">
                                  {selectedMonumento.bibliografia[0].titolo}
                                </p>
                              ) : (
                                <ul className="space-y-3">
                                  {selectedMonumento.bibliografia?.map((b, i) => (
                                    <li key={i} className="text-xs flex gap-2 font-serif">
                                      <Book className="h-3 w-3 text-muted shrink-0 mt-0.5" />
                                      <span className="font-semibold text-ink">{formatBiblKey(b.titolo)}</span>
                                      {b.punti_rif && <span className="text-muted">({b.punti_rif})</span>}
                                    </li>
                                  )) || <li className="text-xs italic text-muted font-serif">Nessuna voce bibliografica.</li>}
                                </ul>
                              )}
                            </>
                         )}
                      </section>

                      {selectedMonumento.traduzioni && selectedMonumento.traduzioni.filter(t => {
                        const l = t.lang?.toLowerCase() || '';
                        return l !== 'it' && !l.startsWith('it (');
                      }).length > 0 && (
                        <section>
                           <h3 className="text-xl font-bold mb-6 italic flex items-center gap-3">
                             <div className="h-px w-8 bg-border" /> Altre Traduzioni
                           </h3>
                           <div className="grid gap-8">
                             {selectedMonumento.traduzioni
                               .filter(t => { const l = t.lang?.toLowerCase() || ''; return l !== 'it' && !l.startsWith('it ('); })
                               .map((t, i) => (
                               <div key={i} className="border-l-4 border-border/40 pl-8 pb-4">
                                 <div className="flex items-center gap-4 mb-3">
                                   <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-muted">{t.lang}</span>
                                 </div>
                                 <p className="text-lg italic text-ink leading-relaxed mb-4">{stripXml(t.testo)}</p>
                                 {t.note && <p className="text-[10px] font-serif text-muted italic">Note: {t.note}</p>}
                               </div>
                             ))}
                           </div>
                        </section>
                      )}


                    </div>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Comparison Drawer */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed bottom-0 left-0 right-0 h-[70vh] bg-sidebar border-t-2 border-accent z-[70] shadow-2xl p-10 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Columns className="h-5 w-5 text-accent" />
                <h3 className="text-xl font-bold italic tracking-tight">Matrice di Confronto Monumenti</h3>
              </div>
              <div className="flex items-center gap-6">
                 <button onClick={() => setCompareList([])} className="text-[10px] font-bold uppercase text-muted hover:text-accent tracking-widest">Svuota Matrice</button>
                 <button onClick={() => setCompareList([])} className="p-2 border border-border hover:border-accent"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="flex-1 flex gap-8 overflow-x-auto pb-6 custom-scrollbar">
              {compareList.map((m, idx) => (
                <div key={`${m.id}-${idx}`} className="w-[450px] shrink-0 bg-parchment border border-border p-8 overflow-y-auto custom-scrollbar relative font-serif">
                  <button 
                    onClick={() => setCompareList(compareList.filter((_, i) => i !== idx))}
                    className="absolute top-4 right-4 text-muted hover:text-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="mb-6">
                    {m.corpus && (
                      <span className="text-[10px] font-bold uppercase text-accent tracking-widest font-sans">{m.corpus}</span>
                    )}
                    <h4 className="text-2xl font-bold">{m.citta}</h4>
                    <span className="text-xs text-muted font-sans uppercase font-bold tracking-tighter">ID #{m.id} • {m.regione}</span>
                  </div>

                  <div className="space-y-8">
                    <section>
                      <h5 className="text-[9px] font-bold uppercase text-muted underline underline-offset-4 mb-3 font-sans">Trascrizione</h5>
                      <div className="text-sm bg-sidebar/50 p-4 border border-border/40"
                           style={{ fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: '1.9' }}>
                        {m.testo ? <EpiDocRenderer xml={m.testo} query={filters.searchText} /> : <span className="italic opacity-50">[Anepigrafe]</span>}
                      </div>
                    </section>
                    <section>
                      <h5 className="text-[9px] font-bold uppercase text-muted underline underline-offset-4 mb-3 font-sans">Traduzione Italiana</h5>
                      <p className="text-sm leading-relaxed text-ink/70">
                        {m.traduzioni?.find(t => { const l = t.lang?.toLowerCase() || ''; return l === 'it' || l.startsWith('it ('); })?.testo ? (
                          <Highlight text={stripXml(m.traduzioni.find(t => { const l = t.lang?.toLowerCase() || ''; return l === 'it' || l.startsWith('it ('); })?.testo)} query={filters.searchText} />
                        ) : "-"}
                      </p>
                    </section>
                    {hasApparatusContent(m.apparatus) && (
                      <section>
                        <h5 className="text-[9px] font-bold uppercase text-muted underline underline-offset-4 mb-3 font-sans">Apparatus Critico</h5>
                        <p className="text-xs font-mono leading-relaxed text-muted whitespace-pre-wrap">
                          <Highlight text={stripXml(m.apparatus)} query={filters.searchText} />
                        </p>
                      </section>
                    )}
                    <section>
                      <h5 className="text-[9px] font-bold uppercase text-muted underline underline-offset-4 mb-3 font-sans">Note Scientifiche</h5>
                      <p className="text-xs leading-relaxed text-muted italic whitespace-pre-wrap">
                        {m.note_interne ? (
                          <NoteWithTags 
                            text={m.note_interne} 
                            query={filters.searchText}
                            monumenti={monumenti}
                            onSelectMonumento={(m) => { setSelectedMonumento(m); setActiveView('catalog'); }}
                            onTagClick={(tag) => {
                              setFilters(f => ({ ...f, searchText: tag }));
                              setCompareList(compareList.filter((_, i) => i !== idx));
                              setActiveView('catalog');
                            }} 
                          />
                        ) : "-"}
                      </p>
                    </section>
                    <section>
                      <h5 className="text-[9px] font-bold uppercase text-muted underline underline-offset-4 mb-3 font-sans">Specifiche</h5>
                      <div className="grid grid-cols-2 gap-4 text-[10px] font-sans font-bold uppercase">
                        <div><span className="text-muted block text-[8px] tracking-widest">Tipologia</span> {m.tipo}</div>
                        <div><span className="text-muted block text-[8px] tracking-widest">Datazione</span> {m.data}</div>
                        <div><span className="text-muted block text-[8px] tracking-widest">Materiale</span> {m.materiale}</div>
                      </div>
                    </section>
                    <section>
                      <h5 className="text-[9px] font-bold uppercase text-muted underline underline-offset-4 mb-3 font-sans">Attributi</h5>
                      <div className="flex flex-wrap gap-1">
                        {m.epiteti?.map(e => <span key={e} className="text-[9px] border border-border px-2 py-0.5 rounded-sm">{e}</span>)}
                      </div>
                    </section>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}