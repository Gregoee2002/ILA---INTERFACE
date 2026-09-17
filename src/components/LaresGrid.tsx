import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { ToolboxFonte, ToolboxItem, itemColor } from '../lib/laresToolbox';
import { CultToolboxStats, CultLemmaStats } from '../lib/cultIndex';

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
        'shrink-0 font-serif text-[10px] align-super',
        fonte === 'ILA' ? 'text-cult' : 'text-muted/60',
      )}
    >
      {fonte === 'ILA' ? 'ila' : 'lar'}
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
        <div key={r.key} className="flex items-baseline gap-2 px-1.5 py-[3px] text-xs">
          <span className="font-serif text-muted/60">{r.label}</span>
          <Segno fonte={r.fonte} />
          <span className="text-muted/60">—</span>
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
          className="w-full flex items-baseline gap-2 px-1.5 py-[3px] text-left rounded-sm hover:bg-sidebar/40 transition-colors"
        >
          <span className="font-serif text-[13px] shrink-0 text-ink">{r.label}</span>
          <Segno fonte={r.fonte} />
          <span className="flex-1 self-center border-b border-dotted border-border/70 mx-1" />
          <span className="shrink-0 text-xs font-sans text-muted">
            {s.lemmata.length} {s.lemmata.length === 1 ? 'lemma' : 'lemmi'} · {atts(s.count)}
          </span>
          {nTesti > 0 && (
            <span
              className="shrink-0 text-xs font-sans text-muted/60 tabular-nums"
              title="passi nelle fonti letterarie, contati a parte"
            >
              +{nTesti}
            </span>
          )}
        </button>
        {open && <div className="ml-4 pl-3 my-1 border-l border-border/40">{s.lemmata.map(renderLemmaRow)}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 -mt-1">
        <p className="font-serif italic text-[13px] text-muted">
          Gli stessi lemmi per percorso dell'Analytical Toolbox LARES, non per famiglia.
        </p>
        <button
          onClick={() => setMostraVuoti(v => !v)}
          className={cn(
            'shrink-0 font-serif text-[13px] transition-colors',
            mostraVuoti ? 'text-accent italic' : 'text-muted hover:text-ink',
          )}
        >
          Rami vuoti
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
            <div className="flex items-baseline gap-2 mb-1.5 pb-1 border-b border-border/30">
              <span className="h-2 w-2 rounded-[1px] shrink-0 self-center" style={{ backgroundColor: itemColor(item.id) }} />
              <h3 className={cn('font-serif text-[15px]', conAtt.length ? 'text-ink' : 'text-muted')}>
                {item.label}
              </h3>
              <span className="font-sans text-[11px] text-muted/60">
                {conAtt.length
                  ? `${totLemmi} ${totLemmi === 1 ? 'lemma' : 'lemmi'} · ${atts(totAtt)}`
                  : 'nessuna attestazione'}
              </span>
            </div>
            <div>{righe.map(renderRiga)}</div>
          </section>
        );
      })}

      {senzaPercorso.length > 0 && (
        <section>
          <div className="flex items-baseline gap-2 mb-1.5 pb-1 border-b border-border/30">
            <span className="h-2 w-2 rounded-[1px] shrink-0 self-center bg-muted/40" />
            <h3 className="font-serif text-[15px] text-ink">Senza percorso</h3>
            <span className="font-sans text-[11px] text-muted/60">{senzaPercorso.length}</span>
          </div>
          <div>{senzaPercorso.map(renderLemmaRow)}</div>
        </section>
      )}
    </div>
  );
};
