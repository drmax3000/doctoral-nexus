/**
 * GET /api/v1/nexus/suggestions?nodeId=xxxx
 * Retorna hasta 3 nodos sugeridos relacionados por tema/enfoque usando la IA (FTS).
 */
import { getAiSuggestions } from '@/server/db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const nodeId = url.searchParams.get('nodeId');
    
    if (!nodeId) {
      return Response.json({ error: 'BAD_REQUEST', detail: 'nodeId parameter is required' }, { status: 400 });
    }

    const suggestions = getAiSuggestions(nodeId);
    return Response.json(suggestions);
  } catch (error: any) {
    console.error('[api/suggestions] ', error);
    return Response.json({ error: 'DB_FAILURE', detail: error.message }, { status: 500 });
  }
}
