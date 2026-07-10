/* Tipos de contenido del KB: doctoral vs. certificación de nube. Fuente única
   para badges, filtros y grafo. El backend (G2, Gemini) expondrá contentType/
   vendor como campos propios; mientras llegan, se derivan de los campos que la
   API ya sirve hoy (dimension === "Certification Review", enfoque = vendor),
   así la UI funciona igual antes y después de ese cambio de contrato. */

export type ContentType = 'doctoral' | 'certification';
export type Vendor = 'aws' | 'azure' | 'gcp';

export const VENDOR_META: Record<Vendor, { label: string; color: string }> = {
  aws:   { label: 'AWS',   color: '#FF9900' },
  azure: { label: 'AZURE', color: '#36A3FF' },
  gcp:   { label: 'GCP',   color: '#34A853' },
};

export const CONTENT_TYPE_META: Record<ContentType, { label: string; color: string; bg: string }> = {
  doctoral:      { label: 'DOCTORAL', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.10)' },
  certification: { label: 'CERT',     color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
};

type NodeLike = {
  contentType?: string;
  vendor?: string;
  dimension?: string;
  enfoque?: string;
};

export function getContentType(node: NodeLike): ContentType {
  if (node.contentType === 'certification' || node.contentType === 'doctoral') {
    return node.contentType;
  }
  return node.dimension === 'Certification Review' ? 'certification' : 'doctoral';
}

export function getVendor(node: NodeLike): Vendor | null {
  const candidate = (node.vendor ?? (getContentType(node) === 'certification' ? node.enfoque : '') ?? '')
    .toLowerCase();
  return candidate in VENDOR_META ? (candidate as Vendor) : null;
}
