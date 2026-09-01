import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Nodo mostrato al posto dei figli quando il rendering lancia un'eccezione. */
  fallback?: React.ReactNode;
  /** Callback opzionale per logging/telemetria. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /**
   * Quando uno di questi valori cambia mentre il confine è sul fallback, il
   * confine si ripristina e riprova a montare i figli. Senza, React resta
   * bloccato sul fallback per tutti i contenuti successivi finché il
   * sottoalbero non viene rimontato (BUG-02): es. dopo la prima scheda con
   * testo epigrafico che lancia, tutte le schede successive dello stesso
   * pannello restano a testo grezzo. Passare `resetKeys={[entryId]}`.
   */
  resetKeys?: ReadonlyArray<unknown>;
}

interface State {
  hasError: boolean;
}

function resetKeysChanged(a?: ReadonlyArray<unknown>, b?: ReadonlyArray<unknown>): boolean {
  if (a === b) return false;
  if (!a || !b || a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return true;
  }
  return false;
}

/**
 * Confine d'errore generico: isola un sottoalbero che potrebbe lanciare in
 * render (es. il renderer del testo epigrafico su XML malformato) evitando che
 * l'eccezione faccia collassare l'intera vista con una schermata bianca.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary ha intercettato un errore di rendering:', error, info);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <span className="text-[11px] italic text-muted/70">
            [contenuto non visualizzabile]
          </span>
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
