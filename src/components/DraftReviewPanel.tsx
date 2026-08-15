import React, { useEffect, useMemo, useState } from 'react';
import { FileSearch, CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { XmlDiffViewer } from './XmlDiffViewer';

/**
 * DraftReviewPanel
 * -----------------
 * Vista di sola lettura sulle estrazioni draft dell'agente Vision (Lane
 * 1971, volume I) non ancora integrate nel corpus. Per ogni entry con un
 * corrispettivo già revisionato in src/data/corpus mostra il diff
 * riga-per-riga (via XmlDiffViewer); per le altre mostra il draft grezzo
 * per una prima lettura. Non scrive né importa nulla: la revisione vera e
 * l'eventuale porting nel corpus restano un passo manuale in Oxygen.
 */

interface DraftFile {
  filename: string;
  size: number;
  hasCorpusMatch: boolean;
}

function parseEntryLabel(filename: string): string {
  const m = filename.match(/^CMRDM-([A-Z]+)-(\d+)_nr(\d+)/);
  if (!m) return filename;
  const [, region, num] = m;
  return `${region} ${parseInt(num, 10)}`;
}

export function DraftReviewPanel() {
  const [drafts, setDrafts] = useState<DraftFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [corpusContent, setCorpusContent] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'reviewed' | 'pending'>('pending');

  useEffect(() => {
    fetch('/api/drafts/files')
      .then(r => r.json())
      .then(data => setDrafts(Array.isArray(data) ? data : []))
      .catch(() => setError('Impossibile caricare l\'elenco dei draft.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) { setDraftContent(null); setCorpusContent(null); return; }
    const entry = drafts.find(d => d.filename === selected);
    if (!entry) return;

    fetch(`/api/drafts/file/${encodeURIComponent(selected)}`)
      .then(r => r.text())
      .then(setDraftContent)
      .catch(() => setDraftContent('Errore nel caricamento del draft.'));

    if (entry.hasCorpusMatch) {
      fetch(`/api/corpus/file/${encodeURIComponent(selected)}`)
        .then(r => r.text())
        .then(setCorpusContent)
        .catch(() => setCorpusContent(null));
    } else {
      setCorpusContent(null);
    }
  }, [selected, drafts]);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? drafts : drafts.filter(d => filter === 'reviewed' ? d.hasCorpusMatch : !d.hasCorpusMatch);
    return [...list].sort((a, b) => a.filename.localeCompare(b.filename));
  }, [drafts, filter]);

  const reviewedCount = useMemo(() => drafts.filter(d => d.hasCorpusMatch).length, [drafts]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
      {/* Colonna elenco */}
      <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-border overflow-y-auto p-4">
        <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-accent/70 mb-2">
          Revisione estrazioni draft
        </div>
        <p className="text-xs font-serif italic text-muted leading-relaxed mb-4">
          Draft generati dall'agente di estrazione Vision su Lane 1971, vol. I. Sola lettura: nessuna
          scrittura sul corpus. {drafts.length} entry draft, {reviewedCount} già presenti (revisionate) nel corpus.
        </p>

        <div className="flex gap-1.5 mb-4">
          {(['pending', 'reviewed', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-colors',
                filter === f ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:text-ink'
              )}
            >
              {f === 'pending' ? 'Da revisionare' : f === 'reviewed' ? 'Già in corpus' : 'Tutte'}
            </button>
          ))}
        </div>

        {loading && <div className="text-xs text-muted italic">Caricamento…</div>}
        {error && <div className="text-xs text-red-500">{error}</div>}

        <div className="space-y-0.5">
          {filtered.map(d => (
            <button
              key={d.filename}
              onClick={() => setSelected(d.filename)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left text-xs font-sans transition-colors',
                selected === d.filename ? 'bg-accent/15 text-ink' : 'hover:bg-border/20 text-muted'
              )}
            >
              {d.hasCorpusMatch
                ? <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                : <Circle className="h-3.5 w-3.5 shrink-0 opacity-40" />}
              <span className="flex-1 truncate">{parseEntryLabel(d.filename)}</span>
              <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
            </button>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="text-xs italic text-muted/60 py-4 text-center">Nessuna entry in questa vista.</div>
          )}
        </div>
      </div>

      {/* Colonna dettaglio */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected && (
          <div className="h-full flex flex-col items-center justify-center text-muted gap-2">
            <FileSearch className="h-8 w-8 opacity-30" />
            <p className="text-sm font-serif italic">Seleziona un'entry per vedere il draft.</p>
          </div>
        )}

        {selected && draftContent && corpusContent && (
          <XmlDiffViewer left={draftContent} right={corpusContent} leftLabel="Draft (Vision)" rightLabel="Corpus (revisionato)" />
        )}

        {selected && draftContent && !corpusContent && (
          <div className="flex flex-col gap-3">
            <div className="text-xs font-sans text-muted">
              Nessuna versione revisionata ancora presente nel corpus per questa entry — draft grezzo qui sotto.
            </div>
            <pre className="overflow-auto rounded-lg border border-border p-4 font-mono text-[13px] leading-relaxed text-ink whitespace-pre-wrap">
              {draftContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
