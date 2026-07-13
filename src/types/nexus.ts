/* Tipo compartido de nodo de conocimiento (hallazgo Codex #5): lista, detalle,
   grafo y cola de repaso consumían el mismo endpoint con interfaces ad-hoc
   distintas por archivo — cualquier campo nuevo del contrato obligaba a
   tocarlas todas o caer en `any`. Una sola definición, todos los consumidores.

   Los campos del contrato extendido (G1/G2/G4/G10, backend de Gemini) son
   opcionales: la UI funciona con la API actual vía los fallbacks de
   content-types.ts y cert-review.tsx, y los usa automáticamente al llegar.
   ApiObservation.dimension (las 4 dimensiones de observación) vive en
   server/db.d.ts y NO se mezcla con este tipo. */

import type { ContentType } from '@/constants/content-types';

export interface QuizItem {
  id: string;
  question: string;
  answer: string;
}

export interface KnowledgeNode {
  id: string;
  title: string;
  author?: string;
  tema?: string;
  capitulo?: string;
  enfoque?: string;
  dimension?: string;
  status?: string;
  confidence?: number;
  excerpt?: string;
  content?: string;
  version?: number;
  traceId?: string;
  lastAgentId?: string;
  meals?: { M: string; E: string; A: string; L: string };

  // Contrato extendido — modo certificación / investigador:
  contentType?: ContentType;
  vendor?: string;
  examTraps?: { section: string; text: string }[];
  quiz?: QuizItem[];
  reviewSummary?: { primaryConcept?: string; topTrap?: string; quizCount?: number };
  lastReviewed?: string | null;
}
