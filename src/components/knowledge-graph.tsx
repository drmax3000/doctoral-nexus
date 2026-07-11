import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, LayoutChangeEvent, Pressable, Animated } from 'react-native';
import Svg, { Circle, Line, Rect, G } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { API_BASE, fetchWithTimeout } from '@/constants/config';
import { RELATION_META } from '@/constants/relations';
import { VENDOR_META, getContentType, getVendor } from '@/constants/content-types';
import type { KnowledgeNode } from '@/types/nexus';

const AnimatedG = Animated.createAnimatedComponent(G);

const HEIGHT = 380;
// Paleta chica ciclada por libro — hace visible si un cluster es intra-libro
// o cruza fuentes distintas, que es justo la pregunta que motiva el grafo.
const BOOK_PALETTE = ['#A78BFA', '#67E8F9', '#34D399', '#FBBF24', '#FB7185', '#60A5FA'];

type GraphNode = KnowledgeNode;
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

type Highlight = { kind: 'group'; value: string } | { kind: 'node'; value: string } | null;

export default function KnowledgeGraph() {
  const router = useRouter();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(0);
  const [highlight, setHighlight] = useState<Highlight>(null);
  // Entrada animada: sin esto el grafo aparece como una imagen fija ya
  // resuelta en vez de sentirse como un objeto que se organiza solo.
  const entrance = React.useRef(new Animated.Value(0)).current;

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

  /* Doble codificación: los nodos doctorales conservan color por libro; los
     de certificación se leen por FORMA (cuadrado vs. círculo) y color por
     vendor — el cluster cert es reconocible aunque comparta paleta. */
  const bookColor = useMemo(() => {
    const titles = [...new Set(nodes.filter(n => getContentType(n) === 'doctoral').map(n => n.title))];
    const map: Record<string, string> = {};
    titles.forEach((t, i) => { map[t] = BOOK_PALETTE[i % BOOK_PALETTE.length]; });
    return map;
  }, [nodes]);

  const certVendors = useMemo(
    () => [...new Set(nodes.filter(n => getContentType(n) === 'certification').map(getVendor).filter(Boolean))],
    [nodes],
  ) as (keyof typeof VENDOR_META)[];

  const layout = useMemo(() => {
    if (!width || nodes.length === 0) return null;
    return simulateForceLayout(nodes, edges, width, HEIGHT);
  }, [nodes, edges, width]);

  useEffect(() => {
    if (layout) {
      entrance.setValue(0);
      Animated.timing(entrance, { toValue: 1, duration: 700, useNativeDriver: false }).start();
    }
  }, [layout, entrance]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && Math.abs(w - width) > 1) setWidth(w);
  };

  const nodesById = useMemo(() => {
    const map: Record<string, GraphNode> = {};
    nodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [nodes]);

  const groupOf = (n: GraphNode) => (getContentType(n) === 'certification' ? getVendor(n) ?? '' : n.title);

  /* Tocar un nodo resalta sus vecinos directos (segundo toque en el mismo
     nodo navega al detalle); tocar una categoria de la leyenda filtra por
     ese grupo; tocar el fondo limpia la seleccion. Antes nada de esto
     reaccionaba al tacto — el grafo era una imagen, no una herramienta. */
  const neighborIds = useMemo(() => {
    if (highlight?.kind !== 'node') return null;
    const ids = new Set<string>([highlight.value]);
    edges.forEach(e => {
      if (e.sourceNodeId === highlight.value) ids.add(e.targetNodeId);
      if (e.targetNodeId === highlight.value) ids.add(e.sourceNodeId);
    });
    return ids;
  }, [highlight, edges]);

  const isNodeActive = (n: GraphNode) => {
    if (!highlight) return true;
    if (highlight.kind === 'group') return groupOf(n) === highlight.value;
    return neighborIds!.has(n.id);
  };

  const isEdgeActive = (e: GraphEdge) => {
    if (!highlight) return true;
    if (highlight.kind === 'group') {
      const src = nodesById[e.sourceNodeId], tgt = nodesById[e.targetNodeId];
      return (!!src && groupOf(src) === highlight.value) || (!!tgt && groupOf(tgt) === highlight.value);
    }
    return neighborIds!.has(e.sourceNodeId) && neighborIds!.has(e.targetNodeId);
  };

  const toggleGroup = (value: string) =>
    setHighlight(current => (current?.kind === 'group' && current.value === value ? null : { kind: 'group', value }));

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
          {/* Fondo tocable: limpia la seleccion al tocar fuera de un nodo. */}
          <Rect x={0} y={0} width={width} height={HEIGHT} fill="#000000" fillOpacity={0} onPress={() => setHighlight(null)} />
          <AnimatedG opacity={entrance}>
            {edges.map(e => {
              const a = layout.get(e.sourceNodeId), b = layout.get(e.targetNodeId);
              if (!a || !b) return null;
              const meta = RELATION_META[e.type] || RELATION_META.custom;
              const active = isEdgeActive(e);
              return (
                <Line
                  key={e.id}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={meta.color}
                  strokeOpacity={active ? 0.6 : 0.06}
                  strokeWidth={active && highlight ? 2.25 : 1.5}
                />
              );
            })}
            {nodes.map(n => {
              const p = layout.get(n.id);
              if (!p) return null;
              const active = isNodeActive(n);
              const isFocused = highlight?.kind === 'node' && highlight.value === n.id;
              const opacity = active ? 1 : 0.12;
              const onPress = () => {
                if (isFocused) router.push(`/node/${n.id}`);
                else setHighlight({ kind: 'node', value: n.id });
              };
              if (getContentType(n) === 'certification') {
                const vendor = getVendor(n);
                const size = isFocused ? 17 : 13;
                return (
                  <Rect
                    key={n.id}
                    x={p.x - size / 2} y={p.y - size / 2} width={size} height={size} rx={3}
                    fill={vendor ? VENDOR_META[vendor].color : '#F59E0B'}
                    stroke={isFocused ? '#F4F6FB' : '#05060E'}
                    strokeWidth={isFocused ? 2.5 : 1.5}
                    opacity={opacity}
                    onPress={onPress}
                  />
                );
              }
              return (
                <Circle
                  key={n.id}
                  cx={p.x} cy={p.y} r={isFocused ? 10 : 7}
                  fill={bookColor[n.title] || '#8A94AD'}
                  stroke={isFocused ? '#F4F6FB' : '#05060E'}
                  strokeWidth={isFocused ? 2.5 : 1.5}
                  opacity={opacity}
                  onPress={onPress}
                />
              );
            })}
          </AnimatedG>
        </Svg>
      ) : null}

      {nodes.length > 0 && (
        <View style={styles.legend}>
          {Object.entries(bookColor).map(([title, color]) => {
            const active = highlight?.kind === 'group' && highlight.value === title;
            return (
              <Pressable
                key={title}
                onPress={() => toggleGroup(title)}
                style={({ pressed }) => [
                  styles.legendItem,
                  active && styles.legendItemActive,
                  pressed && styles.legendItemPressed,
                ]}
              >
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={[styles.legendLabel, active && styles.legendLabelActive]} numberOfLines={1}>{title}</Text>
              </Pressable>
            );
          })}
          {certVendors.map(vendor => {
            const active = highlight?.kind === 'group' && highlight.value === vendor;
            return (
              <Pressable
                key={vendor}
                onPress={() => toggleGroup(vendor)}
                style={({ pressed }) => [
                  styles.legendItem,
                  active && styles.legendItemActive,
                  pressed && styles.legendItemPressed,
                ]}
              >
                <View style={[styles.legendSquare, { backgroundColor: VENDOR_META[vendor].color }]} />
                <Text style={[styles.legendLabel, active && styles.legendLabelActive]} numberOfLines={1}>{VENDOR_META[vendor].label} · cert</Text>
              </Pressable>
            );
          })}
          {highlight && (
            <Pressable onPress={() => setHighlight(null)} style={styles.clearChip}>
              <Text style={styles.clearChipText}>✕ clear</Text>
            </Pressable>
          )}
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
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 170,
    borderWidth: 1, borderColor: 'transparent',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3,
  },
  legendItemActive: { borderColor: 'rgba(167, 139, 250, 0.5)', backgroundColor: 'rgba(167, 139, 250, 0.08)' },
  legendItemPressed: { opacity: 0.6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendSquare: { width: 8, height: 8, borderRadius: 2 },
  legendLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  legendLabelActive: { color: '#F4F6FB' },
  clearChip: {
    borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.4)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  clearChipText: { color: '#FB7185', fontSize: 11, fontWeight: '700' },
});
