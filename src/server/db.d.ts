/** Tipos de la capa de datos (implementación CJS en db.js). */

export interface ApiNode {
  id: string;
  title: string;
  author: string | null;
  capitulo: string | null;
  tema: string | null;
  enfoque: string | null;
  status: 'offline_ready' | 'processing' | 'cloud_sync' | 'error';
  confidence: number;
  version: number;
  traceId: string | null;
  lastAgentId: string | null;
  createdAt: string;
  updatedAt: string;
  content?: string;
  excerpt?: string;
}

export interface ApiObservation {
  id: string;
  text: string;
  dimension: 'THEORETICAL' | 'METHODOLOGICAL' | 'EMPIRICAL' | 'ANALYTICAL';
  createdAt: string;
  source?: { nodeId: string; title: string; author?: string | null; capitulo?: string | null };
}

export interface UpsertNodeInput {
  id: string;
  title: string;
  content: string;
  author?: string | null;
  capitulo?: string | null;
  tema?: string | null;
  enfoque?: string | null;
  confidence?: number;
  status?: ApiNode['status'];
  traceId?: string | null;
  lastAgentId?: string | null;
  contentHash?: string;
}

export declare function getDb(): unknown;
export declare function hasFts(): boolean;
export declare const DB_PATH: string;
export declare const DIMENSIONS: readonly string[];
export declare function listNodes(q?: string | null): ApiNode[];
export declare function getNodeById(id: string): ApiNode | null;
export declare function upsertNode(n: UpsertNodeInput): 'inserted' | 'updated' | 'skipped';
export declare function listObservations(): ApiObservation[];
export declare function createObservation(input: {
  text: string;
  dimension: string;
  nodeId?: string | null;
}): ApiObservation;
