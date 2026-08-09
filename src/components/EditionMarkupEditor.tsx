import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Check, X, AlertTriangle, Eye, Code2,
  Loader2, Stethoscope, ChevronLeft, Sparkles, Link2, CornerDownLeft, Search
} from 'lucide-react';
import { cn, stripAccents } from '../lib/utils';
import {
  MarkupToken, TokenPath, MarkupAction, ValidationIssue, EpithetScanIssue, LbInfo,
  parseEdition, serializeEdition, collectLbs, tokenize, serializeTokens, sliceText,
  wrapSlice, unwrapElement, removeElement, updateElementAttrs, appendElement,
  validateEditionTokens, scanEpithetIssues, MARKUP_ACTIONS, DIVINE_KEYS,
} from '../lib/leidenMarkup';

/* ================================================================
 * EditionMarkupEditor — inserimento assistito Leiden/EpiDoc
 * Modello a flusso unico: gli <lb> sono token, anche annidati nei
 * tag (persName/epiteti che attraversano il cambio riga).
 * ================================================================ */

interface Props {
  value: string;
  onChange: (xml: string) => void;
  anepigrafo?: boolean;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Legenda hover leggera: sostituisce il title nativo del browser (piccolo, ritardato, poco leggibile). */
const Tip: React.FC<{ label: string; children: React.ReactNode; side?: 'top' | 'bottom' }> = ({ label, children, side = 'top' }) => {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12, ease: EASE_OUT }}
            className={cn(
              'absolute left-1/2 -translate-x-1/2 z-50 px-2.5 py-1.5 rounded-lg text-[11px] font-sans whitespace-nowrap pointer-events-none',
              'bg-zinc-900/95 text-white shadow-lg border border-white/10',
              side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};



interface Sel {
  startPath: TokenPath; startOffset: number;
  endPath: TokenPath; endOffset: number;
  text: string; x: number; y: number;
}

interface MenuState {
  sel: Sel | null;          // null = inserimento a fine flusso
  step: 'list' | 'params';
  action?: MarkupAction;
  params: Record<string, string>;
  x: number; y: number;
}

interface ElPopover { path: TokenPath; token: MarkupToken & { kind: 'el' }; x: number; y: number; }

export const EditionMarkupEditor: React.FC<Props> = ({ value, onChange, anepigrafo }) => {
  const [tokens, setTokens] = useState<MarkupToken[]>(() => parseEdition(value));
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [pop, setPop] = useState<ElPopover | null>(null);
  const [tab, setTab] = useState<'anteprima' | 'xml'>('anteprima');
  const [xmlDraft, setXmlDraft] = useState<string | null>(null);
  const [xmlError, setXmlError] = useState<string | null>(null);
  const [selWarn, setSelWarn] = useState<string | null>(null);
  const [scan, setScan] = useState<{ running: boolean; done: number; total: number; issues: EpithetScanIssue[] } | null>(null);
  const lastEmitted = useRef(value);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setTokens(parseEdition(value));
      lastEmitted.current = value;
    }
  }, [value]);

  const commit = useCallback((next: MarkupToken[]) => {
    setTokens(next);
    const xml = serializeEdition(next);
    lastEmitted.current = xml;
    onChange(xml);
  }, [onChange]);

  const issues = useMemo(() => {
    try { return validateEditionTokens(tokens); }
    catch (e: any) { return [{ severity: 'error', line: 0, message: e.message } as ValidationIssue]; }
  }, [tokens]);
  const lbs = useMemo(() => collectLbs(tokens), [tokens]);
  const lbByPath = useMemo(() => {
    const m = new Map<string, LbInfo>();
    lbs.forEach(l => m.set(l.path.join('.'), l));
    return m;
  }, [lbs]);
  const isEmpty = tokens.every(t => t.kind === 'el' && t.name === 'lb') && lbs.length <= 1;

  /* ── selezione (anche attraverso gli lb, stesso genitore) ────── */
  const onMouseUp = () => {
    const s = window.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) { setSelWarn(null); return; }
    const range = s.getRangeAt(0);
    const hostOf = (n: Node | null) => (n?.parentElement as HTMLElement | null)?.closest('[data-tok]');
    const a = hostOf(range.startContainer), b = hostOf(range.endContainer);
    if (!a || !b || !rootRef.current?.contains(a)) return;
    const pa = JSON.parse(a.getAttribute('data-tok') || '[]') as TokenPath;
    const pb = JSON.parse(b.getAttribute('data-tok') || '[]') as TokenPath;
    if (pa.slice(0, -1).join('.') !== pb.slice(0, -1).join('.')) {
      setSelWarn('La selezione non può attraversare tag di livello diverso: seleziona testo con lo stesso genitore (gli accapi sono ammessi).');
      return;
    }
    setSelWarn(null);
    // ordina start/end secondo la posizione nel documento
    const forward = pa[pa.length - 1] < pb[pb.length - 1] || (a === b && range.startOffset <= range.endOffset);
    const sel: Sel = forward
      ? { startPath: pa, startOffset: range.startOffset, endPath: pb, endOffset: range.endOffset, text: s.toString(), x: 0, y: 0 }
      : { startPath: pb, startOffset: range.endOffset, endPath: pa, endOffset: range.startOffset, text: s.toString(), x: 0, y: 0 };
    const rect = range.getBoundingClientRect();
    sel.x = rect.left + rect.width / 2; sel.y = rect.bottom;
    setPop(null);
    setMenu({ sel, step: 'list', params: {}, x: sel.x, y: sel.y });
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-markup-menu]') && !t.closest('[data-el-popover]')) { setMenu(null); setPop(null); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); setPop(null); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  /* ── applicazione azione ─────────────────────────────────────── */
  const applyAction = (action: MarkupAction, params: Record<string, string>) => {
    try {
      if (menu?.sel) {
        const { startPath, startOffset, endPath, endOffset } = menu.sel;
        const composer = (slice: MarkupToken[]) =>
          action.compose ? action.compose(slice, params) : action.build(sliceText(slice), params);
        commit(wrapSlice(tokens, startPath, startOffset, endPath, endOffset, composer));
      } else {
        commit(appendElement(tokens, action.build('', params)));
      }
      setSelWarn(null);
    } catch (e: any) {
      // wrapSlice/build possono rifiutare l'operazione (es. selezione non
      // valida per questa azione): senza questo avviso l'utente non ha
      // nessun segnale che l'azione non è stata applicata.
      setSelWarn(`Impossibile applicare "${action.label}": ${e?.message || 'selezione non valida per questa azione.'}`);
    }
    setMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const pickAction = (action: MarkupAction) => {
    if (!menu) return;
    if (action.params && action.params.length > 0) {
      const prefill: Record<string, string> = {};
      action.params.forEach(p => {
        prefill[p.id] = p.prefill ? p.prefill(menu.sel?.text || '') : (p.type === 'select' && p.options ? p.options[0] : '');
      });
      setMenu({ ...menu, step: 'params', action, params: prefill });
    } else applyAction(action, {});
  };

  /* ── operazioni su elementi e righe ──────────────────────────── */
  const doUnwrap = () => { if (pop) { commit(unwrapElement(tokens, pop.path)); setPop(null); } };
  const doRemove = () => { if (pop) { commit(removeElement(tokens, pop.path)); setPop(null); } };
  const doUpdateAttrs = (attrs: Record<string, string>) => { if (pop) { commit(updateElementAttrs(tokens, pop.path, attrs)); setPop(null); } };

  const toggleBreak = (info: LbInfo) => {
    if (info.n === 1) return;
    commit(updateElementAttrs(tokens, info.path, { break: info.breakNo ? '' : 'no' }));
  };
  const deleteLb = (info: LbInfo) => {
    if (lbs.length <= 1) return;
    commit(removeElement(tokens, info.path));
  };
  const addLineAtEnd = () =>
    commit(appendElement(tokens, { kind: 'el', name: 'lb', attrs: { n: String(lbs.length + 1) }, children: [], selfClosing: true }));

  const applyXmlDraft = () => {
    if (xmlDraft === null) return;
    try {
      const next = parseEdition(xmlDraft);
      validateEditionTokens(next); // il malformato lancia dal tokenize
      commit(next);
      setXmlDraft(null); setXmlError(null);
    } catch (e: any) { setXmlError(e.message); }
  };

  /* ── scanner diagnostico corpus ──────────────────────────────── */
  const runScan = async () => {
    setScan({ running: true, done: 0, total: 0, issues: [] });
    try {
      const res = await fetch('/api/corpus/files');
      const files: any[] = res.ok ? await res.json() : [];
      const names = files.map(f => typeof f === 'string' ? f : f.filename).filter(Boolean);
      const all: EpithetScanIssue[] = [];
      for (let i = 0; i < names.length; i++) {
        try {
          const fr = await fetch(`/api/corpus/file/${encodeURIComponent(names[i])}`);
          if (fr.ok) all.push(...scanEpithetIssues(await fr.text(), names[i]));
        } catch { /* si prosegue */ }
        setScan({ running: true, done: i + 1, total: names.length, issues: [...all] });
      }
      setScan({ running: false, done: names.length, total: names.length, issues: all });
    } catch { setScan({ running: false, done: 0, total: 0, issues: [] }); }
  };

  /* ================================================================ */

  return (
    <div className="space-y-4" ref={rootRef}>
      {isEmpty && (
        <InitialPaste anepigrafo={anepigrafo} onCreate={txtLines => {
          const out: MarkupToken[] = [];
          txtLines.forEach((l, i) => {
            out.push({ kind: 'el', name: 'lb', attrs: { n: String(i + 1) }, children: [], selfClosing: true });
            if (l) out.push({ kind: 'text', value: l });
          });
          commit(out);
        }} />
      )}

      {!isEmpty && (
        <div className="bg-white/50 dark:bg-white/5 border border-border/40 rounded-xl px-5 py-6 backdrop-blur-sm min-h-[280px]" onMouseUp={onMouseUp}>
          <div className="font-serif text-[21px] md:text-[23px] leading-[2.3] text-ink pl-20 py-2" lang="grc">
            <TokenFlow
              tokens={tokens} basePath={[]} lbByPath={lbByPath} lbCount={lbs.length}
              onElClick={(path, token, ev) => {
                // Se l'utente sta selezionando testo (anche dentro un tag già presente),
                // il click che segue il mouseup non deve chiudere il menu di markup appena
                // aperto per sostituirlo col popup "modifica" — la selezione vince sempre.
                const activeSel = window.getSelection();
                if (activeSel && !activeSel.isCollapsed && activeSel.toString().length > 0) return;
                ev.stopPropagation();
                const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                setMenu(null);
                setPop({ path, token: token as any, x: r.left + r.width / 2, y: r.bottom });
              }}
              onToggleBreak={toggleBreak}
              onDeleteLb={deleteLb}
            />
          </div>
          <div className="flex items-center gap-4 mt-3 pl-20">
            <button onClick={addLineAtEnd} className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent/70 transition-colors">
              <CornerDownLeft className="w-3 h-3" /> Aggiungi riga
            </button>
            <button onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setPop(null); setMenu({ sel: null, step: 'list', params: {}, x: r.left, y: r.bottom }); }}
              className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold uppercase tracking-[0.12em] text-muted hover:text-accent transition-colors">
              <Plus className="w-3 h-3" /> Inserisci lacuna / vacat
            </button>
          </div>
          <p className="text-[10px] text-muted/50 italic mt-2.5 pl-20 select-none">
            Seleziona il greco (anche attraverso gli accapi) per il menu di markup · clicca un tag per modificarlo · ⌁ nel margine = break="no"
          </p>
        </div>
      )}

      {selWarn && (
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/8 border border-amber-500/25 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {selWarn}
        </div>
      )}

      {issues.length > 0 && (
        <div className="space-y-1.5">
          {issues.map((iss, i) => (
            <div key={i} className={cn(
              'flex items-start gap-2 text-xs rounded-lg px-3 py-2 border font-serif',
              iss.severity === 'error'
                ? 'text-red-700 dark:text-red-400 bg-red-500/8 border-red-500/25'
                : 'text-amber-800 dark:text-amber-400 bg-amber-500/8 border-amber-500/25',
            )}>
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span><span className="font-mono not-italic text-[10px] opacity-60 mr-1.5">r.{iss.line}</span>{iss.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── anteprima / XML modificabile ── */}
      {!isEmpty && (
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="flex items-center gap-1 px-3 pt-2.5 border-b border-border/30">
            {(['anteprima', 'xml'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setXmlDraft(null); setXmlError(null); }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.16em] rounded-t-lg transition-colors border-b-2 -mb-px',
                  tab === t ? 'text-accent border-accent' : 'text-muted/60 border-transparent hover:text-ink',
                )}>
                {t === 'anteprima' ? <Eye className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
                {t === 'anteprima' ? 'Anteprima' : 'XML'}
              </button>
            ))}
          </div>
          <div className="p-5">
            {tab === 'anteprima' ? (
              <div className="font-serif text-[19px] leading-loose text-ink pl-8" lang="grc">
                <TokenFlow tokens={tokens} basePath={[]} lbByPath={lbByPath} lbCount={lbs.length} preview />
              </div>
            ) : (
              <div>
                <textarea
                  rows={12}
                  value={xmlDraft ?? serializeEdition(tokens)}
                  onChange={e => { setXmlDraft(e.target.value); setXmlError(null); }}
                  spellCheck={false}
                  className="w-full font-mono text-[11px] leading-relaxed text-ink/90 bg-white/60 dark:bg-black/30 border border-border/40 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-accent/40 custom-scrollbar"
                />
                {xmlError && <p className="text-[11px] text-red-500 mt-1.5">{xmlError}</p>}
                {xmlDraft !== null && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={applyXmlDraft} className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white hover:shadow-md transition-all">
                      <Check className="w-3 h-3" /> Applica XML
                    </button>
                    <button onClick={() => { setXmlDraft(null); setXmlError(null); }} className="text-[10px] font-sans font-bold uppercase tracking-[0.12em] text-muted hover:text-ink px-3 transition-colors">
                      Annulla
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── diagnosi epiteti sul corpus ── */}
      <div className="pt-1">
        <button onClick={runScan} disabled={scan?.running}
          className="inline-flex items-center gap-2 text-xs font-sans font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent/70 transition-colors disabled:opacity-50">
          {scan?.running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stethoscope className="w-3.5 h-3.5" />}
          {scan?.running ? `Diagnosi in corso… ${scan.done}/${scan.total}` : 'Diagnosi epiteti separati sul corpus'}
        </button>
        {scan && !scan.running && (
          <div className="mt-3 space-y-1.5">
            {scan.issues.length === 0 ? (
              <p className="text-xs text-accent font-serif italic flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Nessun teonimo/epiteto separato trovato nel corpus.</p>
            ) : (
              <>
                <p className="text-xs text-muted font-serif italic">
                  {scan.issues.length} segnalazion{scan.issues.length === 1 ? 'e' : 'i'} — solo diagnosi, nessun file modificato.
                </p>
                {scan.issues.map((iss, i) => (
                  <div key={i} className="text-xs bg-white/40 dark:bg-white/5 border border-border/40 rounded-lg px-3 py-2 font-serif">
                    <span className="font-mono text-[10px] text-accent">{iss.filename}</span>
                    <span className="text-ink ml-2">{iss.problem}</span>
                    <div className="font-mono text-[10px] text-muted/60 mt-0.5 truncate">{iss.snippet}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {menu && <MarkupMenu menu={menu} setMenu={setMenu} onApply={applyAction} onPick={pickAction} />}
      </AnimatePresence>
      <AnimatePresence>
        {pop && <ElementPopover pop={pop} onClose={() => setPop(null)} onUnwrap={doUnwrap} onRemove={doRemove} onUpdate={doUpdateAttrs} />}
      </AnimatePresence>
    </div>
  );
};

/* ================================================================ */
/* Inserimento iniziale                                              */
/* ================================================================ */

const InitialPaste: React.FC<{ anepigrafo?: boolean; onCreate: (lines: string[]) => void }> = ({ anepigrafo, onCreate }) => {
  const [draft, setDraft] = useState('');
  return (
    <div className="bg-white/50 dark:bg-white/5 border border-border/40 rounded-xl p-5 backdrop-blur-sm">
      <p className="text-xs text-muted font-serif italic mb-3">
        {anepigrafo
          ? 'Monumento anepigrafe: se il testo esiste, incollalo qui — altrimenti lascia vuoto.'
          : 'Incolla o scrivi il testo greco: una riga per ogni riga della pietra, senza trattini di fine parola (dopo si marca break="no" con ⌁ nel margine).'}
      </p>
      <textarea
        rows={8} value={draft} onChange={e => setDraft(e.target.value)} lang="grc"
        placeholder={'Μέγας Μὲς Ἀξιοττηνὸς Ταρεῖ βα\nσιλεύων. …'}
        className="w-full bg-white/60 dark:bg-black/20 border border-border/50 rounded-lg px-3 py-2 text-[16px] text-ink font-serif leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent/40 placeholder:text-muted/30 placeholder:italic custom-scrollbar"
      />
      <button
        onClick={() => draft.trim() && onCreate(draft.split('\n').map(l => l.trim()))}
        disabled={!draft.trim()}
        className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white disabled:opacity-40 transition-all hover:shadow-md"
      >
        <Sparkles className="w-3.5 h-3.5" /> Crea righe
      </button>
    </div>
  );
};

/* ================================================================ */
/* Rendering del flusso (editor e anteprima)                         */
/* ================================================================ */

const TokenFlow: React.FC<{
  tokens: MarkupToken[];
  basePath: TokenPath;
  lbByPath: Map<string, LbInfo>;
  lbCount: number;
  preview?: boolean;
  onElClick?: (path: TokenPath, token: MarkupToken, ev: React.MouseEvent) => void;
  onToggleBreak?: (info: LbInfo) => void;
  onDeleteLb?: (info: LbInfo) => void;
}> = ({ tokens, basePath, lbByPath, lbCount, preview, onElClick, onToggleBreak, onDeleteLb }) => (
  <>
    {tokens.map((t, i) => {
      const path = [...basePath, i];
      if (t.kind === 'text') {
        return <span key={i} data-tok={preview ? undefined : JSON.stringify(path)}>{t.value}</span>;
      }
      if (t.name === 'lb') {
        const info = lbByPath.get(path.join('.'));
        const n = info?.n ?? '?';
        const breakNo = info?.breakNo;
        return (
          <span key={i} className="select-none">
            {n !== 1 && <br />}
            <span className={cn('inline-flex items-baseline gap-1', preview ? 'w-8 -ml-8 pr-1 justify-end' : 'w-20 -ml-20 pr-2 justify-end')}>
              {!preview && info && (
                <>
                  {n !== 1 && (
                    <Tip label={breakNo ? 'break="no" attivo — la parola continua dalla riga sopra. Clicca per disattivare.' : 'Attiva break="no": la parola qui è spezzata dalla riga sopra'}>
                      <button
                        contentEditable={false}
                        onClick={(e) => { e.stopPropagation(); onToggleBreak?.(info); }}
                        className={cn('text-[10px] font-mono px-0.5 rounded transition-colors', breakNo ? 'text-accent font-bold' : 'text-muted/25 hover:text-muted/60')}
                      >⌁</button>
                    </Tip>
                  )}
                  {lbCount > 1 && (
                    <Tip label="Unisci alla riga precedente (elimina l'accapo)">
                      <button
                        contentEditable={false}
                        onClick={(e) => { e.stopPropagation(); onDeleteLb?.(info); }}
                        className="text-muted/20 hover:text-red-400 transition-colors"
                      ><X className="w-2.5 h-2.5" /></button>
                    </Tip>
                  )}
                </>
              )}
              <span className="text-muted/40 text-[9px] font-mono">{n}</span>
            </span>
          </span>
        );
      }
      return (
        <ElementChrome key={i} token={t} path={path} preview={preview} onElClick={onElClick}
          lbByPath={lbByPath} lbCount={lbCount} onToggleBreak={onToggleBreak} onDeleteLb={onDeleteLb} />
      );
    })}
  </>
);

const ElementChrome: React.FC<{
  token: MarkupToken & { kind: 'el' };
  path: TokenPath;
  preview?: boolean;
  onElClick?: (path: TokenPath, token: MarkupToken, ev: React.MouseEvent) => void;
  lbByPath: Map<string, LbInfo>;
  lbCount: number;
  onToggleBreak?: (info: LbInfo) => void;
  onDeleteLb?: (info: LbInfo) => void;
}> = ({ token: t, path, preview, onElClick, lbByPath, lbCount, onToggleBreak, onDeleteLb }) => {
  const click = preview || !onElClick ? undefined : (e: React.MouseEvent) => onElClick(path, t, e);
  const base = preview ? '' : 'cursor-pointer hover:bg-accent/10 rounded transition-colors';
  const kids = <TokenFlow tokens={t.children} basePath={path} preview={preview} onElClick={onElClick}
    lbByPath={lbByPath} lbCount={lbCount} onToggleBreak={onToggleBreak} onDeleteLb={onDeleteLb} />;
  const a = t.attrs;

  switch (t.name) {
    case 'supplied': {
      const open = a.reason === 'omitted' ? '⟨' : '[';
      const close = a.reason === 'omitted' ? '⟩' : ']';
      return <span onClick={click} title={a.reason === 'omitted' ? 'Omesse dal lapicida' : 'Integrazione (lacuna)'} className={cn('text-muted/70 px-0.5', base)}>{open}{kids}{close}</span>;
    }
    case 'gap': {
      let g = '[- - -]';
      if (a.reason === 'illegible') g = a.quantity ? '·'.repeat(Math.min(Number(a.quantity) || 5, 12)) : '·····';
      else if (a.quantity) g = `[- ca. ${a.quantity} -]`;
      else if (a.atLeast) g = `[- ${a.atLeast}-${a.atMost} -]`;
      return <span onClick={click} title="Lacuna" className={cn('font-mono text-sm tracking-widest text-muted px-0.5', base)}>{g}</span>;
    }
    case 'unclear':
      return <span onClick={click} title="Lettere incerte" className={cn('border-b border-dotted border-muted/60 px-0.5', base)}>{kids}</span>;
    case 'surplus':
      return <span onClick={click} title="Lettere spurie" className={cn('text-muted/70 px-0.5', base)}>{'{'}{kids}{'}'}</span>;
    case 'expan': {
      const abbr = t.children.find(c => c.kind === 'el' && c.name === 'abbr');
      const ex = t.children.find(c => c.kind === 'el' && c.name === 'ex');
      return (
        <span onClick={click} title="Abbreviazione sciolta" className={cn('px-0.5', base)}>
          {abbr && abbr.kind === 'el' && <TokenFlow tokens={abbr.children} basePath={[...path, t.children.indexOf(abbr)]} preview={preview}
            lbByPath={lbByPath} lbCount={lbCount} onToggleBreak={onToggleBreak} onDeleteLb={onDeleteLb} />}
          {ex && ex.kind === 'el' && <span className="text-muted/70 italic">({ex.children.map(c => c.kind === 'text' ? c.value : '').join('')})</span>}
        </span>
      );
    }
    case 'choice': {
      const corr = t.children.find(c => c.kind === 'el' && c.name === 'corr');
      const sic = t.children.find(c => c.kind === 'el' && c.name === 'sic');
      const sicText = sic && sic.kind === 'el' ? sic.children.map(c => c.kind === 'text' ? c.value : '').join('') : '';
      return (
        <span onClick={click} title={sicText ? `Correzione (sulla pietra: «${sicText}»)` : 'Correzione editoriale'}
          className={cn('border-b border-dotted border-accent px-0.5', base)}>
          {corr && corr.kind === 'el' && <TokenFlow tokens={corr.children} basePath={[...path, t.children.indexOf(corr)]} preview={preview}
            lbByPath={lbByPath} lbCount={lbCount} onToggleBreak={onToggleBreak} onDeleteLb={onDeleteLb} />}
        </span>
      );
    }
    case 'persName': {
      const cls =
        a.type === 'divine' ? 'font-bold text-accent' :
        a.type === 'attested' ? 'underline decoration-dotted decoration-accent underline-offset-2' :
        a.type === 'ruler' ? 'italic font-semibold text-accent/80' :
        a.type === 'emperor' ? 'font-semibold text-accent/70' : '';
      const label = a.type === 'divine' ? `Divinità: ${a.key || '—'}` : `Persona: ${a.key || '—'}`;
      return <span onClick={click} title={label} className={cn(cls, 'px-0.5', base)}>{kids}</span>;
    }
    case 'name':
      return <span onClick={click} className={cn('px-0', base)}>{kids}</span>;
    case 'rs':
      if (a.type === 'epithet') return <span onClick={click} title="Epiteto" className={cn('text-accent/80 px-0.5', base)}>{kids}</span>;
      return <span onClick={click} className={base}>{kids}</span>;
    case 'placeName':
      return <span onClick={click} title={a.type === 'ethnic' ? `Etnico${a.ref ? ` (${a.ref})` : ''}` : 'Toponimo'}
        className={cn('underline decoration-dotted underline-offset-2 decoration-muted/60 px-0.5', base)}>{kids}</span>;
    case 'space':
      return <span onClick={click} title="Vacat" className={cn('text-muted/50 italic text-sm px-1', base)}>(vac.{a.quantity ? ` ${a.quantity}` : ''})</span>;
    default:
      return <span onClick={click} title={`<${t.name}>`} className={cn('px-0.5 bg-black/5 dark:bg-white/10 rounded', base)}>{kids}</span>;
  }
};


/* ================================================================ */
/* Menu a tendina glass                                              */
/* ================================================================ */

const GROUP_ORDER = ['Lacune e integrazioni', 'Lettere e correzioni', 'Nomi e luoghi', 'Numeri e date', 'Spazi e altro'];

const MarkupMenu: React.FC<{
  menu: MenuState;
  setMenu: (m: MenuState | null) => void;
  onPick: (a: MarkupAction) => void;
  onApply: (a: MarkupAction, p: Record<string, string>) => void;
}> = ({ menu, setMenu, onPick, onApply }) => {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (menu.step === 'list') searchRef.current?.focus(); }, [menu.step]);

  const insertOnly = !menu.sel;
  const q = stripAccents(query.trim());
  const actions = MARKUP_ACTIONS
    .filter(a => insertOnly ? a.mode !== 'wrap' : true)
    .filter(a => !q || stripAccents(a.label).includes(q) || stripAccents(a.group).includes(q));
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const MENU_W = 320; // w-80
  const MENU_MAX_H = 448; // max-h-[28rem]
  const x = Math.min(Math.max(menu.x, MENU_W / 2 + 10), vw - MENU_W / 2 - 10);
  const spaceBelow = vh - menu.y - 8;
  const flipUp = spaceBelow < 220 && menu.y > MENU_MAX_H;
  const top = flipUp ? Math.max(8, menu.y - MENU_MAX_H - 12) : Math.min(menu.y + 8, vh - 60);

  return createPortal(
    <motion.div
      data-markup-menu
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      style={{ position: 'fixed', left: x, top, maxHeight: `min(${MENU_MAX_H}px, calc(100vh - 24px))`, transform: 'translateX(-50%)', zIndex: 9999 }}
      className="w-80 flex flex-col rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-xl overflow-hidden"
    >
      {menu.step === 'list' ? (
        <>
          {menu.sel && (
            <div className="px-3.5 py-2 text-[10px] font-sans text-white/50 border-b border-white/10 truncate shrink-0">
              Selezione: <span className="font-serif text-white/90 not-italic text-xs" lang="grc">«{menu.sel.text}»</span>
            </div>
          )}
          <div className="px-3 pt-2.5 pb-2 shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cerca un'azione…"
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/35 focus:outline-none font-sans"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-white/40 hover:text-white/80 transition-colors shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto custom-scrollbar py-1.5">
            {actions.length === 0 && (
              <p className="px-3.5 py-4 text-xs text-white/40 italic text-center">Nessuna azione trovata.</p>
            )}
            {GROUP_ORDER.map(g => {
              const group = actions.filter(a => a.group === g);
              if (group.length === 0) return null;
              return (
                <div key={g} className="mb-1">
                  <div className="px-3.5 pt-1.5 pb-1 text-[9px] font-sans font-bold uppercase tracking-[0.2em] text-white/35">{g}</div>
                  {group.map(a => (
                    <button key={a.id} onClick={() => onPick(a)}
                      className="w-full flex items-center px-3.5 py-2 text-left hover:bg-white/10 transition-colors">
                      <span className="text-[13px] font-serif text-white/90">{a.label}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      ) : menu.action && (
        <div className="p-3.5">
          <button onClick={() => setMenu({ ...menu, step: 'list' })}
            className="flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-white/50 hover:text-white transition-colors mb-2.5">
            <ChevronLeft className="w-3 h-3" /> {menu.action.label}
          </button>
          <div className="space-y-2.5">
            {menu.action.params!.map(p => (
              <div key={p.id}>
                <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-white/60 mb-1">
                  {p.label}{p.required && <span className="text-accent ml-0.5">*</span>}
                  {p.hint && <span className="ml-1.5 normal-case tracking-normal font-normal italic text-white/40">{p.hint}</span>}
                </label>
                {p.type === 'select' ? (
                  <select
                    value={menu.params[p.id] || ''}
                    onChange={e => setMenu({ ...menu, params: { ...menu.params, [p.id]: e.target.value } })}
                    className="w-full bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-sm text-white font-serif focus:outline-none focus:ring-1 focus:ring-accent/50"
                    style={{ colorScheme: 'dark' }}
                  >
                    {p.options!.map(o => (
                      <option key={o} value={o} style={{ backgroundColor: '#18181b', color: '#fff' }}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type={p.type === 'number' ? 'number' : 'text'}
                      list={p.type === 'datalist' ? `dl-${p.id}` : undefined}
                      value={menu.params[p.id] || ''}
                      placeholder={p.placeholder}
                      onChange={e => setMenu({ ...menu, params: { ...menu.params, [p.id]: e.target.value } })}
                      onKeyDown={e => { if (e.key === 'Enter') onApply(menu.action!, menu.params); }}
                      className="w-full bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-sm text-white font-serif focus:outline-none focus:ring-1 focus:ring-accent/50 placeholder:text-white/30 placeholder:italic"
                    />
                    {p.type === 'datalist' && (
                      <datalist id={`dl-${p.id}`}>{p.options!.map(o => <option key={o} value={o} />)}</datalist>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => onApply(menu.action!, menu.params)}
            disabled={menu.action.params!.some(p => p.required && !(menu.params[p.id] || '').trim())}
            className="mt-3.5 w-full rounded-full px-4 py-2 text-xs font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white disabled:opacity-40 transition-all hover:shadow-md"
          >
            Applica
          </button>
        </div>
      )}
    </motion.div>,
    document.body
  );
};

/* ================================================================ */
/* Popover per elementi esistenti                                    */
/* ================================================================ */

const ElementPopover: React.FC<{
  pop: ElPopover;
  onClose: () => void;
  onUnwrap: () => void;
  onRemove: () => void;
  onUpdate: (attrs: Record<string, string>) => void;
}> = ({ pop, onClose, onUnwrap, onRemove, onUpdate }) => {
  const [attrs, setAttrs] = useState<Record<string, string>>({ ...pop.token.attrs });
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const POP_H = 260;
  const x = Math.min(Math.max(pop.x, 150), vw - 150);
  const spaceBelow = vh - pop.y - 8;
  const flipUp = spaceBelow < 180 && pop.y > POP_H;
  const top = flipUp ? Math.max(8, pop.y - POP_H - 12) : Math.min(pop.y + 8, vh - 60);
  const isDivine = pop.token.name === 'persName' && pop.token.attrs.type === 'divine';
  const editable = Object.keys(attrs);
  const forbidden = (k: string) =>
    (pop.token.name === 'persName' && k === 'nymRef') ||
    (pop.token.name === 'rs' && (k === 'nymRef' || k === 'key'));

  return createPortal(
    <motion.div
      data-el-popover
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      style={{ position: 'fixed', left: x, top, transform: 'translateX(-50%)', zIndex: 9999, maxHeight: 'calc(100vh - 24px)', overflowY: 'auto' }}
      className="w-72 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-xl p-3.5"
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-mono text-[11px] text-accent">&lt;{pop.token.name}{pop.token.attrs.type ? ` type="${pop.token.attrs.type}"` : ''}&gt;</span>
        <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div className="space-y-2">
        {editable.map(k => (
          <div key={k}>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-white/60 mb-1">{k}</label>
            <input
              value={attrs[k] || ''}
              disabled={forbidden(k)}
              list={isDivine && k === 'key' ? 'dl-divine-keys' : undefined}
              onChange={e => setAttrs({ ...attrs, [k]: e.target.value })}
              className="w-full bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-40"
            />
          </div>
        ))}
        {isDivine && <datalist id="dl-divine-keys">{DIVINE_KEYS.map(k => <option key={k} value={k} />)}</datalist>}
        {editable.length === 0 && <p className="text-[11px] text-white/50 italic">Nessun attributo.</p>}
      </div>

      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/10">
        <button onClick={() => onUpdate(attrs)}
          className="flex-1 rounded-full px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white hover:shadow-md transition-all">
          Aggiorna
        </button>
        {!pop.token.selfClosing && pop.token.children.length > 0 && (
          <button onClick={onUnwrap} title="Rimuove il markup conservando il testo"
            className="rounded-full px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] text-muted hover:text-ink border border-border/50 transition-colors">
            Togli markup
          </button>
        )}
        <button onClick={onRemove} title="Elimina l'elemento" className="p-1.5 text-muted/50 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>,
    document.body
  );
};

export default EditionMarkupEditor;