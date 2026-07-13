/* Tipos de contenido del KB: doctoral 7D vs. certificación de nube vs.
   investigador (literatura general, cualquier disciplina/nivel). Fuente única
   para badges, filtros y grafo. El backend expone contentType/vendor como
   campos propios; mientras llegan (nodos viejos en cache), se derivan de los
   campos que la API ya sirve (dimension === "Certification Review"/
   "Investigación General", enfoque = vendor), así la UI funciona igual antes
   y después de ese cambio de contrato. */

export type ContentType = 'doctoral' | 'certification' | 'general';
export type Vendor = 'aws' | 'azure' | 'gcp';

export const VENDOR_META: Record<Vendor, { label: string; color: string }> = {
  aws:   { label: 'AWS',   color: '#FF9900' },
  azure: { label: 'AZURE', color: '#36A3FF' },
  gcp:   { label: 'GCP',   color: '#34A853' },
};

export const CONTENT_TYPE_META: Record<ContentType, { label: string; color: string; bg: string }> = {
  doctoral:      { label: 'DOCTORAL', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.10)' },
  certification: { label: 'CERT',     color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  general:       { label: 'RESEARCH', color: '#4FB0A0', bg: 'rgba(79, 176, 160, 0.12)' },
};

/* Copy por tipo (hallazgo Codex #9): la tarea mental de un capítulo doctoral
   es probar una tesis; la de un tema de certificación es recordar límites y
   elegir servicio. Los labels deben pedir la tarea correcta. */
export const CONTENT_COPY: Record<ContentType, {
  panelTitle: string;
  synthPlaceholder: string;
  dockPill: string;
  suggestionsTitle: string;
  suggestionsSubtitle: string;
}> = {
  doctoral: {
    panelTitle: 'Synthesis',
    synthPlaceholder: 'What does this text prove for your thesis?',
    dockPill: 'Synthesize this chapter',
    suggestionsTitle: '✧ AI KNOWLEDGE CONNECTIONS',
    suggestionsSubtitle: 'Based on the current theoretical framework, consider exploring:',
  },
  certification: {
    panelTitle: 'Exam Notes',
    synthPlaceholder: 'What do you need to remember for the exam?',
    dockPill: 'Note an exam insight',
    suggestionsTitle: '✧ RELATED EXAM TOPICS',
    suggestionsSubtitle: 'Services commonly tested together or confused with this one:',
  },
  general: {
    panelTitle: 'Synthesis',
    synthPlaceholder: 'What does this source add to your research?',
    dockPill: 'Synthesize this source',
    suggestionsTitle: '✧ RELATED LITERATURE',
    suggestionsSubtitle: 'Sources touching similar claims or themes:',
  },
};

type NodeLike = {
  contentType?: string;
  vendor?: string;
  dimension?: string;
  enfoque?: string;
};

export function getContentType(node: NodeLike): ContentType {
  if (node.contentType === 'certification' || node.contentType === 'doctoral' || node.contentType === 'general') {
    return node.contentType;
  }
  if (node.dimension === 'Certification Review') return 'certification';
  if (node.dimension === 'Investigación General') return 'general';
  return 'doctoral';
}

export function getVendor(node: NodeLike): Vendor | null {
  const candidate = (node.vendor ?? (getContentType(node) === 'certification' ? node.enfoque : '') ?? '')
    .toLowerCase();
  return candidate in VENDOR_META ? (candidate as Vendor) : null;
}
