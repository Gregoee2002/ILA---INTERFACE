import { useMemo } from 'react';
import { diffLines, Change } from 'diff';
import { cn } from '../lib/utils';

/**
 * XmlDiffViewer
 * --------------
 * Diff riga per riga fra due stringhe XML (es. draft dell'estrazione Vision
 * vs versione revisionata a mano). Componente SOLO di visualizzazione: non
 * scrive né modifica alcun file, non interagisce con githubStorage.ts.
 * Prende in input due stringhe già caricate a monte dal chiamante.
 */

interface XmlDiffViewerProps {
  left: string;
  right: string;
  leftLabel?: string;
  rightLabel?: string;
}

interface Row {
  key: number;
  leftLine: string | null;
  rightLine: string | null;
  kind: 'same' | 'removed' | 'added';
}

function toRows(changes: Change[]): Row[] {
  const rows: Row[] = [];
  let key = 0;
  for (let i = 0; i < changes.length; i++) {
    const part = changes[i];
    const lines = part.value.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();

    if (!part.added && !part.removed) {
      for (const line of lines) rows.push({ key: key++, leftLine: line, rightLine: line, kind: 'same' });
      continue;
    }

    if (part.removed) {
      const next = changes[i + 1];
      if (next?.added) {
        // Coppia rimosso/aggiunto consecutiva: le affianchiamo come una riga modificata.
        const addedLines = next.value.split('\n');
        if (addedLines[addedLines.length - 1] === '') addedLines.pop();
        const max = Math.max(lines.length, addedLines.length);
        for (let j = 0; j < max; j++) {
          rows.push({
            key: key++,
            leftLine: lines[j] ?? null,
            rightLine: addedLines[j] ?? null,
            kind: lines[j] !== undefined && addedLines[j] !== undefined ? 'removed' : (lines[j] !== undefined ? 'removed' : 'added'),
          });
        }
        i++; // consumato anche il blocco 'added' successivo
        continue;
      }
      for (const line of lines) rows.push({ key: key++, leftLine: line, rightLine: null, kind: 'removed' });
      continue;
    }

    // part.added senza rimozione precedente abbinata
    for (const line of lines) rows.push({ key: key++, leftLine: null, rightLine: line, kind: 'added' });
  }
  return rows;
}

export function XmlDiffViewer({ left, right, leftLabel = 'Draft', rightLabel = 'Revisionato' }: XmlDiffViewerProps) {
  const rows = useMemo(() => toRows(diffLines(left, right)), [left, right]);

  const stats = useMemo(() => {
    let added = 0, removed = 0, same = 0;
    for (const r of rows) {
      if (r.kind === 'added') added++;
      else if (r.kind === 'removed') removed++;
      else same++;
    }
    return { added, removed, same };
  }, [rows]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 text-xs font-sans text-muted">
        <span className="font-semibold text-ink">{leftLabel} → {rightLabel}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500/70" /> {stats.removed} rimosse</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500/70" /> {stats.added} aggiunte</span>
        <span>{stats.same} invariate</span>
      </div>
      <div className="overflow-auto rounded-lg border border-border font-mono text-[13px] leading-relaxed">
        <table className="w-full border-collapse">
          <tbody>
            {rows.map(row => (
              <tr key={row.key} className="align-top">
                <td
                  className={cn(
                    'w-1/2 whitespace-pre-wrap break-all border-r border-border px-3 py-0.5 text-ink',
                    row.kind === 'removed' && 'bg-red-500/10',
                    row.leftLine === null && 'bg-border/20'
                  )}
                >
                  {row.leftLine !== null ? row.leftLine : ''}
                </td>
                <td
                  className={cn(
                    'w-1/2 whitespace-pre-wrap break-all px-3 py-0.5 text-ink',
                    row.kind === 'added' && 'bg-emerald-500/10',
                    row.rightLine === null && 'bg-border/20'
                  )}
                >
                  {row.rightLine !== null ? row.rightLine : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
