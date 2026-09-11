import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { ToolboxFonte, ToolboxItem, itemColor } from '../lib/laresToolbox';
import { CultToolboxStats, CultLemmaStats } from '../lib/cultIndex';
import { ChevronRight } from 'lucide-react';

/**
 * LaresGrid — gli stessi lemmi ordinati per percorso dell'Analytical Toolbox
 * LARES invece che per famiglia. Di default elenca solo i percorsi attestati;
 * il toggle «rami vuoti» aggiunge i rami che il corpus non ha ancora toccato.
 * Le voci innestate da ILA (docs/merge-lessico-lares.md §4) portano un segno.
 */

interface Props {
  /** griglia risolta (seed ⊕ overlay). */
  toolbox: ToolboxItem[];
  /** percorsi attestati, in ordine di griglia, già filtrati. */
  percorsi: CultToolboxStats[];
  senzaPercorso: CultLemmaStats[];
  renderLemmaRow: (l: CultLemmaStats) => React.ReactNode;
  atts: (n: number) => string;
  /** passi letterari per percorso (chiave "item/cat/sub"), accostati non sommati. */
  letterari?: Map<string, number>;
}

const FONTE_LABEL: Record<ToolboxFonte, string> = {
  'LARES-enlarged': 'voce della versione allargata LARES',
  'ILA': 'voce innestata da ILA sul corpus di Men',
};

export const Segno: React.FC<{ fonte?: ToolboxFonte }> = ({ fonte }) =>
  fonte ? (
    <span
      title={FONTE_LABEL[fonte]}
      className={cn(
        'shrink-0 text-[9px] font-sans uppercase tracking-[0.1em] px-1 py-px rounded-sm border',
        fonte === 'ILA'
          ? 'text-cult border-[var(--cult)]/40'
          : 'text-muted/60 border-border/50',
      )}
    >
      {fonte === 'ILA' ? 'ILA' : 'LARES+'}
    </span>
  ) : null;

/** La fonte della voce più profonda del percorso. */
const fonteDi = (toolbox: ToolboxItem[], key: string): ToolboxFonte | undefined => {
  const [itemId, catId, subId] = key.split('/');
  const item = toolbox.find(i => i.id === itemId);
  const cat = item?.categorie.find(c => c.id === catId);
  const sub = cat?.sub.find(s => s.id === subId);
  return sub?.fonte || cat?.fonte;
};

/** «Item → Cat → Sub» → «Cat → Sub»: l'item è già nell'intestazione di sezione. */
const etichettaCoda = (label: string) => label.split(' → ').slice(1).join(' → ') || label;

interface Riga {
  key: string;
  label: string;
  fonte?: ToolboxFonte;
  stats?: CultToolboxStats;
}

export const LaresGrid: React.FC<Props> = ({ toolbox, percorsi, senzaPercorso, renderLemmaRow, atts, letterari }) => {
  const [mostraVuoti, setMostraVuoti] = useState(false);
  const [chiusi, setChiusi] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setChiusi(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const perKey = new Map(percorsi.map(p => [p.key, p]));

  const somaTesti = (prefisso: string) => {
    if (!letterari) return 0;
    let n = 0;
    for (const [k, v] of letterari) if (k === prefisso || k.startsWith(prefisso + '/')) n += v;
    return n;
  };

  const righeAttestate = (itemId: string): Riga[] =>
    percorsi
      .filter(p => p.marker.item === itemId)
      .map(p => ({ key: p.key, label: etichettaCoda(p.label), fonte: fonteDi(toolbox, p.key), stats: p }));

  const righeComplete = (item: ToolboxItem): Riga[] => {
    const out: Riga[] = [];
    for (const cat of item.categorie) {
      const catKey = `${item.id}/${cat.id}`;
      if (perKey.has(catKey)) out.push({ key: catKey, label: cat.label, fonte: cat.fonte, stats: perKey.get(catKey) });
      else if (cat.sub.length === 0) out.push({ key: catKey, label: cat.label, fonte: cat.fonte });
      for (const sub of cat.sub) {
        const k = `${catKey}/${sub.id}`;
        out.push({ key: k, label: `${cat.label} → ${sub.label}`, fonte: sub.fonte || cat.fonte, stats: perKey.get(k) });
      }
    }
    return out;
  };

  const renderRiga = (r: Riga) => {
    if (!r.stats) {
      return (
        <div key={r.key} className="flex items-baseline gap-2 px-2 py-1 text-xs">
          <span className="font-serif text-muted/40">{r.label}</span>
          <Segno fonte={r.fonte} />
          <span className="text-muted/30">—</span>
        </div>
      );
    }
    const s = r.stats;
    const open = !chiusi.has(r.key);
    const nTesti = somaTesti(r.key);
    return (
      <div key={r.key}>
        <button
          onClick={() => toggle(r.key)}
          className="w-full flex items-baseline gap-3 px-2 py-1.5 text-left rounded-sm hover:bg-sidebar/50 transition-colors"
        >
          <span className="font-serif text-[13px] text-ink/85 shrink-0 min-w-[10rem]">{r.label}</span>
          <span className="shrink-0 text-xs font-sans text-muted/60">
            {s.lemmata.length} {s.lemmata.length === 1 ? 'lemma' : 'lemmi'} · {atts(s.count)}
          </span>
          {nTesti > 0 && (
            <span
              className="shrink-0 text-xs font-sans text-muted/50 tabular-nums"
              title="passi nelle fonti letterarie, contati a parte"
            >
              +{nTesti} nei testi
            </span>
          )}
          <Segno fonte={r.fonte} />
          <span className="flex-1" />
          <ChevronRight
            className={cn('shrink-0 h-3.5 w-3.5 text-muted/60 self-center transition-transform', open && 'rotate-90')}
          />
        </button>
        {open && <div className="pl-4 space-y-0.5">{s.lemmata.map(renderLemmaRow)}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 -mt-1">
        <p className="text-xs font-sans text-muted/70">
          Gli stessi lemmi per percorso dell'Analytical Toolbox LARES, non per famiglia.
        </p>
        <button
          onClick={() => setMostraVuoti(v => !v)}
          className={cn(
            'shrink-0 px-2.5 py-1 rounded-md border text-[10px] font-sans font-bold uppercase tracking-widest transition-colors',
            mostraVuoti ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border/50 text-muted hover:text-ink',
          )}
        >
          rami vuoti
        </button>
      </div>

      {toolbox.filter(item => !item.deprecated).map(item => {
        const righe = mostraVuoti ? righeComplete(item) : righeAttestate(item.id);
        const conAtt = righe.filter(r => r.stats);
        if (righe.length === 0 || (!mostraVuoti && conAtt.length === 0)) return null;
        const totAtt = conAtt.reduce((n, r) => n + (r.stats?.count || 0), 0);
        const totLemmi = conAtt.reduce((n, r) => n + (r.stats?.lemmata.length || 0), 0);
        return (
          <section key={item.id}>
            <div className="flex items-baseline gap-2.5 mb-2 pb-1 border-b border-border/40">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: itemColor(item.id) }} />
              <h3
                className={cn(
                  'text-sm font-sans font-bold uppercase tracking-[0.15em]',
                  conAtt.length ? 'text-ink/90' : 'text-ink/40',
                )}
              >
                {item.label}
              </h3>
              <span className="text-xs font-sans text-muted/60">
                {conAtt.length
                  ? `${totLemmi} ${totLemmi === 1 ? 'lemma' : 'lemmi'} · ${atts(totAtt)}`
                  : 'nessuna attestazione'}
              </span>
            </div>
            <div className="space-y-0.5">{righe.map(renderRiga)}</div>
          </section>
        );
      })}

      {senzaPercorso.length > 0 && (
        <section>
          <div className="flex items-baseline gap-2.5 mb-2 pb-1 border-b border-border/40">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0 bg-muted/30" />
            <h3 className="text-sm font-sans font-bold uppercase tracking-[0.15em] text-ink/70">Senza percorso</h3>
            <span className="text-xs font-sans text-muted/60">{senzaPercorso.length}</span>
          </div>
          <div className="space-y-0.5">{senzaPercorso.map(renderLemmaRow)}</div>
        </section>
      )}
    </div>
  );
};
