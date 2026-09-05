import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Check, X, AlertTriangle, Eye, Code2, ChevronLeft, Search,
  CornerDownLeft, Sparkles, Wand2,
} from 'lucide-react';
import { cn, stripAccents, EASE_OUT } from '../lib/utils';
import { TokenPath, wrapSlice, unwrapElement, removeElement, updateElementAttrs, appendElement, sliceText } from '../lib/leidenMarkup';
import {
  MarkupToken, MarkupAction, ValidationIssue,
  parseLitTesto, safeParseLitTesto, serializeLitTesto, validateLitTokens,
  LIT_MARKUP_ACTIONS, LIT_GROUP_ORDER, suggerisciLessico,
} from '../lib/litMarkup';
import { MarkupTokenView } from './MarkupText';

// Stessa grammatica dell'editor epigrafico: chi ha imparato a marcare una
// stele non deve reimparare nulla per marcare Esiodo. Cambia solo il catalogo
// delle azioni (litMarkup.ts) e il senso di <lb/>, qui verso e non riga incisa.

interface Props {
  value: string;
  lingua: 'grc' | 'lat';
  onChange: (testo: string) => void;
}

interface Sel {
  startPath: TokenPath; startOffset: number;
  endPath: TokenPath; endOffset: number;
  text: string; x: number; y: number;
}

interface MenuState {
  sel: Sel | null;
  step: 'list' | 'params';
  action?: MarkupAction;
  params: Record<string, string>;
  x: number; y: number;
}

interface ElPopover { path: TokenPath; token: MarkupToken & { kind: 'el' }; x: number; y: number; }

export const LiteraryMarkupEditor: React.FC<Props> = ({ value, lingua, onChange }) => {
  const [tokens, setTokens] = useState<MarkupToken[]>(() => safeParseLitTesto(value) ?? []);
  const [parseError, setParseError] = useState(() => !!value.trim() && safeParseLitTesto(value) === null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [pop, setPop] = useState<ElPopover | null>(null);
  const [tab, setTab] = useState<'testo' | 'xml'>('testo');
  const [xmlDraft, setXmlDraft] = useState<string | null>(null);
  const [xmlError, setXmlError] = useState<string | null>(null);
  const [selWarn, setSelWarn] = useState<string | null>(null);
  const [mostraSuggerimenti, setMostraSuggerimenti] = useState(false);
  const lastEmitted = useRef(value);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      const next = safeParseLitTesto(value);
      if (next) { setTokens(next); setParseError(false); }
      else setParseError(!!value.trim());
      lastEmitted.current = value;
    }
  }, [value]);

  const commit = useCallback((next: MarkupToken[]) => {
    setTokens(next);
    const testo = serializeLitTesto(next);
    lastEmitted.current = testo;
    onChange(testo);
  }, [onChange]);

  const issues = useMemo<ValidationIssue[]>(() => {
    try { return validateLitTokens(tokens); }
    catch (e: any) { return [{ severity: 'error', line: 0, message: e.message }]; }
  }, [tokens]);

  const suggeriti = useMemo(() => suggerisciLessico(tokens), [tokens]);
  const isEmpty = tokens.length === 0 || tokens.every(t => t.kind === 'el' && t.name === 'lb');
  const numeroVersi = tokens.filter(t => t.kind === 'el' && t.name === 'lb').length;

  /* ── selezione ───────────────────────────────────────────────── */
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
      if (!t.closest('[data-lit-menu]') && !t.closest('[data-lit-popover]')) { setMenu(null); setPop(null); }
    };
    const onKey = (e: KeyboardEvent) => {
      // Solo se qualcosa è aperto, e senza risalire oltre: altrimenti l'Esc
      // che chiude il menu chiuderebbe anche la scheda sotto.
      if (e.key !== 'Escape') return;
      if (menu || pop) { e.stopPropagation(); setMenu(null); setPop(null); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [menu, pop]);

  /* ── azioni ──────────────────────────────────────────────────── */
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
      // La lingua del testo la sa già la scheda: non la si richiede a mano.
      if (action.id === 'mentioned' && !prefill.lang) prefill.lang = lingua;
      setMenu({ ...menu, step: 'params', action, params: prefill });
    } else applyAction(action, {});
  };

  const addLineAtEnd = () =>
    commit(appendElement(tokens, { kind: 'el', name: 'lb', attrs: { n: String(numeroVersi + 1) }, children: [], selfClosing: true }));

  const applyXmlDraft = () => {
    if (xmlDraft === null) return;
    try {
      const next = parseLitTesto(xmlDraft);
      validateLitTokens(next);
      commit(next);
      setXmlDraft(null); setXmlError(null);
    } catch (e: any) { setXmlError(e.message); }
  };

  const creaDaTesto = (righe: string[]) => {
    const out: MarkupToken[] = [];
    righe.forEach((l, i) => {
      out.push({ kind: 'el', name: 'lb', attrs: { n: String(i + 1) }, children: [], selfClosing: true });
      if (l) out.push({ kind: 'text', value: l });
    });
    commit(out);
  };

  if (parseError) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2.5 text-sm text-warning bg-warning/10 border border-warning/25 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Il markup di questo testo è malformato e l'editor assistito non riesce ad aprirlo.
            Correggilo qui sotto — l'errore più frequente è un tag non chiuso.
          </span>
        </div>
        <textarea
          rows={8}
          defaultValue={value}
          onBlur={e => {
            const next = safeParseLitTesto(e.target.value);
            if (next) { lastEmitted.current = e.target.value; onChange(e.target.value); setTokens(next); setParseError(false); }
          }}
          spellCheck={false}
          className="w-full font-mono text-[11px] leading-relaxed text-ink/90 bg-white/60 dark:bg-black/30 border border-border/40 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-accent/40 custom-scrollbar"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3" ref={rootRef}>
      {isEmpty ? (
        <InitialPaste lingua={lingua} onCreate={creaDaTesto} />
      ) : (
        <>
          <div className="flex items-center gap-1 border-b border-border/30">
            {(['testo', 'xml'] as const).map(t => (
              <button key={t} type="button" onClick={() => { setTab(t); setXmlDraft(null); setXmlError(null); }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.16em] rounded-t-lg transition-colors border-b-2 -mb-px',
                  tab === t ? 'text-accent border-accent' : 'text-muted/60 border-transparent hover:text-ink',
                )}>
                {t === 'testo' ? <Eye className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
                {t === 'testo' ? 'Testo' : 'XML'}
              </button>
            ))}
            <span className="flex-1" />
            <span className="text-[10px] font-sans text-muted/50 pr-1">{numeroVersi} vers{numeroVersi === 1 ? 'o' : 'i'}</span>
          </div>

          {tab === 'testo' ? (
            <div
              className="bg-white/50 dark:bg-white/5 border border-border/40 rounded-xl px-5 py-5 backdrop-blur-sm"
              onMouseUp={onMouseUp}
            >
              <div className={cn('leading-[2.1] text-ink pl-10', lingua === 'grc' ? 'font-greek text-[19px]' : 'font-serif text-[18px]')}>
                <MarkupTokenView
                  tokens={tokens}
                  lang={lingua}
                  numeri
                  editable
                  onElClick={(path, token, ev) => {
                    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                    setMenu(null);
                    setPop({ path, token, x: r.left + r.width / 2, y: r.bottom });
                  }}
                />
              </div>
              <div className="flex items-center gap-4 mt-4 pl-10">
                <button type="button" onClick={addLineAtEnd}
                  className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent/70 transition-colors">
                  <CornerDownLeft className="w-3 h-3" /> Aggiungi verso
                </button>
                <button type="button"
                  onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setPop(null); setMenu({ sel: null, step: 'list', params: {}, x: r.left, y: r.bottom }); }}
                  className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold uppercase tracking-[0.12em] text-muted hover:text-accent transition-colors">
                  <Plus className="w-3 h-3" /> Inserisci lacuna
                </button>
              </div>
              <p className="text-[10px] text-muted/50 italic mt-2 pl-10 select-none">
                Seleziona il testo (anche attraverso gli accapi) per il menu di marcatura · clicca un tag per modificarlo
              </p>
            </div>
          ) : (
            <div>
              <textarea
                rows={10}
                value={xmlDraft ?? serializeLitTesto(tokens)}
                onChange={e => { setXmlDraft(e.target.value); setXmlError(null); }}
                spellCheck={false}
                className="w-full font-mono text-[11px] leading-relaxed text-ink/90 bg-white/60 dark:bg-black/30 border border-border/40 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-accent/40 custom-scrollbar"
              />
              {xmlError && <p className="text-[11px] text-danger mt-1.5">{xmlError}</p>}
              {xmlDraft !== null && (
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={applyXmlDraft}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white hover:shadow-md transition-all">
                    <Check className="w-3 h-3" /> Applica XML
                  </button>
                  <button type="button" onClick={() => { setXmlDraft(null); setXmlError(null); }}
                    className="text-[10px] font-sans font-bold uppercase tracking-[0.12em] text-muted hover:text-ink px-3 transition-colors">
                    Annulla
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selWarn && (
        <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 border border-warning/25 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {selWarn}
        </div>
      )}

      {issues.length > 0 && (
        <div className="space-y-1.5">
          {issues.map((iss, i) => (
            <div key={i} className={cn(
              'flex items-start gap-2 text-xs rounded-lg px-3 py-2 border font-serif',
              iss.severity === 'error'
                ? 'text-danger bg-danger/10 border-danger/25'
                : 'text-warning bg-warning/10 border-warning/25',
            )}>
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span><span className="font-mono not-italic text-[10px] opacity-60 mr-1.5">v.{iss.line}</span>{iss.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Suggerimenti del lessico cultuale: propongono, non marcano. La
          decisione resta redazionale, come per lo scanner del corpus. */}
      {suggeriti.length > 0 && !isEmpty && (
        <div className="rounded-lg border border-border/40 bg-[var(--card)]/50 px-3 py-2">
          <button type="button" onClick={() => setMostraSuggerimenti(v => !v)}
            className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] text-cult hover:opacity-70 transition-opacity">
            <Wand2 className="w-3 h-3" />
            {suggeriti.length} parol{suggeriti.length === 1 ? 'a' : 'e'} del lessico cultuale non ancora marcat{suggeriti.length === 1 ? 'a' : 'e'}
          </button>
          {mostraSuggerimenti && (
            <ul className="mt-2 space-y-1">
              {suggeriti.map((s, i) => (
                <li key={i} className="text-[12px] font-serif text-muted/85">
                  <span className={cn(lingua === 'grc' ? 'font-greek' : 'italic', 'text-cult')} lang={lingua}>{s.forma}</span>
                  {' → '}<span className="font-greek" lang="grc">{s.lemma}</span>
                  <span className="text-muted/50"> · {s.family}</span>
                </li>
              ))}
              <li className="text-[11px] font-sans italic text-muted/50 pt-1">
                Selezionale nel testo e usa «Funzione cultuale (parola)» — il suggerimento non marca da sé.
              </li>
            </ul>
          )}
        </div>
      )}

      <AnimatePresence>
        {menu && <LitMenu menu={menu} setMenu={setMenu} onApply={applyAction} onPick={pickAction} />}
      </AnimatePresence>
      <AnimatePresence>
        {pop && (
          <LitPopover
            pop={pop}
            onClose={() => setPop(null)}
            onUnwrap={() => { commit(unwrapElement(tokens, pop.path)); setPop(null); }}
            onRemove={() => { commit(removeElement(tokens, pop.path)); setPop(null); }}
            onUpdate={attrs => { commit(updateElementAttrs(tokens, pop.path, attrs)); setPop(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};


const InitialPaste: React.FC<{ lingua: 'grc' | 'lat'; onCreate: (righe: string[]) => void }> = ({ lingua, onCreate }) => {
  const [draft, setDraft] = useState('');
  return (
    <div className="bg-white/50 dark:bg-white/5 border border-border/40 rounded-xl p-4 backdrop-blur-sm">
      <p className="text-xs text-muted font-serif italic mb-2.5">
        Incolla il testo dall'edizione: un verso per riga (in prosa, una riga sola o gli accapi dell'edizione).
        La marcatura viene dopo, selezionando le parole.
      </p>
      <textarea
        rows={6} value={draft} onChange={e => setDraft(e.target.value)} lang={lingua}
        placeholder={lingua === 'grc' ? 'Θεία δ᾽ Ἠέλιόν τε μέγαν λαμπράν τε Σελήνην…' : 'Luna a lucendo nominata…'}
        className={cn(
          'w-full bg-white/60 dark:bg-black/20 border border-border/50 rounded-lg px-3 py-2 text-[16px] text-ink leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent/40 placeholder:text-muted/30 placeholder:italic custom-scrollbar',
          lingua === 'grc' ? 'font-greek' : 'font-serif',
        )}
      />
      <button
        type="button"
        onClick={() => draft.trim() && onCreate(draft.split('\n').map(l => l.trim()))}
        disabled={!draft.trim()}
        className="mt-2.5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white disabled:opacity-40 transition-all hover:shadow-md"
      >
        <Sparkles className="w-3.5 h-3.5" /> Crea il testo
      </button>
    </div>
  );
};


const LitMenu: React.FC<{
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
  const actions = LIT_MARKUP_ACTIONS
    .filter(a => insertOnly ? a.mode !== 'wrap' : true)
    .filter(a => !q || stripAccents(a.label).includes(q) || stripAccents(a.group).includes(q));

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const MENU_W = 320, MENU_MAX_H = 448;
  const x = Math.min(Math.max(menu.x, MENU_W / 2 + 10), vw - MENU_W / 2 - 10);
  const flipUp = vh - menu.y - 8 < 220 && menu.y > MENU_MAX_H;
  const top = flipUp ? Math.max(8, menu.y - MENU_MAX_H - 12) : Math.min(menu.y + 8, vh - 60);

  return createPortal(
    <motion.div
      data-lit-menu
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
              Selezione: <span className="font-greek text-white/90 not-italic text-xs">«{menu.sel.text}»</span>
            </div>
          )}
          <div className="px-3 pt-2.5 pb-2 shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
              <input
                ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Cerca una marcatura…"
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/35 focus:outline-none font-sans"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-white/40 hover:text-white/80 transition-colors shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto custom-scrollbar py-1.5">
            {actions.length === 0 && <p className="px-3.5 py-4 text-xs text-white/40 italic text-center">Nessuna marcatura trovata.</p>}
            {LIT_GROUP_ORDER.map(g => {
              const gruppo = actions.filter(a => a.group === g);
              if (gruppo.length === 0) return null;
              return (
                <div key={g} className="mb-1">
                  <div className="px-3.5 pt-1.5 pb-1 text-[9px] font-sans font-bold uppercase tracking-[0.2em] text-white/35">{g}</div>
                  {gruppo.map(a => (
                    <button key={a.id} type="button" onClick={() => onPick(a)}
                      className="w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left hover:bg-white/10 transition-colors">
                      <span className="text-[13px] font-serif text-white/90">{a.label}</span>
                      <span className="text-[11px] font-mono text-white/25 shrink-0">{a.glyph}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      ) : menu.action && (
        <div className="p-3.5 overflow-y-auto custom-scrollbar">
          <button type="button" onClick={() => setMenu({ ...menu, step: 'list' })}
            className="flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-white/50 hover:text-white transition-colors mb-2.5">
            <ChevronLeft className="w-3 h-3" /> {menu.action.label}
          </button>
          {menu.action.hint && <p className="text-[11px] font-serif italic text-white/45 mb-2.5 leading-snug">{menu.action.hint}</p>}
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
                    {p.options!.map(o => <option key={o} value={o} style={{ backgroundColor: '#18181b', color: '#fff' }}>{o}</option>)}
                  </select>
                ) : (
                  <>
                    <input
                      type={p.type === 'number' ? 'number' : 'text'}
                      list={p.type === 'datalist' ? `lit-dl-${p.id}` : undefined}
                      value={menu.params[p.id] || ''}
                      placeholder={p.placeholder}
                      onChange={e => setMenu({ ...menu, params: { ...menu.params, [p.id]: e.target.value } })}
                      onKeyDown={e => { if (e.key === 'Enter') onApply(menu.action!, menu.params); }}
                      className="w-full bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-sm text-white font-serif focus:outline-none focus:ring-1 focus:ring-accent/50 placeholder:text-white/30 placeholder:italic"
                    />
                    {p.type === 'datalist' && (
                      <datalist id={`lit-dl-${p.id}`}>{p.options!.map(o => <option key={o} value={o} />)}</datalist>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onApply(menu.action!, menu.params)}
            disabled={menu.action.params!.some(p => p.required && !(menu.params[p.id] || '').trim())}
            className="mt-3.5 w-full rounded-full px-4 py-2 text-xs font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white disabled:opacity-40 transition-all hover:shadow-md"
          >
            Applica
          </button>
        </div>
      )}
    </motion.div>,
    document.body,
  );
};


const LitPopover: React.FC<{
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
  const flipUp = vh - pop.y - 8 < 180 && pop.y > POP_H;
  const top = flipUp ? Math.max(8, pop.y - POP_H - 12) : Math.min(pop.y + 8, vh - 60);
  const chiavi = Object.keys(attrs);
  // Stessi divieti dell'editor epigrafico: nymRef sta sul <name>, il key sul
  // <persName>. Vale anche qui, o i due indici divergerebbero.
  const vietato = (k: string) =>
    (pop.token.name === 'persName' && k === 'nymRef') ||
    (pop.token.name === 'rs' && pop.token.attrs.type === 'epithet' && (k === 'nymRef' || k === 'key'));

  return createPortal(
    <motion.div
      data-lit-popover
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      style={{ position: 'fixed', left: x, top, transform: 'translateX(-50%)', zIndex: 9999, maxHeight: 'calc(100vh - 24px)', overflowY: 'auto' }}
      className="w-72 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-xl p-3.5"
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-mono text-[11px] text-accent">
          &lt;{pop.token.name}{pop.token.attrs.type ? ` type="${pop.token.attrs.type}"` : ''}&gt;
        </span>
        <button type="button" onClick={onClose} className="p-1 text-white/50 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div className="space-y-2">
        {chiavi.map(k => (
          <div key={k}>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-white/60 mb-1">{k}</label>
            <input
              value={attrs[k] || ''}
              disabled={vietato(k)}
              onChange={e => setAttrs({ ...attrs, [k]: e.target.value })}
              className="w-full bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-40"
            />
          </div>
        ))}
        {chiavi.length === 0 && <p className="text-[11px] text-white/50 italic">Nessun attributo.</p>}
      </div>

      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/10">
        <button type="button" onClick={() => onUpdate(attrs)}
          className="flex-1 rounded-full px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] bg-accent text-white hover:shadow-md transition-all">
          Aggiorna
        </button>
        {!pop.token.selfClosing && pop.token.children.length > 0 && (
          <button type="button" onClick={onUnwrap} title="Rimuove il markup conservando il testo"
            className="rounded-full px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.12em] text-white/60 hover:text-white border border-white/20 transition-colors">
            Togli
          </button>
        )}
        <button type="button" onClick={onRemove} title="Elimina l'elemento"
          className="p-1.5 text-white/40 hover:text-danger transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>,
    document.body,
  );
};

export default LiteraryMarkupEditor;
