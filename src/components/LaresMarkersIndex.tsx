import React, { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import {
  TestimoniumRisolto, toolboxLetterario, PercorsoLetterario, foldForSearch, citaBreve,
} from '../lib/litSources';
import {
  LARES_TOOLBOX, LARES_GRID, AMBITO_LABELS, CAMPO_COLOR, LaresAmbito,
  itemColor, toolboxItem, ToolboxFonte,
} from '../lib/laresToolbox';
import { Segno } from './LaresGrid';

/**
 * LaresMarkersIndex — le due griglie LARES come strumento di ricerca.
 *
 * Non sono elenchi di nomi come le altre rubriche — opere, luoghi, divinità —
 * ma classificazioni: la riga porta il ramo, il conteggio dei passi e, aperta,
 * i passi stessi. La veste è quella del «Lessico cultuale», cioè quella di un
 * indice a stampa: filetto puntinato fra voce e numero, niente barre (il resto
 * del database è fatto di elenchi navigabili, non di grafici) e niente icone.
 *
 * L'ordine di default è quello **della griglia**, non della frequenza: la
 * griglia è un discorso, e leggerla per frequenza la spezza. Il toggle
 * «frequenza» resta per la domanda opposta, «che cosa è più marcato».
 */

const FIELD_BASE =
  'bg-transparent border-0 border-b border-border/50 rounded-none font-sans text-xs text-ink outline-none ' +
  'focus:border-accent/60 hover:border-border transition-colors';

// Gli stessi tre grigi del Lessico cultuale.
const SEC = 'text-muted';
const TER = 'text-muted/60';

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

/** Filetto puntinato dell'indice a stampa: lega la voce al suo numero. */
const Filetto: React.FC = () => (
  <span className="flex-1 self-center border-b border-dotted border-border/70 mx-1" />
);

const Intestazione: React.FC<{ colore: string; titolo: string; nota: string }> = ({ colore, titolo, nota }) => (
  <div className="flex items-baseline gap-2 mb-1.5 pb-1 border-b border-border/30">
    <span className="h-2 w-2 rounded-[1px] shrink-0 self-center" style={{ backgroundColor: colore }} />
    <h3 className="font-serif text-[15px] text-ink">{titolo}</h3>
    <span className={cn('font-sans text-[11px]', TER)}>{nota}</span>
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
  const totale = visibili.reduce((n, p) => n + p.occorrenze.length, 0);

  const toggle = (k: string) => setAperti(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n;
  });

  const riga = (p: PercorsoLetterario) => {
    const aperto = aperti.has(p.key);
    const parti = p.label.split(' → ');
    const coda = parti[parti.length - 1];
    const testa = parti.slice(1, -1).join(' → '); // l'item è già nell'intestazione di sezione
    const fonte = fonteDelPercorso(p.key);
    return (
      <div key={p.key}>
        <button
          onClick={() => toggle(p.key)}
          className="w-full flex items-baseline gap-2 px-1.5 py-[3px] text-left rounded-sm hover:bg-sidebar/40 transition-colors"
        >
          <span className="shrink-0 truncate text-[13px] font-serif" title={p.label}>
            {testa && <span className={TER}>{testa} → </span>}
            <span className={cn('transition-colors', aperto ? 'text-accent' : 'text-ink')}>{coda}</span>
          </span>
          <Segno fonte={fonte} />
          <Filetto />
          <span className={cn('shrink-0 w-8 text-right text-xs font-sans tabular-nums', SEC)}>
            {p.occorrenze.length}
          </span>
        </button>
        {aperto && (
          <div className="ml-4 pl-3 my-1 border-l border-border/40 space-y-1">
            {p.occorrenze.map((o, i) => (
              <button
                key={`${o.testimoniumId}-${i}`}
                onClick={() => onGo(o.testimoniumId)}
                className="w-full text-left flex items-baseline gap-2 group"
                title={`Vai a ${o.cita}`}
              >
                <span className={cn('text-[11px] font-serif italic shrink-0 group-hover:text-accent', SEC)}>
                  {o.cita}
                </span>
                <span
                  className={cn('text-[13px] truncate', TER, o.lingua === 'grc' ? 'font-greek' : 'font-serif italic')}
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
      <p className={cn('font-serif italic text-sm py-10 text-center', SEC)}>
        Nessun segmento marcato col toolbox: la griglia si riempie marcando il testo, non compilando un campo.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5 items-baseline">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="filtra ramo, passo, testo marcato…"
          className={cn(FIELD_BASE, 'flex-1 min-w-[14rem] py-1')}
        />
        <div className="flex items-baseline gap-1.5">
          {(['griglia', 'frequenza'] as Ordine[]).map((o, i) => (
            <React.Fragment key={o}>
              {i > 0 && <span className={TER}>·</span>}
              <button onClick={() => setOrdine(o)}
                title={o === 'griglia' ? "l'ordine del documento LARES: la griglia è un discorso" : 'che cosa è più marcato'}
                className={cn('font-serif text-[13px] transition-colors', ordine === o ? 'text-accent italic' : `${SEC} hover:text-ink`)}>
                {o === 'griglia' ? 'per griglia' : 'per frequenza'}
              </button>
            </React.Fragment>
          ))}
        </div>
        <span className={cn('font-sans text-[11px]', TER)}>
          {visibili.length} rami · {passi(totale)}
        </span>
      </div>

      {visibili.length === 0 ? (
        <p className={cn('font-serif italic text-sm py-10 text-center', SEC)}>Nessun ramo per questo filtro.</p>
      ) : ordine === 'frequenza' ? (
        <div className="space-y-0.5">
          {[...visibili].sort((a, b) => b.occorrenze.length - a.occorrenze.length || a.label.localeCompare(b.label)).map(riga)}
        </div>
      ) : (
        <div className="space-y-6">
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

  const totale = [...perAmbito.values()].reduce((n, v) => n + v.length, 0);

  if (totale === 0) {
    return (
      <p className={cn('font-serif italic text-sm py-10 text-center', SEC)}>
        Nessun marcatore concettuale assegnato.
      </p>
    );
  }

  const toggle = (k: string) => setAperti(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n;
  });

  return (
    <>
      <p className={cn('font-serif italic text-[13px] leading-relaxed mb-5', SEC)}>
        I nove marcatori qualificano la testimonianza intera, non un segmento: sono l'altro livello
        di LARES, e una stessa testimonianza può stare sotto più ambiti.
      </p>
      <div className="space-y-6">
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
                        className="w-full flex items-baseline gap-2 px-1.5 py-[3px] text-left rounded-sm hover:bg-sidebar/40 transition-colors">
                        <span className="shrink-0 truncate text-[13px] font-serif">
                          <span className={cn('transition-colors', aperto ? 'text-accent' : 'text-ink')}>
                            {AMBITO_LABELS[a.id]}
                          </span>
                          <span className={cn('italic', TER)}> · {a.en}</span>
                        </span>
                        <Filetto />
                        <span className={cn('shrink-0 w-8 text-right text-xs font-sans tabular-nums', SEC)}>
                          {refs.length}
                        </span>
                      </button>
                      {aperto && (
                        <div className="ml-4 pl-3 my-1 border-l border-border/40 flex flex-wrap gap-x-3 gap-y-1">
                          {refs.map(r => (
                            <button key={r.id} onClick={() => onGo(r.id)}
                              className={cn('text-[11px] font-serif italic hover:text-accent', SEC)}>
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
