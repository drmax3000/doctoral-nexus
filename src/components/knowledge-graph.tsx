import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, LayoutChangeEvent, Pressable, Animated } from 'react-native';
import Svg, { Circle, Line, Rect, G } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { API_BASE, fetchJson } from '@/constants/config';
import { useAsync } from '@/hooks/use-async';
import { RELATION_META } from '@/constants/relations';
import { VENDOR_META, CONTENT_TYPE_META, getContentType, getVendor } from '@/constants/content-types';
import { ContentBadges } from '@/components/content-badges';
import { ErrorCard } from '@/components/ui/error-card';
import { Boundary } from '@/components/ui/boundary';
import type { KnowledgeNode } from '@/types/nexus';

const AnimatedG = Animated.createAnimatedComponent(G);

const HEIGHT = 380;
// Paleta chica ciclada por libro — hace visible si un cluster es intra-libro
// o cruza fuentes distintas, que es justo la pregunta que motiva el grafo.
const BOOK_PALETTE = ['#A78BFA', '#67E8F9', '#34D399', '#FBBF24', '#FB7185', '#60A5FA'];
// Paleta propia para literatura general (investigador) -- tonos teal, distinta
// de BOOK_PALETTE para que un cluster de literatura general nunca se confunda
// visualmente con un libro doctoral aunque comparta la forma de circulo.
const GENERAL_PALETTE = ['#4FB0A0', '#7DD3C0', '#2F8577', '#9AE6D8'];

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

type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] };

export default function KnowledgeGraph() {
  const router = useRouter();
  const [width, setWidth] = useState(0);
  const [highlight, setHighlight] = useState<Highlight>(null);
  // Entrada animada: sin esto el grafo aparece como una imagen fija ya
  // resuelta en vez de sentirse como un objeto que se organiza solo.
  const [entrance] = React.useState(() => new Animated.Value(0));

  const fetchGraph = useCallback(async (): Promise<GraphData> => {
    const [nodesData, edgesData] = await Promise.all([
      fetchJson<GraphNode[]>(`${API_BASE}/api/v1/nexus/nodes`),
      fetchJson<GraphEdge[]>(`${API_BASE}/api/v1/nexus/relationships`),
    ]);
    return {
      nodes: Array.isArray(nodesData) ? nodesData : [],
      edges: Array.isArray(edgesData) ? edgesData : [],
    };
  }, []);

  /* Auditoria Codex EH-02: antes un fetch fallido dejaba nodes=[] y se veia
     igual que "Knowledge base is empty" — un fallo real de red no se
     distinguia de un KB genuinamente vacio. 'empty' del hook ahora se basa
     solo en nodes.length (KB vacio); "sin links todavia" con nodos
     presentes sigue siendo una rama de UI aparte, no un error. */
  const asyncState = useAsync<GraphData>(fetchGraph, {
    isEmpty: data => data.nodes.length === 0,
  });
  const hasData = asyncState.status === 'success' || asyncState.status === 'empty';
  const nodes = hasData ? asyncState.data.nodes : [];
  const edges = hasData ? asyncState.data.edges : [];

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

  /* Literatura general no tiene libro/capitulo como los nodos doctorales, asi
     que se agrupa por autor (o tema, o titulo como ultimo fallback) en vez de
     por titulo -- agrupar por titulo tratandolo igual que un libro no tiene
     sentido para un articulo o tesis suelta. */
  const generalGroupOf = (n: GraphNode) => n.author || n.tema || n.title;
  const generalColor = useMemo(() => {
    const groups = [...new Set(nodes.filter(n => getContentType(n) === 'general').map(generalGroupOf))];
    const map: Record<string, string> = {};
    groups.forEach((g, i) => { map[g] = GENERAL_PALETTE[i % GENERAL_PALETTE.length]; });
    return map;
  }, [nodes]);

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

  const groupOf = (n: GraphNode) => {
    const contentType = getContentType(n);
    if (contentType === 'certification') return getVendor(n) ?? '';
    if (contentType === 'general') return generalGroupOf(n);
    return n.title;
  };

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

  const selectedNode = highlight?.kind === 'node' ? nodesById[highlight.value] : null;
  const selectedTitle = selectedNode
    ? (getContentType(selectedNode) === 'certification' ? (selectedNode.capitulo || selectedNode.title) : selectedNode.title)
    : '';

  return (
    <View style={styles.card} onLayout={onLayout}>
      {asyncState.status === 'loading' ? (
        <View style={[styles.center, { height: HEIGHT }]}>
          <ActivityIndicator size="small" color="#67E8F9" />
        </View>
      ) : asyncState.status === 'error' ? (
        <View style={[styles.center, { height: HEIGHT }]}>
          <ErrorCard message={asyncState.error.message} onRetry={asyncState.retry} retrying={asyncState.retrying} />
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
        // Boundary local (auditoria Codex EH-01, nivel 3): un fallo en el
        // render de fuerzas/SVG no debe tumbar toda la pestana de Telemetria.
        <Boundary
          fallback={retry => (
            <View style={[styles.center, { height: HEIGHT }]}>
              <Text style={styles.emptyText}>Graph failed to render.</Text>
              <Pressable onPress={retry} hitSlop={12} style={{ marginTop: 10 }}>
                <Text style={styles.emptySub}>Tap to retry</Text>
              </Pressable>
            </View>
          )}
        >
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
              const nodeContentType = getContentType(n);
              if (nodeContentType === 'certification') {
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
              if (nodeContentType === 'general') {
                // Mismo circulo que doctoral, pero con anillo de acento propio
                // (color de CONTENT_TYPE_META.general) para que sea distinguible
                // de un vistazo aunque comparta la forma base.
                return (
                  <Circle
                    key={n.id}
                    cx={p.x} cy={p.y} r={isFocused ? 10 : 7}
                    fill={generalColor[generalGroupOf(n)] || CONTENT_TYPE_META.general.color}
                    stroke={isFocused ? '#F4F6FB' : CONTENT_TYPE_META.general.color}
                    strokeWidth={isFocused ? 2.5 : 2}
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
        </Boundary>
      ) : null}

      {/* Tarjeta de info: antes tocar un nodo solo resaltaba sus conexiones
          sin mostrar de que nodo se trataba — ahora aparece titulo + tipo. */}
      {selectedNode && (
        <Pressable
          style={styles.infoCard}
          onPress={() => router.push(`/node/${selectedNode.id}`)}
        >
          <ContentBadges node={selectedNode} showDoctoral />
          <Text style={styles.infoTitle} numberOfLines={2}>{selectedTitle}</Text>
          <Text style={styles.infoHint}>Tap to open this chapter</Text>
        </Pressable>
      )}

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
          {Object.entries(generalColor).map(([group, color]) => {
            const active = highlight?.kind === 'group' && highlight.value === group;
            return (
              <Pressable
                key={group}
                onPress={() => toggleGroup(group)}
                style={({ pressed }) => [
                  styles.legendItem,
                  active && styles.legendItemActive,
                  pressed && styles.legendItemPressed,
                ]}
              >
                <View style={[styles.legendDotRing, { borderColor: color }]} />
                <Text style={[styles.legendLabel, active && styles.legendLabelActive]} numberOfLines={1}>{group}</Text>
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
  infoCard: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 12,
    backgroundColor: 'rgba(167, 139, 250, 0.06)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    borderRadius: 14, padding: 14, gap: 6,
  },
  infoTitle: { color: '#F4F6FB', fontSize: 15, fontWeight: '700', lineHeight: 21 },
  infoHint: { color: '#8A94AD', fontSize: 11, fontWeight: '600' },
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
  legendDotRing: { width: 8, height: 8, borderRadius: 4, borderWidth: 2, backgroundColor: 'transparent' },
  legendLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  legendLabelActive: { color: '#F4F6FB' },
  clearChip: {
    borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.4)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  clearChipText: { color: '#FB7185', fontSize: 11, fontWeight: '700' },
});
