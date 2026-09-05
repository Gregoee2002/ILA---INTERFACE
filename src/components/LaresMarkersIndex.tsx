import React, { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import {
  TestimoniumRisolto, toolboxLetterario, PercorsoLetterario, foldForSearch, citaBreve,
} from '../lib/litSources';
import {
  LARES_TOOLBOX, LARES_GRID, AMBITO_CAMPO, AMBITO_LABELS, CAMPO_COLOR, LaresAmbito,
  itemColor, toolboxItem, ToolboxFonte,
} from '../lib/laresToolbox';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Segno } from './LaresGrid';

/**
 * LaresMarkersIndex — le due griglie LARES come strumento di ricerca.
 *
 * Prima erano due elenchi piatti di voci d'indice, uguali a quello delle opere
 * o dei luoghi: si leggeva che cosa era stato marcato, non che forma avesse lo
 * spoglio. Qui prendono la grafica della vista «Lessico cultuale» — sezioni,
 * barre in scala √ su scala comune, conteggio reale a fianco, riga che si apre
 * sui passi — perché è la stessa domanda: dove si addensa la marcatura, e che
 * cosa c'è esattamente sotto un ramo.
 *
 * L'ordine di default è quello **della griglia**, non della frequenza: la
 * griglia è un discorso, e leggerla per frequenza la spezza. Il toggle
 * «frequenza» resta per la domanda opposta, «che cosa è più marcato».
 */

const FIELD_BASE =
  'bg-[var(--card)] dark:bg-black/25 border border-[var(--border)]/50 dark:border-white/5 rounded-lg font-sans text-xs outline-none shadow-inner focus:border-accent/50 focus:ring-1 focus:ring-accent/30 hover:bg-[var(--sidebar)] dark:hover:bg-black/40 transition-all duration-300';
const FIELD_STYLE = { backgroundColor: 'var(--card)', color: 'var(--ink)' } as const;

type Ordine = 'griglia' | 'frequenza';

/** Ordine di griglia: item, categoria, sottocategoria, come nel documento LARES. */
const PATH_ORDER: Map<string, number> = (() => {
  const m = new Map<string, number>();
  let i = 0;
  for (const item of LARES_TOOLBOX) {
    m.set(item.id, i++);
    for (const cat of item.categorie) {
      m.set(`${item.id}/${cat.id}`, i++);
      for (const sub of cat.sub) m.set(`${item.id}/${cat.id}/${sub.id}`, i++);
    }
  }
  return m;
})();

/** La fonte della voce più profonda del percorso: il segno è quello della griglia. */
function fonteDelPercorso(key: string): ToolboxFonte | undefined {
  const [itemId, catId, subId] = key.split('/');
  const item = toolboxItem(itemId);
  const cat = item?.categorie.find(c => c.id === catId);
  const sub = cat?.sub.find(s => s.id === subId);
  return sub?.fonte || cat?.fonte;
}

const Barra: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <span className="flex-1 min-w-[3rem] max-w-[20rem] h-2.5 rounded-sm bg-border/30 overflow-hidden">
    <span className="block h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: color }} />
  </span>
);

const Intestazione: React.FC<{ colore: string; titolo: string; nota: string }> = ({ colore, titolo, nota }) => (
  <div className="flex items-baseline gap-2.5 mb-2 pb-1 border-b border-border/40">
    <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: colore }} />
    <h3 className="text-sm font-sans font-bold uppercase tracking-[0.15em] text-ink/90">{titolo}</h3>
    <span className="text-xs font-sans text-muted/60">{nota}</span>
  </div>
);

const passi = (n: number) => `${n} ${n === 1 ? 'passo' : 'passi'}`;

/* ── 1. l'Analytical Toolbox ─────────────────────────────────────────────── */

export const ToolboxIndex: React.FC<{
  testimonia: TestimoniumRisolto[];
  onGo: (id: string) => void;
}> = ({ testimonia, onGo }) => {
  const [search, setSearch] = useState('');
  const [ordine, setOrdine] = useState<Ordine>('griglia');
  const [aperti, setAperti] = useState<Set<string>>(new Set());

  const percorsi = useMemo(() => {
    const tutti = [...toolboxLetterario(testimonia).values()];
    return tutti.sort((a, b) =>
      (PATH_ORDER.get(a.key) ?? 9999) - (PATH_ORDER.get(b.key) ?? 9999) || a.key.localeCompare(b.key));
  }, [testimonia]);

  const tokens = foldForSearch(search).split(/\s+/).filter(Boolean);
  const passa = (p: PercorsoLetterario) => {
    if (tokens.length === 0) return true;
    const hay = foldForSearch([p.label, p.key, ...p.occorrenze.map(o => `${o.cita} ${o.testo}`)].join(' '));
    return tokens.some(t => hay.includes(t));
  };
  const visibili = percorsi.filter(passa);
  const maxOcc = Math.max(1, ...visibili.map(p => p.occorrenze.length));
  const totale = visibili.reduce((n, p) => n + p.occorrenze.length, 0);

  const toggle = (k: string) => setAperti(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n;
  });

  const riga = (p: PercorsoLetterario) => {
    const aperto = aperti.has(p.key);
    const colore = itemColor(p.marker.item);
    const parti = p.label.split(' → ');
    const coda = parti[parti.length - 1];
    const testa = parti.slice(1, -1).join(' → '); // l'item è già nell'intestazione di sezione
    const fonte = fonteDelPercorso(p.key);
    return (
      <div key={p.key}>
        <button
          onClick={() => toggle(p.key)}
          className="w-full flex items-center gap-3 px-2 py-1.5 text-left rounded-sm hover:bg-sidebar/50 transition-colors"
        >
          <span className="w-[11rem] shrink-0 text-right truncate text-[13px] font-serif" title={p.label}>
            {testa && <span className="text-muted/50">{testa} → </span>}
            <span className="text-ink/85">{coda}</span>
          </span>
          <Barra pct={Math.max(2, (Math.sqrt(p.occorrenze.length) / Math.sqrt(maxOcc)) * 100)} color={colore} />
          <span className="shrink-0 w-8 text-right text-xs font-sans text-muted/80 tabular-nums">
            {p.occorrenze.length}
          </span>
          <Segno fonte={fonte} />
          <span className="shrink-0 text-muted/40">
            {aperto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
        </button>
        {aperto && (
          <div className="pl-[11.75rem] pr-2 pb-2 space-y-1">
            {p.occorrenze.map((o, i) => (
              <button
                key={`${o.testimoniumId}-${i}`}
                onClick={() => onGo(o.testimoniumId)}
                className="w-full text-left flex items-baseline gap-2 group"
                title={`Vai a ${o.cita}`}
              >
                <span className="text-[11px] font-serif italic text-muted/70 group-hover:text-accent shrink-0">
                  {o.cita}
                </span>
                <span
                  className={cn('text-[13px] truncate', o.lingua === 'grc' ? 'font-greek' : 'font-serif italic')}
                  lang={o.lingua}
                >
                  {o.testo}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (percorsi.length === 0) {
    return (
      <p className="text-sm italic text-muted/60 py-10 text-center">
        Nessun segmento marcato col toolbox. La griglia si riempie marcando il testo, non compilando un campo.
      </p>
    );
  }

  return (
    <>
      <p className="text-[13px] font-serif italic text-muted/70 leading-relaxed mb-4">
        {visibili.length} rami della griglia · {passi(totale)} marcati. L'ordine è quello del documento
        LARES: la griglia è un discorso, leggerla per frequenza lo spezza — ma il toggle c'è.
      </p>

      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/50 pointer-events-none" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filtra ramo, passo, testo marcato…"
            className={cn(FIELD_BASE, 'w-full pl-9 pr-3 py-2')} style={FIELD_STYLE}
          />
        </div>
        <div className="inline-flex rounded-lg border border-[var(--border)]/50 dark:border-white/5 overflow-hidden text-[10px] font-sans font-bold uppercase tracking-widest shadow-inner">
          {(['griglia', 'frequenza'] as Ordine[]).map(o => (
            <button key={o} onClick={() => setOrdine(o)}
              className={cn('px-3 py-2 transition-colors', ordine === o ? 'bg-accent/10 text-accent' : 'text-muted hover:text-ink')}>
              {o === 'griglia' ? 'per griglia' : 'per frequenza'}
            </button>
          ))}
        </div>
      </div>

      {visibili.length === 0 ? (
        <p className="text-sm italic text-muted/60 py-10 text-center">Nessun ramo per questo filtro.</p>
      ) : ordine === 'frequenza' ? (
        <div className="space-y-0.5">
          {[...visibili].sort((a, b) => b.occorrenze.length - a.occorrenze.length || a.label.localeCompare(b.label)).map(riga)}
        </div>
      ) : (
        <div className="space-y-7">
          {LARES_TOOLBOX.map(item => {
            const suoi = visibili.filter(p => p.marker.item === item.id);
            if (suoi.length === 0) return null;
            const occ = suoi.reduce((n, p) => n + p.occorrenze.length, 0);
            return (
              <section key={item.id}>
                <Intestazione
                  colore={itemColor(item.id)}
                  titolo={item.label}
                  nota={`${suoi.length} ${suoi.length === 1 ? 'ramo' : 'rami'} · ${passi(occ)}`}
                />
                <div className="space-y-0.5">{suoi.map(riga)}</div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
};

/* ── 2. i nove marcatori concettuali ─────────────────────────────────────── */

export const AmbitiIndex: React.FC<{
  testimonia: TestimoniumRisolto[];
  onGo: (id: string) => void;
}> = ({ testimonia, onGo }) => {
  const [aperti, setAperti] = useState<Set<string>>(new Set());

  const perAmbito = useMemo(() => {
    const m = new Map<LaresAmbito, { id: string; cita: string }[]>();
    for (const t of testimonia) {
      for (const mk of t.lares) {
        const lista = m.get(mk.ambito) || [];
        if (!lista.some(x => x.id === t.id)) lista.push({ id: t.id, cita: citaBreve(t) });
        m.set(mk.ambito, lista);
      }
    }
    return m;
  }, [testimonia]);

  const max = Math.max(1, ...[...perAmbito.values()].map(v => v.length));
  const totale = [...perAmbito.values()].reduce((n, v) => n + v.length, 0);

  if (totale === 0) {
    return (
      <p className="text-sm italic text-muted/60 py-10 text-center">
        Nessun marcatore concettuale assegnato.
      </p>
    );
  }

  const toggle = (k: string) => setAperti(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n;
  });

  return (
    <>
      <p className="text-[13px] font-serif italic text-muted/70 leading-relaxed mb-5">
        I nove marcatori qualificano la <b>testimonianza intera</b>, non un segmento: sono l'altro
        livello di LARES, e una stessa testimonianza può stare sotto più ambiti. Le barre contano
        passi, non parole.
      </p>
      <div className="space-y-7">
        {LARES_GRID.map(campo => {
          const righe = campo.ambiti.filter(a => (perAmbito.get(a.id) || []).length > 0);
          if (righe.length === 0) return null;
          const occ = righe.reduce((n, a) => n + (perAmbito.get(a.id) || []).length, 0);
          return (
            <section key={campo.campo}>
              <Intestazione
                colore={CAMPO_COLOR[campo.campo]}
                titolo={campo.label}
                nota={`${campo.en} · ${passi(occ)}`}
              />
              <div className="space-y-0.5">
                {righe.map(a => {
                  const refs = perAmbito.get(a.id) || [];
                  const aperto = aperti.has(a.id);
                  return (
                    <div key={a.id}>
                      <button onClick={() => toggle(a.id)}
                        className="w-full flex items-center gap-3 px-2 py-1.5 text-left rounded-sm hover:bg-sidebar/50 transition-colors">
                        <span className="w-[11rem] shrink-0 text-right truncate text-[13px] font-serif text-ink/85">
                          {AMBITO_LABELS[a.id]}
                          <span className="text-muted/45 italic"> · {a.en}</span>
                        </span>
                        <Barra pct={Math.max(2, (Math.sqrt(refs.length) / Math.sqrt(max)) * 100)}
                          color={CAMPO_COLOR[AMBITO_CAMPO[a.id]]} />
                        <span className="shrink-0 w-8 text-right text-xs font-sans text-muted/80 tabular-nums">
                          {refs.length}
                        </span>
                        <span className="shrink-0 text-muted/40">
                          {aperto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                      {aperto && (
                        <div className="pl-[11.75rem] pr-2 pb-2 flex flex-wrap gap-x-4 gap-y-1">
                          {refs.map(r => (
                            <button key={r.id} onClick={() => onGo(r.id)}
                              className="text-[11px] font-serif italic text-muted/70 hover:text-accent">
                              {r.cita}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
};
