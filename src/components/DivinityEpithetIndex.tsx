import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

interface DivinitaEpitetiPair {
  divinita: string;
  epiteti: string[];
}

interface DivinityEpithetIndexProps {
  divinitaEpiteti: DivinitaEpitetiPair[];
  /** m.divinita / m.epiteti piatti, usati per recuperare eventuali voci orfane non coperte dalle coppie. */
  divinitaFlat: string[];
  epitetiFlat: string[];
  emptyDivinita: string;
  emptyEpiteti: string;
}

interface Link {
  fromIndex: number;
  toIndex: number;
}

/**
 * Doppio elenco navigabile: divinità a sinistra, epiteti a destra, nella
 * stessa card. Le curve non sono decorative — ricalcano m.divinitaEpiteti,
 * l'unica fonte che sa quale epiteto appartiene a quale divinità in QUESTA
 * iscrizione (m.epiteti/m.divinita sono piatti e perderebbero l'accoppiamento).
 */
export const DivinityEpithetIndex: React.FC<DivinityEpithetIndexProps> = ({
  divinitaEpiteti, divinitaFlat, epitetiFlat, emptyDivinita, emptyEpiteti,
}) => {
  const leftItems = useMemo(() => {
    const named = divinitaEpiteti.map(d => d.divinita);
    const orphans = divinitaFlat.filter(d => !named.includes(d));
    return [...named, ...orphans];
  }, [divinitaEpiteti, divinitaFlat]);

  const rightItems = useMemo(() => {
    const linked: string[] = [];
    divinitaEpiteti.forEach(d => d.epiteti.forEach(e => { if (!linked.includes(e)) linked.push(e); }));
    const orphans = epitetiFlat.filter(e => !linked.includes(e));
    return [...linked, ...orphans];
  }, [divinitaEpiteti, epitetiFlat]);

  const links: Link[] = useMemo(() => {
    const out: Link[] = [];
    divinitaEpiteti.forEach(d => {
      const fromIndex = leftItems.indexOf(d.divinita);
      d.epiteti.forEach(e => {
        const toIndex = rightItems.indexOf(e);
        if (fromIndex >= 0 && toIndex >= 0) out.push({ fromIndex, toIndex });
      });
    });
    return out;
  }, [divinitaEpiteti, leftItems, rightItems]);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [paths, setPaths] = useState<{ d: string; fromIndex: number; toIndex: number }[]>([]);
  const [hover, setHover] = useState<{ side: 'left' | 'right'; index: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const box = container.getBoundingClientRect();
      const next = links.map(({ fromIndex, toIndex }) => {
        const fromEl = leftRefs.current[fromIndex];
        const toEl = rightRefs.current[toIndex];
        if (!fromEl || !toEl) return null;
        const fromBox = fromEl.getBoundingClientRect();
        const toBox = toEl.getBoundingClientRect();
        const x1 = fromBox.right - box.left;
        const y1 = fromBox.top + fromBox.height / 2 - box.top;
        const x2 = toBox.left - box.left;
        const y2 = toBox.top + toBox.height / 2 - box.top;
        const dx = Math.max((x2 - x1) * 0.5, 24);
        return { d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, fromIndex, toIndex };
      }).filter((p): p is { d: string; fromIndex: number; toIndex: number } => p !== null);
      setPaths(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [links, leftItems.length, rightItems.length]);

  const isDim = (side: 'left' | 'right', index: number) => {
    if (!hover) return false;
    if (hover.side === side) return hover.index !== index;
    const connected = links.some(l =>
      hover.side === 'left' ? l.fromIndex === hover.index && l.toIndex === index
                            : l.toIndex === hover.index && l.fromIndex === index
    );
    return !connected;
  };

  const isPathActive = (p: { fromIndex: number; toIndex: number }) => {
    if (!hover) return true;
    return hover.side === 'left' ? p.fromIndex === hover.index : p.toIndex === hover.index;
  };

  return (
    <div ref={containerRef} className="relative grid grid-cols-[1fr_28px_1fr] items-start gap-0">
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={hover && isPathActive(p) ? 1.6 : 1}
            opacity={!hover ? 0.35 : isPathActive(p) ? 0.75 : 0.08}
            className="transition-[opacity,stroke-width] duration-150"
          />
        ))}
      </svg>

      <div className="relative z-10 space-y-1.5">
        <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.1em] text-muted/70 mb-2">Divinità</p>
        {leftItems.length > 0 ? leftItems.map((v, i) => (
          <div
            key={v}
            ref={el => { leftRefs.current[i] = el; }}
            onMouseEnter={() => setHover({ side: 'left', index: i })}
            onMouseLeave={() => setHover(null)}
            className="rounded-lg border border-border bg-card/60 backdrop-blur-md px-3 py-1.5 text-sm font-serif text-ink transition-opacity duration-150"
            style={{ opacity: isDim('left', i) ? 0.35 : 1 }}
          >
            {v}
          </div>
        )) : (
          <p className="text-xs text-muted/50 italic">{emptyDivinita}</p>
        )}
      </div>

      <div className="relative z-10" />

      <div className="relative z-10 space-y-1.5">
        <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.1em] text-muted/70 mb-2">Epiteti</p>
        {rightItems.length > 0 ? rightItems.map((v, i) => (
          <div
            key={v}
            ref={el => { rightRefs.current[i] = el; }}
            onMouseEnter={() => setHover({ side: 'right', index: i })}
            onMouseLeave={() => setHover(null)}
            className="rounded-lg border border-border bg-card/60 backdrop-blur-md px-3 py-1.5 text-sm font-serif text-ink transition-opacity duration-150"
            style={{ opacity: isDim('right', i) ? 0.35 : 1 }}
          >
            {v}
          </div>
        )) : (
          <p className="text-xs text-muted/50 italic">{emptyEpiteti}</p>
        )}
      </div>
    </div>
  );
};
