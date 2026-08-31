import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { 
  Search,
  MapPin,
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
  Filter,
  Check,
  AlertTriangle,
  Feather,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  GitCompare,
  KeyRound,
  Unlock,
  NotebookPen,
  Bug,
  ExternalLink,
  BookMarked,
  Type,
  Tags
} from 'lucide-react';
import { cn, EASE_OUT, EASE_IN, SPRING_SNAPPY, SPRING_SOFT } from './lib/utils';
import { ICONOGRAPHY_LABELS } from './lib/iconographyLabels';
import { labelEvidence, labelUnit, labelType, labelMaterial, labelInscriptionType } from './lib/vocabLabels';
import { Monumento, FilterState, SortField, Traduzione, Bibliografia, Appunto, EntryRegistro, BugReport, EDITORIAL_STATUS_LABELS } from './types';
import { RAW_DATA } from './data';
import { monumentiToXml, xmlToMonumenti, formatIlaLabel, splitDivineKey } from './lib/xmlUtils';
import { buildDivinityIndex, buildOnomasticaIndex, buildClassificationAudit, DivinityStats, OnomasticaStats } from './lib/epithetIndex';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PleiadesMap } from './components/PleiadesMap';
import { MapView } from './components/MapView';
import { IconographyPanel } from './components/IconographyPanel';
import { CooccurrenceHeatmap } from './components/CooccurrenceHeatmap';
import { CultLexiconPanel } from './components/CultLexiconPanel';
import { SectionEditorView } from './components/SectionEditorView';
import { DraftReviewPanel } from './components/DraftReviewPanel';
import { UnlockEditingModal } from './components/UnlockEditingModal';
import { RegistroPanel } from './components/RegistroPanel';
import { RegistroForm } from './components/RegistroForm';
import { BugReportsPanel } from './components/BugReportsPanel';
import { BibliographyIndex, BiblioReplacement, BiblioApplyResult } from './components/BibliographyIndex';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import ilaLogo from './assets/images/ila-logo.png';

// Forma della risposta di GET /api/search (vedi src/lib/searchIndex.ts).
// Dichiarato qui invece che importato dal modulo server per non accoppiare
// il bundle frontend al codice Node del backend.
interface SearchResult {
  id: number;
  entryId?: string;
  score: number;
  match: Record<string, string[]>;
  terms: string[];
  matchInSupplied: boolean;
}

type AppView = 'home' | 'catalog' | 'stats' | 'timeline' | 'health' | 'map' | 'heatmap' | 'cult' | 'editor' | 'review' | 'flags' | 'bugs' | 'biblio';

// true sulla build GitHub Pages (vedi vite.config.ts / apiShim.ts): niente
// server.ts, quindi le funzionalità che dipendevano da Gemini AI o dalla
// cartella drafts/ (solo lettura, popolata dalla pipeline locale) restano
// nascoste — non hanno un backend a cui appoggiarsi lì.
const isStaticBuild = import.meta.env.VITE_STATIC_BUILD === 'true';

// Curve condivise: stessa "fisica" per tutte le micro-animazioni del progetto
// Unica fonte per l'email amministratore lato client — evita che le ~10
// occorrenze sparse nel file finiscano per divergere se mai cambiasse.
// NOTA: questo è solo un controllo di visibilità UI; l'enforcement reale
// deve avvenire lato server (vedi audit di sicurezza).
const ADMIN_EMAIL = 'gabrielegregorio123@gmail.com';

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

const formatDate = (val?: number) => {
  if (val === undefined || val === null || isNaN(val)) return '-';
  const abs = Math.abs(val);
  return val < 0 ? `${abs} a.C.` : `${val} d.C.`;
};

const formatEraYear = (raw?: string) => {
  if (!raw) return '';
  const n = parseInt(raw, 10);
  if (isNaN(n)) return raw;
  return formatDate(n);
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

// Segnaposto interno del corpus per i campi non ancora compilati: può
// comparire da solo (es. ref="DA_COMPILARE") o dentro una frase (es. "Height
// of letters: DA_COMPILARE.") — in entrambi i casi il campo va nascosto
// nella scheda invece di mostrare il segnaposto alla lettera.
const isFilled = (v?: string | null): v is string => !!v && !v.toUpperCase().includes('DA_COMPILARE');

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


// Card "protagonista" per una divinità: nome, occorrenze, regioni, numero di epiteti
// Elenco divinità in rubrica: ordine alfabetico, tutte le righe allineate su
// un'unica retta verticale (nome a sinistra del punto, attestazioni a
// destra). Scorrevole, con la voce sotto il marcatore fisso leggermente
// evidenziata durante lo scroll (stessa meccanica della rubrica onomastica,
// vedi RUBRICA_MARKER_OFFSET). La voce attiva pilota anche l'anteprima ad
// albero degli epiteti mostrata accanto (vedi onActiveChange).
const DIAGONAL_ROW_H = 42;
const DIAGONAL_BASE_X = 150;

const DivinityDiagonalList = ({ items, onSelect, onActiveChange, onScrollProgress, searchTerm }: {
  items: { name: string; count: number; epiteti: { name: string; count: number }[] }[];
  onSelect: (name: string) => void;
  // Chiamata a ogni cambio di riga attiva durante lo scroll (non solo al
  // click) — alimenta l'anteprima ad albero in tempo reale accanto alla lista.
  onActiveChange?: (name: string) => void;
  // Chiamata a ogni frame di scroll con quanto si è scesi nella lista (0 a
  // inizio, 1 dopo ~140px) — usata dal pannello padre per rimpicciolire
  // l'header di ricerca/filtro mentre si scorre, senza farlo sparire.
  onScrollProgress?: (amount: number) => void;
  // Termine di ricerca epiteti/divinità: non filtra la lista, evidenzia le
  // righe che hanno un epiteto (o un nome) corrispondente — vedi
  // EpithetStats per l'input di ricerca.
  searchTerm?: string;
}) => {
  const sorted = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);
  // Case-sensitive: i teonimi ed epiteti latinizzati del corpus si
  // distinguono per capitalizzazione (es. "Men" vs un ipotetico "men"), e
  // una ricerca insensibile al maiuscolo/minuscolo darebbe troppi falsi
  // positivi su termini brevi.
  const term = (searchTerm || '').trim();
  const searchActive = term.length > 0;
  const matchedEpiteto = (d: { name: string; epiteti: { name: string; count: number }[] }): string | null => {
    if (!searchActive) return null;
    const hit = d.epiteti.find(e => e.name.includes(term));
    return hit ? hit.name : null;
  };
  const isMatch = (d: { name: string; epiteti: { name: string; count: number }[] }) =>
    searchActive && (d.name.includes(term) || matchedEpiteto(d) !== null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Frazione di scroll (0 a inizio lista, 1 a fondo lista): guida sia quale
  // riga è "attiva" sia la dissolvenza della linea qui sotto. Sostituisce un
  // precedente calcolo basato su un offset fisso in px dall'alto del
  // contenitore — quel calcolo si "incastrava" su schermi molto alti, dove
  // 96px restano vicini al bordo superiore per tutta la lista e la riga più
  // vicina a quel punto smette di aggiornarsi. La frazione di scroll invece
  // raggiunge matematicamente 1 (= ultima voce attiva) a fondo scroll, su
  // qualunque dimensione di schermo.
  const [scrollFraction, setScrollFraction] = useState(0);
  const rafPending = useRef(false);
  const FADE_RANGE_ROWS = 5;
  // L'anteprima ad albero accanto è più "pesante" (ricalcola curve SVG,
  // rianima i rami) della semplice evidenziazione della riga: notificarla a
  // ogni frame di scroll la farebbe sfarfallare attraverso ogni divinità
  // intermedia durante uno scroll veloce. Si notifica quindi solo quando la
  // riga attiva resta ferma per DEBOUNCE_MS — l'evidenziazione della lista
  // resta invece istantanea, sganciata da questo ritardo.
  const DEBOUNCE_MS = 140;
  const lastNotified = useRef<string | null>(null);
  const debounceTimer = useRef<number | null>(null);

  const notifyActive = (name: string) => {
    if (lastNotified.current === name) return;
    lastNotified.current = name;
    onActiveChange?.(name);
  };

  // Hover su una riga: notifica subito, senza il debounce usato per lo
  // scroll — al contrario dello scroll (che attraversa righe intermedie
  // "di passaggio"), l'hover è già un gesto mirato su una voce precisa.
  const onRowHover = (name: string) => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    notifyActive(name);
  };

  const updateActive = () => {
    rafPending.current = false;
    const container = containerRef.current;
    if (!container) return;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const fraction = maxScroll > 0 ? Math.min(1, Math.max(0, container.scrollTop / maxScroll)) : 1;
    const idx = Math.round(fraction * (sorted.length - 1));
    setActiveIndex(idx);
    setScrollFraction(fraction);
    onScrollProgress?.(Math.min(1, container.scrollTop / 140));
    if (onActiveChange && sorted[idx]) {
      const name = sorted[idx].name;
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(() => notifyActive(name), DEBOUNCE_MS);
    }
  };
  const onScroll = () => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(updateActive);
  };
  useLayoutEffect(() => {
    updateActive();
    // La prima voce va mostrata subito, senza attendere il debounce.
    if (sorted[0]) notifyActive(sorted[0].name);
    return () => { if (debounceTimer.current) window.clearTimeout(debounceTimer.current); };
  }, [sorted]);

  // Ricerca attiva: la selezione si sposta da sola sulla prima voce
  // pertinente invece di lasciare l'utente a scorrere manualmente fino al
  // risultato evidenziato. Se il termine individua una sola divinità (caso
  // tipico di un epiteto esclusivo), quella resta "fissata" come voce
  // attiva; con più corrispondenze si porta comunque in vista la prima,
  // così l'utente parte già dalla zona giusta della lista.
  useEffect(() => {
    if (!searchActive) return;
    const matchIdx = sorted.findIndex(isMatch);
    if (matchIdx < 0) return;
    setActiveIndex(matchIdx);
    const container = containerRef.current;
    if (container) {
      // Stesso modello frazionario di updateActive (scrollTop/maxScroll ->
      // indice riga): uno scroll "a centro riga" indipendente finirebbe
      // corretto solo finché dura l'animazione, per poi essere riscritto
      // dall'handler di scroll nativo non appena questo ricalcola l'indice
      // attivo dalla propria formula — con un target incoerente, l'utente
      // vedrebbe l'evidenziazione "saltare" su una riga vicina ma sbagliata
      // a fine scroll.
      const maxScroll = container.scrollHeight - container.clientHeight;
      const targetTop = maxScroll * (matchIdx / Math.max(1, sorted.length - 1));
      container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    notifyActive(sorted[matchIdx].name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, sorted]);

  // Tutte le righe allineate sulla stessa ascissa: retta verticale invece
  // della precedente progressione diagonale (parametro mantenuto solo per
  // compatibilità con le chiamate esistenti più sotto).
  const tickX = (_i?: number) => DIAGONAL_BASE_X;
  const totalHeight = sorted.length * DIAGONAL_ROW_H;

  return (
    <motion.div {...fadeSwap} className="flex-1 flex overflow-hidden">
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <div
          ref={containerRef}
          onScroll={onScroll}
          className="flex-1 self-center w-full overflow-y-auto overflow-x-hidden custom-scrollbar"
          style={{
            paddingTop: RUBRICA_MARKER_OFFSET, paddingBottom: RUBRICA_MARKER_OFFSET,
            // Centra la composizione diagonale nel pannello quando c'è più
            // spazio del necessario, invece di lasciarla incollata al
            // bordo sinistro.
            maxWidth: tickX(sorted.length - 1) + 300,
          }}
        >
          {/* minWidth garantisce che il contenitore abbia davvero
              altrettanta larghezza scrollabile quanto richiesto dall'ultima
              riga: senza, il browser blocca scrollLeft al massimo che
              riesce a calcolare dal contenuto effettivamente presente, e il
              pan smette di seguire la diagonale ben prima dell'ultima voce
              (restava comunque selezionabile, solo non più raggiunta dalla
              vista). +240 = spazio per contatore ed eventuale badge epiteto
              a destra del punto sull'ultima riga. */}
          <div className="relative" style={{ height: totalHeight, minWidth: tickX(sorted.length - 1) + 240 }}>
            {sorted.length > 1 && (
              <svg className="absolute inset-0 pointer-events-none" width="100%" height={totalHeight} preserveAspectRatio="none">
                <line
                  x1={tickX(0)} y1={DIAGONAL_ROW_H / 2}
                  x2={tickX(sorted.length - 1)} y2={(sorted.length - 1) * DIAGONAL_ROW_H + DIAGONAL_ROW_H / 2}
                  stroke="var(--border)" strokeWidth={0.75}
                  // Dissolvenza verso la fine dello scroll (ultimo ~25%):
                  // la linea si "consuma" mentre ci si avvicina all'ultima
                  // voce, invece di restare identica dall'inizio alla fine.
                  strokeOpacity={0.5 * Math.max(0, 1 - Math.max(0, scrollFraction - 0.75) / 0.25)}
                />
              </svg>
            )}
            {sorted.map((d, i) => {
              const x = tickX(i);
              const isActive = i === activeIndex;
              const match = isMatch(d);
              const dimmed = searchActive && !match;
              const epitetoHit = matchedEpiteto(d);
              // Dissolvenza/scala continua in base alla distanza (in righe,
              // non in px) dalla voce attiva: fa "sentire" il testo in
              // movimento durante lo scroll, non solo la linea diagonale
              // (sempre uguale a se stessa). Disattivata durante la
              // ricerca, per non sommare due sistemi di enfasi diversi.
              const proximity = Math.max(0, 1 - Math.abs(i - activeIndex) / FADE_RANGE_ROWS);
              const rowStyle: React.CSSProperties = {
                top: i * DIAGONAL_ROW_H, height: DIAGONAL_ROW_H,
                opacity: searchActive ? undefined : 0.4 + proximity * 0.6,
                transform: searchActive ? undefined : `scale(${0.96 + proximity * 0.04})`,
              };
              return (
                <div
                  key={d.name}
                  className="absolute inset-x-0 transition-[opacity,transform] duration-150 ease-out"
                  style={rowStyle}
                >
                  <button
                    onClick={() => onSelect(d.name)}
                    onMouseEnter={() => { setActiveIndex(i); onRowHover(d.name); }}
                    className={cn(
                      "group relative w-full h-full text-left hover:bg-accent/[0.04] active:bg-accent/10 transition-all duration-200",
                      dimmed && "opacity-30"
                    )}
                  >
                    {/* Feedback immediato al click, indipendente dal marcatore
                        (che resta ancorato allo scroll e non "salta" al
                        click — spostarlo di scatto sarebbe più confusionario
                        di questo lieve rinforzo istantaneo sulla riga
                        premuta). */}
                    <span
                      className="absolute top-0 bottom-0 flex items-center justify-end pr-3"
                      style={{ left: 0, width: Math.max(0, x - 8) }}
                    >
                      <motion.span
                        layoutId={`divname-${d.name}`}
                        className={cn(
                          "font-serif transition-all duration-200 truncate group-active:text-accent",
                          isActive ? "text-2xl italic text-accent font-bold"
                            : match ? "text-lg text-accent font-bold"
                            : "text-base text-ink/70"
                        )}
                      >
                        {d.name}
                      </motion.span>
                    </span>
                    <span
                      className={cn(
                        "absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 group-active:bg-accent",
                        match ? "bg-accent" : "bg-accent/50"
                      )}
                      style={{ left: x, top: '50%', width: isActive || match ? 6 : 4, height: isActive || match ? 6 : 4 }}
                    />
                    <span
                      className="absolute top-0 bottom-0 flex items-center justify-start pl-3 gap-2"
                      style={{ left: x + 8, right: 0 }}
                    >
                      <span className={cn(
                        "font-sans font-bold tabular-nums transition-all duration-200 shrink-0 group-active:text-accent",
                        isActive || match ? "text-base text-accent" : "text-sm text-muted"
                      )}>
                        {d.count}×
                      </span>
                      {epitetoHit && (
                        <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent/70 bg-accent/10 px-1.5 py-0.5 rounded-sm truncate">
                          {epitetoHit}
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          {sorted.length === 0 && (
            <div className="text-center py-12 text-muted/40 text-sm italic">Nessuna divinità trovata per questo filtro.</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const EPITHET_TREE_ROW_H = 40;

// Albero genealogico orizzontale: la divinità come radice a sinistra
// (stesso layoutId della sua voce sulla diagonale, per una transizione
// fluida invece di un cambio di vista secco), una spina verticale con un
// ramo orizzontale per ogni epiteto. La colonna dei rami è scrollabile
// verticalmente e indipendente dalla radice (fissa) — necessario per
// divinità come Men, che ha decine di epiteti: senza scroll indipendente
// l'albero diventerebbe altissimo o i nodi illeggibili.
const EpithetTree = ({ divinity, epithets, onSelectEpithet, onSelectAll, preview = false }: {
  divinity: { name: string; count: number; regions: number };
  epithets: { name: string; count: number }[];
  onSelectEpithet: (name: string) => void;
  onSelectAll: () => void;
  // Modalità anteprima: usata nella rubrica divinità per tenere l'albero
  // sempre visibile e aggiornato in tempo reale mentre si scorre la lista,
  // invece che solo dopo un click. Stesso layout e stesso scroll indipendente
  // dei rami; cambia solo l'animazione di transizione tra una divinità e
  // l'altra (radice in dissolvenza, rami sostituiti uno a uno invece del
  // layoutId condiviso, che qui sarebbe attivo su due istanze contemporanee —
  // una nella rubrica e una qui — e andrebbe in conflitto).
  preview?: boolean;
  key?: string | number;
}) => {
  const maxCount = Math.max(1, ...epithets.map(e => e.count));
  const totalHeight = Math.max(epithets.length, 1) * EPITHET_TREE_ROW_H;
  const ROOT_COL_W = 208; // deve combaciare con w-52 sulla colonna radice
  const BRANCH_PAD_L = 4; // deve combaciare con pl-1 sulla colonna rami

  // Per far sì che il raccordo dalla radice raggiunga davvero ogni epiteto
  // (non un solo trattino fisso) serve un SVG che copra l'intera riga —
  // radice fissa compresa — e ridisegni le curve verso ogni voce
  // attualmente visibile man mano che la colonna dei rami scorre.
  const rowAreaRef = useRef<HTMLDivElement>(null);
  const branchScrollRef = useRef<HTMLDivElement>(null);
  const [rowAreaHeight, setRowAreaHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const rafPending = useRef(false);

  const measure = () => {
    rafPending.current = false;
    if (rowAreaRef.current) setRowAreaHeight(rowAreaRef.current.clientHeight);
    if (branchScrollRef.current) setScrollTop(branchScrollRef.current.scrollTop);
  };
  const onBranchScroll = () => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(measure);
  };
  useLayoutEffect(() => { measure(); }, [epithets]);

  const rootY = rowAreaHeight / 2;

  return (
    <motion.div {...fadeSwap} className="flex-1 flex flex-col overflow-hidden">
      {/* L'intestazione (occorrenze/regioni/epiteti) vive nel pannello
          padre insieme a ricerca e filtro, non qui — vedi EpithetStats,
          così resta visibile anche quando non c'è ancora una divinità
          attiva (nessun risultato per il filtro corrente). */}
      <div ref={rowAreaRef} className="flex-1 flex items-center overflow-hidden relative">
        {/* Raccordo radice→rami: un'unica curva per ogni epiteto
            attualmente visibile, ridisegnata a ogni scroll — una vera
            ramificazione dal nome della divinità, non un trattino fisso. */}
        {rowAreaHeight > 0 && (
          <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height={rowAreaHeight}>
            {epithets.map((e, i) => {
              const childY = i * EPITHET_TREE_ROW_H - scrollTop + EPITHET_TREE_ROW_H / 2;
              if (childY < -EPITHET_TREE_ROW_H || childY > rowAreaHeight + EPITHET_TREE_ROW_H) return null;
              const childX = ROOT_COL_W + BRANCH_PAD_L;
              return (
                <path
                  key={e.name}
                  d={`M ${ROOT_COL_W} ${rootY} C ${ROOT_COL_W + 40} ${rootY}, ${childX - 40} ${childY}, ${childX} ${childY}`}
                  fill="none" stroke="var(--border)" strokeWidth={1}
                />
              );
            })}
          </svg>
        )}
        {/* Radice: nome della divinità. Fuori da preview condivide il
            layoutId con la sua voce sulla rubrica per una transizione
            fluida da lista a vista dedicata. In preview quel layoutId
            sarebbe attivo su due istanze contemporanee (la riga in rubrica e
            questa radice) e andrebbe in conflitto — qui la radice cambia
            invece con una dissolvenza propria, agganciata al nome. */}
        <div className="shrink-0 w-52 flex flex-col items-end pr-5 relative">
          <button onClick={onSelectAll} className="group text-right">
            {preview ? (
              // Nessun mode="wait": il nome uscente e quello entrante si
              // sovrappongono in dissolvenza (invece di lasciare un vuoto
              // tra i due) — contenitore relative di altezza fissa perché le
              // due istanze, sovrapposte in absolute, non si spingano a
              // vicenda.
              <div className="relative h-8 min-w-[8ch]">
                <AnimatePresence initial={false}>
                  <motion.span
                    key={divinity.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.32, ease: EASE_OUT }}
                    className="absolute inset-0 flex items-center justify-end text-2xl italic font-bold text-accent font-serif leading-tight group-hover:opacity-80 whitespace-nowrap"
                  >
                    {divinity.name}
                  </motion.span>
                </AnimatePresence>
              </div>
            ) : (
              <motion.span
                layoutId={`divname-${divinity.name}`}
                className="block text-2xl italic font-bold text-accent font-serif leading-tight group-hover:opacity-80 transition-opacity"
              >
                {divinity.name}
              </motion.span>
            )}
            <span className="block text-xs font-sans font-bold text-muted mt-1">
              {divinity.count} <span className="text-border">·</span> vedi tutte
            </span>
          </button>
        </div>

        {/* Colonna dei rami: scrollabile in verticale, indipendente dalla
            radice — essenziale per Men e le sue decine di epiteti. */}
        <div
          ref={branchScrollRef}
          onScroll={onBranchScroll}
          className="flex-1 h-full overflow-y-auto custom-scrollbar pl-1"
        >
          {epithets.length === 0 ? (
            <div className="h-full flex items-center text-muted/40 text-sm italic">
              Nessun epiteto co-occorrente per questa divinità nello stesso monumento.
            </div>
          ) : (
            <div className="relative" style={{ height: totalHeight }}>
              {/* In preview i rami si sostituiscono uno a uno (dissolvenza +
                  lieve scorrimento, con un piccolo sfalsamento in cascata)
                  invece di cambiare di scatto: è l'"albero che si
                  rigenera" mentre si scorre la rubrica a fianco. Fuori da
                  preview restano statici (nessuna voce cambia senza un
                  click, che rimonta l'intero componente più in alto). */}
              <AnimatePresence initial={false}>
                {epithets.map((e, i) => (
                  <motion.button
                    key={preview ? `${divinity.name}-${e.name}` : e.name}
                    onClick={() => onSelectEpithet(e.name)}
                    initial={preview ? { opacity: 0, x: -14 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    exit={preview ? { opacity: 0, x: 14 } : undefined}
                    transition={{ duration: 0.22, delay: preview ? Math.min(i, 12) * 0.018 : 0, ease: EASE_OUT }}
                    className="group absolute inset-x-0 mr-4 flex items-center gap-4 rounded-lg border border-border/50 bg-card/40 backdrop-blur-sm hover:bg-accent/[0.06] hover:border-accent/30 transition-colors"
                    style={{ top: i * EPITHET_TREE_ROW_H + 3, height: EPITHET_TREE_ROW_H - 6, paddingLeft: 16 }}
                  >
                    <span className="w-40 shrink-0 text-left text-base font-serif italic text-ink group-hover:text-accent transition-colors truncate">
                      {e.name}
                    </span>
                    <div className="flex-1 min-w-0 flex items-center gap-3 pr-4">
                      <div className="flex-1 max-w-[140px] h-1.5 bg-border/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent/60 rounded-full transition-all"
                          style={{ width: `${Math.max(4, (e.count / maxCount) * 100)}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs font-sans font-bold text-muted tabular-nums">
                        <span className="text-border mr-0.5">·</span>{e.count}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Helper per la lista attestazioni
const AttestationList = ({
  label, context, items, monumenti, onSelectMonumento, variant = 'epithet'
}: {
  label: string;
  context?: string; // es. il nome della divinità di appartenenza, per il breadcrumb
  items: Monumento[];
  monumenti: Monumento[];
  onSelectMonumento: (m: Monumento) => void;
  // 'all' = tutte le attestazioni di una divinità (incluse quelle senza
  // epiteto), raggiunta dal nodo centrale del grafo; 'epithet' = drill-down
  // su un epiteto specifico.
  variant?: 'epithet' | 'all';
  key?: string | number;
}) => (
  <motion.div {...fadeSwap} className="flex-1 flex flex-col overflow-hidden">
    <div className="mb-6 border-b border-border pb-2">
      <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-1.5">
        {context ? <>{context} <ChevronRight className="inline h-3 w-3 -mt-0.5 mx-0.5" /> Elenco monumenti</> : 'Elenco monumenti'}
      </div>
      <h3 className="text-2xl font-serif italic text-accent">
        {variant === 'all' ? <>Tutte le attestazioni di &quot;{label}&quot;</> : <>Attestazioni per: &quot;{label}&quot;</>}
      </h3>
    </div>
    <div className="text-[10px] font-sans text-muted/60 mb-2 uppercase tracking-widest">
      {items.length} {items.length === 1 ? 'attestazione' : 'attestazioni'}
    </div>
    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
      <div className="border border-border/60 rounded-sm bg-parchment/40 overflow-hidden">
        <div className="hidden md:grid grid-cols-[4.5rem_2fr_6rem_6rem_1.25rem] gap-3 px-3 py-2 border-b border-border/60 text-[9px] font-sans font-bold uppercase tracking-widest text-muted/60">
          <span>Id</span>
          <span>Testo</span>
          <span>Regione</span>
          <span>Località</span>
          <span />
        </div>
        <div className="divide-y divide-border/40">
          {items.map((m, i) => (
            <motion.div
              key={m.entryId || `idx-${m.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: Math.min(i, 20) * 0.015, ease: EASE_OUT }}
              onClick={() => onSelectMonumento(m)}
              className="group grid grid-cols-[4.5rem_2fr_6rem_6rem_1.25rem] items-center gap-3 px-3 py-3.5 cursor-pointer hover:bg-accent/5 transition-colors"
            >
              <span className="shrink-0 text-[11px] font-mono font-bold text-accent/80 group-hover:text-accent transition-colors truncate">
                ILA-{m.id.toString().padStart(3, '0')}
              </span>
              <div className="min-w-0 flex flex-col gap-0.5">
                <span className="text-sm font-bold font-serif text-ink group-hover:text-accent transition-colors truncate">{getDisplayTitle(m)}</span>
                <span className="text-xs italic text-muted/70 truncate">"{stripXml(m.testo) || '[Anepigrafe]'}"</span>
              </div>
              <span className="text-[10px] font-sans font-bold text-accent uppercase tracking-widest truncate">{m.regione || '—'}</span>
              <span className="text-[10px] font-sans font-bold text-muted/70 uppercase tracking-widest truncate">{m.citta || '—'}</span>
              <ChevronRight className="h-3.5 w-3.5 text-border group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 justify-self-end" />
            </motion.div>
          ))}
        </div>
      </div>
      {items.length === 0 && (
        <div className="text-center py-12 text-muted/40 text-sm italic">Nessuna attestazione trovata.</div>
      )}
    </div>
  </motion.div>
);

// Distanza dal bordo superiore del contenitore, in pixel, a cui è ancorato
// il "marcatore" della rubrica: la voce il cui centro è più vicino a questa
// linea viene evidenziata mentre si scorre, effetto rolodex/elenco telefonico.
const RUBRICA_MARKER_OFFSET = 96;

// Onomastica come rubrica: elenco alfabetico verticale su tutta l'altezza
// disponibile, raggruppato per iniziale. La voce più vicina al marcatore
// fisso (linea d'accento a RUBRICA_MARKER_OFFSET px dall'alto) si evidenzia
// dinamicamente durante lo scroll, come sfogliando un vero elenco cartaceo.
// Indice alfabetico completo (A-Z + "#" per nomi che non iniziano con una
// lettera, es. "[...]lia figlia di Poplios") per la colonna di selezione
// rapida a sinistra della rubrica.
const RUBRICA_ALPHABET = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

const OnomasticaRubrica = ({ items, onSelect }: {
  items: { name: string; regions: string[] }[];
  onSelect: (name: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [activeName, setActiveName] = useState<string | null>(items[0]?.name ?? null);
  // Distanza (px) di ogni voce dal marcatore, per la dissolvenza qui sotto.
  const [rowDist, setRowDist] = useState<Record<string, number>>({});
  // Il marcatore insegue la voce attiva invece di restare fisso — vedi il
  // <motion.div> più sotto.
  const [markerTop, setMarkerTop] = useState(RUBRICA_MARKER_OFFSET);
  const rafPending = useRef(false);
  const FADE_RANGE = 170;

  const updateActive = () => {
    rafPending.current = false;
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const markerY = containerRect.top + RUBRICA_MARKER_OFFSET;
    let closestName: string | null = null;
    let closestDist = Infinity;
    let closestRect: DOMRect | null = null;
    const dist: Record<string, number> = {};
    itemRefs.current.forEach((el, name) => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const d = Math.abs(center - markerY);
      dist[name] = d;
      if (d < closestDist) { closestDist = d; closestName = name; closestRect = rect; }
    });
    if (closestName) setActiveName(closestName);
    if (closestRect) {
      const r: DOMRect = closestRect;
      // Sotto il testo (bordo inferiore della riga), non a metà altezza:
      // a metà attraverserebbe il nome come una barratura invece di
      // sottolinearlo.
      setMarkerTop(r.bottom - containerRect.top);
    }
    setRowDist(dist);
  };

  const onScroll = () => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(updateActive);
  };

  useLayoutEffect(() => { updateActive(); }, [items]);

  // Prima voce per ogni lettera, per l'indice laterale A-Z: quali lettere
  // hanno almeno un nome (le altre restano disabilitate) e a quale voce
  // saltare quando si clicca una lettera.
  const letterFirstItem = useMemo(() => {
    const map: Record<string, string> = {};
    items.forEach(item => {
      const raw = item.name.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(raw) ? raw : '#';
      if (!map[letter]) map[letter] = item.name;
    });
    return map;
  }, [items]);

  const scrollToLetter = (letter: string) => {
    const container = containerRef.current;
    const targetName = letterFirstItem[letter];
    const el = targetName ? itemRefs.current.get(targetName) : undefined;
    if (!container || !el) return;
    const markerY = container.getBoundingClientRect().top + RUBRICA_MARKER_OFFSET;
    const elY = el.getBoundingClientRect().top;
    container.scrollTo({ top: container.scrollTop + (elY - markerY), behavior: 'smooth' });
  };

  const activeLetter = activeName
    ? (/[A-Z]/.test(activeName.charAt(0).toUpperCase()) ? activeName.charAt(0).toUpperCase() : '#')
    : null;

  let lastLetter = '';

  return (
    <motion.div {...fadeSwap} className="flex-1 flex overflow-hidden gap-1">
      {/* Indice alfabetico laterale: salta direttamente alla prima voce di
          una lettera. Le lettere senza alcun nome restano disabilitate. */}
      <div className="hidden sm:flex flex-col shrink-0 w-6 py-1">
        {RUBRICA_ALPHABET.map(letter => {
          const available = !!letterFirstItem[letter];
          return (
            <button
              key={letter}
              disabled={!available}
              onClick={() => scrollToLetter(letter)}
              className={cn(
                "flex-1 flex items-center justify-center text-[9px] font-sans font-bold uppercase transition-all duration-150",
                !available && "text-muted/20 cursor-default",
                available && letter === activeLetter && "text-accent scale-125 font-black",
                available && letter !== activeLetter && "text-muted/60 hover:text-accent hover:scale-110"
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>
      <div className="relative flex-1 flex flex-col overflow-hidden">
        {/* Marcatore: insegue la voce attiva invece di restare fisso */}
        <motion.div
          className="absolute left-0 right-0 border-t-2 border-accent/70 pointer-events-none z-10"
          animate={{ top: markerTop }}
          transition={SPRING_SOFT}
        >
          <span className="absolute -left-1 -top-[5px] w-2 h-2 rounded-full bg-accent" />
        </motion.div>
        <div
          ref={containerRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto custom-scrollbar px-4"
          style={{ paddingTop: RUBRICA_MARKER_OFFSET, paddingBottom: RUBRICA_MARKER_OFFSET }}
        >
          {/* Indice "a sommario di libro": ogni lettera è un capitolo, i
              nomi sotto sono le sue voci — nome a sinistra, regione a
              destra, come in un indice editoriale. */}
          {items.map(item => {
            const raw = item.name.charAt(0).toUpperCase();
            const letter = /[A-Z]/.test(raw) ? raw : '#';
            const showLetter = letter !== lastLetter;
            lastLetter = letter;
            const isActive = item.name === activeName;
            const proximity = Math.max(0, 1 - (rowDist[item.name] ?? FADE_RANGE) / FADE_RANGE);
            return (
              <React.Fragment key={item.name}>
                {showLetter && (
                  <div
                    className="pt-7 pb-1 text-sm font-serif text-ink select-none"
                    style={{ fontVariant: 'small-caps', letterSpacing: '0.08em' }}
                  >
                    {letter === '#' ? '—' : letter}
                  </div>
                )}
                <button
                  ref={el => { if (el) itemRefs.current.set(item.name, el); else itemRefs.current.delete(item.name); }}
                  onClick={() => onSelect(item.name)}
                  className="w-full text-left flex items-baseline justify-between gap-4 py-1.5 pl-6 pr-1 transition-[opacity,color] duration-200"
                  style={{ opacity: 0.4 + proximity * 0.6 }}
                >
                  <span className={cn(
                    "font-serif transition-all duration-200 truncate",
                    isActive ? "text-accent font-bold" : "text-ink/80"
                  )}>
                    {item.name}
                  </span>
                  <span className={cn(
                    "shrink-0 text-xs font-serif italic tracking-wide transition-colors duration-200",
                    isActive ? "text-accent" : "text-muted/50"
                  )}>
                    {item.regions[0] || ''}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
          {items.length === 0 && (
            <div className="text-center py-12 text-muted/40 text-sm italic">Nessun nome trovato per questo filtro.</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Sentinella per "tutte le attestazioni della divinità" nello stato
// selectedEpithet: distingue il drill-down per singolo epiteto dalla vista
// che mostra ogni menzione della divinità, incluse quelle senza epiteto.
const ALL_EPITHETS = '__all__';

function EpithetStats({ monumenti, onSelectMonumento, initialTab, initialDivinity, initialOnomastica, initialSearch }: {
  monumenti: Monumento[],
  onSelectMonumento: (m: Monumento) => void,
  // Preset applicato solo al mount (il componente viene smontato/rimontato a
  // ogni cambio di activeView, vedi il render condizionale in App) — arriva
  // dal popover contestuale sull'iscrizione o dal suo fallback di redirect.
  initialTab?: 'divinita' | 'onomastica',
  initialDivinity?: string,
  initialOnomastica?: string,
  initialSearch?: string,
}) {
  const [activeTab, setActiveTab] = useState<'divinita' | 'onomastica'>(initialTab || 'divinita');
  // selectedDivinity/selectedEpithet: impostati insieme, solo al click (sulla
  // rubrica o sull'albero) — è l'unico modo per aprire le attestazioni. Fino
  // a quel momento restano null anche se l'albero a fianco mostra già
  // un'altra divinità: quello è governato da activeDivinityName, aggiornato
  // in continuo dallo scroll della rubrica (vedi sotto).
  const [selectedDivinity, setSelectedDivinity] = useState<string | null>(initialDivinity || null);
  const [selectedEpithet, setSelectedEpithet] = useState<string | null>(initialDivinity ? ALL_EPITHETS : null);
  // Divinità "attiva" durante lo scroll della rubrica: alimenta l'anteprima
  // ad albero in tempo reale accanto alla lista, indipendentemente da
  // un'eventuale selezione già aperta sulle attestazioni.
  const [activeDivinityName, setActiveDivinityName] = useState<string | null>(initialDivinity || null);
  // Quanto si è scesi nella rubrica (0-1, satura dopo ~140px): rimpicciolisce
  // l'header di ricerca/filtro del pannello destro mentre si scorre, senza
  // farlo sparire — vedi onScrollProgress su DivinityDiagonalList.
  const [listScroll, setListScroll] = useState(0);
  const [selected, setSelected] = useState<string | null>(initialOnomastica || null); // solo per l'onomastica
  // Ricerca epiteti (principale) / divinità: non filtra la lista, evidenzia
  // nella vista diagonale tutte le divinità che hanno un epiteto (o un nome)
  // corrispondente — utile per vedere a colpo d'occhio quante e quali
  // divinità condividono lo stesso epiteto.
  const [epithetSearch, setEpithetSearch] = useState(initialSearch || '');

  // ── Statistiche divinità, con epiteti co-occorrenti e relativo conteggio ──
  // Aggregazione condivisa con il popover contestuale sull'iscrizione (vedi
  // src/lib/epithetIndex.ts) — stessa fonte di verità, nessun ricalcolo
  // divergente.
  const divstatsIndex: Record<string, DivinityStats> = useMemo(() => buildDivinityIndex(monumenti), [monumenti]);
  const divstats: DivinityStats[] = useMemo(
    () => Object.values(divstatsIndex).sort((a, b) => b.count - a.count),
    [divstatsIndex]
  );

  const [divinitaRegionFilter, setDivinitaRegionFilter] = useState('');
  const divinitaRegions = useMemo(
    () => Array.from(new Set(divstats.flatMap(d => d.regionsList))).sort(),
    [divstats]
  );
  const filteredDivstats = useMemo(
    () => divinitaRegionFilter
      ? divstats.filter(d => d.regionsList.includes(divinitaRegionFilter))
      : divstats,
    [divstats, divinitaRegionFilter]
  );

  // ── Onomastica: rubrica alfabetica ─────────────────────────────────────────
  // I nomi attestati non si ripetono quasi mai (a differenza delle divinità):
  // niente più aggregazione per "numero di attestazioni" o "numero di
  // regioni" come unità significativa — solo un indice navigabile in ordine
  // alfabetico, con un filtro per regione (l'unico raggruppamento che ha
  // ancora senso qui).
  const [onomasticaRegionFilter, setOnomasticaRegionFilter] = useState('');
  const onostatsIndex: Record<string, OnomasticaStats> = useMemo(() => buildOnomasticaIndex(monumenti), [monumenti]);
  const onostats: OnomasticaStats[] = useMemo(
    () => Object.values(onostatsIndex).sort((a, b) => a.name.localeCompare(b.name)),
    [onostatsIndex]
  );

  const onomasticaRegions = useMemo(
    () => Array.from(new Set(onostats.flatMap(o => o.regions))).sort(),
    [onostats]
  );

  const filteredOnostats = useMemo(
    () => onomasticaRegionFilter
      ? onostats.filter(o => o.regions.includes(onomasticaRegionFilter))
      : onostats,
    [onostats, onomasticaRegionFilter]
  );

  const totalDivinita = divstats.length;
  const totalOnomastica = onostats.length;
  const totalEpiteti = useMemo(() => {
    const set = new Set<string>();
    divstats.forEach(d => d.epiteti.forEach(e => set.add(e.name)));
    return set.size;
  }, [divstats]);

  // Divinità mostrata nell'anteprima ad albero: quella attiva sullo scroll
  // se ancora presente nella lista filtrata, altrimenti la prima della
  // lista filtrata (es. subito dopo aver applicato un filtro regione che
  // esclude la divinità in anteprima).
  const activeDivinityStats = useMemo(
    () => filteredDivstats.find(d => d.name === activeDivinityName) || filteredDivstats[0] || null,
    [filteredDivstats, activeDivinityName]
  );

  // ── Monumenti per l'epiteto selezionato (nel contesto della divinità) ─────
  // ALL_EPITHETS (click sul nodo centrale del grafo) → tutte le iscrizioni
  // in cui la divinità è nominata, incluse quelle senza epiteto: filtra solo
  // su divinita, senza richiedere un match su epiteti.
  const monumentsForEpithet = useMemo(() => {
    if (!selectedDivinity || !selectedEpithet) return [];
    if (selectedEpithet === ALL_EPITHETS) {
      return monumenti.filter(m => m.divinita?.includes(selectedDivinity));
    }
    return monumenti.filter(m => m.divinita?.includes(selectedDivinity) && m.epiteti?.includes(selectedEpithet));
  }, [monumenti, selectedDivinity, selectedEpithet]);

  // ── Monumenti per l'onomastica selezionata ─────────────────────────────────
  const monumentsForOnomastica = useMemo(() => {
    if (!selected) return [];
    return monumenti.filter(m => m.onomastica?.includes(selected));
  }, [monumenti, selected]);

  // Per le divinità la selezione vera e propria è solo l'apertura delle
  // attestazioni (selectedEpithet): la rubrica e l'anteprima ad albero
  // restano sempre la vista di base, anche mentre activeDivinityName cambia
  // in continuo con lo scroll.
  const anySelection = activeTab === 'divinita' ? !!selectedEpithet : !!selected;

  // Risale di un livello: attestazioni → rubrica+albero (o, per
  // l'onomastica, direttamente attestazioni → griglia)
  const goBack = () => {
    if (activeTab === 'divinita') {
      setSelectedEpithet(null);
      setSelectedDivinity(null);
    } else {
      setSelected(null);
    }
  };

  // Apre le attestazioni per la divinità/epiteto scelto — unico punto in cui
  // si "seleziona" davvero qualcosa nella tab divinità, sia dal click su una
  // riga della rubrica sia dal click su radice/ramo dell'anteprima ad albero.
  const openAttestations = (divinityName: string, epithet: string) => {
    setSelectedDivinity(divinityName);
    setSelectedEpithet(epithet);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {anySelection && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="mb-6 flex justify-end items-center gap-2 shrink-0"
        >
          <button
            onClick={goBack}
            className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent border border-accent px-4 py-2 hover:bg-accent hover:text-white transition-all"
          >
            ← Indietro
          </button>
        </motion.div>
      )}

      {/* Tab selector */}
      {!anySelection && (
        <div className="flex gap-0 mb-6 border-b border-border">
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
        {activeTab === 'divinita' && !selectedEpithet && (
          <motion.div key="divinita-list" {...fadeSwap} className="flex-1 flex flex-col overflow-hidden">
            {divstats.length === 0 ? (
              <div className="text-center py-12 text-muted/40 text-sm italic">
                Nessuna divinità estratta. Verifica che il corpus contenga tag &lt;persName type="divine"&gt;.
              </div>
            ) : (
              /* Rubrica verticale delle divinità a sinistra, anteprima ad
                 albero degli epiteti a destra — entrambe scorrevoli in modo
                 indipendente. L'albero segue in tempo reale la divinità
                 attiva sullo scroll/hover della rubrica (vedi onActiveChange /
                 activeDivinityName); un click, sulla rubrica o sull'albero,
                 è l'unico modo per aprire davvero le attestazioni. Ricerca e
                 filtro regione vivono entrambi nella colonna sinistra, sopra
                 la rubrica che restringono; l'anteprima a destra è racchiusa
                 in una finestra con la stessa identità visiva delle schede
                 del catalogo. */
              <div className="flex-1 flex gap-8 overflow-hidden glass-panel !rounded-lg p-5">
                <div className="w-[380px] shrink-0 flex flex-col overflow-hidden">
                  {/* Ricerca epiteto/divinità: vive sopra la rubrica che
                      filtra, invece che nell'header della colonna destra —
                      stesso rimpicciolimento legato allo scroll di
                      DivinityDiagonalList (via listScroll), solo spostato di
                      colonna. */}
                  <div
                    className="mb-3 shrink-0 transition-transform duration-200 ease-out"
                    style={{ transform: `scale(${1 - listScroll * 0.22})`, transformOrigin: 'left center' }}
                  >
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                      <input
                        type="text"
                        value={epithetSearch}
                        onChange={(e) => setEpithetSearch(e.target.value)}
                        placeholder="Cerca epiteto o divinità…"
                        className="w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-lg pl-9 pr-8 py-2 font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 transition-all duration-300"
                        style={{ backgroundColor: 'var(--card)', color: 'var(--ink)' }}
                      />
                      {epithetSearch && (
                        <button
                          onClick={() => setEpithetSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted/50 hover:text-accent transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Filtro regione: vive sotto la ricerca, nella stessa
                      colonna che entrambe restringono — prima stava
                      nell'header del pannello destro. Stesso rimpicciolimento
                      legato allo scroll della rubrica. */}
                  <div
                    className="mb-3 shrink-0 transition-transform duration-200 ease-out"
                    style={{ transform: `scale(${1 - listScroll * 0.22})`, transformOrigin: 'left center' }}
                  >
                    <div className="relative w-full">
                      <select
                        className="w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-lg pl-3 pr-8 py-2 font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 cursor-pointer appearance-none transition-all duration-300"
                        style={{ backgroundColor: 'var(--card)', color: 'var(--ink)', WebkitAppearance: 'none' as const, appearance: 'none' as const }}
                        value={divinitaRegionFilter}
                        onChange={(e) => setDivinitaRegionFilter(e.target.value)}
                      >
                        <option value="" className="bg-parchment dark:bg-sidebar text-ink">Tutte le Regioni</option>
                        {divinitaRegions.map(r => <option key={r} value={r} className="bg-parchment dark:bg-sidebar text-ink">{r}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                    </div>
                  </div>
                  <DivinityDiagonalList
                    items={filteredDivstats}
                    onSelect={(name) => openAttestations(name, ALL_EPITHETS)}
                    onActiveChange={setActiveDivinityName}
                    onScrollProgress={setListScroll}
                    searchTerm={epithetSearch}
                  />
                </div>
                <div className="flex-1 flex flex-col overflow-hidden pl-8">
                  {/* Finestra di analisi degli epiteti: stessa identità visiva
                      delle schede del catalogo — cornice in pergamena, bordo
                      morbido, intestazione con etichetta accent e metadati a
                      destra. Il filtro regione è stato spostato nella colonna
                      sinistra, sotto la ricerca. */}
                  <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/70 bg-parchment shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="shrink-0 flex items-center justify-between gap-4 px-7 py-4 border-b border-border/40 bg-sidebar/30">
                      <span className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] text-accent whitespace-nowrap">
                        Epiteti co-occorrenti
                      </span>
                      <div className="flex items-center gap-3 text-[10px] font-sans font-bold uppercase tracking-widest text-muted min-w-0 text-right justify-end">
                        {activeDivinityStats ? (
                          <>
                            <span className="whitespace-nowrap">{activeDivinityStats.count} occorrenze</span>
                            <span className="text-border">·</span>
                            <span className="whitespace-nowrap">{activeDivinityStats.regions} {activeDivinityStats.regions === 1 ? 'regione' : 'regioni'}</span>
                            <span className="text-border">·</span>
                            <span className="whitespace-nowrap">{activeDivinityStats.epiteti.length} {activeDivinityStats.epiteti.length === 1 ? 'epiteto' : 'epiteti'}</span>
                          </>
                        ) : (
                          <span className="normal-case font-normal italic text-muted/50">Nessuna divinità per questo filtro</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 p-5 flex flex-col">
                      {activeDivinityStats ? (
                        <EpithetTree
                          key="divinita-preview"
                          divinity={activeDivinityStats}
                          epithets={activeDivinityStats.epiteti}
                          onSelectEpithet={(name) => openAttestations(activeDivinityStats.name, name)}
                          onSelectAll={() => openAttestations(activeDivinityStats.name, ALL_EPITHETS)}
                          preview
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-center text-muted/40 text-sm italic px-8">
                          Passa il mouse su una divinità della rubrica per vederne gli epiteti co-occorrenti.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'divinita' && selectedDivinity && selectedEpithet && (
          <AttestationList
            key="divinita-attestations"
            label={selectedEpithet === ALL_EPITHETS ? selectedDivinity : selectedEpithet}
            context={selectedEpithet === ALL_EPITHETS ? undefined : selectedDivinity}
            variant={selectedEpithet === ALL_EPITHETS ? 'all' : 'epithet'}
            items={monumentsForEpithet}
            monumenti={monumenti}
            onSelectMonumento={onSelectMonumento}
          />
        )}

        {activeTab === 'onomastica' && !selected && (
          <motion.div key="onomastica-rubrica" {...fadeSwap} className="flex-1 flex flex-col overflow-hidden">
            <div className="mb-4 flex items-center justify-end animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="relative w-56">
                <select
                  className="w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-xl pl-3 pr-8 py-2 font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 cursor-pointer appearance-none transition-all duration-300"
                  style={{ backgroundColor: 'var(--card)', color: 'var(--ink)', WebkitAppearance: 'none' as const, appearance: 'none' as const }}
                  value={onomasticaRegionFilter}
                  onChange={(e) => setOnomasticaRegionFilter(e.target.value)}
                >
                  <option value="" className="bg-parchment dark:bg-sidebar text-ink">Tutte le Regioni</option>
                  {onomasticaRegions.map(r => <option key={r} value={r} className="bg-parchment dark:bg-sidebar text-ink">{r}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
              </div>
            </div>
            {onostats.length === 0 ? (
              <div className="text-center py-12 text-muted/40 text-sm italic">
                Nessun nome di persona estratto. Verifica che il corpus contenga tag &lt;persName type="attested"&gt;.
              </div>
            ) : (
              <OnomasticaRubrica items={filteredOnostats} onSelect={setSelected} />
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

  // Audit di classificazione divinità / epiteti (vedi buildClassificationAudit).
  const audit = useMemo(() => buildClassificationAudit(monumenti), [monumenti]);
  const naRelated = audit.neverAlone.filter(d => d.relatedNames.length > 0);
  const naPlain = audit.neverAlone.filter(d => d.relatedNames.length === 0);
  // Solo i segnali "stretti" contano nel totale in evidenza: sovrapposizione di
  // token fra teonimi co-presenti + stessa forma divinità/epiteto. Il "mai da
  // sola" senza altri indizi resta come nota informativa (in un corpus tutto
  // incentrato su Men molte divinità reali non compaiono mai da sole).
  const auditTotal = naRelated.length + audit.divVsEpi.length;

  const jumpToFirst = (ids: number[]) => {
    const m = monumenti.find(x => ids.includes(x.id));
    if (m) onSelectMonumento(m);
  };

  const IdChips = ({ ids }: { ids: number[] }) => (
    <div className="flex flex-wrap gap-1.5">
      {ids.slice(0, 20).map(id => {
        const m = monumenti.find(x => x.id === id);
        return (
          <button key={id} onClick={() => m && onSelectMonumento(m)}
            className="text-[10px] font-sans rounded border border-border/60 bg-white/40 dark:bg-black/10 px-1.5 py-0.5 hover:border-accent hover:text-accent transition-colors">
            {formatIlaLabel(id)}
          </button>
        );
      })}
      {ids.length > 20 && <span className="text-[10px] text-muted self-center">+{ids.length - 20}</span>}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <motion.div {...scrollReveal} className="mb-8">
        <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-2">Controllo qualità</div>
        <h2 className="text-3xl md:text-4xl font-bold italic mb-2">Coerenza del Corpus</h2>
        <div className="ornament-rule !my-0 mb-3 max-w-[6rem] mx-0" />
        <p className="text-sm text-muted font-serif">
          Controllo automatico delle varianti grafiche e dei campi mancanti. Nessun dato viene modificato: le segnalazioni vanno verificate e corrette a mano.
        </p>
      </motion.div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2">
        {/* Riepilogo */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-card p-4">
            <div className="text-3xl font-bold">{totalConflicts}</div>
            <div className="text-[10px] font-sans uppercase tracking-widest text-muted mt-1">Conflitti di grafia</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-3xl font-bold">{auditTotal}</div>
            <div className="text-[10px] font-sans uppercase tracking-widest text-muted mt-1">Classificazioni sospette</div>
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
                  {formatIlaLabel(m.id)}
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

        {/* Audit di classificazione divinità / epiteti */}
        {(auditTotal > 0 || naPlain.length > 0) && (
          <div>
            <h3 className="font-bold text-sm mb-1">
              Classificazione divinità / epiteti
              <span className="ml-2 text-[10px] font-sans font-normal text-muted uppercase tracking-widest">
                da verificare su Lane 1971, poi correggere sullo XML
              </span>
            </h3>

            {naRelated.length > 0 && (
              <div className="space-y-3 mt-3">
                <div className="text-[10px] font-sans uppercase tracking-widest text-muted/70">
                  Probabile stessa divinità in forma variante ({naRelated.length}) — mai attestata da sola e con token in comune con un teonimo co-presente
                </div>
                {naRelated.map(d => (
                  <div key={d.name} className="rounded-xl border border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/10 backdrop-blur-md p-4 shadow-sm">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-serif text-sm font-semibold">{d.name}</span>
                      <span className="text-[10px] text-muted">×{d.count} · confronta con: <span className="text-amber-700/90 font-semibold">{d.relatedNames.join(', ')}</span></span>
                    </div>
                    <IdChips ids={d.monumentIds} />
                  </div>
                ))}
              </div>
            )}

            {naPlain.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] font-sans uppercase tracking-widest text-muted/70 mb-2">
                  Mai attestate da sole ({naPlain.length}) — informativo: in un corpus incentrato su Men è atteso anche per divinità reali
                </div>
                <div className="flex flex-wrap gap-2">
                  {naPlain.map(d => (
                    <span key={d.name} className="text-xs font-sans rounded border border-border/50 px-2 py-1 text-muted">
                      {d.name} <span className="text-[10px]">×{d.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {audit.divVsEpi.length > 0 && (
              <div className="space-y-3 mt-4">
                <div className="text-[10px] font-sans uppercase tracking-widest text-muted/70">
                  Stessa forma usata sia come divinità sia come epiteto ({audit.divVsEpi.length})
                </div>
                {audit.divVsEpi.map(t => (
                  <div key={t.key} className="rounded-xl border border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/10 backdrop-blur-md p-4 shadow-sm space-y-2">
                    <div>
                      <span className="text-[10px] font-sans uppercase tracking-widest text-amber-700/80">come divinità: </span>
                      <span className="font-serif text-sm font-semibold">{t.asDivinita.form}</span>
                      <div className="mt-1"><IdChips ids={t.asDivinita.monumentIds} /></div>
                    </div>
                    <div>
                      <span className="text-[10px] font-sans uppercase tracking-widest text-amber-700/80">come epiteto: </span>
                      <span className="font-serif text-sm font-semibold">{t.asEpiteto.form}</span>
                      <div className="mt-1"><IdChips ids={t.asEpiteto.monumentIds} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {audit.sharedEpithets.length > 0 && (
          <div>
            <h3 className="font-bold text-sm mb-1">
              Epiteti condivisi da più divinità
              <span className="ml-2 text-[10px] font-sans font-normal text-muted uppercase tracking-widest">
                {audit.sharedEpithets.length} · informativo — genuinamente condivisi o contaminazione da co-occorrenza
              </span>
            </h3>
            <div className="space-y-3 mt-3">
              {audit.sharedEpithets.map(s => (
                <div key={s.epiteto} className="rounded-xl border border-border/60 bg-white/30 dark:bg-black/10 p-4">
                  <div className="font-serif text-sm font-semibold mb-2">{s.epiteto}</div>
                  <div className="space-y-1.5">
                    {s.divinita.map(d => (
                      <div key={d.name} className="flex flex-wrap items-baseline gap-2">
                        <span className="text-xs font-sans text-muted min-w-[8rem]">{d.name} <span className="text-[10px]">×{d.monumentIds.length}</span></span>
                        <IdChips ids={d.monumentIds} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
const RAIL_ITEMS: { view: AppView; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { view: 'home', label: 'Home', icon: <MoonDisc illum={RAIL_HOME_MOON.illum} waxing={RAIL_HOME_MOON.waxing} size={16} opacity={0.7} /> },
  { view: 'catalog', label: 'Catalogo', icon: <Book className="h-4 w-4" /> },
  { view: 'map', label: 'Mappa', icon: <MapPin className="h-4 w-4" /> },
  { view: 'timeline', label: 'Cronologia', icon: <Clock className="h-4 w-4" /> },
  { view: 'stats', label: 'Statistiche Epiteti', icon: <BarChart2 className="h-4 w-4" /> },
  { view: 'heatmap', label: 'Heatmap', icon: <Columns className="h-4 w-4" /> },
  { view: 'cult', label: 'Lessico cultuale', icon: <Tags className="h-4 w-4" /> },
  { view: 'health', label: 'Coerenza', icon: <Check className="h-4 w-4" />, adminOnly: true },
  { view: 'flags', label: 'Registro', icon: <NotebookPen className="h-4 w-4" />, adminOnly: true },
  { view: 'bugs', label: 'Bug', icon: <Bug className="h-4 w-4" />, adminOnly: true },
  { view: 'biblio', label: 'Bibliografia', icon: <BookMarked className="h-4 w-4" />, adminOnly: true },
  { view: 'editor', label: 'Editor XML', icon: <Feather className="h-4 w-4" /> },
  // Pannello di revisione draft: dipende dalla cartella drafts/ (solo
  // lettura, popolata dalla pipeline locale) — non disponibile sulla build
  // GitHub Pages, che non ha accesso a quel filesystem.
  ...(isStaticBuild ? [] : [{ view: 'review' as const, label: 'Revisione Draft', icon: <GitCompare className="h-4 w-4" /> }]),
];

// Sotto la soglia `md` (768px) di Tailwind, la rail verticale lascia il posto a una barra inferiore.
function useIsDesktop(breakpointPx = 768) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= breakpointPx : true
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpointPx]);
  return isDesktop;
}

function IconRail({
  activeView, onNavigate, theme, setTheme, isDarkModeActive,
  showSettings, setShowSettings, currentUser, loginWithGoogle, logout,
  editingUnlocked, onUnlockClick, onLockClick, effectiveAdmin,
}: {
  activeView: AppView; onNavigate: (v: AppView) => void;
  theme: 'light' | 'dark' | 'system'; setTheme: (t: 'light' | 'dark' | 'system') => void; isDarkModeActive: boolean;
  showSettings: boolean; setShowSettings: (v: boolean | ((s: boolean) => boolean)) => void;
  currentUser: User | null; loginWithGoogle: () => void; logout: () => void;
  editingUnlocked: boolean; onUnlockClick: () => void; onLockClick: () => void;
  effectiveAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDesktop = useIsDesktop();
  // Registro e Bug sono voci riservate: nascoste finché l'editing non è
  // sbloccato, non solo di sola lettura (vedi RegistroForm/BugReportsPanel).
  const railItems = useMemo(() => RAIL_ITEMS.filter(item => !item.adminOnly || effectiveAdmin), [effectiveAdmin]);

  // Fase lunare reale: ciclo sinodico medio 29.53059 giorni, ancorato al novilunio del 6 gen 2000 18:14 UTC
  const moon = useMemo(() => getMoonPhase(), []);

  if (!isDesktop) {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-50 h-14 flex items-stretch bg-[var(--card)]/95 dark:bg-[var(--card)]/90 backdrop-blur-xl border-t border-border/40 shadow-[0_-4px_24px_-8px_rgba(var(--shadow-color),0.15)] overflow-x-auto overflow-y-hidden custom-scrollbar">
        {railItems.map(item => {
          const active = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              title={item.label}
              className={cn(
                "flex flex-col items-center justify-center gap-1 shrink-0 w-16 h-full relative transition-colors",
                active ? "text-accent" : "text-muted"
              )}
            >
              {active && (
                <motion.span
                  layoutId="rail-active-indicator-mobile"
                  className="absolute top-0 inset-x-3 h-[3px] rounded-full bg-accent"
                  transition={SPRING_SNAPPY}
                />
              )}
              <span className="w-4 h-4 shrink-0 flex items-center justify-center">{item.icon}</span>
              <span className="text-[8px] font-sans font-bold uppercase tracking-wide leading-none truncate max-w-[56px]">{item.label}</span>
            </button>
          );
        })}

        <div className="self-stretch my-3 w-px shrink-0 bg-border/40" />

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={isDarkModeActive ? "Modalità Giorno" : "Modalità Notte"}
          className="flex flex-col items-center justify-center gap-1 shrink-0 w-16 h-full text-muted"
        >
          <span className="w-4 h-4 shrink-0 flex items-center justify-center">
            {isDarkModeActive ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </span>
          <span className="text-[8px] font-sans font-bold uppercase tracking-wide leading-none">Tema</span>
        </button>

        <button
          onClick={() => setShowSettings(s => !s)}
          title="Impostazioni"
          className={cn("flex flex-col items-center justify-center gap-1 shrink-0 w-16 h-full", showSettings ? "text-accent" : "text-muted")}
        >
          <span className="w-4 h-4 shrink-0 flex items-center justify-center"><Settings className="h-4 w-4" /></span>
          <span className="text-[8px] font-sans font-bold uppercase tracking-wide leading-none">Impostaz.</span>
        </button>

        {/* Sulla build statica non c'e' login Google: l'accesso in scrittura
            e' gia' autorizzato da password+PAT GitHub (vedi effectiveAdmin). */}
        {!isStaticBuild && (
          <button
            onClick={currentUser ? logout : loginWithGoogle}
            title={currentUser ? (currentUser.email === ADMIN_EMAIL ? "Admin — Disconnetti" : `${currentUser.email} — Disconnetti`) : "Accedi come amministratore"}
            className="flex flex-col items-center justify-center gap-1 shrink-0 w-16 h-full text-muted"
          >
            <span className="w-4 h-4 shrink-0 flex items-center justify-center">
              {currentUser ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            </span>
            <span className="text-[8px] font-sans font-bold uppercase tracking-wide leading-none">{currentUser ? 'Esci' : 'Accedi'}</span>
          </button>
        )}

        {/* Sblocco modifica per token GitHub — solo sulla build statica: il
            gate password da sola apre il sito in sola lettura (snapshot). */}
        {isStaticBuild && (
          <button
            onClick={editingUnlocked ? onLockClick : onUnlockClick}
            title={editingUnlocked ? "Modifica sbloccata — blocca di nuovo" : "Sblocca modifica con token GitHub"}
            className={cn("flex flex-col items-center justify-center gap-1 shrink-0 w-16 h-full", editingUnlocked ? "text-accent" : "text-muted")}
          >
            <span className="w-4 h-4 shrink-0 flex items-center justify-center">
              {editingUnlocked ? <Unlock className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            </span>
            <span className="text-[8px] font-sans font-bold uppercase tracking-wide leading-none">{editingUnlocked ? 'Sbloccato' : 'Sblocca'}</span>
          </button>
        )}
      </nav>
    );
  }

  return (
    <>
      {/* Overlay per chiudere cliccando fuori */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm"
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
        transition={{ duration: 0.16, ease: EASE_OUT }}
        className="glass-panel fixed inset-y-0 left-0 z-50 flex flex-col items-stretch !rounded-none border-r overflow-hidden"
      >
        <div className={cn("flex items-center h-14 shrink-0 gap-2", expanded ? "px-4 justify-start" : "justify-center")}>
          <img src={ilaLogo} alt="ILA" className="h-8 w-8 shrink-0 object-contain" />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-bold tracking-[0.15em] text-accent whitespace-nowrap"
                style={{ fontFamily: '"Cinzel", serif' }}
              >
                ILA
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 flex flex-col gap-1 px-2 py-2 overflow-y-auto">
          {railItems.map(item => {
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

          {/* Sulla build statica non c'e' login Google: l'accesso in scrittura
              e' gia' autorizzato da password+PAT GitHub (vedi effectiveAdmin). */}
          {!isStaticBuild && (
            <button
              onClick={currentUser ? logout : loginWithGoogle}
              title={currentUser ? (currentUser.email === ADMIN_EMAIL ? "Admin — Disconnetti" : `${currentUser.email} — Disconnetti`) : "Accedi come amministratore"}
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
                    {currentUser ? (currentUser.email === ADMIN_EMAIL ? 'Admin' : currentUser.email) : 'Accedi'}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}

          {isStaticBuild && (
            <button
              onClick={editingUnlocked ? onLockClick : onUnlockClick}
              title={editingUnlocked ? "Modifica sbloccata — blocca di nuovo" : "Sblocca modifica con token GitHub"}
              className={cn("flex items-center gap-3 h-10 px-3 rounded-lg shrink-0 hover:bg-accent/5 transition-colors", editingUnlocked ? "text-accent" : "text-muted hover:text-accent")}
            >
              <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                {editingUnlocked ? <Unlock className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
              </span>
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}
                    className="text-[11px] font-sans font-bold uppercase tracking-widest whitespace-nowrap truncate"
                  >
                    {editingUnlocked ? 'Modifica sbloccata' : 'Sblocca modifica'}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
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

function HomeView({ monumenti, onNavigate, onSearch, effectiveAdmin }: { monumenti: Monumento[], onNavigate: (view: AppView) => void, onSearch: (q: string) => void, effectiveAdmin: boolean }) {
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

  const allSections: { view: AppView; label: string; desc: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { view: 'map', label: 'Mappa', desc: 'I siti di ritrovamento, geolocalizzati sul territorio antico.', icon: <MapPin className="h-5 w-5" /> },
    { view: 'timeline', label: 'Cronologia', desc: 'Le iscrizioni disposte lungo la sequenza temporale.', icon: <Clock className="h-5 w-5" /> },
    { view: 'stats', label: 'Statistiche Epiteti', desc: 'Frequenza e distribuzione degli epiteti di Men.', icon: <BarChart2 className="h-5 w-5" /> },
    { view: 'heatmap', label: 'Heatmap Co-occorrenze', desc: 'Quali epiteti e attributi ricorrono insieme.', icon: <Columns className="h-5 w-5" /> },
    { view: 'cult', label: 'Lessico cultuale', desc: 'Il vocabolario delle funzioni cultuali marcato nelle edizioni, per lemma e famiglia.', icon: <Tags className="h-5 w-5" /> },
    { view: 'health', label: 'Coerenza', desc: "Controlli di qualità e coerenza sui dati del corpus.", icon: <Check className="h-5 w-5" />, adminOnly: true },
    { view: 'flags', label: 'Registro', desc: 'Lavorazioni in corso dei collaboratori sulle schede del catalogo.', icon: <NotebookPen className="h-5 w-5" />, adminOnly: true },
    { view: 'bugs', label: 'Bug', desc: 'Problemi di funzionamento segnalati dai collaboratori.', icon: <Bug className="h-5 w-5" />, adminOnly: true },
    { view: 'biblio', label: 'Bibliografia', desc: 'Censimento delle diciture bibliografiche e modifica in blocco.', icon: <BookMarked className="h-5 w-5" />, adminOnly: true },
    { view: 'editor', label: 'Editor XML', desc: 'Modifica le schede EpiDoc sezione per sezione, con riscrittura chirurgica.', icon: <Feather className="h-5 w-5" /> },
  ];
  const sections = allSections.filter(s => !s.adminOnly || effectiveAdmin);

  const launchCard = (view: AppView) => {
    setLaunching(view);
    setLaunchStage('lit');
    setTimeout(() => setLaunchStage('zoom'), 620);
    setTimeout(() => onNavigate(view), 620 + 350);
  };

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar"
      style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}
    >
    <div className="w-full max-w-[1440px] mx-auto px-6 md:px-10 lg:px-14 pt-8 md:pt-10 lg:pt-12 pb-6">
      {/* Hero: narrativa+ricerca a sinistra, wordmark a bilanciare lo spazio a destra */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 items-center mb-8">
        <div>
          <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-2">Benvenuto</div>
          <p className="text-base md:text-lg font-serif italic text-ink/85 leading-relaxed max-w-2xl mb-4">
            Il database raccoglie al momento {stats.totale} schede in {stats.citta} località del mondo antico.
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
          <p className="text-sm font-sans font-bold uppercase tracking-[0.15em] text-muted/50">Database Epigrafico</p>
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
        className="relative w-full mb-8 text-left group overflow-hidden rounded-2xl"
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
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-10 px-7 py-8 md:px-12 md:py-10 text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10 flex-1">
            <motion.div
              className="relative w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-full bg-white/10 text-white flex items-center justify-center ring-1 ring-white/25 group-hover:bg-white/20 group-hover:ring-white/40 transition-all self-start md:self-auto shadow-inner"
              animate={launching === 'catalog' && launchStage === 'lit' ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              {React.cloneElement(heroSection.icon as React.ReactElement, { className: 'h-7 w-7 md:h-8 md:w-8 text-white/90' })}
            </motion.div>

            <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/25 to-transparent hidden md:block shrink-0" />

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="text-[9px] md:text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-white/60 mb-2 md:mb-1">Punto di partenza</div>
              <div className="font-serif font-bold text-white text-3xl md:text-4xl mb-2 md:mb-2 leading-tight tracking-tight">{heroSection.label}</div>
              <p className="text-sm md:text-base text-white/70 leading-relaxed max-w-lg">{heroSection.desc}</p>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center shrink-0 pl-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white/15 group-hover:border-white/50 transition-all">
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </div>
          <ChevronRight className="md:hidden absolute right-6 top-10 h-6 w-6 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
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
        className="relative z-10 text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-4"
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
                  <p className="text-[11px] text-muted leading-snug min-h-[2.5em]">{s.desc}</p>
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
    </div>
  );
}

// Conversione in numerale romano per le etichette dei secoli (dominio ridotto: corpus antico)
function toRoman(num: number): string {
  const vals: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let n = num, out = '';
  for (const [v, s] of vals) { while (n >= v) { out += s; n -= v; } }
  return out;
}

// Cascata cronologica in stile Gantt: ogni scheda è una barra ancorata alla propria
// data reale (mai spostata orizzontalmente) e lunga quanto il proprio intervallo di
// datazione. Le barre che si sovrappongono nel tempo scendono nella prima corsia
// libera sotto di loro — un impaccamento a intervalli letto dall'alto in basso, non
// un raggruppamento che nasconde schede né diramazioni curve.
function Timeline({ monumenti, onSelect, paused = false }: { monumenti: Monumento[], onSelect: (m: Monumento) => void, paused?: boolean }) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const axisRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomAnchorRef = useRef<{ year: number; clientX: number } | null>(null);
  const didFitRef = useRef(false);

  // Il floor dello zoom non è più un valore fisso bassissimo: coincide con lo zoom della
  // vista di default (panoramica, calcolato in computeFitZoom), aggiornato lì sotto — non
  // ha senso poter rimpicciolire oltre "si vede già tutto". Il tetto è un valore ragionevole
  // per la lettura ravvicinata, non il limite tecnico della transizione CSS.
  const minZoomRef = useRef(0.08);
  const ZOOM_MAX = 3;
  // Sotto questa soglia di zoom la vista è "panoramica" (blocchi compatti per secolo, con
  // solo un conteggio) — sopra è "di dettaglio" (la cascata di barre con testo). Non sono
  // due modalità separate da un pulsante: la soglia divide un unico continuo di zoom, così
  // zoomare avanti o indietro (rotellina, pulsanti, o click su un secolo) passa dall'una
  // all'altra senza scatti.
  // Zoom di dettaglio fisso a cui porta il click su un secolo: abbastanza per distinguere
  // le singole schede, non tanto da farne stare solo un paio a schermo — l'obiettivo è
  // capire la distribuzione del secolo, non necessariamente leggere ogni nome (per quello
  // c'è comunque lo zoom manuale). Deve restare >= 1 (soglia di isOverview) o il click
  // non farebbe uscire dalla vista panoramica.
  const DETAIL_ZOOM = 1;
  const OVERVIEW_ZOOM_CAP = 0.95;

  const sorted = useMemo(() => {
    return monumenti
      .filter(m => m.data_inizio !== undefined)
      .sort((a, b) => (a.data_inizio || 0) - (b.data_inizio || 0));
  }, [monumenti]);

  // Dominio cronologico dell'asse: derivato dai dati reali (con un secolo di margine per lato).
  const { yearMin, yearMax } = useMemo(() => {
    if (sorted.length === 0) return { yearMin: -400, yearMax: 400 };
    const years = sorted.map(m => m.data_inizio || 0);
    const dataMin = Math.min(...years);
    const dataMax = Math.max(...years);
    return {
      yearMin: Math.floor(dataMin / 100) * 100 - 100,
      yearMax: Math.ceil(dataMax / 100) * 100 + 100,
    };
  }, [sorted]);
  const yearSpan = yearMax - yearMin;

  // Scala cronologica di base (px/anno) — è anche la scala di LAYOUT, fissa e indipendente
  // dallo zoom: la cascata viene disegnata UNA volta a questa scala fissa, come un'immagine;
  // lo zoom è una trasformazione CSS animata applicata sopra, non un ricalcolo del layout.
  const LAYOUT_PX_PER_YEAR = 3.4;
  const BASE_PX_PER_YEAR = LAYOUT_PX_PER_YEAR;
  const pxPerYear = LAYOUT_PX_PER_YEAR * zoom;
  const naturalWidth = yearSpan * LAYOUT_PX_PER_YEAR;
  const yearToLeft = (year: number) => (year - yearMin) * LAYOUT_PX_PER_YEAR;

  const centuryTicks = useMemo(() => {
    const startC = Math.floor(yearMin / 100);
    const endC = Math.ceil(yearMax / 100);
    const ticks: number[] = [];
    for (let c = startC; c <= endC; c++) ticks.push(c);
    return ticks;
  }, [yearMin, yearMax]);

  // In vista panoramica ogni secolo mostra solo un conteggio, non le singole barre.
  const countByCentury = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of sorted) {
      const c = Math.floor((m.data_inizio ?? 0) / 100);
      map.set(c, (map.get(c) || 0) + 1);
    }
    return map;
  }, [sorted]);

  const isOverview = zoom < 1;

  // In panoramica la cascata è disegnata a scala di layout fissa e poi rimpicciolita
  // da `transform: scale(zoom)` (zoom di fit ~0.3 per un corpus di ~10 secoli). Le
  // etichette dei secoli e i pallini del conteggio sono pensati "grandi", ma quel
  // transform li schiacciava a ~7px, illeggibili. Qui li contro-scaliamo di 1/zoom
  // così tornano alla dimensione dichiarata a schermo, indipendente dallo zoom.
  const overviewScale = isOverview && zoom > 0 ? 1 / zoom : 1;

  // Geometria della cascata: RULE_Y separa le intestazioni dei secoli (sempre in cima,
  // come le colonne di fase di un diagramma di Gantt) dalle barre; CASCADE_TOP è dove
  // inizia la prima corsia.
  const RULE_Y = 36;
  const CASCADE_TOP = RULE_Y + 12;
  const ROW_H = 30;
  const BAR_H = 22;
  const MIN_BAR_WIDTH = 86;
  const BAR_GAP = 8;

  // Impaccamento a intervalli (come le "righe" di un Gantt): si scorre l'elenco già
  // ordinato per data di inizio e ogni barra va nella prima corsia il cui ultimo
  // occupante finisce prima che questa inizi — mai spostata orizzontalmente, solo
  // spinta in una corsia più bassa quando si sovrappone nel tempo a chi la precede.
  const bars = useMemo(() => {
    const laneEdges: number[] = [];
    return sorted.map(m => {
      const start = m.data_inizio ?? 0;
      const end = m.data_fine ?? start;
      const left = yearToLeft(start);
      const rawWidth = yearToLeft(end) - left;
      const width = Math.max(MIN_BAR_WIDTH, rawWidth);
      let lane = laneEdges.findIndex(edge => left >= edge);
      if (lane === -1) lane = laneEdges.length;
      laneEdges[lane] = left + width + BAR_GAP;
      return { m, left, width, lane };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, yearMin]);

  const laneCount = useMemo(() => bars.reduce((max, b) => Math.max(max, b.lane + 1), 0), [bars]);
  // In vista panoramica basta lo spazio per l'intestazione e il pallino del conteggio —
  // niente corsie di barre, quindi un'altezza fissa invece di quella della cascata. È
  // generosa perché in panoramica etichette e pallini sono ingranditi (vedi sotto).
  const OVERVIEW_HEIGHT = RULE_Y + 128;
  const cascadeHeight = isOverview ? OVERVIEW_HEIGHT : CASCADE_TOP + Math.max(1, laneCount) * ROW_H + 24;

  const axisWidth = Math.max(600, naturalWidth + 40);

  const formatHoverYear = (y: number) => (y < 0 ? `${Math.abs(y)} a.C.` : y === 0 ? '1 d.C.' : `${y} d.C.`);
  const hoverYear = hoverX !== null ? Math.round(yearMin + hoverX / LAYOUT_PX_PER_YEAR) : null;

  const handleAxisMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!axisRef.current) return;
    const rect = axisRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    setHoverX(Math.max(0, Math.min(axisWidth, screenX / zoom)));
  };
  const handleAxisMouseLeave = () => setHoverX(null);

  // Ctrl/Cmd + rotellina (o pizzico sul trackpad) zooma l'asse mantenendo fermo sotto
  // il cursore l'anno su cui si trovava il mouse.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (!axisRef.current) return;
      const rect = axisRef.current.getBoundingClientRect();
      const cursorXInAxis = e.clientX - rect.left;
      const currentYear = yearMin + cursorXInAxis / pxPerYear;
      zoomAnchorRef.current = { year: currentYear, clientX: e.clientX };
      // Fattore per singolo "tick" di rotellina/pizzico: era 1.15, troppo sensibile — con
      // un trackpad bastavano un paio di scatti per sballare lo zoom di parecchio. Ridotto
      // drasticamente: ogni passo cambia lo zoom solo del 3%, quindi serve un gesto più
      // lungo e deliberato per arrivare a un livello di zoom significativo.
      const factor = e.deltaY < 0 ? 1.03 : 1 / 1.03;
      setZoom(z => Math.min(ZOOM_MAX, Math.max(minZoomRef.current, z * factor)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [pxPerYear, yearMin]);

  // Dopo ogni cambio di zoom, riallinea lo scroll così l'anno "ancorato" resta nella
  // stessa posizione sullo schermo.
  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current;
    const scrollEl = scrollRef.current;
    const axisEl = axisRef.current;
    if (!anchor || !scrollEl || !axisEl) return;
    scrollEl.scrollLeft = 0;
    const axisLeftAtZero = axisEl.getBoundingClientRect().left;
    const pos = (anchor.year - yearMin) * pxPerYear;
    let target = axisLeftAtZero + pos - anchor.clientX;
    target = Math.max(0, Math.min(target, scrollEl.scrollWidth - scrollEl.clientWidth));
    scrollEl.scrollLeft = target;
    zoomAnchorRef.current = null;
  }, [zoom]);

  // Calcola lo zoom "panoramico": l'intera sequenza (tutti i secoli) visibile in una volta,
  // senza mai dover scorrere — è la vista di default e quella a cui torna "Vista d'insieme".
  // A questo zoom si vedono solo i blocchi compatti per secolo (vedi isOverview), quindi non
  // serve un pavimento di leggibilità come per le barre: può scendere quanto serve.
  const computeFitZoom = () => {
    if (!scrollRef.current) return null;
    const containerWidth = scrollRef.current.clientWidth;
    if (containerWidth <= 0) return null;
    // Il contenuto vive dentro px-16 (md:px-24): il margine da sottrarre deve rispecchiare
    // quel padding reale, non una stima fissa — una stima troppo bassa (era 80, il padding
    // reale è 128-192px) lasciava l'ultimo secolo a ridosso del bordo destro del riquadro
    // mentre a sinistra il padding si vedeva per intero.
    const sidePad = (typeof window !== 'undefined' && window.innerWidth >= 768) ? 96 : 64;
    const available = Math.max(containerWidth - sidePad * 2 - 24, 120);
    const naturalAtZoom1 = yearSpan * BASE_PX_PER_YEAR;
    if (naturalAtZoom1 <= 0) return null;
    const fit = Math.min(OVERVIEW_ZOOM_CAP, Math.max(0.05, available / naturalAtZoom1));
    minZoomRef.current = fit;
    return fit;
  };

  // All'apertura della sezione, applica subito lo zoom a schermo intero.
  useLayoutEffect(() => {
    if (didFitRef.current) return;
    if (sorted.length === 0 || !scrollRef.current) return;
    didFitRef.current = true;
    const fit = computeFitZoom();
    if (fit !== null) setZoom(fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted.length, yearSpan]);

  // Zoom da pulsante: ancora sul centro della vista attualmente visibile.
  const zoomByFactor = (factor: number) => {
    if (!axisRef.current || !scrollRef.current) return;
    const scrollRect = scrollRef.current.getBoundingClientRect();
    const axisRect = axisRef.current.getBoundingClientRect();
    const viewportCenterClientX = scrollRect.left + scrollRect.width / 2;
    const cursorXInAxis = viewportCenterClientX - axisRect.left;
    const currentYear = yearMin + cursorXInAxis / pxPerYear;
    zoomAnchorRef.current = { year: currentYear, clientX: viewportCenterClientX };
    setZoom(z => Math.min(ZOOM_MAX, Math.max(minZoomRef.current, z * factor)));
  };
  const handleZoomIn = () => zoomByFactor(1.4);
  const handleZoomOut = () => zoomByFactor(1 / 1.4);
  const handleZoomReset = () => {
    zoomAnchorRef.current = null;
    setZoom(computeFitZoom() ?? 1);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  };

  // Esc come scorciatoia rapida per tornare alla vista di default — ma non
  // quando la timeline è "in pausa" (una scheda aperta sopra di lei la copre):
  // in quel caso Esc deve chiudere la scheda, non reimpostare di nascosto lo
  // zoom di una vista che l'utente non sta nemmeno guardando.
  useEffect(() => {
    if (paused) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleZoomReset();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  // Click diretto sull'asse (fuori da una barra): zoom interattivo centrato sul punto
  // cronologico cliccato. Le barre fermano la propagazione del click.
  const handleAxisClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!axisRef.current) return;
    const rect = axisRef.current.getBoundingClientRect();
    const cursorXInAxis = e.clientX - rect.left;
    const currentYear = yearMin + cursorXInAxis / pxPerYear;
    zoomAnchorRef.current = { year: currentYear, clientX: e.clientX };
    setZoom(z => Math.min(ZOOM_MAX, Math.max(minZoomRef.current, z * 1.7)));
  };

  // Click su un blocco-secolo: passa (o resta) alla vista di dettaglio ancorata su quel
  // secolo. Lo zoom va SEMPRE a un valore fisso, mai moltiplicato per quello corrente —
  // cliccare più secoli in sequenza (o lo stesso più volte) portava a uno zoom che si
  // moltiplicava ad ogni click, fino a "vedere solo un pezzetto di barra" dopo 2-3 click.
  // Il valore scelto privilegia vedere la distribuzione delle schede del secolo (anche
  // se il nome non è sempre leggibile) piuttosto che il singolo testo.
  const handleCenturyClick = (century: number, clientX: number) => {
    zoomAnchorRef.current = { year: century * 100 + 50, clientX };
    setZoom(DETAIL_ZOOM);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {sorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="text-sm font-serif italic text-muted mb-1">Nessun monumento datato nel corpus.</div>
            <p className="text-xs text-muted/70 font-sans">Le entry compariranno qui non appena verrà compilato il campo datazione (data_inizio).</p>
          </div>
        </div>
      ) : (
      /* Header rimosso: niente più titolo/sottotitolo a sé, che rubavano spazio verticale
         alla cronologia stessa. I comandi (indispensabili: senza "Vista d'insieme" non c'è
         modo di tornare alla panoramica) restano come una piccola toolbar fluttuante, fuori
         dall'area di scroll così non scorre via col contenuto. */
      <div className="relative flex-1 min-h-0">
        {sorted.length < monumenti.length && (
          <div
            className="absolute top-3 left-3 z-20 h-8 px-3 rounded-full flex items-center gap-1.5 text-[10px] font-sans font-bold text-muted bg-parchment/90 border border-border/60 shadow-sm backdrop-blur-sm"
            title={`Solo le schede con una datazione numerica (notBefore/notAfter) compaiono nella cronologia. Le altre ${monumenti.length - sorted.length} non hanno estremi cronologici sfruttabili.`}
          >
            <Clock className="h-3.5 w-3.5 text-muted/70" />
            <span className="tabular-nums text-ink">{sorted.length}</span>
            <span className="uppercase tracking-wide">di {monumenti.length} schede datate</span>
          </div>
        )}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <button
            onClick={handleZoomReset}
            className="h-8 pl-3 pr-3.5 rounded-full flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-wide text-accent bg-parchment/90 hover:bg-accent/15 border border-accent/30 shadow-sm backdrop-blur-sm transition-colors"
            title="Vista d'insieme (adatta alla finestra) — anche tasto Esc"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Vista d'insieme
          </button>
          <div className="flex items-center gap-0.5 bg-parchment/90 backdrop-blur-sm border border-border/60 rounded-full p-1 shadow-sm">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= minZoomRef.current + 0.001}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted/70 hover:bg-accent/10 hover:text-accent disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
              title="Riduci zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= ZOOM_MAX - 0.001}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted/70 hover:bg-accent/10 hover:text-accent disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
              title="Aumenta zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      {/* Niente bg-card qui: un riempimento opaco spezzava la texture/venatura di sfondo
          della pagina proprio nel riquadro più esplorato con zoom e scroll — un rettangolo
          piatto "staccato" dal resto. Il bordo e l'ombra bastano a delimitarlo, lasciando la
          texture della pagina continuare sotto (è fissa rispetto al viewport, quindi resta
          coerente qualunque sia lo zoom o lo scroll del contenuto sopra). */}
      <div ref={scrollRef} className="h-full overflow-x-auto overflow-y-auto relative custom-scrollbar min-h-0 border border-border rounded-lg shadow-sm" style={{ minHeight: 0, overflowX: 'auto' }}>
            <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="relative px-16 md:px-24 pb-8 flex flex-col"
                 style={{
                   minHeight: '100%',
                   // In vista panoramica la linea sta al CENTRO verticale della pagina
                   // (il contenuto panoramico è più basso del riquadro, quindi justify-center
                   // lo centra davvero); appena si seleziona un secolo si passa al dettaglio
                   // e la linea risale in cima, dove serve tutta l'altezza per la cascata
                   // delle barre. "Vista d'insieme" / reset zoom riportano a isOverview e
                   // quindi di nuovo al centro.
                   justifyContent: isOverview ? 'center' : 'flex-start',
                   paddingTop: isOverview ? 0 : 32,
                   transition: 'padding-top 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                 }}
            >
              {/* La cascata (intestazioni, riga, barre) viene disegnata UNA volta sola a una
                  scala di layout fissa — non cambia mai forma in base allo zoom. Lo zoom è
                  una trasformazione CSS animata applicata qui sopra. */}
              {/* Questo contenitore riserva lo spazio scrollabile: la sua width/height NON è
                  animata (a differenza del transform sotto) perché è proprio da qui che si
                  legge scrollWidth per ricalcolare lo scroll dopo uno zoom (vedi l'effetto su
                  [zoom]) — se fosse in transizione, nel momento esatto in cui il layout viene
                  misurato risulterebbe ancora alla larghezza precedente, "ancorando" lo zoom in
                  un punto sbagliato (visto succedere cliccando un secolo lontano dall'inizio
                  dell'asse: lo scroll restava vicino a zero invece di seguire il secolo cliccato). */}
              <div
                className="relative shrink-0"
                style={{
                  width: axisWidth * zoom,
                  height: cascadeHeight * zoom,
                }}
              >
              <div
                className="absolute left-0 top-0"
                style={{
                  width: axisWidth,
                  height: cascadeHeight,
                  transform: `scale(${zoom})`,
                  transformOrigin: '0 0',
                  transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
              <div
                ref={axisRef}
                onMouseMove={handleAxisMouseMove}
                onMouseLeave={handleAxisMouseLeave}
                onClick={handleAxisClick}
                className="absolute cursor-zoom-in"
                style={{ left: 0, top: 0, width: axisWidth, height: cascadeHeight }}
              >
                {/* Intestazioni dei secoli: tacca accento + etichetta in maiuscolo, sempre in
                    cima — come le colonne di fase di un diagramma di Gantt — con una guida
                    verticale tratteggiata che scende lungo tutta la cascata sottostante. Il
                    blocco è cliccabile per intero (in vista panoramica mostra il conteggio al
                    posto delle barre) e riporta SEMPRE allo zoom fisso di dettaglio — anche se
                    già in dettaglio, cliccare qui è il modo per uscire da uno zoom eccessivo
                    invece di continuare a moltiplicarlo (vedi handleCenturyClick). Le barre,
                    sopra di esso in z-index, restano cliccabili normalmente. */}
                {centuryTicks.slice(0, -1).map(c => {
                  const bandLeft = yearToLeft(c * 100);
                  const bandRight = yearToLeft((c + 1) * 100);
                  const bandWidth = bandRight - bandLeft;
                  const centuryNum = c < 0 ? -c : c + 1;
                  const era = c < 0 ? 'a.C.' : 'd.C.';
                  // In panoramica le colonne sono strette e le etichette, contro-scalate a
                  // dimensione fissa, si accavallavano: qui la forma compatta ("V a.C.")
                  // senza "sec.". In dettaglio le colonne sono larghe → forma estesa.
                  const label = isOverview ? `${toRoman(centuryNum)} ${era}` : `${toRoman(centuryNum)} sec. ${era}`;
                  const count = countByCentury.get(c) || 0;
                  return (
                    <div
                      key={`head-${c}`}
                      className={`absolute ${count > 0 ? 'cursor-zoom-in hover:bg-accent/[0.06]' : ''} transition-colors`}
                      style={{ left: bandLeft, width: bandWidth, top: 0, height: cascadeHeight }}
                      onClick={count > 0 ? (e) => { e.stopPropagation(); handleCenturyClick(c, e.clientX); } : undefined}
                    >
                      {/* La soglia è sulla larghezza REALE a schermo (bandWidth è in px di
                          layout, va moltiplicata per lo zoom): sotto ~64px di colonna
                          l'etichetta si sovrapporrebbe a quella accanto. In dettaglio
                          (zoom >= 1) la colonna è sempre larga, quindi resta sempre visibile. */}
                      {bandWidth * zoom > (isOverview ? 58 : 64) && (
                        <div
                          className="absolute flex items-center gap-1.5"
                          style={{ left: 6, top: 3, transform: isOverview ? `scale(${overviewScale})` : undefined, transformOrigin: 'left top' }}
                        >
                          <div className={`bg-accent rounded-full shrink-0 ${isOverview ? 'w-1 h-4' : 'w-1 h-5'}`} />
                          <span className={`font-sans font-extrabold uppercase tracking-wide whitespace-nowrap ${isOverview ? 'text-[11px] text-ink/85' : 'text-[10px] text-ink/75'}`}>{label}</span>
                        </div>
                      )}
                      <div className="absolute border-l border-dashed border-border" style={{ left: 0, top: RULE_Y, bottom: 0 }} />
                      {isOverview && count > 0 && bandWidth * zoom > 40 && (
                        <div className="absolute" style={{ left: '50%', top: RULE_Y + 32, transform: 'translateX(-50%)' }}>
                          <div
                            className="rounded-full bg-accent/15 border border-accent/50 text-accent text-[13px] font-sans font-bold flex items-center justify-center"
                            style={{ minWidth: 32, height: 32, padding: '0 8px', transform: `scale(${overviewScale})`, transformOrigin: 'top center' }}
                          >
                            {count}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Riga orizzontale che separa le intestazioni dalla cascata delle barre —
                    fa anche da "asse": si accende in teal al passaggio del mouse. */}
                <div
                  className={`absolute inset-x-0 rounded-full transition-colors duration-200 pointer-events-none ${hoverX !== null ? 'bg-accent' : 'bg-ink/25'}`}
                  style={{ top: RULE_Y, height: isOverview ? 3 : 2, zIndex: 1 }}
                />

                <span className="absolute text-muted text-sm font-bold tracking-tighter select-none pointer-events-none" style={{ left: 0, top: RULE_Y, transform: 'translate(-135%, -50%)' }}>···</span>
                <span className="absolute text-muted text-sm font-bold tracking-tighter select-none pointer-events-none" style={{ left: axisWidth, top: RULE_Y, transform: 'translate(35%, -50%)' }}>···</span>

                {/* Linea guida interattiva: segue il mouse e mostra l'anno sotto il cursore. */}
                {hoverX !== null && hoverYear !== null && (
                  <div className="absolute pointer-events-none" style={{ left: hoverX, top: 0, height: cascadeHeight, transform: 'translateX(-50%)' }}>
                    <div className="w-px h-full bg-accent/40 mx-auto" style={{ backgroundImage: 'linear-gradient(to bottom, transparent, var(--accent) 10%, var(--accent) 90%, transparent)', opacity: 0.3 }} />
                    <div className="absolute left-1/2 px-2 py-0.5 rounded-full bg-ink text-parchment text-[9px] font-sans font-bold whitespace-nowrap shadow-md" style={{ top: RULE_Y, transform: 'translate(-50%, -50%)' }}>
                      {formatHoverYear(hoverYear)}
                    </div>
                  </div>
                )}

                {/* Cascata delle barre: solo in vista di dettaglio (zoom >= soglia). Ognuna
                    resta ancorata alla propria data reale e lunga quanto il proprio intervallo
                    di datazione; le sovrapposizioni nel tempo scendono di corsia invece di
                    spostare la posizione orizzontale. */}
                {!isOverview && bars.map(({ m, left, width, lane }) => (
                  <button
                    key={m.entryId || `id-${m.id}`}
                    onClick={(e) => { e.stopPropagation(); onSelect(m); }}
                    title={`#${m.id} — ${m.citta || m.regione || 'N/A'} — ${formatDateRange(m.data_inizio, m.data_fine)}`}
                    className="absolute flex items-center gap-1 px-2 rounded-sm border border-accent/30 bg-accent/10 text-[11px] font-sans font-bold text-ink hover:bg-accent/20 hover:border-accent hover:text-accent transition-colors overflow-hidden whitespace-nowrap"
                    style={{ left, top: CASCADE_TOP + lane * ROW_H, width, height: BAR_H, zIndex: 2 }}
                  >
                    <span className="text-accent shrink-0">#{m.id}</span>
                    <span className="truncate min-w-0">{m.citta || m.regione || 'N/A'}</span>
                  </button>
                ))}
              </div>
              </div>
              </div>
            </motion.div>
          </div>
      </div>
      )}
        </div>
      );
    }

// Azione risultante dal click su un termine cliccabile del testo
// dell'iscrizione (persName divine/attested, o fallback per ruler/emperor/
// placeName) — vedi EpiDocRenderer (case 'persname'/'placename') e il suo
// gestore in App (handleTermClick).
type TermClickAction =
  | { kind: 'popover-divinita'; stats: DivinityStats; rect: DOMRect }
  | { kind: 'popover-onomastica'; stats: OnomasticaStats; rect: DOMRect }
  | { kind: 'redirect-stats'; tab: 'divinita' | 'onomastica'; search: string }
  | { kind: 'redirect-catalog'; term: string };

const EpiDocRenderer = ({ xml, query, onTermClick, divinityIndex, onomasticaIndex, plain = false }: {
  xml: string;
  query: string;
  onTermClick?: (action: TermClickAction) => void;
  divinityIndex?: Record<string, DivinityStats>;
  onomasticaIndex?: Record<string, OnomasticaStats>;
  /** Modalità "trascrizione pura": nessun markup diacritico, colore o tooltip —
   *  solo le lettere e l'andamento per righe. Vedi il toggle nella finestra epigrafica. */
  plain?: boolean;
}) => {
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
      if (!collapsed.trim()) {
        // In modalità con markup la spaziatura fra parole è resa dal padding
        // dei vari <span>; in trascrizione pura quei riquadri non ci sono, così
        // uno spazio fra elementi va reso esplicitamente o le parole si toccano.
        return plain && collapsed ? ' ' : null;
      }
      return <Highlight key={key} text={collapsed} query={query} />;
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const localName = (el.localName || el.tagName || '').toLowerCase();

      // ── Modalità trascrizione pura ──────────────────────────────────────────
      // Rende il solo testo di lettura: niente parentesi editoriali, colori,
      // sottolineature, tooltip o termini cliccabili. Si conserva unicamente
      // l'andamento per righe (con numeri di riga a margine) e la scansione in
      // versi/paragrafi, perché sono riferimenti, non markup del testo.
      if (plain) {
        const children = () => Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i));
        switch (localName) {
          case 'lb': {
            const brk = el.getAttribute('break') || '';
            const ln = el.getAttribute('n') || '';
            const lineNumSpan = (
              <span
                key={key + '-n'}
                className="text-muted/40 text-[9px] select-none inline-block w-8 -ml-8 pr-2 text-right leading-none"
                style={{ fontFamily: 'monospace', fontStyle: 'normal', fontWeight: 'normal' }}
              >
                {ln}
              </span>
            );
            if (brk === 'no') return <span key={key}><br />{lineNumSpan}</span>;
            if (ln === '1') return <span key={key}>{lineNumSpan}</span>;
            return <span key={key}><br />{lineNumSpan}</span>;
          }
          case 'expan': {
            // <abbr>X</abbr><ex>yz</ex> → forma sciolta senza parentesi: "Xyz"
            return <span key={key}>{el.textContent || ''}</span>;
          }
          case 'choice': {
            // Testo di lettura: si tiene la forma corretta/normalizzata,
            // non entrambe le varianti.
            const pick = ['corr', 'reg', 'sic', 'orig']
              .map(t => Array.from(el.children).find(c => (c.localName || c.tagName || '').toLowerCase() === t))
              .find(Boolean) || el.firstElementChild;
            return <span key={key}>{pick ? (pick.textContent || '') : ''}</span>;
          }
          case 'gap':
            return <span key={key} className="text-muted/50"> — </span>;
          case 'space':
            return <span key={key}> </span>;
          case 'surplus':
          case 'head':
            return null;
          case 'div':
          case 'p':
          case 'ab':
          case 'lg':
            return <div key={key} className="mb-2">{children()}</div>;
          case 'l':
            return <div key={key}>{children()}</div>;
          default:
            return <span key={key}>{children()}</span>;
        }
      }
      // ───────────────────────────────────────────────────────────────────────

      const nAttr = el.getAttribute('n') || '';
      const typeAttr = el.getAttribute('type') || '';
      const keyAttr = el.getAttribute('key') || '';
      const nymRefAttr = el.getAttribute('nymRef') || el.getAttribute('nymref') || '';
      const refAttr = el.getAttribute('ref') || '';
      const reasonAttr = el.getAttribute('reason') || '';
      const quantityAttr = el.getAttribute('quantity') || '';
      const breakAttr = el.getAttribute('break') || '';
      const lemmaAttr = el.getAttribute('lemma') || '';
      const anaAttr = el.getAttribute('ana') || '';
      const certAttr = el.getAttribute('cert') || '';
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

          // Markup cliccabile: divinità/nomi attestati aprono un popover di
          // statistiche (con redirect alla pagina Statistiche Epiteti come
          // fallback se il termine non è nell'indice); sovrani/imperatori
          // non hanno ancora una vista statistiche dedicata, quindi vanno
          // dritti al fallback "filtra il catalogo" (stesso comportamento
          // delle pill nel pannello Iconografia).
          let onClick: ((e: React.MouseEvent) => void) | undefined;
          if (onTermClick && keyAttr) {
            if (typeAttr === 'divine') {
              const nameChildCount = Array.from(el.children).filter(
                c => (c.localName || c.tagName || '').toLowerCase() === 'name'
              ).length;
              const { divinity } = splitDivineKey(keyAttr, nameChildCount);
              onClick = (e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const stats = divinity ? divinityIndex?.[divinity] : undefined;
                if (stats) onTermClick({ kind: 'popover-divinita', stats, rect });
                else onTermClick({ kind: 'redirect-stats', tab: 'divinita', search: divinity || keyAttr });
              };
            } else if (typeAttr === 'attested') {
              onClick = (e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const stats = onomasticaIndex?.[keyAttr];
                if (stats) onTermClick({ kind: 'popover-onomastica', stats, rect });
                else onTermClick({ kind: 'redirect-stats', tab: 'onomastica', search: keyAttr });
              };
            } else if (typeAttr === 'ruler' || typeAttr === 'emperor') {
              onClick = (e) => {
                e.stopPropagation();
                onTermClick({ kind: 'redirect-catalog', term: keyAttr });
              };
            }
          }
          if (onClick) {
            className += ' cursor-pointer';
          }

          return (
            <span
              key={key}
              className={className}
              data-epidoc-tooltip={tooltipLabel}
              onClick={onClick}
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

          // Nessuna vista statistiche dedicata ai luoghi: il click va
          // dritto al fallback "filtra il catalogo", come per ruler/emperor.
          const placeTerm = keyAttr || refAttr || (el.textContent || '').trim();
          const onClick = onTermClick && placeTerm
            ? (e: React.MouseEvent) => { e.stopPropagation(); onTermClick({ kind: 'redirect-catalog', term: placeTerm }); }
            : undefined;
          if (onClick) className += ' cursor-pointer';

          return (
            <span
              key={key}
              className={className}
              data-epidoc-tooltip={tooltipText}
              onClick={onClick}
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
        case 'w': {
          // Lessico di funzione cultuale (tassonomia cult-functions) — malva/lilla.
          // In ILA <w> marca SOLO questo layer, mai la tokenizzazione integrale.
          const fam = anaAttr.replace(/#/g, ' ').trim();
          const tip = `${lemmaAttr ? `Lemma: ${lemmaAttr}` : 'Parola marcata'}${fam ? ` — ${fam}` : ''}`;
          return (
            <span
              key={key}
              className={`text-cult hover:bg-black/5 dark:hover:bg-white/5 transition-colors px-0.5 rounded cursor-help inline${certAttr === 'low' ? ' opacity-70' : ''}`}
              data-epidoc-tooltip={tip}
            >
              {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
            </span>
          );
        }
        case 'rs': {
          let className = 'italic hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors px-0.5 rounded cursor-help inline';
          let tooltipText = 'Termine semantico';
          if (typeAttr === 'cultTerm' || typeAttr === 'cultFormula') {
            const fam = anaAttr.replace(/#/g, ' ').trim();
            return (
              <span
                key={key}
                className="text-cult hover:bg-black/5 dark:hover:bg-white/5 transition-colors px-0.5 rounded cursor-help inline"
                data-epidoc-tooltip={`Funzione cultuale${keyAttr ? `: ${keyAttr}` : ''}${fam ? ` (${fam})` : ''}`}
              >
                {Array.from(node.childNodes).map((child: any, i) => renderNode(child, key + '-' + i))}
              </span>
            );
          }
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
      style={{ fontFamily: 'var(--font-greek)', fontSize: 'inherit' }}
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


// Popover contestuale aperto dal click su una divinità o un nome attestato
// nel testo dell'iscrizione (EpiDocRenderer) — statistiche rapide con un
// pulsante per espandere alla pagina Statistiche Epiteti completa. Stile
// coerente con la pillola di navigazione glass/blur introdotta nel redesign
// dei pannelli scheda (.nav-pill-active, vedi index.css).
const TermStatsPopover = ({ action, onExpand, onClose }: {
  action: Extract<TermClickAction, { kind: 'popover-divinita' | 'popover-onomastica' }>;
  onExpand: () => void;
  onClose: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  const { rect } = action;
  const width = 280;
  const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8);
  const top = rect.bottom + 8;

  return (
    <div
      ref={ref}
      className="term-stats-popover fixed z-50 rounded-xl p-4 font-sans"
      style={{ left, top, width }}
    >
      {action.kind === 'popover-divinita' ? (
        <>
          <div className="text-lg italic font-bold text-accent font-serif leading-tight">{action.stats.name}</div>
          <div className="text-xs text-muted mt-1">
            {action.stats.count}× attestata · {action.stats.regions} region{action.stats.regions === 1 ? 'e' : 'i'}
          </div>
          {action.stats.epiteti.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {action.stats.epiteti.slice(0, 5).map(e => (
                <span key={e.name} className="border border-accent/20 bg-accent/5 text-accent px-2 py-0.5 text-[11px] italic rounded-full font-serif">
                  {e.name} <span className="opacity-60">{e.count}×</span>
                </span>
              ))}
            </div>
          )}
          <button onClick={onExpand} className="mt-3 text-xs font-bold text-accent hover:underline">
            Vedi tutte le statistiche →
          </button>
        </>
      ) : (
        <>
          <div className="text-lg font-serif font-semibold text-ink leading-tight">{action.stats.name}</div>
          <div className="text-xs text-muted mt-1">
            {action.stats.count}× attestato{action.stats.regions.length > 0 ? ` · ${action.stats.regions.join(', ')}` : ''}
          </div>
          <button onClick={onExpand} className="mt-3 text-xs font-bold text-accent hover:underline">
            Vedi tutte le attestazioni →
          </button>
        </>
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

// Stato iniziale dei filtri del catalogo — riusato sia dall'useState che dai
// due pulsanti di azzeramento (quello rapido accanto alla barra di ricerca e
// il "Reset Filtri" in fondo alla tendina), così restano sempre allineati.
const DEFAULT_FILTERS: FilterState = {
  searchText: '',
  regione: '',
  citta: '',
  tipo: '',
  materiale: '',
  iconAttributo: '',
  iconFunzione: '',
  iconPosizione: '',
  onlyInscr: false,
  onlyAnep: false,
  onlyHasTrad: false,
  onlyNoTrad: false,
  dateRange: [-500, 500],
  searchMode: 'AND',
};

export default function App({ skipLanding = false }: { skipLanding?: boolean } = {}) {
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
  // Indici divinità/onomastica calcolati una volta sul corpus intero, riusati
  // sia dalla pagina Statistiche Epiteti sia dal popover contestuale aperto
  // cliccando un termine nel testo dell'iscrizione (vedi lib/epithetIndex.ts).
  const divinityIndex = useMemo(() => buildDivinityIndex(monumenti), [monumenti]);
  const onomasticaIndex = useMemo(() => buildOnomasticaIndex(monumenti), [monumenti]);

  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(!skipLanding);
  const logoImgRef = useRef<HTMLImageElement>(null);
  // Vedi PasswordGate.tsx: l'animazione del logo parte solo a caricamento
  // immagine completato, per evitare il "pop" a scatti su reti lente.
  const [logoLoaded, setLogoLoaded] = useState(false);
  useEffect(() => {
    if (logoImgRef.current?.complete) setLogoLoaded(true);
  }, []);
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
  
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Vero quando almeno un filtro (o la ricerca testuale) è diverso dallo stato
  // di partenza: pilota la comparsa del pulsante rapido "Azzera filtri" accanto
  // alla barra di ricerca. searchMode è una modalità, non un filtro, quindi non
  // conta.
  const hasActiveFilters =
    filters.searchText !== '' ||
    filters.regione !== '' ||
    filters.citta !== '' ||
    filters.tipo !== '' ||
    filters.materiale !== '' ||
    filters.iconAttributo !== '' ||
    filters.iconFunzione !== '' ||
    filters.iconPosizione !== '' ||
    filters.onlyInscr ||
    filters.onlyAnep ||
    filters.onlyHasTrad ||
    filters.onlyNoTrad ||
    filters.dateRange[0] !== DEFAULT_FILTERS.dateRange[0] ||
    filters.dateRange[1] !== DEFAULT_FILTERS.dateRange[1];
  
  // Ricerca full-text (MiniSearch, lato server) — è la ricerca di default,
  // non più un pannello di confronto separato dal filtro vero.
  const [miniSearchResults, setMiniSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // true finché non arriva la prima risposta per la query corrente: evita di
  // mostrare per un istante "nessun risultato" (lista vuota) prima che la
  // fetch abbia risposto, mentre l'utente sta ancora scrivendo
  const [searchPending, setSearchPending] = useState(false);

  useEffect(() => {
    const query = filters.searchText.trim();
    // Le query puramente numeriche sono probabilmente una ricerca per id
    // (es. "95" per la scheda ILA-095): non applicare la soglia minima di
    // 3 caratteri pensata per evitare rumore nella ricerca testuale.
    const isIdQuery = /^\d+$/.test(query);
    if (query.length <= 2 && !isIdQuery) {
      setMiniSearchResults([]);
      setSearchPending(false);
      return;
    }
    if (query.length === 0) {
      setMiniSearchResults([]);
      setSearchPending(false);
      return;
    }
    setSearchPending(true);
    const controller = new AbortController();
    // Piccolo debounce per non sparare una fetch ad ogni tasto
    const t = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}&mode=${filters.searchMode}`, { signal: controller.signal })
        .then(res => res.json())
        .then((data: SearchResult[]) => {
          setMiniSearchResults(Array.isArray(data) ? data : []);
          setSearchPending(false);
        })
        .catch((e) => {
          if (e.name !== 'AbortError') console.error('Ricerca fallita:', e);
        })
        .finally(() => setIsSearching(false));
    }, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [filters.searchText, filters.searchMode]);

  // Set degli id trovati dalla ricerca (undefined = nessuna ricerca testuale
  // attiva, quindi il filtro per testo non esclude nulla) e mappa id →
  // "il match cade in una parte ricostruita editorialmente" per il badge.
  const searchResultIds = useMemo(() => {
    const query = filters.searchText.trim();
    const isIdQuery = /^\d+$/.test(query);
    if (query.length === 0 || (query.length <= 2 && !isIdQuery)) return null;
    return new Set(miniSearchResults.map(r => r.id));
  }, [miniSearchResults, filters.searchText]);

  const matchInSuppliedById = useMemo(() => {
    const map = new Map<number, boolean>();
    miniSearchResults.forEach(r => map.set(r.id, r.matchInSupplied));
    return map;
  }, [miniSearchResults]);
  
  const [selectedMonumento, setSelectedMonumento] = useState<Monumento | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Markup cliccabile sull'iscrizione: popover di statistiche aperto (solo
  // per divinità/onomastica) e preset da applicare al mount della prossima
  // EpithetStats — sia per il redirect di fallback sia per il pulsante
  // "vedi tutto" dentro il popover stesso.
  const [activePopover, setActivePopover] = useState<Extract<TermClickAction, { kind: 'popover-divinita' | 'popover-onomastica' }> | null>(null);
  // `exact: true` → il termine è una voce confermata dell'indice (click su
  // "vedi tutto" nel popover): preseleziona direttamente la divinità/nome.
  // `exact: false` → fallback di redirect per un termine non trovato
  // nell'indice (es. ruler/emperor non tracciati, o voce isolata): precompila
  // solo il campo di ricerca della pagina, senza forzare una selezione che
  // punterebbe a una voce inesistente.
  const [statsPreset, setStatsPreset] = useState<{ tab: 'divinita' | 'onomastica'; term: string; exact: boolean } | null>(null);

  const handleTermClick = (action: TermClickAction) => {
    if (action.kind === 'redirect-catalog') {
      setFilters(f => ({ ...f, searchText: action.term }));
      setSelectedMonumento(null);
    } else if (action.kind === 'redirect-stats') {
      setStatsPreset({ tab: action.tab, term: action.search, exact: false });
      setSelectedMonumento(null);
      setActiveView('stats');
    } else {
      setActivePopover(action);
    }
  };

  const handleExpandPopover = () => {
    if (!activePopover) return;
    setStatsPreset({
      tab: activePopover.kind === 'popover-divinita' ? 'divinita' : 'onomastica',
      term: activePopover.stats.name,
      exact: true,
    });
    setActivePopover(null);
    // La scheda è una modale sopra activeView: senza chiuderla resterebbe in
    // primo piano anche dopo aver cambiato vista, nascondendo le statistiche.
    setSelectedMonumento(null);
    setActiveView('stats');
  };

  // --- Navigazione a sezioni della modale editoriale: pannelli discreti,
  // non più scroll continuo. "Supporto Epigrafico" fonde scheda+oggetto;
  // "Iscrizione" fonde trascrizione+commento; "Iconografia" raccoglie anche
  // gli indici (divinità/epiteti/onomastica/imperatori); "Bibliografia" a parte. ---
  const RECORD_SECTIONS: { id: string; label: string }[] = [
    { id: 'supporto', label: 'Supporto Epigrafico' },
    { id: 'iscrizione', label: 'Iscrizione' },
    { id: 'iconografia', label: 'Iconografia' },
    { id: 'bibliografia', label: 'Bibliografia' },
  ];
  const [activeRecordSection, setActiveRecordSection] = useState<string>('supporto');
  const recordContentRef = useRef<HTMLDivElement>(null);

  // Il rect del click da cui il popover è posizionato è valido solo per lo
  // span cliccato in quel momento: cambiando scheda o sezione va chiuso,
  // altrimenti resterebbe ancorato a una posizione ormai fuori contesto.
  useEffect(() => {
    setActivePopover(null);
  }, [selectedMonumento, activeRecordSection]);

  useEffect(() => {
    if (!selectedMonumento) return;
    setActiveRecordSection('supporto');
  }, [selectedMonumento?.id]);

  // Esc chiude la scheda aperta. Registrato in "capture" così ha la precedenza
  // sugli altri handler di Esc montati più in basso (es. il reset zoom della
  // Cronologia, che resta montata sotto il modal): senza questo, con una scheda
  // aperta dalla Cronologia premere Esc non chiudeva la scheda e reimpostava
  // di nascosto lo zoom della timeline sottostante.
  useEffect(() => {
    if (!selectedMonumento) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setSelectedMonumento(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [selectedMonumento]);

  const goToRecordSection = (id: string) => {
    setActiveRecordSection(id);
    recordContentRef.current?.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Sulla build statica: di default si consulta lo snapshot statico del
  // corpus (nessun token richiesto, solo il gate password in main.tsx).
  // editingUnlocked diventa true solo dopo un PAT GitHub valido inserito
  // da UnlockEditingModal — è quello il vero "sei autorizzato a scrivere"
  // per questa build (vedi effectiveAdmin sotto e apiShim.ts).
  const [editingUnlocked, setEditingUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const handleUnlockSubmit = async (token: string) => {
    const { unlockEditing } = await import('./lib/apiShim');
    return unlockEditing(token);
  };

  const handleUnlocked = async () => {
    setEditingUnlocked(true);
    // Il corpus in memoria (snapshot) va rimpiazzato con quello live appena
    // idratato da unlockEditing, altrimenti la UI continua a mostrare i
    // dati fermi all'ultimo deploy anche se lo shim ora ne ha di freschi.
    try {
      const res = await fetch('/api/monumenti');
      if (res.ok) setMonumenti(await res.json());
    } catch (e) {
      console.warn('Ricaricamento corpus live dopo sblocco fallito', e);
    }
    // registri/bugs vengono caricati dall'effetto su effectiveAdmin, non qui.
  };

  const handleLockEditing = async () => {
    const { lockEditing } = await import('./lib/apiShim');
    await lockEditing();
    setEditingUnlocked(false);
    try {
      const res = await fetch('/api/monumenti');
      if (res.ok) setMonumenti(await res.json());
    } catch (e) {
      console.warn('Ricaricamento snapshot dopo blocco fallito', e);
    }
    // registri/bugs vengono svuotati dall'effetto su effectiveAdmin, non qui.
  };

  // Il PAT resta in localStorage da uno sblocco precedente (vedi
  // githubStorageBrowser.ts), ma editingUnlocked riparte sempre da false a
  // ogni caricamento: senza questo effetto, chi ha già sbloccato una volta
  // dovrebbe riaprire la finestra e reincollare lo stesso token a ogni
  // visita. Se il token nel frattempo è stato revocato, unlockEditing lo
  // scarta da solo (clearStoredToken) e si resta silenziosamente in
  // modalità viewer, senza popup d'errore a freddo all'avvio.
  useEffect(() => {
    if (!isStaticBuild) return;
    (async () => {
      const { getStoredToken } = await import('./lib/githubStorageBrowser');
      const token = getStoredToken();
      if (!token) return;
      const result = await handleUnlockSubmit(token);
      if (result.ok) await handleUnlocked();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [translating, setTranslating] = useState(false);
  const [activeTranslationLang, setActiveTranslationLang] = useState<string | null>(null);
  // Finestra epigrafica: alterna testo con markup diacritico (default) e
  // trascrizione pura. Preferenza di lettura, resta impostata fra una scheda e l'altra.
  const [plainTranscription, setPlainTranscription] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });



  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  // Conferma "Riordina ID" — NON usa window.confirm(): nelle preview embeddate
  // (es. iframe sandboxati) i dialoghi nativi del browser
  // (confirm/alert/prompt) vengono spesso bloccati silenziosamente, senza
  // errore visibile — il click sembra "non fare nulla". Un dialogo interno
  // funziona sempre, indipendentemente dal contesto di rendering.
  const [showReindexConfirm, setShowReindexConfirm] = useState(false);
  // Blocco salvataggio per scheda disallineata (vedi handleSaveMetadata) —
  // stesso motivo del dialogo sopra: niente window.confirm()/alert().
  const [staleSaveEntryId, setStaleSaveEntryId] = useState<string | null>(null);
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

  
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Reset sub-states when modal closes
  useEffect(() => {
    if (!selectedMonumento) {
      setShowDeleteConfirm(false);
    }
  }, [selectedMonumento]);

  // Riparte dalla lingua di default (IT se presente, altrimenti la prima) ad ogni cambio di record
  useEffect(() => {
    setActiveTranslationLang(null);
  }, [selectedMonumento?.entryId ?? selectedMonumento?.id]);



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

  // Sulla build statica non c'è login Google/Firebase (il check su
  // ADMIN_EMAIL era comunque solo visibilità UI, mai enforcement reale —
  // vedi commento sopra): l'accesso in scrittura dipende da editingUnlocked,
  // vero solo dopo un PAT GitHub valido sbloccato da UnlockEditingModal
  // (enforcement reale è comunque lato apiShim.ts + permessi del token su
  // GitHub, non questo booleano). Prima di sbloccare, chi ha solo la
  // password vede il catalogo in sola lettura dallo snapshot statico.
  const effectiveAdmin = isStaticBuild ? editingUnlocked : (!!currentUser && currentUser.email === ADMIN_EMAIL);

  // Registro di lavorazione dei collaboratori sulle schede del catalogo
  // (vedi flags.json su GitHub) e bug segnalati sul funzionamento dell'app
  // (bugs.json). Entrambi restano vuoti e non vengono nemmeno richiesti
  // finché l'editing non è sbloccato (stesso PAT usato per salvare, vedi
  // apiShim.ts) — sezioni riservate ai collaboratori, non c'è uno snapshot
  // statico per queste, a differenza del corpus.
  const [registri, setRegistri] = useState<EntryRegistro[]>([]);
  const [registriLoading, setRegistriLoading] = useState(false);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [bugsLoading, setBugsLoading] = useState(false);

  const fetchRegistri = async () => {
    setRegistriLoading(true);
    try {
      const res = await fetch('/api/flags');
      if (res.ok) setRegistri(await res.json());
    } catch (e) {
      console.warn('Caricamento registro fallito', e);
    } finally {
      setRegistriLoading(false);
    }
  };

  const fetchBugs = async () => {
    setBugsLoading(true);
    try {
      const res = await fetch('/api/bugs');
      if (res.ok) setBugs(await res.json());
    } catch (e) {
      console.warn('Caricamento bug fallito', e);
    } finally {
      setBugsLoading(false);
    }
  };

  // Solo se sbloccati: da viewer non c'è nulla da mostrare in queste
  // sezioni (vedi RegistroPanel/BugReportsPanel, comunque nascoste dalla nav).
  useEffect(() => {
    if (effectiveAdmin) { fetchRegistri(); fetchBugs(); }
    else { setRegistri([]); setBugs([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAdmin]);

  const knownAuthors = useMemo(() => {
    const set = new Set<string>();
    registri.forEach(r => r.notes.forEach(n => n.author && set.add(n.author)));
    bugs.forEach(b => b.author && set.add(b.author));
    return Array.from(set).sort();
  }, [registri, bugs]);

  const createRegistroNote = async (entryId: string, entryLabel: string, author: string, note: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, entryLabel, author, note }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Errore nel salvataggio della nota' };
      setRegistri(prev => prev.some(r => r.entryId === entryId) ? prev.map(r => r.entryId === entryId ? data : r) : [...prev, data]);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || String(e) };
    }
  };

  const updateRegistroStatus = async (entryId: string, status: 'open' | 'resolved'): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/flags/${encodeURIComponent(entryId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Errore nell\'aggiornamento del registro' };
      setRegistri(prev => prev.map(r => r.entryId === entryId ? data : r));
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || String(e) };
    }
  };

  const createBugReport = async (author: string, note: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, note }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Errore nel salvataggio del bug' };
      setBugs(prev => [...prev, data]);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || String(e) };
    }
  };

  const updateBugStatus = async (id: string, status: 'open' | 'resolved'): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/bugs/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Errore nell\'aggiornamento del bug' };
      setBugs(prev => prev.map(b => b.id === id ? data : b));
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || String(e) };
    }
  };

  const regions = useMemo(() => Array.from(new Set(monumenti.map(m => m.regione).filter(Boolean).map(s => s.trim()))).sort(), [monumenti]);
  const cities = useMemo(() => Array.from(new Set(monumenti.map(m => m.citta).filter(Boolean).map(s => s.trim()))).sort(), [monumenti]);
  const types = useMemo(() => Array.from(new Set(monumenti.map(m => m.tipo).filter(Boolean).map(s => s.trim()))).sort(), [monumenti]);
  const materials = useMemo(() => Array.from(new Set(monumenti.map(m => m.materiale).filter(Boolean).map(s => s.trim()))).sort(), [monumenti]);
  const iconAttributi = useMemo(() => {
    const set = new Set<string>();
    monumenti.forEach(m => m.iconografia?.figures?.forEach(f => f.traits?.forEach(t => t.key && set.add(t.key))));
    return Array.from(set).sort();
  }, [monumenti]);
  const iconFunzioni = useMemo(() => {
    const set = new Set<string>();
    monumenti.forEach(m => { if (m.iconografia?.function) set.add(m.iconografia.function); });
    return Array.from(set).sort();
  }, [monumenti]);
  const iconPosizioni = useMemo(() => {
    const set = new Set<string>();
    monumenti.forEach(m => m.iconografia?.figures?.forEach(f => f.place && set.add(f.place)));
    return Array.from(set).sort();
  }, [monumenti]);

  const filteredMonumenti = useMemo(() => {
    return monumenti
      .filter(m => {
        // Ricerca testuale: guidata da MiniSearch (server), non più da un
        // confronto substring in locale. searchResultIds === null significa
        // "nessuna ricerca testuale attiva" (query vuota o troppo corta):
        // in quel caso il filtro per testo non esclude nulla. Mentre la
        // fetch per una query nuova è ancora in corso (searchPending),
        // teniamo tutto visibile invece di mostrare per un istante "nessun
        // risultato" prima che la risposta arrivi.
        const matchesSearch = searchResultIds === null || searchPending || searchResultIds.has(m.id);
        
        const matchesRegione = !filters.regione || m.regione === filters.regione;
        const matchesCitta = !filters.citta || m.citta === filters.citta;
        const matchesTipo = !filters.tipo || m.tipo === filters.tipo;
        const matchesMateriale = !filters.materiale || m.materiale === filters.materiale;
        const matchesIconAttributo = !filters.iconAttributo || (m.iconografia?.figures?.some(f => f.traits?.some(t => t.key === filters.iconAttributo)) ?? false);
        const matchesIconFunzione = !filters.iconFunzione || m.iconografia?.function === filters.iconFunzione;
        const matchesIconPosizione = !filters.iconPosizione || (m.iconografia?.figures?.some(f => f.place === filters.iconPosizione) ?? false);

        const matchesInscr = !filters.onlyInscr || m.iscrizione;
        const matchesAnep = !filters.onlyAnep || m.anepigr;
        
        const hasTrad = m.traduzioni && m.traduzioni.some(t => t.testo && t.testo.trim().length > 0);
        const matchesHasTrad = !filters.onlyHasTrad || hasTrad;
        const matchesNoTrad = !filters.onlyNoTrad || !hasTrad;

        const matchesDate = (!m.data_inizio || !m.data_fine) || (m.data_inizio >= filters.dateRange[0] && m.data_fine <= filters.dateRange[1]);

        return matchesSearch && matchesRegione && matchesCitta && matchesTipo && matchesMateriale && matchesIconAttributo && matchesIconFunzione && matchesIconPosizione && matchesInscr && matchesAnep && matchesHasTrad && matchesNoTrad && matchesDate;
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
  }, [monumenti, filters, sortField, sortOrder, searchResultIds, searchPending]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filters]);


  const totalPages = Math.ceil(filteredMonumenti.length / ITEMS_PER_PAGE);

  // La lista filtrata può ridursi anche senza che cambino i filtri (es.
  // eliminazione di una scheda): se currentPage resta oltre l'ultima
  // pagina disponibile, paginatedMonumenti sarebbe vuoto pur con
  // "Pagina N di M" che mostra ancora N > M.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages));
  }, [totalPages, currentPage]);

  const paginatedMonumenti = filteredMonumenti.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const reindexMonumenti = async (dataToReindex?: Monumento[]) => {
    if (!effectiveAdmin) {
      alert(`Solo l'amministratore (${ADMIN_EMAIL}) può riordinare gli ID.`);
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
    
    // Sulla build statica (GitHub Pages) il salvataggio scrive le schede una
    // ad una su GitHub in un pool a concorrenza limitata (apiShim.ts): con
    // ~300 schede può richiedere decine di secondi. Ascoltiamo l'evento che
    // apiShim dispatcha ad ogni scrittura riuscita per mostrare un
    // conteggio live invece di un messaggio statico che sembra bloccato.
    const onWriteProgress = (e: Event) => {
      const detail = (e as CustomEvent<{ done: number; total: number }>).detail;
      if (!detail) return;
      setImportStatus({ type: 'loading', message: `Riordino ID in corso... (${detail.done}/${detail.total})` });
    };
    window.addEventListener('corpus-write-progress', onWriteProgress);

    try {
      setImportStatus({ type: 'loading', message: 'Riordino ID in corso...' });
      const res = await fetch('/api/monumenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reindexed)
      });
      if (res.ok) {
        const result = await res.json();
        const failures: { filename: string; error: string }[] = result?.failures || [];
        if (failures.length > 0) {
          // Salvataggio parziale: la maggior parte (o quasi) delle schede è
          // già stata scritta su GitHub con successo — buttare via quel
          // progresso mostrando solo "errore" sarebbe fuorviante. Si
          // ricarica lo stato vero dal server invece di assumere che
          // "reindexed" rispecchi cosa è realmente su GitHub (le poche
          // schede fallite sono rimaste con l'id/contenuto precedente).
          const freshRes = await fetch('/api/monumenti');
          if (freshRes.ok) setMonumenti(await freshRes.json());
          setImportStatus({
            type: 'error',
            message: `Riordino parziale: ${result.succeeded}/${result.count} salvate, ${failures.length} fallite (${failures.map((f: any) => f.filename).join(', ')}). Riprova per completare le rimanenti.`,
          });
          return;
        }
        setMonumenti(reindexed);
        if (selectedMonumento) {
          const updatedSelected = reindexed.find(m => m.entryId === selectedMonumento.entryId);
          if (updatedSelected) setSelectedMonumento(updatedSelected);
        }
        setImportStatus({ type: 'success', message: 'ID riordinati con successo!' });
        setTimeout(() => setImportStatus({ type: 'idle', message: '' }), 3000);
      } else {
        // Il server/shim manda sempre un { error: "..." } specifico (validazione,
        // permessi, fallimento GitHub): mostrarlo invece di un messaggio fisso
        // era l'unico modo per diagnosticare un fallimento reale come questo.
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detail = body.error;
        } catch { /* risposta non-JSON, resta l'HTTP status */ }
        throw new Error(detail);
      }
    } catch (err: any) {
      console.error("Reindex error", err);
      setImportStatus({ type: 'error', message: `Errore nel salvataggio: ${err.message}` });
    } finally {
      window.removeEventListener('corpus-write-progress', onWriteProgress);
    }
  };

  // Rilancia sul server la sync da GitHub (stessa eseguita all'avvio), poi
  // ricarica lo stato locale — così una modifica fatta direttamente sul
  // repo dati diventa visibile senza dover riavviare il server.
  const syncFromGitHub = async () => {
    if (!effectiveAdmin) {
      alert(`Solo l'amministratore (${ADMIN_EMAIL}) può forzare la sincronizzazione.`);
      return;
    }
    setImportStatus({ type: 'loading', message: 'Sincronizzazione da GitHub in corso...' });
    try {
      const res = await fetch('/api/corpus/sync', { method: 'POST' });
      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);

      const freshRes = await fetch('/api/monumenti');
      if (freshRes.ok) {
        const fresh = await freshRes.json();
        setMonumenti(fresh);
        if (selectedMonumento) {
          const updatedSelected = fresh.find((m: Monumento) => m.entryId === selectedMonumento.entryId);
          if (updatedSelected) setSelectedMonumento(updatedSelected);
        }
      }
      setImportStatus({
        type: 'success',
        message: `Sincronizzato: ${body.monumentiCount} schede (${body.pulled} scaricate${body.deletedLocally?.length ? `, ${body.deletedLocally.length} rimosse in locale` : ''}).`,
      });
      setTimeout(() => setImportStatus({ type: 'idle', message: '' }), 5000);
    } catch (err: any) {
      console.error("Sync from GitHub error", err);
      setImportStatus({ type: 'error', message: `Errore nella sincronizzazione: ${err.message}` });
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
          // Dimensions
          dim: m.dim || '',
          dim_altezza: m.dim_altezza || '',
          dim_larghezza: m.dim_larghezza || '',
          dim_profondita: m.dim_profondita || '',
          dim_unita: m.dim_unita || 'cm',
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
          tmLink: m.tmLink || '',
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
      alert(`Solo l'amministratore (${ADMIN_EMAIL}) può importare dati.`);
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
      alert(`Solo l'amministratore (${ADMIN_EMAIL}) può modificare i dati.`);
      return;
    }
    const target = monumenti.find(m => m.entryId === entryId);
    if (!target) return;

    const updatedMon = { ...target, ...metadata };

    const testXml = monumentiToXml([updatedMon]);
    const parser = new DOMParser();
    const xmldoc = parser.parseFromString(testXml, 'application/xml');
    if (xmldoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error("I dati modificati producono XML non valido. Controlla i valori inseriti.");
    }

    // Salvataggio scoped al singolo file: manda solo questa scheda (mai
    // l'intero corpus) e dichiara l'ultimo hash noto del file, così il
    // server può bloccare invece di sovrascrivere se nel frattempo è
    // cambiato altrove (altra sessione, o modifica diretta su GitHub).
    const res = await fetch(`/api/monumenti/${encodeURIComponent(entryId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monumento: updatedMon, baseHash: target._fileHash ?? null })
    });

    if (res.status === 409) {
      setStaleSaveEntryId(entryId);
      throw new Error("Salvataggio bloccato: la scheda è stata modificata altrove nel frattempo.");
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({} as any));
      throw new Error(errBody.error || "Impossibile salvare la scheda sul server.");
    }

    const body = await res.json();
    const persisted: Monumento = { ...updatedMon, _corpusFile: body._corpusFile, _fileHash: body._fileHash };
    setMonumenti(prev => prev.map(m => m.entryId === entryId ? persisted : m));
    setSelectedMonumento(prev => (prev && prev.entryId === entryId) ? persisted : prev);
  };

  // --- Modifica in blocco delle diciture bibliografiche (pannello Bibliografia).
  // Ogni edit è un find/replace esatto sulla stringa <bibl>: si individuano le
  // schede che contengono almeno una delle diciture "from", si riscrive quella
  // voce (titolo + rawXml, così monumentiToXml la riserializza) e si salva una
  // scheda alla volta con lo stesso canale dell'editor (PATCH /api/monumenti/:id
  // con baseHash), in un pool a concorrenza limitata. Nessuna POST dell'intero
  // corpus: quella cancellerebbe i file non inviati (vedi apiShim.ts). ---
  const [biblioProgress, setBiblioProgress] = useState<{ done: number; total: number } | null>(null);

  const handleBiblioApply = async (edits: BiblioReplacement[]): Promise<BiblioApplyResult> => {
    if (!effectiveAdmin) {
      return { ok: false, updatedEntries: 0, updatedSchede: 0, failures: [{ entryId: '-', error: 'Editing non sbloccato.' }] };
    }
    const replMap = new Map(edits.map(e => [e.from.trim(), e.to.trim()]));

    // Schede da toccare + versione aggiornata della loro bibliografia.
    const targets: { mon: Monumento; nextBibl: Bibliografia[]; changed: number }[] = [];
    for (const m of monumenti) {
      if (!m.bibliografia || m.bibliografia.length === 0) continue;
      let changed = 0;
      const nextBibl = m.bibliografia.map(b => {
        const key = (b.titolo || '').trim();
        if (replMap.has(key)) {
          const to = replMap.get(key)!;
          if (to !== key) { changed++; return { ...b, titolo: to, rawXml: to }; }
        }
        return b;
      });
      if (changed > 0) targets.push({ mon: m, nextBibl, changed });
    }

    if (targets.length === 0) {
      return { ok: true, updatedEntries: 0, updatedSchede: 0, failures: [] };
    }

    const failures: { entryId: string; error: string }[] = [];
    let done = 0;
    let updatedEntries = 0;
    let updatedSchede = 0;
    const persistedById = new Map<string, Monumento>();
    setBiblioProgress({ done: 0, total: targets.length });

    let next = 0;
    const worker = async () => {
      while (next < targets.length) {
        const { mon, nextBibl, changed } = targets[next++];
        const entryId = mon.entryId!;
        const updatedMon: Monumento = { ...mon, bibliografia: nextBibl };
        try {
          const res = await fetch(`/api/monumenti/${encodeURIComponent(entryId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monumento: updatedMon, baseHash: mon._fileHash ?? null }),
          });
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({} as any));
            failures.push({ entryId, error: errBody.error || errBody.message || `HTTP ${res.status}` });
          } else {
            const body = await res.json();
            persistedById.set(entryId, { ...updatedMon, _corpusFile: body._corpusFile, _fileHash: body._fileHash });
            updatedEntries += changed;
            updatedSchede++;
          }
        } catch (e: any) {
          failures.push({ entryId, error: e?.message || String(e) });
        }
        done++;
        setBiblioProgress({ done, total: targets.length });
      }
    };
    const CONCURRENCY = 4;
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()));

    // Applica in memoria le schede andate a buon fine; per le altre lascia
    // lo stato precedente. Se ci sono fallimenti si ricarica dal server per
    // non tenere hash disallineati.
    if (persistedById.size > 0) {
      setMonumenti(prev => prev.map(m => (m.entryId && persistedById.has(m.entryId)) ? persistedById.get(m.entryId)! : m));
      setSelectedMonumento(prev => (prev && prev.entryId && persistedById.has(prev.entryId)) ? persistedById.get(prev.entryId)! : prev);
    }
    if (failures.length > 0) {
      try {
        const fresh = await fetch('/api/monumenti');
        if (fresh.ok) setMonumenti(await fresh.json());
      } catch { /* si tiene lo stato locale già aggiornato */ }
    }

    setBiblioProgress(null);
    return { ok: failures.length === 0, updatedEntries, updatedSchede, failures };
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
    link.download = `ILA-${String(m.id).padStart(3, '0')}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!effectiveAdmin || !selectedMonumento) {
      alert(`Solo l'amministratore (${ADMIN_EMAIL}) può eliminare le schede.`);
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
      alert(`Solo l'amministratore (${ADMIN_EMAIL}) può generare e salvare traduzioni.`);
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
      formatIlaLabel(m.id),
      m.citta || '-',
      m.tipo || '-',
      m.materiale || '-'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['ID', 'Città', 'Tipologia', 'Materiale']],
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
          const fId = parsedItem.entryId || `local-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
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
      <div className="h-dvh w-full flex flex-col items-center justify-center bg-parchment gap-10 px-6">
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
    <div className="flex h-dvh w-full flex-col bg-parchment text-ink font-serif overflow-hidden relative pb-14 md:pb-0 md:pl-16" style={{ height: '100dvh' }}>
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
        editingUnlocked={editingUnlocked}
        onUnlockClick={() => setShowUnlockModal(true)}
        onLockClick={handleLockEditing}
        effectiveAdmin={effectiveAdmin}
      />
      <div className="digital-seal">CDA</div>

      <AnimatePresence>
        {showLanding && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 1, ease: 'easeInOut' } }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-parchment"
            style={{
              // Sempre in tema chiaro, a prescindere dalla modalità notte
              // attiva nel resto dell'app: il ritaglio del logo non è pulito
              // sullo sfondo scuro, quindi qui le custom property del tema
              // vengono fissate ai valori light indipendentemente da .dark
              // sull'antenato (elenco completo delle var di :root/.dark in
              // index.css, non solo un sottoinsieme).
              colorScheme: 'light',
              ['--parchment' as any]: '#F7F4EC',
              ['--ink' as any]: '#1E2A26',
              ['--sidebar' as any]: '#F1EDE1',
              ['--card' as any]: '#FEFDFA',
              ['--accent' as any]: '#1F8377',
              ['--muted' as any]: '#6E6A5E',
              ['--border' as any]: '#E1DBC8',
              ['--shadow-color' as any]: '61, 53, 38',
              ['--tint-1' as any]: 'rgba(233, 238, 231, 0.55)',
              ['--tint-2' as any]: 'rgba(244, 238, 223, 0.55)',
              ['--tint-3' as any]: 'rgba(232, 238, 238, 0.55)',
              ['--tint-4' as any]: 'rgba(243, 233, 226, 0.55)',
            }}
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
                initial={false}
                animate={logoLoaded ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.7 }}
                transition={{ duration: 1.1, ease: EASE_OUT }}
                className="mb-12"
              >
                <img
                  ref={logoImgRef}
                  src={ilaLogo}
                  alt="Index Lunae Antiquae"
                  className="h-52 sm:h-64 md:h-72 lg:h-80 w-auto object-contain"
                  fetchPriority="high"
                  decoding="sync"
                  onLoad={() => setLogoLoaded(true)}
                />
              </motion.div>

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

      {/* Editorial Header — solo nel catalogo, ridotto a barra di ricerca: negli
          altri contesti le funzioni (tema/impostazioni/account/navigazione)
          sono già tutte in barra laterale, quindi qui sarebbe solo vuoto. */}
      {activeView === 'catalog' && (
      <header className={cn(
        "mx-2.5 md:mx-5 lg:mx-6 mt-4 mb-2 rounded-2xl bg-[var(--card)]/85 dark:bg-[var(--card)]/70 backdrop-blur-xl border border-[var(--border)]/60 dark:border-[var(--border)]/50 shrink-0 gap-4 min-h-fit shadow-[0_12px_40px_-12px_rgba(var(--shadow-color),0.18),_inset_0_1px_2px_rgba(255,255,255,0.5)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5),_inset_0_1px_1px_rgba(255,255,255,0.08)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between transition-all duration-500 relative sticky top-2 z-30",
        hasNavigated ? "px-5 py-2.5" : "px-8 md:px-10 py-6"
      )}>
        {/* Soft bottom glow/blur to give relief (rilievo) */}
        <div className="absolute -bottom-4 inset-x-12 h-8 bg-accent/10 dark:bg-accent/5 blur-2xl rounded-full opacity-50 pointer-events-none -z-10" />
        {!hasNavigated && (
        <div className="flex flex-col">
          <div className="flex items-center gap-4">
            <button onClick={goHome} className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[0.15em] text-accent leading-none hover:opacity-80 transition-opacity cursor-pointer" style={{ fontFamily: '"Cinzel", serif' }} title="Torna alla home">ILA</button>
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
          <div className="flex items-center gap-2 shrink-0">
          <div
            className={cn(
              "flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-full border transition-all duration-300 shrink-0 min-w-[180px] lg:min-w-[240px]",
              showFilterPanel
                ? "border-accent/50 bg-[var(--card)] ring-1 ring-accent/30 shadow-inner"
                : "border-[var(--border)]/50 bg-[var(--card)]/80 hover:bg-[var(--card)] shadow-inner"
            )}
          >
            <Search className="h-3.5 w-3.5 text-muted/50 shrink-0" />
            <input
              type="text"
              value={filters.searchText}
              onChange={(e) => setFilters(f => ({ ...f, searchText: e.target.value }))}
              onFocus={() => setShowFilterPanel(true)}
              placeholder="Cerca testo, luoghi, tipi…"
              className={cn(
                "flex-1 min-w-0 bg-transparent outline-none text-xs placeholder:text-muted/60 placeholder:italic placeholder:font-serif",
                filters.searchText ? "text-ink font-sans font-bold" : "font-serif"
              )}
            />
            <button
              type="button"
              onClick={() => setShowFilterPanel(s => !s)}
              className="shrink-0"
              title="Filtri avanzati"
            >
              <motion.span animate={{ rotate: showFilterPanel ? 180 : 0 }} transition={{ duration: 0.2 }} className="block">
                <ChevronDown className="h-3.5 w-3.5 text-muted/50" />
              </motion.span>
            </button>
          </div>
          {/* Azzeramento rapido: compare accanto alla barra solo quando c'è
              qualcosa da azzerare, così non serve aprire la tendina e
              scorrere fino in fondo al "Reset Filtri". */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={() => setFilters(DEFAULT_FILTERS)}
                title="Rimuovi tutti i filtri"
                className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full border border-accent/40 bg-accent/5 text-accent text-[9px] font-sans font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-all duration-300 shrink-0"
              >
                <X className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">Azzera filtri</span>
              </motion.button>
            )}
          </AnimatePresence>
          </div>
        )}
      </header>
      )}

      <div className="flex-1 flex overflow-hidden relative min-h-0" style={{ minHeight: 0 }}>
        {/* Settings Overlay */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="glass-panel absolute right-0 top-0 bottom-0 w-[85vw] sm:w-80 p-6 sm:p-10 border-t-0 border-r-0 border-b-0 z-40 shadow-2xl flex flex-col"
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

                {effectiveAdmin && (
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
                )}

                {effectiveAdmin && (
                  <section>
                    <h4 className="text-[10px] font-bold uppercase text-muted mb-4 tracking-widest">Amministrazione</h4>
                    <div className="space-y-4">
                      <button
                        onClick={() => { setIsImportModalOpen(true); setShowSettings(false); }}
                        className="w-full text-left py-2 font-sans text-xs hover:text-accent flex items-center gap-2"
                      >
                        <Upload className="h-3.5 w-3.5" /> Importa
                      </button>
                      <button onClick={exportFilteredData} className="w-full text-left py-2 font-sans text-xs hover:text-accent flex items-center gap-2">
                        <Download className="h-3.5 w-3.5" /> Esporta XML
                      </button>
                      <button
                        onClick={() => { setShowReindexConfirm(true); setShowSettings(false); }}
                        className="w-full text-left py-2 font-sans text-xs hover:text-accent flex items-center gap-2"
                      >
                        <Hash className="h-3.5 w-3.5" /> Riordina ID
                      </button>
                      <button
                        onClick={syncFromGitHub}
                        disabled={importStatus.type === 'loading'}
                        className="w-full text-left py-2 font-sans text-xs hover:text-accent flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isStaticBuild
                          ? "Ricarica il corpus da GitHub e rilancia la pubblicazione del sito, senza aspettare un nuovo commit di codice"
                          : "Ricarica il corpus dal repository GitHub senza riavviare il server"}
                      >
                        {importStatus.type === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Sincronizza da GitHub
                      </button>
                      {importStatus.type !== 'idle' && (
                        <div className={cn(
                          "text-[9px] font-bold uppercase tracking-widest pl-0.5",
                          importStatus.type === 'loading' && "text-accent",
                          importStatus.type === 'success' && "text-green-600",
                          importStatus.type === 'error' && "text-red-600"
                        )}>
                          {importStatus.message}
                        </div>
                      )}
                    </div>
                  </section>
                )}

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
                className="flex absolute z-30 top-14 md:top-2 left-2 right-2 md:left-5 lg:left-6 md:right-auto flex-col md:w-80 lg:w-96 max-h-[calc(100%-4rem)] md:max-h-[calc(100%-1rem)] p-6 md:p-8 rounded-2xl bg-[var(--card)]/95 dark:bg-[var(--card)]/90 backdrop-blur-xl border border-[var(--border)]/60 dark:border-[var(--border)]/50 shadow-[0_20px_50px_-12px_rgba(var(--shadow-color),0.28)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] overflow-y-auto custom-scrollbar"
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
                      onClick={() => setFilters(f => ({ ...f, searchMode: 'AND' }))}
                      className={cn("px-2 py-0.5 text-[8px] font-bold transition-all", filters.searchMode === 'AND' ? "bg-accent text-white" : "text-muted hover:text-ink")}
                      title="Tutti i termini devono comparire"
                    >
                      AND
                    </button>
                    <button 
                      onClick={() => setFilters(f => ({ ...f, searchMode: 'OR' }))}
                      className={cn("px-2 py-0.5 text-[8px] font-bold transition-all", filters.searchMode === 'OR' ? "bg-accent text-white" : "text-muted hover:text-ink")}
                      title="Basta che compaia almeno un termine"
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
                    className="w-full bg-transparent py-1 pl-6 pr-6 font-sans text-xs outline-none transition-colors placeholder:opacity-50"
                    value={filters.searchText}
                    onChange={(e) => setFilters(f => ({ ...f, searchText: e.target.value }))}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3 w-3 text-accent/60 animate-spin" />
                  )}
                </div>
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
                    {types.map(t => <option key={t} value={t} className="bg-parchment dark:bg-sidebar text-ink">{labelType(t)}</option>)}
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
                    {materials.map(m => <option key={m} value={m} className="bg-parchment dark:bg-sidebar text-ink">{labelMaterial(m)}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                </div>
              </div>

              {iconFunzioni.length > 0 && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <label className="mb-2 block field-label">Funzione Iconografica</label>
                  <div className="relative">
                    <select
                      className="w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-xl pl-3 pr-8 py-2.5 font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 cursor-pointer appearance-none transition-all duration-300"
                      style={{ backgroundColor: 'var(--card)', color: 'var(--ink)', WebkitAppearance: 'none' as const, appearance: 'none' as const }}
                      value={filters.iconFunzione}
                      onChange={(e) => setFilters(f => ({ ...f, iconFunzione: e.target.value }))}
                    >
                      <option value="" className="bg-parchment dark:bg-sidebar text-ink">Tutte le Funzioni</option>
                      {iconFunzioni.map(v => <option key={v} value={v} className="bg-parchment dark:bg-sidebar text-ink">{ICONOGRAPHY_LABELS[v] || v}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                  </div>
                </div>
              )}

              {iconAttributi.length > 0 && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <label className="mb-2 block field-label">Attributo Iconografico</label>
                  <div className="relative">
                    <select
                      className="w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-xl pl-3 pr-8 py-2.5 font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 cursor-pointer appearance-none transition-all duration-300"
                      style={{ backgroundColor: 'var(--card)', color: 'var(--ink)', WebkitAppearance: 'none' as const, appearance: 'none' as const }}
                      value={filters.iconAttributo}
                      onChange={(e) => setFilters(f => ({ ...f, iconAttributo: e.target.value }))}
                    >
                      <option value="" className="bg-parchment dark:bg-sidebar text-ink">Tutti gli Attributi</option>
                      {iconAttributi.map(v => <option key={v} value={v} className="bg-parchment dark:bg-sidebar text-ink">{ICONOGRAPHY_LABELS[v] || v}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                  </div>
                </div>
              )}

              {iconPosizioni.length > 0 && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <label className="mb-2 block field-label">Posizione Composizione</label>
                  <div className="relative">
                    <select
                      className="w-full bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-xl pl-3 pr-8 py-2.5 font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 cursor-pointer appearance-none transition-all duration-300"
                      style={{ backgroundColor: 'var(--card)', color: 'var(--ink)', WebkitAppearance: 'none' as const, appearance: 'none' as const }}
                      value={filters.iconPosizione}
                      onChange={(e) => setFilters(f => ({ ...f, iconPosizione: e.target.value }))}
                    >
                      <option value="" className="bg-parchment dark:bg-sidebar text-ink">Tutte le Posizioni</option>
                      {iconPosizioni.map(v => <option key={v} value={v} className="bg-parchment dark:bg-sidebar text-ink">{ICONOGRAPHY_LABELS[v] || v}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
                  </div>
                </div>
              )}

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
                  onClick={() => setFilters(DEFAULT_FILTERS)}
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

        <section className="flex-1 relative p-6 md:p-12 overflow-hidden transition-all duration-500">
        <motion.div
          key={activeView}
          initial={activeView === 'map' ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={activeView === 'map' ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          onAnimationComplete={() => {
            if (activeView === 'map') window.dispatchEvent(new Event('resize'));
          }}
          className="absolute inset-0 flex flex-col"
          style={{ position: 'absolute', inset: 0 }}
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
              effectiveAdmin={effectiveAdmin}
            />
          )}
          {activeView === 'catalog' && (
            <>
                {/* Record List */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 glass-panel glass-panel-elevated rounded-2xl">
                  <div className="px-6 pt-6 mb-2 flex items-center justify-between border-b border-border/20 pb-3 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                    <span>Visualizzazione di {filteredMonumenti.length} schede</span>
                    <div className="flex items-center gap-4">
                      <span className="opacity-30 lowercase">Ordina per:</span>
                      <button onClick={() => toggleSort('id')} className={cn("hover:text-accent transition-colors", sortField === 'id' && "text-accent")}>ID</button>
                      <button onClick={() => toggleSort('citta')} className={cn("hover:text-accent transition-colors", (sortField === 'citta' || sortField === 'regione') && "text-accent")}>Località</button>
                    </div>
                  </div>
  
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-6">
                    <div className="hidden md:grid md:grid-cols-[1.5rem_1.5fr_4fr_2fr_2fr_1.5rem] lg:grid-cols-[1.5rem_1.5fr_4fr_2fr_2fr_1.5rem] xl:grid-cols-[1.5rem_0.8fr_2.7fr_1.5fr_1fr_3fr_1.5rem] gap-2 border-b border-border py-4 text-[10px] font-bold uppercase tracking-tighter text-muted/60 sticky top-0 bg-[var(--card)]/95 backdrop-blur-md z-10 px-2 lg:px-0" >
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
                      <div>Monumento</div>
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
                              "relative block md:grid md:grid-cols-[1.5rem_1.5fr_4fr_2fr_2fr_1.5rem] lg:grid-cols-[1.5rem_1.5fr_4fr_2fr_2fr_1.5rem] xl:grid-cols-[1.5rem_0.8fr_2.7fr_1.5fr_1fr_3fr_1.5rem] gap-2 border-b py-3 md:py-4 group items-center px-2 lg:px-0 min-h-[76px] md:h-[76px] overflow-hidden [&>div]:min-w-0",
                              isSelected ? "border-accent/20" : "border-border/30 cursor-pointer"
                            )}
                            
                            onClick={() => setSelectedMonumento(m)}
                          >
                            {/* Accent bar indicating selection */}
                            <motion.div
                              className="absolute left-0 top-0 bottom-0 bg-accent"
                              initial={false}
                              animate={{ width: isSelected ? 3 : 0, opacity: isSelected ? 1 : 0 }}
                              transition={SPRING_SNAPPY}
                            />

                            {/* --- MOBILE VIEW --- */}
                            <div className="md:hidden flex w-full gap-3 items-start">
                              <div className="flex items-center justify-center pt-0.5 md:pt-0" onClick={e => { e.stopPropagation(); toggleSelect(m); }}>
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
                              
                              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="font-mono text-[10px] font-bold text-accent bg-accent/5 px-1.5 py-0.5 rounded-sm border border-accent/10 tabular-nums">#{m.id.toString().padStart(3, '0')}</span>
                                    {searchResultIds?.has(m.id) && matchInSuppliedById.get(m.id) && (
                                      <span className="font-mono text-[8px] font-bold text-amber-700 bg-amber-500/10 px-1 py-0.5 rounded-sm border border-amber-500/20">RICOSTR.</span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-bold text-ink/75 tabular-nums shrink-0">{formatDateRange(m.data_inizio, m.data_fine)}</span>
                                </div>
                                
                                <div className="text-sm font-bold text-ink leading-tight line-clamp-2">{getDisplayTitle(m)}</div>
                                
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                  <span className="text-[9px] font-bold uppercase text-muted tracking-tighter">{labelType(m.tipo)}</span>
                                  {m.regione && <span className="text-[7px] font-sans text-accent font-bold uppercase tracking-wider bg-accent/5 px-1 rounded-xs border border-accent/10">{m.regione}</span>}
                                  {m.citta && (
                                     <span className="flex items-center gap-0.5 text-[8px] font-sans text-muted uppercase tracking-tighter">
                                       <MapPin className="h-1.5 w-1.5 opacity-50" />
                                       {m.citta}
                                     </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="shrink-0 pl-1 self-center">
                                <ChevronRight className="h-4 w-4 text-border group-hover:text-accent group-hover:translate-x-1 transition-all" />
                              </div>
                            </div>

                            {/* --- DESKTOP VIEW --- */}
                            <div className="hidden md:contents">
                              <div className="flex items-center justify-center pt-0.5 md:pt-0" onClick={e => { e.stopPropagation(); toggleSelect(m); }}>
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
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] font-bold text-accent bg-accent/5 px-1.5 py-0.5 rounded-sm border border-accent/10 tabular-nums">#{m.id.toString().padStart(3, '0')}</span>
                                {searchResultIds?.has(m.id) && matchInSuppliedById.get(m.id) && (
                                  <span
                                    className="font-mono text-[8px] font-bold text-amber-700 bg-amber-500/10 px-1 py-0.5 rounded-sm border border-amber-500/20 whitespace-nowrap"
                                    title="Il termine cercato compare in una parte ricostruita editorialmente (supplied), non attestata sulla pietra"
                                  >
                                    RICOSTR.
                                  </span>
                                )}
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
                                   {labelType(m.tipo)}
                                 </button>
                              </div>
                              <div className="hidden xl:block">
                                <div
                                  className="text-[11px] italic text-ink/70 leading-relaxed font-serif overflow-hidden"
                                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}
                                >
                                  {stripXml(m.testo) || '[Anepigrafe]'}
                                </div>
                              </div>
                              <div className="text-right flex justify-end items-center">
                                <ChevronRight className="h-4 w-4 text-border group-hover:text-accent group-hover:translate-x-1 transition-all" />
                              </div>
                            </div>
                          </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="mt-8 mb-6 flex items-center justify-between border-t border-border/20 pt-6 px-6">
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
                  </div>
                </div>
            </>
          )}

          {activeView === 'stats' && (
            <EpithetStats
              monumenti={monumenti}
              onSelectMonumento={(m) => { setSelectedMonumento(m); setActiveView('catalog'); }}
              initialTab={statsPreset?.tab}
              initialDivinity={statsPreset?.exact && statsPreset.tab === 'divinita' ? statsPreset.term : undefined}
              // La tab onomastica non ha un campo di ricerca libera (solo
              // rubrica alfabetica + filtro regione): anche nel fallback non
              // esatto, la voce diretta "0 attestazioni per questo nome" è
              // il miglior atterraggio disponibile — meglio di un termine
              // silenziosamente ignorato.
              initialOnomastica={statsPreset?.tab === 'onomastica' ? statsPreset.term : undefined}
              initialSearch={!statsPreset?.exact && statsPreset?.tab === 'divinita' ? statsPreset.term : undefined}
            />
          )}
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
          {activeView === 'cult' && (
            <CultLexiconPanel
              monumenti={monumenti}
              onSelectMonumento={(m) => { setSelectedMonumento(m); setActiveView('catalog'); }}
            />
          )}
          {activeView === 'health' && effectiveAdmin && <CorpusHealth monumenti={monumenti} onSelectMonumento={(m) => { setSelectedMonumento(m); setActiveView('catalog'); }} />}
          {activeView === 'flags' && effectiveAdmin && (
            <RegistroPanel
              registri={registri}
              loading={registriLoading}
              onResolve={entryId => updateRegistroStatus(entryId, 'resolved')}
              onReopen={entryId => updateRegistroStatus(entryId, 'open')}
              onSelectEntry={entryId => {
                const m = monumenti.find(x => x.entryId === entryId || x.id.toString() === entryId);
                if (m) { setSelectedMonumento(m); setActiveView('catalog'); }
              }}
            />
          )}
          {activeView === 'bugs' && effectiveAdmin && (
            <BugReportsPanel
              bugs={bugs}
              loading={bugsLoading}
              knownAuthors={knownAuthors}
              onCreate={createBugReport}
              onResolve={id => updateBugStatus(id, 'resolved')}
              onReopen={id => updateBugStatus(id, 'open')}
            />
          )}
          {activeView === 'biblio' && effectiveAdmin && (
            <BibliographyIndex
              monumenti={monumenti}
              onApply={handleBiblioApply}
              progress={biblioProgress}
              onSelectMonumento={(m) => { setSelectedMonumento(m); setActiveView('catalog'); }}
            />
          )}
          {activeView === 'review' && <DraftReviewPanel />}
          {activeView === 'editor' && (
            <SectionEditorView
              monumenti={monumenti}
              effectiveAdmin={effectiveAdmin}
              currentUserEmail={currentUser?.email}
              onLogin={isStaticBuild ? () => setShowUnlockModal(true) : loginWithGoogle}
              onSave={handleSaveMetadata}
              onCreate={createMonumentoFromEditor}
              onExport={exportSingleRecord}
              initialEntryId={editorTargetEntryId}
              onInitialEntryIdConsumed={() => setEditorTargetEntryId(null)}
            />
          )}
          {activeView === 'timeline' && <Timeline monumenti={monumenti} onSelect={setSelectedMonumento} paused={!!selectedMonumento} />}
          {activeView === 'map' && <MapView monumenti={monumenti} onSelectMonumento={(id) => { const m = monumenti.find(x => x.id.toString() === id || x.entryId === id); if (m) { setSelectedMonumento(m); setActiveView('catalog'); } }} />}
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

      {/* Blocco salvataggio scheda disallineata — vedi handleSaveMetadata */}
      <AnimatePresence>
        {staleSaveEntryId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStaleSaveEntryId(null)}
              className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="relative w-full max-w-sm bg-parchment shadow-2xl border border-border rounded-2xl text-ink p-6 space-y-4"
            >
              <div className="flex items-center gap-2 font-sans font-bold uppercase tracking-widest text-xs text-accent">
                <AlertTriangle className="h-4 w-4" /> Salvataggio bloccato
              </div>
              <p className="text-sm font-serif text-ink/80 leading-relaxed">
                Questa scheda è stata modificata altrove (un'altra sessione di lavoro, o un
                aggiornamento diretto su GitHub) da quando l'hai aperta qui. Per non
                sovrascrivere quelle modifiche, il salvataggio è stato bloccato. Ricarica i
                dati e riapplica le tue modifiche sulla versione più recente.
              </p>
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => setStaleSaveEntryId(null)}
                  className="text-[11px] font-sans font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors px-3 py-2"
                >
                  Chiudi
                </button>
                <button
                  onClick={async () => {
                    const id = staleSaveEntryId;
                    setStaleSaveEntryId(null);
                    try {
                      const freshRes = await fetch('/api/monumenti');
                      if (freshRes.ok) {
                        const fresh: Monumento[] = await freshRes.json();
                        setMonumenti(fresh);
                        const freshTarget = id ? fresh.find(m => m.entryId === id) : undefined;
                        if (freshTarget) setSelectedMonumento(freshTarget);
                      }
                    } catch (err) {
                      console.error("Reload after stale save failed", err);
                    }
                  }}
                  className="text-[11px] font-sans font-bold uppercase tracking-widest bg-accent text-parchment px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Ricarica dati
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
                <div className="flex h-full flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                  {/* Left Metadata Rail */}
                  <div className="w-full md:w-56 bg-sidebar border-b md:border-b-0 md:border-r border-border p-5 md:p-6 flex flex-col shrink-0 md:overflow-y-auto custom-scrollbar">
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
                          className="text-[9px] font-sans font-semibold uppercase tracking-[0.15em] text-accent/80 flex items-center gap-1.5 hover:text-accent transition-colors"
                          title="Apri questa scheda nell'editor completo"
                        >
                          <Edit2 className="h-3 w-3" /> Modifica
                        </button>
                      )}
                    </div>

                    <div className="space-y-8">
                      <div className="border-l-2 border-accent pl-4">
                         <span className="text-3xl font-light italic leading-none">#{ selectedMonumento.id?.toString().padStart(3, '0') }</span>
                         <span className="block mt-2 font-sans field-label">
                           {selectedMonumento.id ? `Record #${selectedMonumento.id}` : 'Nuovo Record'}
                         </span>
                      </div>

                      {/* Navigazione a sezioni della scheda: pannelli discreti (stile "glass") */}
                      <nav className="space-y-1.5 -mx-1">
                        {RECORD_SECTIONS.map(({ id, label }) => {
                          const active = activeRecordSection === id;
                          return (
                            <button
                              key={id}
                              onClick={() => goToRecordSection(id)}
                              className={cn(
                                "w-full text-left px-3.5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200",
                                active
                                  ? "nav-pill-active text-accent"
                                  : "text-muted hover:text-ink"
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </nav>

                      <section className="space-y-4">
                        <h4 className="font-sans field-label opacity-85 pb-2 border-b border-border/40">Dettagli</h4>
                        <dl className="space-y-3">
                          {[
                            { label: 'Regione', value: selectedMonumento.regione, display: selectedMonumento.regione, type: 'regione' },
                            { label: 'Località', value: selectedMonumento.citta, display: selectedMonumento.citta, type: 'citta' },
                            { label: 'Datazione', value: formatDateRange(selectedMonumento.data_inizio, selectedMonumento.data_fine), display: formatDateRange(selectedMonumento.data_inizio, selectedMonumento.data_fine), type: '' },
                            { label: 'Tipologia', value: selectedMonumento.tipo, display: labelType(selectedMonumento.tipo || ''), type: 'tipo' },
                            { label: 'Materiale', value: selectedMonumento.materiale, display: labelMaterial(selectedMonumento.materiale || ''), type: '' }
                          ].filter(item => item.value && item.value !== '-').map(item => (
                            <div key={item.label}>
                              <dt className="text-[9px] font-sans font-bold uppercase text-muted/80 tracking-tighter">{item.label}</dt>
                              {item.type ? (
                                <button
                                  onClick={() => { setFilters(f => ({ ...f, [item.type]: item.value })); setSelectedMonumento(null); }}
                                  className="text-xs font-semibold text-ink mt-0.5 font-serif hover:text-accent transition-colors block text-left capitalize"
                                >
                                  {item.display}
                                </button>
                              ) : (
                                <dd className="text-xs font-semibold text-ink mt-0.5 font-serif capitalize">{item.display}</dd>
                              )}
                            </div>
                          ))}
                        </dl>
                      </section>

                      {effectiveAdmin && (
                        <section className="pt-5 border-t border-border/40 mt-5">
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

                      <RegistroForm
                        entryId={selectedMonumento.entryId ?? selectedMonumento.id?.toString() ?? ''}
                        entryLabel={formatIlaLabel(selectedMonumento.id)}
                        registro={registri.find(r => r.entryId === (selectedMonumento.entryId ?? selectedMonumento.id?.toString() ?? ''))}
                        effectiveAdmin={effectiveAdmin}
                        knownAuthors={knownAuthors}
                        onCreate={createRegistroNote}
                        onResolve={entryId => updateRegistroStatus(entryId, 'resolved')}
                        onReopen={entryId => updateRegistroStatus(entryId, 'open')}
                      />

                     </div>
                   </div>

                  {/* Main Content Area */}
                  <div ref={recordContentRef} className="flex-1 min-h-0 bg-parchment p-6 md:p-16 md:overflow-hidden">
                  {activeRecordSection === 'supporto' && (
                  <div className="animate-in fade-in duration-200 md:-mt-8">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 mr-4">
                        {true && (
                          <div className="flex flex-col gap-1 mb-2">
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
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-tighter">
                                {formatIlaLabel(selectedMonumento.id)}
                              </span>
                              {selectedMonumento.tm && (
                                selectedMonumento.tmLink ? (
                                  <a
                                    href={selectedMonumento.tmLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 bg-sidebar text-muted hover:text-accent text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm transition-colors"
                                    title="Apri la scheda su Trismegistos"
                                  >
                                    TM {selectedMonumento.tm} <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                ) : (
                                  <span className="bg-sidebar text-muted text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-tighter">
                                    TM {selectedMonumento.tm}
                                  </span>
                                )
                              )}
                              {selectedMonumento.editorialStatus && (
                                <span
                                  className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm",
                                    selectedMonumento.editorialStatus === 'under-revision' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                    selectedMonumento.editorialStatus === 'draft' && "bg-sidebar text-muted",
                                    (selectedMonumento.editorialStatus === 'published' || selectedMonumento.editorialStatus === 'diplomatic-edition') && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  )}
                                  title="Stato editoriale (TEI revisionDesc/@status)"
                                >
                                  {EDITORIAL_STATUS_LABELS[selectedMonumento.editorialStatus]}
                                </span>
                              )}
                              {selectedMonumento.textTypes?.map((tt, idx) => (
                                <span key={idx} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm">
                                  {labelInscriptionType(tt)}
                                </span>
                              ))}
                              <button
                                onClick={() => setCompareList(prev => prev.some(m => m.entryId === selectedMonumento.entryId) ? prev : [...prev, selectedMonumento])}
                                className="text-[9px] font-bold uppercase hover:text-accent transition-colors underline underline-offset-2 ml-1"
                              >
                                + Confronta
                              </button>
                            </div>
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-ink leading-tight font-serif">
                              {getDisplayTitle(selectedMonumento)}
                            </h2>
                            <div className="ornament-rule !my-0 mt-2 max-w-[6rem] mx-0" />
                          </div>
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
                        </div>
                      )}
                      
                    </div>
                    
                      <div className="space-y-5 mt-1">
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

                        <div className="grid md:grid-cols-2 gap-6 border border-border/40 bg-sidebar/20 p-5 md:p-6 rounded-sm font-serif text-xs leading-relaxed text-ink/80">
                          <div>
                            <h4 className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent mb-3 pb-1 border-b border-border/30">Layout & Supporto Materiale</h4>
                            {(selectedMonumento.layout_desc || selectedMonumento.supporto) && (
                              <p className="mb-3 text-ink-70 select-text font-serif leading-relaxed">{selectedMonumento.layout_desc || selectedMonumento.supporto}</p>
                            )}
                            <div className="space-y-1.5 text-[10px] font-sans border-t border-border/20 pt-2.5">
                              {selectedMonumento.scrittura && (
                                <div>
                                  <span className="text-muted uppercase font-bold text-[9px]">Scrittura:</span>{' '}
                                  <span className="text-ink font-serif italic text-xs">{selectedMonumento.scrittura}</span>
                                  {isFilled(selectedMonumento.scrittura_ref) && (
                                    <a href={selectedMonumento.scrittura_ref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-accent hover:underline ml-2 align-middle font-mono">
                                      EAGLE Writing Link ↗
                                    </a>
                                  )}
                                </div>
                              )}
                              {isFilled(selectedMonumento.scrittura_note) && <div><span className="text-muted uppercase font-bold text-[9px]">Note paleografiche:</span> <span className="text-ink font-serif text-xs">{selectedMonumento.scrittura_note}</span></div>}

                              {selectedMonumento.tipo && (
                                <div>
                                  <span className="text-muted uppercase font-bold text-[9px]">Tipo oggetto:</span>{' '}
                                  <span className="text-ink font-serif italic text-xs capitalize">{labelType(selectedMonumento.tipo)}</span>
                                  {isFilled(selectedMonumento.tipo_ref) && (
                                    <a href={selectedMonumento.tipo_ref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-accent hover:underline ml-2 align-middle font-mono">
                                      EAGLE Object Link ↗
                                    </a>
                                  )}
                                </div>
                              )}

                              {selectedMonumento.materiale && (
                                <div>
                                  <span className="text-muted uppercase font-bold text-[9px]">Materiale:</span>{' '}
                                  <span className="text-ink font-serif italic text-xs capitalize">{labelMaterial(selectedMonumento.materiale)}</span>
                                  {isFilled(selectedMonumento.materialRef) && (
                                    <a href={selectedMonumento.materialRef} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-accent hover:underline ml-2 align-middle font-mono">
                                      EAGLE Material Link ↗
                                    </a>
                                  )}
                                </div>
                              )}

                              {(selectedMonumento.dim_altezza || selectedMonumento.dim_larghezza || selectedMonumento.dim_profondita) ? (
                                <div>
                                  <span className="text-muted uppercase font-bold text-[9px]">Dimensioni:</span>{' '}
                                  <span className="text-ink font-serif italic text-xs">
                                    {[
                                      selectedMonumento.dim_altezza && `h ${selectedMonumento.dim_altezza}`,
                                      selectedMonumento.dim_larghezza && `l ${selectedMonumento.dim_larghezza}`,
                                      selectedMonumento.dim_profondita && `p ${selectedMonumento.dim_profondita}`,
                                    ].filter(Boolean).join(' × ')} {labelUnit(selectedMonumento.dim_unita || 'cm')}
                                  </span>
                                </div>
                              ) : (
                                selectedMonumento.dim && <div><span className="text-muted uppercase font-bold text-[9px]">Dati di Supporto (Dim):</span> <span className="text-ink font-serif text-xs">{stripXml(selectedMonumento.dim)}</span></div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent mb-3 pb-1 border-b border-border/30">Georeferenziazione & Date Storiche</h4>
                            <div className="space-y-3">
                              {(selectedMonumento.citta || selectedMonumento.luogo_rit) && (
                                <div className="grid grid-cols-2 gap-2">
                                  {selectedMonumento.citta && (
                                    <div>
                                      <span className="text-muted uppercase font-bold text-[9px] block">Città Antica (Pleiades)</span>
                                      <span className="font-serif font-semibold text-ink text-xs block truncate" title={selectedMonumento.citta}>{selectedMonumento.citta}</span>
                                      {isFilled(selectedMonumento.place_ref_ancient) && (
                                        <a href={selectedMonumento.place_ref_ancient} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-accent hover:underline font-mono truncate max-w-full mt-1">
                                          Pleiades Link
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {selectedMonumento.luogo_rit && (
                                    <div>
                                      <span className="text-muted uppercase font-bold text-[9px] block">Rinvenimento Moderno</span>
                                      <span className="font-serif font-semibold text-ink text-xs block truncate" title={selectedMonumento.luogo_rit}>{selectedMonumento.luogo_rit}</span>
                                      {isFilled(selectedMonumento.place_ref_modern) && (
                                        <a href={selectedMonumento.place_ref_modern} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] text-accent hover:underline font-mono truncate max-w-full mt-1">
                                          GeoNames Link
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              <PleiadesMap pleiadesUri={isFilled(selectedMonumento.place_ref_ancient) ? selectedMonumento.place_ref_ancient : undefined} cityName={selectedMonumento.citta} />

                              {selectedMonumento.origDates && selectedMonumento.origDates.length > 0 && (
                                <div className="border-t border-border/20 pt-3">
                                  <span className="text-muted uppercase font-bold text-[9px] block mb-2">Datazione del monumento</span>
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
                                            ({formatEraYear(od.notBeforeCustom)}{od.notAfterCustom ? ` / ${formatEraYear(od.notAfterCustom)}` : ''})
                                          </span>
                                        )}
                                        {od.evidence && (
                                          <span className="text-[8px] font-sans font-bold uppercase tracking-widest text-muted/50 ml-1 border border-border/40 px-1 rounded-sm">
                                            {labelEvidence(od.evidence)}
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
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
                  </div>
                  )}
                  {activeRecordSection === 'iscrizione' && (
                    <div className="space-y-14 animate-in fade-in duration-200 max-w-[70ch] mx-auto">
                      <section>
                         <h3 className="text-2xl font-bold mb-6 italic flex items-center gap-4">
                           <div className="flex items-center gap-4 shrink-0">
                             <div className="h-[1px] w-8 bg-border/40" />
                             <div className="w-1.5 h-1.5 rotate-45 border border-accent/40" />
                           </div>
                           Trascrizione Testuale
                           <div className="flex-1 h-[1px] bg-border/20" />
                           {!isStaticBuild && effectiveAdmin && selectedMonumento.testo && (
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
                           <div className="space-y-8">
                             <LegendaDropdown />
                             <div className="bg-sidebar/50 border border-border p-8 md:p-12 text-lg md:text-2xl text-ink/90 shadow-inner relative"
                     style={{ fontFamily: 'var(--font-greek)', lineHeight: '2' }}>
                                {selectedMonumento.testo && (
                                  <button
                                    type="button"
                                    onClick={() => setPlainTranscription(v => !v)}
                                    aria-pressed={plainTranscription}
                                    title={plainTranscription
                                      ? 'Mostra il testo con il markup diacritico (parentesi, colori, note)'
                                      : 'Mostra la trascrizione pura, senza markup'}
                                    className="absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-sm border border-border/60 bg-background/80 backdrop-blur px-2 py-1 font-sans text-[9px] font-bold uppercase tracking-widest text-muted transition-colors hover:text-accent hover:border-accent/40"
                                  >
                                    {plainTranscription
                                      ? <><Tags className="h-3 w-3" /> Con markup</>
                                      : <><Type className="h-3 w-3" /> Trascrizione pura</>}
                                  </button>
                                )}
                                <div className="relative z-10 max-w-[62ch] mx-auto pl-10 border-l-2 border-border/40 max-h-[52vh] overflow-y-auto custom-scrollbar pr-4 pt-10">
                                  {selectedMonumento.testo ? (
                                    <EpiDocRenderer
                                      xml={selectedMonumento.testo}
                                      query={filters.searchText}
                                      onTermClick={handleTermClick}
                                      divinityIndex={divinityIndex}
                                      onomasticaIndex={onomasticaIndex}
                                      plain={plainTranscription}
                                    />
                                  ) : <span className="opacity-40 italic">[Anepigrafe]</span>}
                                </div>
                             </div>
                             {selectedMonumento.traduzioni && selectedMonumento.traduzioni.filter(t => t.testo).length > 0 && (() => {
                               const isIt = (l: string) => l === 'it' || l.startsWith('it (');
                               const sorted = [...selectedMonumento.traduzioni!.filter(t => t.testo)].sort((a, b) => {
                                 const aIt = isIt(a.lang?.toLowerCase() || '') ? 0 : 1;
                                 const bIt = isIt(b.lang?.toLowerCase() || '') ? 0 : 1;
                                 return aIt - bIt;
                               });
                               const active = sorted.find(t => t.lang === activeTranslationLang) ?? sorted[0];
                               return (
                                 <div className="bg-sidebar/30 border-l-4 border-accent p-8 font-serif text-lg italic leading-relaxed text-ink/80 mb-6">
                                   <div className="flex items-center justify-between gap-4 mb-2 not-italic">
                                     <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-muted">Traduzione</span>
                                     {sorted.length > 1 && (
                                       <div className="flex items-center gap-1">
                                         {sorted.map((t, i) => (
                                           <button
                                             key={`${t.lang}-${i}`}
                                             onClick={() => setActiveTranslationLang(t.lang ?? null)}
                                             className={cn(
                                               "px-1.5 py-0.5 text-[8px] font-sans font-bold uppercase tracking-wider rounded-sm transition-colors",
                                               t === active ? "bg-accent text-white" : "text-muted/70 hover:text-accent"
                                             )}
                                             title={t.lang}
                                           >
                                             {(t.lang || '?').slice(0, 2).toUpperCase()}
                                           </button>
                                         ))}
                                       </div>
                                     )}
                                   </div>
                                   <Highlight text={stripXml(active?.testo)} query={filters.searchText} />
                                   {active?.note && <p className="text-[10px] font-sans not-italic text-muted mt-3">Note: {active.note}</p>}
                                 </div>
                               );
                             })()}
                             {hasApparatusContent(selectedMonumento.apparatus) && (
                               <div className="bg-sidebar/20 border border-border/40 p-6 rounded-sm font-sans text-xs leading-relaxed text-muted block">
                                 <div className="text-[9px] font-sans font-bold uppercase tracking-widest text-muted mb-2 font-semibold">Apparatus Critico</div>
                                 <Highlight text={stripXml(selectedMonumento.apparatus)} query={filters.searchText} />
                               </div>
                             )}
                           </div>
                      </section>

                      {isFilled(selectedMonumento.note_interne) && (
                        <section>
                           <h3 className="text-2xl font-bold mb-6 italic flex items-center gap-4">
                             <div className="flex items-center gap-4 shrink-0">
                               <div className="h-[1px] w-8 bg-border/40" />
                               <div className="w-1.5 h-1.5 rotate-45 border border-accent/40" />
                             </div>
                             Commento
                             <div className="flex-1 h-[1px] bg-border/20" />
                           </h3>
                           <p className="text-sm leading-relaxed text-ink/80 font-serif whitespace-pre-wrap">
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
                            </p>
                        </section>
                      )}
                    </div>
                  )}

                  {activeRecordSection === 'iconografia' && (
                    <div className="space-y-14 animate-in fade-in duration-200">
                      <section>
                         <h3 className="text-2xl font-bold mb-6 italic flex items-center gap-4">
                           <div className="flex items-center gap-4 shrink-0">
                             <div className="h-[1px] w-8 bg-border/40" />
                             <div className="w-1.5 h-1.5 rotate-45 border border-accent/40" />
                           </div>
                           Indici
                           <div className="flex-1 h-[1px] bg-border/20" />
                         </h3>
                         {(selectedMonumento.divinita?.length || selectedMonumento.epiteti?.length || selectedMonumento.onomastica?.length || selectedMonumento.imperatori?.length) ? (
                           <div className="grid sm:grid-cols-2 gap-x-10 gap-y-6">
                            {selectedMonumento.divinita && selectedMonumento.divinita.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold uppercase text-muted tracking-widest mb-2">Divinità</h4>
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
                            {selectedMonumento.epiteti && selectedMonumento.epiteti.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold uppercase text-muted tracking-widest mb-2">Epiteti</h4>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {selectedMonumento.epiteti.map(e => (
                                    <button
                                      key={e}
                                      onClick={() => { setFilters(f => ({ ...f, searchText: e })); setSelectedMonumento(null); }}
                                      className="border border-accent/20 bg-accent/5 text-accent px-3 py-1 text-xs italic rounded-full font-serif hover:bg-accent hover:text-white transition-all cursor-pointer"
                                    >
                                      {e}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedMonumento.onomastica && selectedMonumento.onomastica.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold uppercase text-muted tracking-widest mb-2 font-sans">Onomastica</h4>
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
                            {selectedMonumento.imperatori && selectedMonumento.imperatori.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold uppercase text-muted tracking-widest mb-2">Imperatori</h4>
                                <div className="flex flex-wrap gap-2">
                                  {selectedMonumento.imperatori.map((imp: string) => (
                                    <button key={imp}
                                      onClick={() => { setFilters(f => ({ ...f, searchText: imp })); setSelectedMonumento(null); }}
                                      className="border border-accent/40 text-accent/70 px-3 py-1 text-xs font-serif hover:border-accent hover:text-accent transition-all cursor-pointer rounded-full"
                                    >{imp}</button>
                                  ))}
                                </div>
                              </div>
                            )}
                           </div>
                         ) : (
                           <p className="text-xs font-serif text-muted italic">Nessun indice registrato.</p>
                         )}
                      </section>

                      <section>
                        <h3 className="text-xs font-bold uppercase text-muted tracking-widest mb-3">Commento Iconografico</h3>
                        {selectedMonumento.iconografia?.note ? (
                          <p className="text-xs leading-relaxed text-ink/80 italic font-serif whitespace-pre-wrap border-l-2 border-accent/40 pl-4">
                            {selectedMonumento.iconografia.note}
                          </p>
                        ) : (
                          <p className="text-xs font-serif text-muted italic">Nessun commento registrato.</p>
                        )}
                      </section>

                      <IconographyPanel monumento={selectedMonumento} />
                    </div>
                  )}

                  {activeRecordSection === 'bibliografia' && (
                    <div className="animate-in fade-in duration-200 max-w-[70ch]">
                      {selectedMonumento.bibliografia && selectedMonumento.bibliografia.length > 0 ? (
                      <section>
                         <h3 className="text-xl font-bold mb-6 italic flex items-center gap-3">
                           <div className="h-px w-8 bg-border" /> Bibliografia
                         </h3>
                            <>
                              {selectedMonumento.bibliografia.length === 1 && selectedMonumento.bibliografia[0].titolo.length > 60 ? (
                                <p className="text-xs font-serif text-ink/80 leading-relaxed">
                                  {selectedMonumento.bibliografia[0].titolo}
                                </p>
                              ) : (
                                <ul className="space-y-3">
                                  {selectedMonumento.bibliografia.map((b, i) => (
                                    <li key={i} className="text-xs flex gap-2 font-serif">
                                      <Book className="h-3 w-3 text-muted shrink-0 mt-0.5" />
                                      <span className="font-semibold text-ink">{formatBiblKey(b.titolo)}</span>
                                      {b.punti_rif && <span className="text-muted">({b.punti_rif})</span>}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </>
                      </section>
                      ) : (
                        <p className="text-xs font-serif text-muted italic">Nessun riferimento bibliografico registrato.</p>
                      )}
                    </div>
                  )}
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
                    <h4 className="text-2xl font-bold">{m.citta}</h4>
                    <span className="text-xs text-muted font-sans uppercase font-bold tracking-tighter">{formatIlaLabel(m.id)} • {m.regione}</span>
                  </div>

                  <div className="space-y-8">
                    <section>
                      <h5 className="text-[9px] font-bold uppercase text-muted underline underline-offset-4 mb-3 font-sans">Trascrizione</h5>
                      <div className="text-sm bg-sidebar/50 p-4 border border-border/40"
                           style={{ fontFamily: 'var(--font-greek)', lineHeight: '1.9' }}>
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
                        <div><span className="text-muted block text-[8px] tracking-widest">Tipologia</span> {labelType(m.tipo)}</div>
                        <div><span className="text-muted block text-[8px] tracking-widest">Datazione</span> {m.data}</div>
                        <div><span className="text-muted block text-[8px] tracking-widest">Materiale</span> {labelMaterial(m.materiale)}</div>
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

      {isStaticBuild && showUnlockModal && (
        <UnlockEditingModal
          onClose={() => setShowUnlockModal(false)}
          onSubmit={handleUnlockSubmit}
          onUnlocked={handleUnlocked}
        />
      )}

      {activePopover && (
        <TermStatsPopover
          action={activePopover}
          onExpand={handleExpandPopover}
          onClose={() => setActivePopover(null)}
        />
      )}
    </div>
    </MotionConfig>
  );
}