import React from 'react';
import { cn } from '../lib/utils';
import { MarkupToken, safeParseLitTesto } from '../lib/litMarkup';
import { TokenPath } from '../lib/leidenMarkup';
import { CAMPO_COLOR, LaresCampo } from '../lib/litSources';

/**
 * MarkupText — resa di un testo antico marcato, in lettura e in scrittura.
 *
 * Le convenzioni grafiche sono quelle dell'anteprima dell'edizione epigrafica
 * (EditionMarkupEditor): parentesi quadre per le integrazioni, punti
 * sottoscritti per le lettere incerte, divinità in evidenza, lessico cultuale
 * in malva. Non è un vezzo di coerenza: chi legge una stele e chi legge
 * Esiodo devono riconoscere le stesse marche senza reimpararle.
 *
 * Lo stesso componente serve l'editor (`editable`): i token testo portano
 * allora un `data-tok` con il proprio percorso, che la selezione del browser
 * usa per sapere che cosa si sta marcando, e gli elementi diventano
 * cliccabili. Una resa sola per le due modalità — altrimenti si divergerebbe
 * al primo ritocco.
 *
 * Testo non marcato (o markup malformato) viene reso com'è: la sezione resta
 * leggibile anche prima che qualcuno abbia marcato alcunché.
 */

const CAMPI: LaresCampo[] = ['rappresentazione', 'comunicazione', 'fruizione'];

const testoDi = (t: MarkupToken): string =>
  t.kind === 'text' ? t.value : t.name === 'lb' ? ' ' : t.children.map(testoDi).join('');

interface FlowProps {
  tokens: MarkupToken[];
  numeri?: boolean;
  contatore: { n: number };
  /** in scrittura: percorso del token padre, per il data-tok dei figli */
  basePath?: TokenPath;
  onElClick?: (path: TokenPath, token: MarkupToken & { kind: 'el' }, ev: React.MouseEvent) => void;
}

const Flow: React.FC<FlowProps> = ({ tokens, numeri, contatore, basePath, onElClick }) => {
  const editable = !!basePath;
  const sub = (children: MarkupToken[], path: TokenPath) => (
    <Flow tokens={children} numeri={numeri} contatore={contatore}
      basePath={editable ? path : undefined} onElClick={onElClick} />
  );

  return (
    <>
      {tokens.map((t, i) => {
        const path: TokenPath = [...(basePath || []), i];
        if (t.kind === 'text') {
          return <span key={i} data-tok={editable ? JSON.stringify(path) : undefined}>{t.value}</span>;
        }
        const a = t.attrs;
        const kids = sub(t.children, path);
        const click = onElClick ? (e: React.MouseEvent) => {
          // Una selezione in corso vince sempre sul click: aprire il popover
          // dell'elemento chiuderebbe il menu di markup appena evocato.
          const s = window.getSelection();
          if (s && !s.isCollapsed && s.toString().length > 0) return;
          e.stopPropagation();
          onElClick(path, t as MarkupToken & { kind: 'el' }, e);
        } : undefined;
        const hover = onElClick ? 'cursor-pointer hover:bg-accent/10 rounded transition-colors' : '';

        switch (t.name) {
          case 'lb': {
            contatore.n += 1;
            const n = contatore.n;
            return (
              <span key={i} className="select-none">
                {n !== 1 && <br />}
                {numeri && (
                  <span className="inline-flex w-8 -ml-8 pr-1 justify-end align-baseline text-muted/35 text-[9px] font-mono">
                    {n % 5 === 0 || n === 1 ? n : ''}
                  </span>
                )}
              </span>
            );
          }
          case 'supplied': {
            const omessa = a.reason === 'omitted';
            return (
              <span key={i} onClick={click} title={omessa ? 'Omesso dal copista' : 'Integrazione dell\'editore'}
                className={cn('text-muted/70', hover)}>
                {omessa ? '⟨' : '['}{kids}{omessa ? '⟩' : ']'}
              </span>
            );
          }
          case 'gap': {
            let g = '[- - -]';
            if (a.reason === 'illegible') g = a.quantity ? '·'.repeat(Math.min(Number(a.quantity) || 5, 12)) : '·····';
            else if (a.quantity) g = `[- ca. ${a.quantity} -]`;
            else if (a.atLeast) g = `[- ${a.atLeast}-${a.atMost} -]`;
            return <span key={i} onClick={click} title="Lacuna della tradizione"
              className={cn('font-mono text-sm tracking-widest text-muted/80', hover)}>{g}</span>;
          }
          case 'unclear':
            return <span key={i} onClick={click} title="Lettura incerta"
              className={cn('border-b border-dotted border-muted/60', hover)}>{kids}</span>;
          case 'surplus':
            return <span key={i} onClick={click} title={a.resp ? `Espunto da ${a.resp}` : 'Espunzione'}
              className={cn('text-muted/70', hover)}>{'{'}{kids}{'}'}</span>;
          case 'expan': {
            const abbrIdx = t.children.findIndex(c => c.kind === 'el' && c.name === 'abbr');
            const abbr = abbrIdx >= 0 ? t.children[abbrIdx] : undefined;
            const ex = t.children.find(c => c.kind === 'el' && c.name === 'ex');
            return (
              <span key={i} onClick={click} title="Abbreviazione sciolta" className={hover}>
                {abbr && abbr.kind === 'el' && sub(abbr.children, [...path, abbrIdx])}
                {ex && <span className="text-muted/70 italic">({testoDi(ex)})</span>}
              </span>
            );
          }
          case 'choice': {
            const corrIdx = t.children.findIndex(c => c.kind === 'el' && c.name === 'corr');
            const corr = corrIdx >= 0 ? t.children[corrIdx] : undefined;
            const sic = t.children.find(c => c.kind === 'el' && c.name === 'sic');
            return (
              <span key={i} onClick={click} title={sic ? `Correzione (tràdito: «${testoDi(sic)}»)` : 'Correzione editoriale'}
                className={cn('border-b border-dotted border-accent/70', hover)}>
                {corr && corr.kind === 'el' ? sub(corr.children, [...path, corrIdx]) : kids}
              </span>
            );
          }
          case 'app': {
            // Apparato: si legge la lezione accolta, la variante sta nel titolo.
            const lemIdx = t.children.findIndex(c => c.kind === 'el' && c.name === 'lem');
            const lem = lemIdx >= 0 ? t.children[lemIdx] : undefined;
            const rdgs = t.children.filter(c => c.kind === 'el' && c.name === 'rdg');
            const nota = rdgs
              .map(r => `${testoDi(r)}${r.kind === 'el' && r.attrs.wit ? ` (${r.attrs.wit})` : ''}`)
              .join(' · ');
            return (
              <span key={i} onClick={click} title={nota ? `Variante: ${nota}` : 'Apparato'}
                className={cn('border-b border-dashed border-muted/50', hover)}>
                {lem && lem.kind === 'el' ? sub(lem.children, [...path, lemIdx]) : kids}
              </span>
            );
          }
          case 'lem':
          case 'rdg':
          case 'name':
            return <span key={i} onClick={click} className={hover}>{kids}</span>;
          case 'persName': {
            const cls =
              a.type === 'divine' ? 'font-bold text-accent' :
              a.type === 'attested' ? 'underline decoration-dotted decoration-accent underline-offset-2' :
              a.type === 'ruler' ? 'italic font-semibold text-accent/80' :
              a.type === 'emperor' ? 'font-semibold text-accent/70' : '';
            return <span key={i} onClick={click} title={`${a.type === 'divine' ? 'Divinità' : 'Persona'}: ${a.key || '—'}`}
              className={cn(cls, hover)}>{kids}</span>;
          }
          case 'w':
            return (
              <span key={i} onClick={click} className={cn('text-cult', hover)}
                title={`${a.lemma ? `Lessico cultuale: ${a.lemma}` : 'Parola marcata'}${a.ana ? ` — ${a.ana.replace(/#/g, '')}` : ''}`}>
                {kids}
              </span>
            );
          case 'rs': {
            if (a.type === 'epithet') return <span key={i} onClick={click} title="Epiteto" className={cn('text-accent/80', hover)}>{kids}</span>;
            if (a.type === 'cultTerm' || a.type === 'cultFormula') {
              return <span key={i} onClick={click} title={`Funzione cultuale${a.key ? `: ${a.key}` : ''}`}
                className={cn('text-cult', hover)}>{kids}</span>;
            }
            if (a.subtype && CAMPI.includes(a.type as LaresCampo)) {
              return (
                <span key={i} onClick={click} title={`LARES · ${a.type} → ${a.subtype}`}
                  className={cn('border-b-2', hover)}
                  style={{ borderColor: CAMPO_COLOR[a.type as LaresCampo] }}>
                  {kids}
                </span>
              );
            }
            return <span key={i} onClick={click} title={a.type ? `${a.type}${a.key ? `: ${a.key}` : ''}` : undefined} className={hover}>{kids}</span>;
          }
          case 'placeName':
            return <span key={i} onClick={click} title={a.type === 'ethnic' ? 'Etnico' : 'Toponimo'}
              className={cn('underline decoration-dotted underline-offset-2 decoration-muted/60', hover)}>{kids}</span>;
          case 'mentioned':
            return <span key={i} onClick={click} title={a.corresp ? `Parola citata: ${a.corresp}` : 'Parola citata in quanto parola'}
              className={cn('italic', hover)}>«{kids}»</span>;
          case 'quote':
            return <span key={i} onClick={click} title={a.source ? `Citazione: ${a.source}` : 'Citazione interna'}
              className={cn('text-ink/75', hover)}>“{kids}”</span>;
          case 'title':
            return <span key={i} onClick={click} className={cn('italic', hover)}>{kids}</span>;
          case 'ref':
            return <span key={i} onClick={click} title={`Fonte ${a.type || ''}${a.target ? `: ${a.target}` : ''}`}
              className={cn('underline decoration-dotted underline-offset-2 decoration-accent/50', hover)}>{kids}</span>;
          case 'num':
            return <span key={i} onClick={click} title={a.value ? `Valore: ${a.value}` : 'Numerale'}
              className={cn('tabular-nums', hover)}>{kids}</span>;
          case 'date':
            return <span key={i} onClick={click} title="Data" className={cn('border-b border-dotted border-muted/40', hover)}>{kids}</span>;
          default:
            return <span key={i} onClick={click} title={`<${t.name}>`} className={hover}>{kids}</span>;
        }
      })}
    </>
  );
};

export const MarkupText: React.FC<{
  testo: string;
  lang: 'grc' | 'lat';
  /** numera i versi/righe nel margine, come nell'anteprima dell'edizione */
  numeri?: boolean;
  className?: string;
}> = ({ testo, lang, numeri, className }) => {
  const tokens = React.useMemo(() => safeParseLitTesto(testo), [testo]);

  if (!tokens) {
    // Markup rotto: si mostra comunque il testo, non un errore. Il guasto è
    // segnalato dove va segnalato — nell'editor e nel controllo d'integrità.
    return <span lang={lang} className={cn('whitespace-pre-wrap', className)}>{testo}</span>;
  }

  return (
    <span lang={lang} className={cn('whitespace-pre-wrap', numeri && 'pl-8', className)}>
      <Flow tokens={tokens} numeri={numeri} contatore={{ n: 0 }} />
    </span>
  );
};

/** Variante su token già in memoria: anteprima e superficie di lavoro dell'editor. */
export const MarkupTokenView: React.FC<{
  tokens: MarkupToken[];
  lang: 'grc' | 'lat';
  numeri?: boolean;
  className?: string;
  /** attiva la modalità scrittura: data-tok sui testi, elementi cliccabili */
  editable?: boolean;
  onElClick?: (path: TokenPath, token: MarkupToken & { kind: 'el' }, ev: React.MouseEvent) => void;
}> = ({ tokens, lang, numeri, className, editable, onElClick }) => (
  <span lang={lang} className={cn('whitespace-pre-wrap', numeri && 'pl-8', className)}>
    <Flow tokens={tokens} numeri={numeri} contatore={{ n: 0 }}
      basePath={editable ? [] : undefined} onElClick={editable ? onElClick : undefined} />
  </span>
);

export default MarkupText;
