/**
 * GET /api/v1/nexus/nodes/:id
 * Nodo completo (content Markdown masivo incluido) para la pantalla de lectura.
 */
import { getNodeById } from '@/server/db';

export async function GET(_request: Request, { id }: { id: string }) {
  try {
    const node = getNodeById(id);
    if (!node) {
      return Response.json({ error: 'NODE_NOT_FOUND', id }, { status: 404 });
    }
    return Response.json(node);
  } catch (error: any) {
    console.error('[api/nodes/:id] ', error);
    return Response.json({ error: 'DB_FAILURE', detail: error.message }, { status: 500 });
  }
}
