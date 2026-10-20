import { Component, type ReactNode } from 'react';
import { reportError } from '@/constants/sentry';

type BoundaryProps = {
  children: ReactNode;
  /** Render-prop: recibe retry() (limpia el error y re-monta children). */
  fallback: (retry: () => void) => ReactNode;
};

type BoundaryState = { error: Error | null };

/* Boundary local generico (auditoria Codex EH-01, nivel 3 — "widget"): a
   diferencia del boundary por ruta de Expo Router, este envuelve un
   componente puntual (hoy solo KnowledgeGraph) para que un fallo de render
   ahi no tumbe toda la pantalla que lo contiene. Class component a
   proposito: getDerivedStateFromError no tiene equivalente en hooks. */
export class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  // componentDidCatch (no getDerivedStateFromError) es el lugar correcto
  // para side effects como reportar a Sentry -- getDerivedStateFromError
  // debe quedar puro.
  componentDidCatch(error: Error) {
    reportError(error);
  }

  retry = () => this.setState({ error: null });

  render() {
    if (this.state.error) return this.props.fallback(this.retry);
    return this.props.children;
  }
}
