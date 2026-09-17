import React from 'react';
import { ApparatusEntry, toApparatusRow, splitApparatusNote, formatApparatusLoc } from '../lib/apparatus';

type Props = {
  value?: ApparatusEntry[] | string;
  /** Evidenzia i termini cercati (di norma <Highlight text={t} query={q} />). */
  render?: (text: string) => React.ReactNode;
  className?: string;
};

// L'apparato in forma tabellare: riga | lezione | lettore in maiuscoletto.
export const ApparatusNotes: React.FC<Props> = ({ value, render, className }) => {
  const show = (t: string) => (render ? render(t) : t);

  const rows = React.useMemo(() => {
    if (Array.isArray(value)) return value.map(toApparatusRow);
    const raw = (value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!raw) return [];
    // Apparato ancora in forma libera: si prova comunque a isolare "l. n:" iniziale.
    const m = raw.match(/^(l+\.\s*\d+(?:\s*[-–]\s*\d+)?|\d+(?:\s*[-–]\s*\d+)?)\s*[:.]\s*(.+)$/i);
    if (!m) return [{ loc: '', ...splitApparatusNote(raw) }];
    return [{ loc: formatApparatusLoc(m[1]), ...splitApparatusNote(m[2]) }];
  }, [value]);

  if (rows.length === 0) return null;

  return (
    <dl className={className}>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-[3.5rem_1fr] gap-x-4 items-baseline py-1.5 border-t border-border/25 first:border-t-0 first:pt-0 last:pb-0"
        >
          <dt className="text-[10px] font-sans uppercase tracking-[0.12em] text-muted/60 tabular-nums text-right">
            {r.loc}
          </dt>
          <dd className="text-ink/75 leading-relaxed">
            {show(r.lezione)}
            {r.lettore && (
              <span
                className="ml-2 text-[0.95em] tracking-[0.06em] text-muted/80"
                style={{ fontVariant: 'small-caps' }}
              >
                {show(r.lettore)}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
};
