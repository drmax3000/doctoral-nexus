import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { API_BASE, fetchWithTimeout } from '@/constants/config';
import { RELATION_META } from '@/constants/relations';

const HEIGHT = 380;
// Paleta chica ciclada por libro — hace visible si un cluster es intra-libro
// o cruza fuentes distintas, que es justo la pregunta que motiva el grafo.
const BOOK_PALETTE = ['#A78BFA', '#67E8F9', '#34D399', '#FBBF24', '#FB7185', '#60A5FA'];

interface GraphNode { id: string; title: string; author?: string; }
interface GraphEdge { id: string; sourceNodeId: string; targetNodeId: string; type: string; }
interface Point { x: number; y: number; vx: number; vy: number; }

/* Simulacion de fuerzas minima (repulsion + resortes + centrado) — sin
   dependencia externa. A esta escala (decenas/cientos de nodos) 120
   iteraciones al montar son instantaneas; d3-force seria sobre-ingenieria
   para el tamano real del grafo (mismo criterio que se aplico al elegir
   Redis en vez de un motor de grafos dedicado para el almacenamiento). */
function simulateForceLayout(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number) {
  const pos = new Map<string, Point>();
  nodes.forEach(n => {
    pos.set(n.id, {
      x: width / 2 + (Math.random() - 0.5) * width * 0.7,
      y: height / 2 + (Math.random() - 0.5) * height * 0.7,
      vx: 0, vy: 0,
    });
  });

  const REPULSION = 1800;
  const SPRING = 0.02;
  const IDEAL_LEN = 78;
  const DAMPING = 0.82;
  const CENTER_PULL = 0.012;
  const PADDING = 22;

  for (let iter = 0; iter < 140; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      const a = pos.get(nodes[i].id)!;
      for (let j = i + 1; j < nodes.length; j++) {
        const b = pos.get(nodes[j].id)!;
        const dx = a.x - b.x, dy = a.y - b.y;
        const distSq = dx * dx + dy * dy || 0.01;
        const dist = Math.sqrt(distSq);
        const force = REPULSION / distSq;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
    }
    edges.forEach(e => {
      const a = pos.get(e.sourceNodeId), b = pos.get(e.targetNodeId);
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = SPRING * (dist - IDEAL_LEN);
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    });
    pos.forEach(p => {
      p.vx += (width / 2 - p.x) * CENTER_PULL;
      p.vy += (height / 2 - p.y) * CENTER_PULL;
      p.vx *= DAMPING; p.vy *= DAMPING;
      p.x += p.vx; p.y += p.vy;
      p.x = Math.max(PADDING, Math.min(width - PADDING, p.x));
      p.y = Math.max(PADDING, Math.min(height - PADDING, p.y));
    });
  }
  return pos;
}

export default function KnowledgeGraph() {
  const router = useRouter();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    Promise.all([
      fetchWithTimeout(`${API_BASE}/api/v1/nexus/nodes`).then(r => r.json()),
      fetchWithTimeout(`${API_BASE}/api/v1/nexus/relationships`).then(r => r.json()),
    ])
      .then(([nodesData, edgesData]) => {
        if (Array.isArray(nodesData)) setNodes(nodesData);
        if (Array.isArray(edgesData)) setEdges(edgesData);
      })
      .catch(err => console.error('Knowledge graph fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const bookColor = useMemo(() => {
    const titles = [...new Set(nodes.map(n => n.title))];
    const map: Record<string, string> = {};
    titles.forEach((t, i) => { map[t] = BOOK_PALETTE[i % BOOK_PALETTE.length]; });
    return map;
  }, [nodes]);

  const layout = useMemo(() => {
    if (!width || nodes.length === 0) return null;
    return simulateForceLayout(nodes, edges, width, HEIGHT);
  }, [nodes, edges, width]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && Math.abs(w - width) > 1) setWidth(w);
  };

  return (
    <View style={styles.card} onLayout={onLayout}>
      {loading ? (
        <View style={[styles.center, { height: HEIGHT }]}>
          <ActivityIndicator size="small" color="#67E8F9" />
        </View>
      ) : nodes.length === 0 ? (
        <View style={[styles.center, { height: HEIGHT }]}>
          <Text style={styles.emptyText}>Knowledge base is empty.</Text>
        </View>
      ) : edges.length === 0 ? (
        <View style={[styles.center, { height: HEIGHT }]}>
          <Text style={styles.emptyGlyph}>◌</Text>
          <Text style={styles.emptyText}>No links yet</Text>
          <Text style={styles.emptySub}>
            Connect chapters from any chapter page — linked nodes will appear here.
          </Text>
        </View>
      ) : layout && width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {edges.map(e => {
            const a = layout.get(e.sourceNodeId), b = layout.get(e.targetNodeId);
            if (!a || !b) return null;
            const meta = RELATION_META[e.type] || RELATION_META.custom;
            return (
              <Line
                key={e.id}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={meta.color} strokeOpacity={0.45} strokeWidth={1.5}
              />
            );
          })}
          {nodes.map(n => {
            const p = layout.get(n.id);
            if (!p) return null;
            return (
              <Circle
                key={n.id}
                cx={p.x} cy={p.y} r={7}
                fill={bookColor[n.title] || '#8A94AD'}
                stroke="#05060E" strokeWidth={1.5}
                onPress={() => router.push(`/node/${n.id}`)}
              />
            );
          })}
        </Svg>
      ) : null}

      {nodes.length > 0 && (
        <View style={styles.legend}>
          {Object.entries(bookColor).map(([title, color]) => (
            <View key={title} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>{title}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 32,
    overflow: 'hidden',
  },
  center: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyGlyph: { color: '#A78BFA', fontSize: 28, marginBottom: 8, opacity: 0.7 },
  emptyText: { color: '#e2e8f0', fontSize: 15, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  emptySub: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 160 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
});
