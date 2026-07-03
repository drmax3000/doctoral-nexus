/**
 * GET  /api/v1/nexus/observations  → historial DESC con source (JOIN nodes)
 * POST /api/v1/nexus/observations  → { text, dimension, source?: { nodeId } }
 *
 * Invariante: dimension la asigna el humano; la BD la valida con CHECK + capa app.
 */
import { listObservations, createObservation } from '@/server/db';

export async function GET(_request: Request) {
  try {
    return Response.json(listObservations());
  } catch (error: any) {
    console.error('[api/observations] ', error);
    return Response.json({ error: 'DB_FAILURE', detail: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const created = createObservation({
      text: body?.text,
      dimension: body?.dimension,
      nodeId: body?.source?.nodeId ?? null,
    });
    return Response.json(created, { status: 201 });
  } catch (error: any) {
    const status = error?.status === 400 ? 400 : 500;
    console.error('[api/observations POST] ', error.message);
    return Response.json(
      { error: status === 400 ? error.message : 'DB_FAILURE' },
      { status },
    );
  }
}
