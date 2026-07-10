/* Grafo: tipos de vínculo entre nodos — mapea directo a los dos casos que
   motivan la funcion (patrones convergentes vs. datos dispares que se
   capturan en vez de descartarse), mas dos generales. Fuente única para
   node/[id].tsx y el componente de visualizacion del grafo. */
export const RELATION_META: Record<string, { label: string; glyph: string; color: string }> = {
  similar:     { label: 'Similar',     glyph: '≈', color: '#67E8F9' },
  contradicts: { label: 'Contradicts', glyph: '⚡', color: '#FB7185' },
  builds_on:   { label: 'Builds on',   glyph: '⤴', color: '#A78BFA' },
  custom:      { label: 'Custom',      glyph: '✦', color: '#8A94AD' },
  // Vínculos del modo certificación (contrato extendido /graph — G5):
  confusable_with: { label: 'Confusable with', glyph: '⇄', color: '#FF5C77' },
  exam_related:    { label: 'Exam related',    glyph: '◆', color: '#FFD166' },
  cites:           { label: 'Cites',           glyph: '❝', color: '#C4B5FD' },
};
