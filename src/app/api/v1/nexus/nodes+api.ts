/**
 * GET /api/v1/nexus/nodes[?q=término]
 * Lista de nodos SIN content masivo (excerpt de 220 chars).
 * El texto completo se sirve por /nodes/[id] — payload de Library liviano.
 */
import { listNodes } from '@/server/db';

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get('q');
    return Response.json(listNodes(q));
  } catch (error: any) {
    console.error('[api/nodes] ', error);
    return Response.json({ error: 'DB_FAILURE', detail: error.message }, { status: 500 });
  }
}
