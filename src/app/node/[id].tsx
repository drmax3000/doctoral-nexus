import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TextInput, Pressable,
  Platform, useWindowDimensions, KeyboardAvoidingView, Animated, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE, fetchWithTimeout } from '@/constants/config';
import { RELATION_META } from '@/constants/relations';
import { ContentBadges } from '@/components/content-badges';
import { CONTENT_COPY, getContentType } from '@/constants/content-types';
import { ExamTrapsCard, ReviewDeck, getExamTraps, getQuizItems } from '@/components/cert-review';

/* ═══════════════════════ DESIGN TOKENS · NEXUS DARK ═══════════════════════ */
const C = {
  bg: '#05060E',
  surface: 'rgba(16, 21, 38, 0.72)',
  dock: 'rgba(13, 17, 32, 0.97)',      // el dock necesita opacidad casi total sobre el texto
  inputBg: 'rgba(5, 6, 14, 0.65)',
  line: 'rgba(148, 163, 184, 0.10)',
  text: '#F4F6FB',
  textDim: '#8A94AD',
  textFaint: '#586176',
  violet: '#A78BFA',
  violetDeep: '#7C5CE0',
  cyan: '#67E8F9',
  rose: '#FB7185',
};

const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, "Times New Roman", serif',
});

const DIMENSIONS = [
  { key: 'THEORETICAL',    color: '#A78BFA' },
  { key: 'METHODOLOGICAL', color: '#67E8F9' },
  { key: 'EMPIRICAL',      color: '#34D399' },
  { key: 'ANALYTICAL',     color: '#FBBF24' },
] as const;

type DimensionKey = typeof DIMENSIONS[number]['key'];

const WIDE_BREAKPOINT = 920;

/* ─────────── Panel de síntesis (compartido por dock móvil y split web) ─────────── */
function SynthesisPanel({
  node, observation, setObservation, dimension, setDimension, onSave,
}: {
  node: any;
  observation: string;
  setObservation: (v: string) => void;
  dimension: DimensionKey | null;
  setDimension: (v: DimensionKey) => void;
  onSave: () => void;
}) {
  const canSave = observation.trim().length > 0 && dimension !== null;
  const copy = CONTENT_COPY[getContentType(node)];

  return (
    <View>
      {/* Contexto: el panel siempre declara su fuente. */}
      <View style={styles.panelSourceRow}>
        <Text style={styles.panelGlyph}>◈</Text>
        <Text style={styles.panelSourceText} numberOfLines={1}>
          {node.author || 'Unknown'}{node.capitulo ? `  ·  ${node.capitulo}` : ''}
        </Text>
      </View>

      <TextInput
        style={styles.inputArea}
        multiline
        placeholder={copy.synthPlaceholder}
        placeholderTextColor={C.textFaint}
        value={observation}
        onChangeText={setObservation}
        textAlignVertical="top"
      />

      <View style={styles.dimRow}>
        {DIMENSIONS.map(dim => {
          const active = dimension === dim.key;
          return (
            <Pressable
              key={dim.key}
              style={[
                styles.dimPill,
                active && { borderColor: dim.color, backgroundColor: `${dim.color}1F` },
              ]}
              onPress={() => setDimension(dim.key)}
            >
              <View style={[styles.dimDot, { backgroundColor: dim.color, opacity: active ? 1 : 0.35 }]} />
              <Text style={[styles.dimPillText, active && { color: dim.color }]}>
                {dim.key.slice(0, 6)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.saveButton, canSave ? styles.saveButtonEnabled : styles.saveButtonDisabled]}
        disabled={!canSave}
        onPress={onSave}
      >
        <Text style={[styles.saveButtonText, canSave && { color: '#FFFFFF' }]}>
          {canSave ? 'COMMIT INSIGHT' : 'WRITE + CLASSIFY'}
        </Text>
      </Pressable>
    </View>
  );
}

function AiSuggestionsCard({
  suggestions, onSelect, linkedIds, onConnect, title, subtitle,
}: {
  suggestions: any[];
  onSelect: (id: string) => void;
  linkedIds: Set<string>;
  onConnect: (id: string) => void;
  title: string;
  subtitle: string;
}) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <View style={styles.suggestionsContainer}>
      <Text style={styles.suggestionsTitle}>{title}</Text>
      <Text style={styles.suggestionsSubtitle}>{subtitle}</Text>
      {suggestions.map((s, idx) => {
        const linked = linkedIds.has(s.id);
        return (
          <Pressable
            key={s.id}
            style={({pressed}) => [styles.suggestionCard, pressed && { opacity: 0.7 }]}
            onPress={() => onSelect(s.id)}
          >
            <View style={styles.sugHeader}>
              <Text style={styles.sugAuthor}>{typeof s.author === 'object' ? JSON.stringify(s.author) : (s.author || 'Unknown')} {s.capitulo ? `· ${typeof s.capitulo === 'object' ? JSON.stringify(s.capitulo) : s.capitulo}` : ''}</Text>
            </View>
            <Text style={styles.sugTitle} numberOfLines={2}>{typeof s.title === 'object' ? JSON.stringify(s.title) : s.title}</Text>
            <View style={styles.metaRow}>
              {s.tema && <Text style={styles.sugMeta}>{typeof s.tema === 'object' ? JSON.stringify(s.tema) : s.tema}</Text>}
              {s.enfoque && <Text style={styles.sugMeta}> · {typeof s.enfoque === 'object' ? JSON.stringify(s.enfoque) : s.enfoque}</Text>}
            </View>
            <Pressable
              hitSlop={8}
              disabled={linked}
              onPress={() => onConnect(s.id)}
              style={[styles.linkButton, linked && styles.linkButtonDone]}
            >
              <Text style={[styles.linkButtonText, linked && styles.linkButtonDoneText]}>
                {linked ? '✓ Linked' : '🔗 Link'}
              </Text>
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}

function RelationshipsCard({
  relationships, nodesById, currentId, onSelect,
}: {
  relationships: any[];
  nodesById: Record<string, any>;
  currentId: string;
  onSelect: (id: string) => void;
}) {
  if (!relationships || relationships.length === 0) return null;

  return (
    <View style={styles.suggestionsContainer}>
      <Text style={styles.suggestionsTitle}>⛓ CONFIRMED LINKS</Text>
      <Text style={styles.suggestionsSubtitle}>
        Connections explicitly drawn between this chapter and others:
      </Text>
      {relationships.map((r) => {
        const otherId = r.sourceNodeId === currentId ? r.targetNodeId : r.sourceNodeId;
        const other = nodesById[otherId];
        if (!other) return null;
        const meta = RELATION_META[r.type] || RELATION_META.custom;
        return (
          <Pressable
            key={r.id}
            style={({ pressed }) => [styles.suggestionCard, pressed && { opacity: 0.7 }]}
            onPress={() => onSelect(otherId)}
          >
            <View style={styles.sugHeader}>
              <Text style={[styles.relBadge, { color: meta.color, borderColor: `${meta.color}55` }]}>
                {meta.glyph} {meta.label}{r.label ? `: ${r.label}` : ''}
              </Text>
            </View>
            <Text style={styles.sugTitle} numberOfLines={2}>{other.title}</Text>
            <Text style={styles.sugAuthor}>
              {other.author || 'Unknown'}{other.capitulo ? ` · ${other.capitulo}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ConnectPanel({
  allNodes, excludeIds, onConnect,
}: {
  allNodes: any[];
  excludeIds: Set<string>;
  onConnect: (targetId: string, type: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [relType, setRelType] = useState<'similar' | 'contradicts'>('similar');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allNodes
      .filter(n => !excludeIds.has(n.id))
      .filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.author?.toLowerCase().includes(q) ||
        n.tema?.toLowerCase().includes(q) ||
        n.capitulo?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, allNodes, excludeIds]);

  if (!open) {
    return (
      <Pressable style={styles.connectTrigger} onPress={() => setOpen(true)}>
        <Text style={styles.connectTriggerText}>+ Link to another node</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.connectPanel}>
      <View style={styles.dockHeader}>
        <Text style={styles.panelTitle}>Link this chapter to…</Text>
        <Pressable onPress={() => { setOpen(false); setQuery(''); }} hitSlop={12}>
          <Text style={styles.dockClose}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.dimRow}>
        {(['similar', 'contradicts'] as const).map(t => {
          const meta = RELATION_META[t];
          const active = relType === t;
          return (
            <Pressable
              key={t}
              style={[styles.dimPill, active && { borderColor: meta.color, backgroundColor: `${meta.color}1F` }]}
              onPress={() => setRelType(t)}
            >
              <Text style={[styles.dimPillText, active && { color: meta.color }]}>
                {meta.glyph} {meta.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={styles.connectInput}
        placeholder="Search title, author, topic…"
        placeholderTextColor={C.textFaint}
        value={query}
        onChangeText={setQuery}
        autoFocus
      />

      {results.map(n => (
        <Pressable
          key={n.id}
          style={styles.connectResult}
          onPress={() => { onConnect(n.id, relType); setOpen(false); setQuery(''); }}
        >
          <Text style={styles.connectResultTitle} numberOfLines={1}>{n.title}</Text>
          <Text style={styles.connectResultMeta} numberOfLines={1}>
            {n.author || 'Unknown'}{n.capitulo ? ` · ${n.capitulo}` : ''}
          </Text>
        </Pressable>
      ))}
      {query.trim().length > 0 && results.length === 0 && (
        <Text style={styles.connectEmpty}>No matches.</Text>
      )}
    </View>
  );
}

export default function NodeDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const { nodeData, id } = useLocalSearchParams();
  const [observation, setObservation] = useState('');
  const [dimension, setDimension] = useState<DimensionKey | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [node, setNode] = useState<any>(null);
  const [loadingNode, setLoadingNode] = useState(!nodeData);

  /* Progreso de lectura: hilo violeta que crece con el scroll. */
  const progress = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (nodeData && typeof nodeData === 'string') {
      try {
        setNode(JSON.parse(nodeData));
        setLoadingNode(false);
      } catch (e) {
        console.error('Failed to parse nodeData', e);
      }
    } else if (id) {
      // T3 Prereq: Deep link, fetch by id
      fetchWithTimeout(`${API_BASE}/api/v1/nexus/nodes/${id}`)
        .then(res => res.json())
        .then(data => {
          setNode(data);
          setLoadingNode(false);
        })
        .catch(err => {
          console.error("Fetch node error:", err);
          setLoadingNode(false);
        });
    } else {
      setLoadingNode(false);
    }
  }, [nodeData, id]);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [allNodes, setAllNodes] = useState<any[]>([]);
  React.useEffect(() => {
    if (node?.id) {
      fetchWithTimeout(`${API_BASE}/api/v1/nexus/suggestions?nodeId=${node.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setSuggestions(data);
        })
        .catch(err => console.error("AI Suggestions error:", err));

      fetchWithTimeout(`${API_BASE}/api/v1/nexus/relationships?nodeId=${node.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setRelationships(data);
        })
        .catch(err => console.error("Relationships fetch error:", err));

      // Dataset chico (decenas/cientos de nodos): traer todo de una vez alcanza
      // para resolver nombres de vinculos y alimentar el picker de conexion manual.
      fetchWithTimeout(`${API_BASE}/api/v1/nexus/nodes`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllNodes(data);
        })
        .catch(err => console.error("Nodes fetch error:", err));
    }
  }, [node?.id]);

  const nodesById = useMemo(() => {
    const map: Record<string, any> = {};
    allNodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [allNodes]);

  const linkedIds = useMemo(() => {
    const ids = new Set<string>();
    relationships.forEach(r => {
      ids.add(r.sourceNodeId === node?.id ? r.targetNodeId : r.sourceNodeId);
    });
    return ids;
  }, [relationships, node?.id]);

  const connectExcludeIds = useMemo(
    () => new Set([node?.id, ...linkedIds].filter(Boolean) as string[]),
    [node?.id, linkedIds]
  );

  const handleConnect = async (targetId: string, type: string = 'similar') => {
    if (!node?.id || targetId === node.id) return;
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/v1/nexus/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceNodeId: node.id, targetNodeId: targetId, type }),
      });
      if (!response.ok) throw new Error('Failed to link');
      const rel = await response.json();
      setRelationships(prev => [rel, ...prev]);
    } catch (error) {
      console.error('Error creating relationship', error);
      alert('Failed to link chapters. Try again.');
    }
  };

  if (loadingNode) {
    return (
      <View style={[styles.errorContainer, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#A78BFA" />
      </View>
    );
  }

  if (!node) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading chapter data.</Text>
      </View>
    );
  }

  const handleSave = async () => {
    try {
      const payload = {
        text: observation,
        dimension,
        source: {
          nodeId: node.id,
          title: node.title,
          author: node.author,
          capitulo: node.capitulo
        }
      };

      const response = await fetchWithTimeout(`${API_BASE}/api/v1/nexus/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save');

      setSaved(true);
      setObservation('');
      setDimension(null);
      setTimeout(() => { setSaved(false); setDockOpen(false); }, 1400);
    } catch (error) {
      console.error('Error saving observation', error);
      // "Error de red: no cerrar el dock, no borrar el texto (el borrador del doctorante es sagrado)."
      alert('Failed to save insight to K3s cluster. Draft kept.');
    }
  };

  const isCert = getContentType(node) === 'certification';
  const examTraps = isCert ? getExamTraps(node) : '';
  const quizItems = isCert ? getQuizItems(node) : [];
  const copy = CONTENT_COPY[isCert ? 'certification' : 'doctoral'];

  const readingContent = (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: isWide ? 60 : insets.bottom + 140 }, // aire para el dock
      ]}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={32}
      onScroll={e => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        const total = Math.max(1, contentSize.height - layoutMeasurement.height);
        progress.setValue(Math.min(1, Math.max(0, contentOffset.y / total)));
      }}
    >
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>
          {(node.capitulo || 'RAW EXTRACT').toUpperCase()}
        </Text>
        <Text style={styles.title}>{node.title}</Text>
        <View style={styles.metaRow}>
          <ContentBadges node={node} />
          <Text style={styles.metaText}>{node.author || 'Unknown author'}</Text>
          {node.tema && <View style={styles.metaDivider} />}
          {node.tema && <Text style={styles.metaText}>{node.tema}</Text>}
          {node.enfoque && <View style={styles.metaDivider} />}
          {node.enfoque && <Text style={styles.metaText}>{node.enfoque}</Text>}
        </View>
        {/* Repaso: las trampas van arriba, no enterradas en la sección 4. */}
        {isCert && <ExamTrapsCard traps={examTraps} />}
      </View>

      <Markdown style={markdownStyles}>{node.content || ''}</Markdown>

      {isCert && <ReviewDeck nodeId={node.id} quiz={quizItems} />}

      <AiSuggestionsCard
        suggestions={suggestions}
        onSelect={(suggestedId) => router.push(`/node/${suggestedId}`)}
        linkedIds={linkedIds}
        onConnect={(targetId) => handleConnect(targetId, 'similar')}
        title={copy.suggestionsTitle}
        subtitle={copy.suggestionsSubtitle}
      />

      <RelationshipsCard
        relationships={relationships}
        nodesById={nodesById}
        currentId={node.id}
        onSelect={(otherId) => router.push(`/node/${otherId}`)}
      />

      <ConnectPanel
        allNodes={allNodes}
        excludeIds={connectExcludeIds}
        onConnect={handleConnect}
      />
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Hilo de progreso de lectura. */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, {
            transform: [
              { scaleX: progress },
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, 0] }) },
            ],
          }]}
        />
      </View>

      {isCert ? (
        /* Certificación: sin Synthesis — clasificar un insight en las 4
           dimensiones epistémicas (THEORETICAL/METHODOLOGICAL/EMPIRICAL/
           ANALYTICAL) no aplica a repasar para un examen. El ReviewDeck ya
           dentro de readingContent es el único mecanismo de captura. */
        readingContent
      ) : isWide ? (
        /* ── WEB / TABLET: SPLIT VIEW — leer y sintetizar sin cambiar de contexto ── */
        <View style={styles.splitRow}>
          <View style={styles.splitReading}>{readingContent}</View>
          <View style={styles.splitPanel}>
            <Text style={styles.panelTitle}>{copy.panelTitle}</Text>
            {saved
              ? <Text style={styles.savedText}>✓ Insight committed</Text>
              : (
                <SynthesisPanel
                  node={node}
                  observation={observation} setObservation={setObservation}
                  dimension={dimension} setDimension={setDimension}
                  onSave={handleSave}
                />
              )}
          </View>
        </View>
      ) : (
        /* ── MÓVIL: lectura inmersiva + SYNTHESIS DOCK expandible ── */
        <>
          {readingContent}

          <View style={[styles.dockWrap, { paddingBottom: insets.bottom + 12 }]}>
            {dockOpen ? (
              <View style={styles.dockPanel}>
                <View style={styles.dockHeader}>
                  <Text style={styles.panelTitle}>{copy.panelTitle}</Text>
                  <Pressable onPress={() => setDockOpen(false)} hitSlop={12}>
                    <Text style={styles.dockClose}>✕</Text>
                  </Pressable>
                </View>
                {saved
                  ? <Text style={styles.savedText}>✓ Insight committed</Text>
                  : (
                    <SynthesisPanel
                      node={node}
                      observation={observation} setObservation={setObservation}
                      dimension={dimension} setDimension={setDimension}
                      onSave={handleSave}
                    />
                  )}
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.dockPill, pressed && { transform: [{ scale: 0.97 }] }]}
                onPress={() => setDockOpen(true)}
              >
                <Text style={styles.dockPillGlyph}>✦</Text>
                <Text style={styles.dockPillText}>{copy.dockPill}</Text>
                {observation.length > 0 && <View style={styles.draftDot} />}
              </Pressable>
            )}
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

/* ═══════════════════════════════ STYLESHEET ═══════════════════════════════ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  errorContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: C.rose, fontSize: 16 },

  progressTrack: { height: 2, backgroundColor: 'rgba(148, 163, 184, 0.08)' },
  progressFill: {
    height: 2, width: '100%',
    backgroundColor: C.violet,
    boxShadow: '0px 0px 8px rgba(167, 139, 250, 0.9)',
  },

  scrollContent: { paddingHorizontal: 24, paddingTop: 28 },

  headerBlock: {
    marginBottom: 28,
    borderBottomWidth: 1, borderBottomColor: C.line,
    paddingBottom: 24,
  },
  eyebrow: { fontSize: 11, fontWeight: '900', color: C.violet, letterSpacing: 3, marginBottom: 10 },
  title: {
    fontSize: 30, color: C.text, fontFamily: SERIF,
    lineHeight: 40, marginBottom: 14, letterSpacing: -0.3,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  metaText: { color: C.textDim, fontSize: 13, fontWeight: '600' },
  metaDivider: { width: 1, height: 12, backgroundColor: C.line },

  /* Split view (web / tablet horizontal). */
  splitRow: { flex: 1, flexDirection: 'row' },
  splitReading: { flex: 1.7, minWidth: 0 },
  splitPanel: {
    flex: 1, maxWidth: 440,
    borderLeftWidth: 1, borderLeftColor: C.line,
    backgroundColor: 'rgba(10, 13, 26, 0.6)',
    padding: 24,
  },
  panelTitle: { color: C.text, fontSize: 22, fontFamily: SERIF, marginBottom: 14 },

  /* Synthesis Dock (móvil). */
  dockWrap: { position: 'absolute', left: 16, right: 16, bottom: 0 },
  dockPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.violetDeep,
    borderRadius: 28, paddingVertical: 15,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.6)',
    boxShadow: '0px 10px 30px rgba(124, 92, 224, 0.5)',
  },
  dockPillGlyph: { color: '#FFFFFF', fontSize: 15 },
  dockPillText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  draftDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: C.cyan,
    boxShadow: '0px 0px 8px rgba(103, 232, 249, 0.9)',
  },

  dockPanel: {
    backgroundColor: C.dock,
    borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.25)',
    padding: 20,
    boxShadow: '0px -8px 40px rgba(0, 0, 0, 0.6)',
  },
  dockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dockClose: { color: C.textFaint, fontSize: 14, fontWeight: '800', padding: 4 },

  /* Panel compartido. */
  panelSourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  panelGlyph: { color: C.violet, fontSize: 13 },
  panelSourceText: { color: C.textDim, fontSize: 12, fontWeight: '600', flex: 1 },

  inputArea: {
    backgroundColor: C.inputBg,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.line,
    color: C.text,
    padding: 14,
    minHeight: 110,
    fontSize: 15, lineHeight: 24,
    fontFamily: SERIF,
    marginBottom: 14,
  },

  dimRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  dimPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: C.line, borderRadius: 10,
    paddingHorizontal: 11, paddingVertical: 7,
  },
  dimDot: { width: 6, height: 6, borderRadius: 3 },
  dimPillText: { color: C.textDim, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },

  saveButton: { borderRadius: 13, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  saveButtonEnabled: {
    backgroundColor: C.violetDeep,
    borderColor: 'rgba(167, 139, 250, 0.6)',
    boxShadow: '0px 6px 22px rgba(124, 92, 224, 0.45)',
  },
  saveButtonDisabled: { backgroundColor: 'transparent', borderColor: C.line },
  saveButtonText: { color: C.textFaint, fontSize: 12, fontWeight: '900', letterSpacing: 2 },

  savedText: { color: '#34D399', fontSize: 15, fontWeight: '800', paddingVertical: 24, textAlign: 'center' },

  /* AI Suggestions */
  suggestionsContainer: {
    marginTop: 40,
    marginBottom: 40,
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  suggestionsTitle: { color: C.cyan, fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  suggestionsSubtitle: { color: C.textDim, fontSize: 14, fontFamily: SERIF, marginBottom: 20 },
  suggestionCard: {
    backgroundColor: 'rgba(16, 21, 38, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sugHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sugAuthor: { color: C.textFaint, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  sugTitle: { color: C.text, fontSize: 16, fontFamily: SERIF, lineHeight: 22, marginBottom: 8 },
  sugMeta: { color: C.violet, fontSize: 12, fontWeight: '600' },

  /* Grafo: boton "Link" en cada sugerencia. */
  linkButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(103, 232, 249, 0.35)',
    borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6,
  },
  linkButtonDone: { borderColor: 'rgba(52, 211, 153, 0.4)', backgroundColor: 'rgba(52, 211, 153, 0.08)' },
  linkButtonText: { color: C.cyan, fontSize: 11, fontWeight: '800' },
  linkButtonDoneText: { color: '#34D399' },

  /* Grafo: badge de tipo de vinculo en "Confirmed Links". */
  relBadge: {
    fontSize: 10, fontWeight: '900', letterSpacing: 0.5,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },

  /* Grafo: panel de conexion manual (buscar + tipo + resultados). */
  connectTrigger: {
    alignSelf: 'flex-start',
    marginTop: -8, marginBottom: 40,
    borderWidth: 1, borderColor: C.line, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  connectTriggerText: { color: C.textDim, fontSize: 13, fontWeight: '700' },
  connectPanel: {
    marginTop: -8, marginBottom: 40,
    backgroundColor: C.dock,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.25)',
    padding: 18,
  },
  connectInput: {
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1, borderColor: C.line,
    color: C.text,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  connectResult: {
    borderWidth: 1, borderColor: C.line, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8,
  },
  connectResultTitle: { color: C.text, fontSize: 14, fontFamily: SERIF },
  connectResultMeta: { color: C.textFaint, fontSize: 11, marginTop: 2 },
  connectEmpty: { color: C.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
});

/* Lectura profunda: cuerpo serif 17/30 — la decisión tipográfica que separa
   una app de notas de una herramienta de investigación. */
const markdownStyles = {
  body: { color: '#E6EAF3', fontSize: 17, lineHeight: 30, fontFamily: SERIF },
  heading1: { color: '#F4F6FB', fontSize: 26, fontFamily: SERIF, marginTop: 28, marginBottom: 14, lineHeight: 34 },
  heading2: { color: '#F4F6FB', fontSize: 22, fontFamily: SERIF, marginTop: 24, marginBottom: 12, lineHeight: 30 },
  heading3: { color: '#F4F6FB', fontSize: 19, fontFamily: SERIF, marginTop: 18, marginBottom: 10 },
  paragraph: { marginBottom: 18 },
  list_item: { marginBottom: 10 },
  strong: { color: '#FFFFFF', fontWeight: '700' as const },
  em: { fontStyle: 'italic' as const, color: '#C7CEDD' },
  blockquote: {
    borderLeftWidth: 3, borderLeftColor: '#A78BFA', paddingLeft: 18,
    marginVertical: 18, backgroundColor: 'rgba(167, 139, 250, 0.06)',
    paddingVertical: 14, borderRadius: 4,
  },
  code_inline: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)', paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 14, color: '#67E8F9', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.12)',
  },
  code_block: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)', padding: 16, borderRadius: 12,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 14, color: '#E2E8F0', marginBottom: 18,
    borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.12)',
  },
};
