import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { API_BASE, fetchWithTimeout } from '@/constants/config';
import type { QuizItem } from '@/types/nexus';

/* Secciones de repaso para nodos de certificación: bloque destacado de
   "Trampas Comunes del Examen" + ReviewDeck de Autoevaluación. Prefieren los
   campos examTraps/quiz del contrato extendido (G1, Gemini); mientras llegan,
   se extraen del markdown completo que /nodes/{id} ya sirve hoy — misma
   estrategia dual que content-types.ts, la UI no espera al backend. */

export type { QuizItem };

function extractSection(content: string, headingKeywords: string[]): string {
  const lines = content.split('\n');
  const start = lines.findIndex(
    line => line.startsWith('## ') &&
      headingKeywords.some(k => line.toLowerCase().includes(k.toLowerCase())),
  );
  if (start === -1) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { end = i; break; }
  }
  return lines.slice(start + 1, end).join('\n').trim();
}

// Contrato vigente: headers en ingles ("Common Exam Traps" / "Self-Assessment").
// Se acepta tambien el nombre legacy en espanol para no romper el primer
// analisis generado antes de este cambio de idioma.
export function getExamTraps(node: { content?: string; examTraps?: { text: string }[] }): string {
  if (node.examTraps?.length) return node.examTraps.map(t => t.text).join('\n\n');
  return extractSection(node.content ?? '', ['Common Exam Traps', 'Trampas Comunes del Examen']);
}

const QUIZ_LINE_RE = /^[-*]\s*Q:\s*(.+?)\s+A:\s*(.+)$/;

export function getQuizItems(node: { id?: string; content?: string; quiz?: QuizItem[] }): QuizItem[] {
  if (node.quiz?.length) return node.quiz;
  const section = extractSection(node.content ?? '', ['Self-Assessment', 'Autoevaluación']);
  if (!section) return [];
  const items: QuizItem[] = [];
  for (const line of section.split('\n')) {
    const match = line.trim().match(QUIZ_LINE_RE);
    if (match) {
      items.push({
        id: `${node.id ?? 'node'}:${items.length}`,
        question: match[1].trim(),
        answer: match[2].trim(),
      });
    }
  }
  return items;
}

export function ExamTrapsCard({ traps }: { traps: string }) {
  if (!traps) return null;
  return (
    <View style={styles.trapsCard}>
      <Text style={styles.trapsTitle}>⚠ COMMON EXAM TRAPS</Text>
      <Markdown style={trapsMarkdownStyles}>{traps}</Markdown>
    </View>
  );
}

export function ReviewDeck({ nodeId, quiz }: { nodeId: string; quiz: QuizItem[] }) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [marked, setMarked] = useState<Record<string, 'again' | 'known'>>({});

  if (!quiz.length) return null;

  const mark = (item: QuizItem, result: 'again' | 'known') => {
    setMarked(current => ({ ...current, [item.id]: result }));
    // Persistencia best-effort: si /review-events (G4) aún no existe, el
    // repaso sigue funcionando en sesión y solo se pierde el historial.
    fetchWithTimeout(`${API_BASE}/api/v1/nexus/review-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId, quizItemId: item.id, result }),
    }).catch(err => console.warn('review-event not persisted:', err?.message));
  };

  return (
    <View style={styles.deck}>
      <Text style={styles.deckTitle}>✦ SELF-ASSESSMENT</Text>
      <Text style={styles.deckSubtitle}>
        Answer mentally, reveal, then be honest: known, or again?
      </Text>
      {quiz.map((item, index) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.question}>{index + 1}. {item.question}</Text>
          {revealed[item.id] && <Text style={styles.answer}>{item.answer}</Text>}
          <View style={styles.actions}>
            <Pressable
              style={styles.revealButton}
              onPress={() => setRevealed(current => ({ ...current, [item.id]: !current[item.id] }))}
            >
              <Text style={styles.revealText}>{revealed[item.id] ? 'HIDE' : 'REVEAL'}</Text>
            </Pressable>
            {revealed[item.id] && (
              <>
                <Pressable
                  style={[styles.markButton, styles.againButton, marked[item.id] === 'again' && styles.againActive]}
                  onPress={() => mark(item, 'again')}
                >
                  <Text style={[styles.markText, { color: '#FB7185' }]}>↻ AGAIN</Text>
                </Pressable>
                <Pressable
                  style={[styles.markButton, styles.knownButton, marked[item.id] === 'known' && styles.knownActive]}
                  onPress={() => mark(item, 'known')}
                >
                  <Text style={[styles.markText, { color: '#34D399' }]}>✓ KNOWN</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, "Times New Roman", serif',
});

const styles = StyleSheet.create({
  /* Trampas: la única tarjeta ámbar de la pantalla — severidad, no acento. */
  trapsCard: {
    marginTop: 28,
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 18, padding: 18,
  },
  trapsTitle: { color: '#F59E0B', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },

  deck: {
    marginTop: 40, paddingTop: 30,
    borderTopWidth: 1, borderTopColor: 'rgba(148, 163, 184, 0.10)',
  },
  deckTitle: { color: '#F59E0B', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  deckSubtitle: { color: '#8A94AD', fontSize: 14, fontFamily: SERIF, marginBottom: 20 },
  card: {
    backgroundColor: 'rgba(16, 21, 38, 0.72)',
    borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.10)',
    borderRadius: 16, padding: 18, marginBottom: 12,
  },
  question: { color: '#F4F6FB', fontSize: 15, fontFamily: SERIF, lineHeight: 23 },
  answer: {
    color: '#FDE68A', fontSize: 14, lineHeight: 21, marginTop: 12,
    borderLeftWidth: 2, borderLeftColor: 'rgba(245, 158, 11, 0.5)', paddingLeft: 12,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  revealButton: {
    borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.25)',
    borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8,
  },
  revealText: { color: '#8A94AD', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  markButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8 },
  againButton: { borderColor: 'rgba(251, 113, 133, 0.35)' },
  againActive: { backgroundColor: 'rgba(251, 113, 133, 0.14)' },
  knownButton: { borderColor: 'rgba(52, 211, 153, 0.35)' },
  knownActive: { backgroundColor: 'rgba(52, 211, 153, 0.14)' },
  markText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
});

const trapsMarkdownStyles = {
  body: { color: '#E6EAF3', fontSize: 15, lineHeight: 24, fontFamily: SERIF },
  list_item: { marginBottom: 8 },
  strong: { color: '#FFFFFF', fontWeight: '700' as const },
};
