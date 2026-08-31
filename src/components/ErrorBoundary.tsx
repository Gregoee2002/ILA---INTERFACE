import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Nodo mostrato al posto dei figli quando il rendering lancia un'eccezione. */
  fallback?: React.ReactNode;
  /** Callback opzionale per logging/telemetria. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
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
