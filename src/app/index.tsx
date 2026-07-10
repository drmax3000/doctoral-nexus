import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl,
  Platform, UIManager, TextInput, Pressable, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { API_BASE, fetchWithTimeout } from '@/constants/config';
import { ContentBadges } from '@/components/content-badges';
import {
  CONTENT_TYPE_META, VENDOR_META, getContentType, getVendor,
  type ContentType, type Vendor,
} from '@/constants/content-types';

/* ═══════════════════════ DESIGN TOKENS · NEXUS DARK ═══════════════════════ */
const C = {
  bg: '#05060E',                                  // ink void (más profundo que #020617)
  surface: 'rgba(16, 21, 38, 0.72)',              // glass base
  surfaceHi: 'rgba(24, 31, 54, 0.85)',            // glass elevado
  line: 'rgba(148, 163, 184, 0.10)',              // hairline
  lineFocus: 'rgba(167, 139, 250, 0.55)',
  text: '#F4F6FB',
  textDim: '#8A94AD',
  textFaint: '#586176',
  violet: '#A78BFA',                              // acento primario (conocimiento)
  violetDeep: '#7C5CE0',
  cyan: '#67E8F9',                                // acento secundario (síntesis)
  emerald: '#34D399',
  rose: '#FB7185',
};

const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, "Times New Roman", serif',
});

interface DocumentNode {
  id: string;
  title: string;
  status: 'offline_ready' | 'processing' | 'cloud_sync' | 'error';
  confidence: number;
  author?: string;
  tema?: string;
  capitulo?: string;
  enfoque?: string;
  content?: string;
  traceId: string;
  lastAgentId: string;
  version: number;
  // Campos del contrato extendido (G2); mientras llegan, la UI los deriva
  // de dimension/enfoque vía @/constants/content-types.
  dimension?: string;
  contentType?: string;
  vendor?: string;
}

/* ─────────────── Micro-interacción: tarjeta con escala al presionar ─────────────── */
function NodeCard({ item, onPress }: { item: DocumentNode; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animate(0.975)}
      onPressOut={() => animate(1)}
    >
      <Animated.View style={[styles.nodeCard, { transform: [{ scale }] }]}>
        {/* Riel luminoso: ancla visual de la jerarquía */}
        <View style={styles.nodeRail} />

        <View style={styles.nodeContent}>
          <View style={styles.nodeHeaderRow}>
            <Text style={styles.nodeEyebrow} numberOfLines={1}>
              {item.capitulo ? item.capitulo.toUpperCase() : 'RAW EXTRACT'}
            </Text>
            <ContentBadges node={item} />
            <View style={styles.confidenceBadge}>
              <View style={styles.confidenceDot} />
              <Text style={styles.confidenceText}>{(item.confidence * 100).toFixed(0)}%</Text>
            </View>
          </View>

          <Text style={styles.nodeTitle} numberOfLines={3}>{item.title}</Text>

          <Text style={styles.nodeByline} numberOfLines={1}>
            {item.author || 'Unknown author'}
            {item.enfoque ? `  ·  ${item.enfoque}` : ''}
          </Text>

          <View style={styles.nodeFooter}>
            <View style={styles.taxonomyContainer}>
              {item.tema && (
                <View style={styles.taxonomyTag}>
                  <Text style={styles.taxonomyText}>{item.tema}</Text>
                </View>
              )}
              <View style={[styles.taxonomyTag, styles.versionTag]}>
                <Text style={[styles.taxonomyText, styles.versionText]}>v{item.version}</Text>
              </View>
            </View>
            <Text style={styles.readGlyph}>⟶</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function DoctoralNexusCore() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [nodes, setNodes] = useState<DocumentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ContentType | null>(null);
  const [vendorFilter, setVendorFilter] = useState<Vendor | null>(null);


  const loadArchitecture = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setNetworkError(null);

    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/v1/nexus/nodes`);
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        const data = await response.json();
        setNodes(data);
      } else {
        throw new Error('502_BAD_GATEWAY');
      }
    } catch (error: any) {
      console.warn('Network error:', error.message);

      let errorMessage = 'Data link failure. Server unreachable.';
      if (error.name === 'AbortError') errorMessage = 'Extreme latency. (8s timeout).';
      if (error.message === '502_BAD_GATEWAY') errorMessage = 'Tunnel active, but local backend inoperative.';

      setNetworkError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadArchitecture();
  }, []);

  /* Los filtros por tipo/vendor solo existen en pantalla cuando el KB tiene
     ambos mundos; con una biblioteca 100% doctoral la UI queda como siempre. */
  const hasCertContent = useMemo(() => nodes.some(n => getContentType(n) === 'certification'), [nodes]);
  const availableVendors = useMemo(
    () => [...new Set(nodes.map(getVendor).filter(Boolean))] as Vendor[],
    [nodes],
  );

  const filteredNodes = nodes.filter(node => {
    if (typeFilter && getContentType(node) !== typeFilter) return false;
    if (vendorFilter && getVendor(node) !== vendorFilter) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      node.title.toLowerCase().includes(query) ||
      (node.author && node.author.toLowerCase().includes(query)) ||
      (node.tema && node.tema.toLowerCase().includes(query)) ||
      (node.enfoque && node.enfoque.toLowerCase().includes(query)) ||
      (node.capitulo && node.capitulo.toLowerCase().includes(query))
    );
  });

  const stats = useMemo(() => ({
    nodes: nodes.length,
    authors: new Set(nodes.map(n => n.author).filter(Boolean)).size,
    themes: new Set(nodes.map(n => n.tema).filter(Boolean)).size,
  }), [nodes]);

  /* Zero-state inteligente: las sugerencias son chips accionables que
     rellenan el buscador — el usuario nunca queda en un callejón sin salida. */
  const renderEmptyState = () => {
    const pick = (fn: (n: DocumentNode) => string | undefined) =>
      [...new Set(nodes.map(fn).filter(Boolean))].slice(0, 2) as string[];

    const suggestions = [
      ...pick(n => n.capitulo).map(v => ({ label: v, kind: 'CHAPTER' })),
      ...pick(n => n.author).map(v => ({ label: v, kind: 'AUTHOR' })),
      ...pick(n => n.tema).map(v => ({ label: v, kind: 'THEME' })),
    ];

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyGlyph}>◌</Text>
        <Text style={styles.emptyTitle}>
          {nodes.length === 0 ? "Knowledge base is empty" : `Nothing matches “${searchQuery}”`}
        </Text>
        <Text style={styles.emptyText}>
          {nodes.length === 0
            ? "Run 'npm run ingest' to populate your SQLite database with documents."
            : "Your knowledge base does contain these threads — pull one:"}
        </Text>

        <View style={styles.suggestionWrap}>
          {suggestions.map((s, i) => (
            <Pressable
              key={`${s.kind}-${i}`}
              style={({ pressed }) => [styles.suggestionChip, pressed && styles.suggestionChipPressed]}
              onPress={() => setSearchQuery(s.label)}
            >
              <Text style={styles.suggestionKind}>{s.kind}</Text>
              <Text style={styles.suggestionLabel} numberOfLines={1}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Halo ambiental superior: profundidad sin LinearGradient */}
      <View pointerEvents="none" style={styles.ambientHalo} />

      <View style={styles.headerContainer}>
        <Text style={styles.overline}>DOCTORAL NEXUS</Text>
        <Text style={styles.header}>Library</Text>

        <View style={styles.statsRow}>
          <Text style={styles.statText}><Text style={styles.statValue}>{stats.nodes}</Text>  nodes</Text>
          <View style={styles.statDivider} />
          <Text style={styles.statText}><Text style={styles.statValue}>{stats.authors}</Text>  authors</Text>
          <View style={styles.statDivider} />
          <Text style={styles.statText}><Text style={styles.statValue}>{stats.themes}</Text>  themes</Text>
        </View>

        <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search framework, author, concept…"
            placeholderTextColor={C.textFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={12}>
              <Text style={styles.searchClear}>✕</Text>
            </Pressable>
          )}
        </View>

        {hasCertContent && (
          <View style={styles.filterRow}>
            {(['doctoral', 'certification'] as ContentType[]).map(type => {
              const active = typeFilter === type;
              const meta = CONTENT_TYPE_META[type];
              return (
                <Pressable
                  key={type}
                  onPress={() => {
                    setTypeFilter(active ? null : type);
                    if (type !== 'certification') setVendorFilter(null);
                  }}
                  style={[
                    styles.filterChip,
                    active && { borderColor: meta.color, backgroundColor: meta.bg },
                  ]}
                >
                  <Text style={[styles.filterChipText, active && { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
            {typeFilter === 'certification' && availableVendors.length > 1 && (
              <View style={styles.filterDivider} />
            )}
            {typeFilter === 'certification' && availableVendors.length > 1 && availableVendors.map(vendor => {
              const active = vendorFilter === vendor;
              const meta = VENDOR_META[vendor];
              return (
                <Pressable
                  key={vendor}
                  onPress={() => setVendorFilter(active ? null : vendor)}
                  style={[styles.filterChip, active && { borderColor: meta.color }]}
                >
                  <View style={[styles.filterVendorDot, { backgroundColor: meta.color }]} />
                  <Text style={[styles.filterChipText, active && { color: C.text }]}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {networkError && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>⚠ Connection error</Text>
          <Text style={styles.errorText}>{networkError}</Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={C.violet} />
          <Text style={styles.loaderText}>SYNCHRONIZING K3s SWARM</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNodes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadArchitecture(true)}
              tintColor={C.violet}
            />
          }
          renderItem={({ item }) => (
            <NodeCard
              item={item}
              onPress={() =>
                // El listado ya no viaja con content masivo: el detalle
                // hace fetch por id contra /nodes/[id] (ya implementado).
                router.push({ pathname: '/node/[id]', params: { id: item.id } })
              }
            />
          )}
        />
      )}
    </View>
  );
}

/* ═══════════════════════════════ STYLESHEET ═══════════════════════════════ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  ambientHalo: {
    position: 'absolute',
    top: -180, left: -80, right: -80, height: 340,
    borderRadius: 340,
    backgroundColor: 'rgba(124, 92, 224, 0.14)',
    // El blur nativo no existe sin expo-blur; el radio enorme + opacidad baja lo simula.
    transform: [{ scaleX: 1.4 }],
  },

  /* Header editorial: overline técnica + serif de gran cuerpo. */
  headerContainer: { paddingHorizontal: 24, paddingBottom: 18, paddingTop: 8 },
  overline: {
    fontSize: 11, fontWeight: '800', color: C.violet,
    letterSpacing: 4, marginBottom: 6,
  },
  header: {
    fontSize: 44, color: C.text, fontFamily: SERIF,
    fontWeight: Platform.OS === 'android' ? 'normal' : '700',
    letterSpacing: -0.5, lineHeight: 50,
  },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 },
  statText: { color: C.textDim, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  statValue: { color: C.text, fontWeight: '800', fontSize: 13 },
  statDivider: { width: 1, height: 12, backgroundColor: C.line },

  /* Buscador glass con estado de foco (glow violeta). */
  searchContainer: {
    marginTop: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1, borderColor: C.line,
    paddingHorizontal: 16,
    boxShadow: '0px 6px 18px rgba(0, 0, 0, 0.35)',
  },
  searchContainerFocused: {
    borderColor: C.lineFocus,
    boxShadow: '0px 0px 22px rgba(167, 139, 250, 0.18)',
  },
  searchIcon: { color: C.textDim, fontSize: 18, marginRight: 10 },
  searchInput: {
    flex: 1, color: C.text, paddingVertical: 14,
    fontSize: 15, fontWeight: '500',
  },
  searchClear: { color: C.textFaint, fontSize: 13, fontWeight: '800', padding: 4 },

  /* Chips de filtro tipo/vendor: mismo lenguaje glass que el buscador. */
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 14 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.line,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  filterChipText: { color: C.textDim, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  filterVendorDot: { width: 6, height: 6, borderRadius: 3 },
  filterDivider: { width: 1, height: 14, backgroundColor: C.line, marginHorizontal: 2 },

  errorCard: {
    marginHorizontal: 24, marginBottom: 16,
    backgroundColor: 'rgba(251, 113, 133, 0.08)',
    borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.35)',
    borderRadius: 16, padding: 16,
  },
  errorTitle: { color: C.rose, fontWeight: '800', fontSize: 14, marginBottom: 4, letterSpacing: 0.5 },
  errorText: { color: C.text, fontSize: 13, lineHeight: 20 },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: {
    color: C.textDim, marginTop: 18, fontWeight: '700',
    fontSize: 11, letterSpacing: 3,
  },

  /* Zero-state: chips accionables, nunca texto muerto. */
  emptyContainer: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 8 },
  emptyGlyph: { color: C.violet, fontSize: 40, marginBottom: 14, opacity: 0.7 },
  emptyTitle: {
    color: C.text, fontSize: 20, fontFamily: SERIF, textAlign: 'center',
    marginBottom: 8, lineHeight: 28,
  },
  emptyText: { color: C.textDim, fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  suggestionWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  suggestionChip: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.25)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9,
    maxWidth: 280,
  },
  suggestionChipPressed: { backgroundColor: C.surfaceHi, borderColor: C.lineFocus },
  suggestionKind: { color: C.violet, fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 2 },
  suggestionLabel: { color: C.text, fontSize: 13, fontWeight: '600' },

  /* Tarjeta de nodo: glass estratificado + riel luminoso. */
  listContainer: { paddingHorizontal: 20, paddingBottom: 80, paddingTop: 6 },
  nodeCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1, borderColor: C.line,
    boxShadow: '0px 12px 28px rgba(0, 0, 0, 0.45)',
  },
  nodeRail: {
    width: 3,
    backgroundColor: C.violet,
    boxShadow: '0px 0px 12px rgba(167, 139, 250, 0.8)',
  },
  nodeContent: { padding: 20, flex: 1 },

  nodeHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10, gap: 12,
  },
  nodeEyebrow: {
    flex: 1, fontSize: 10, fontWeight: '900',
    color: C.textDim, letterSpacing: 2.5,
  },
  confidenceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.10)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  confidenceDot: {
    width: 5, height: 5, borderRadius: 3, backgroundColor: C.emerald,
    boxShadow: '0px 0px 6px rgba(52, 211, 153, 0.9)',
  },
  confidenceText: { color: C.emerald, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  nodeTitle: {
    fontSize: 21, color: C.text, fontFamily: SERIF,
    lineHeight: 29, marginBottom: 8,
  },
  nodeByline: { color: C.textDim, fontSize: 13, fontWeight: '600', marginBottom: 16 },

  nodeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taxonomyContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  taxonomyTag: {
    backgroundColor: 'rgba(103, 232, 249, 0.07)',
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(103, 232, 249, 0.18)',
  },
  taxonomyText: { color: C.cyan, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  versionTag: {
    backgroundColor: 'rgba(148, 163, 184, 0.06)',
    borderColor: C.line,
  },
  versionText: { color: C.textFaint },
  readGlyph: { color: C.violet, fontSize: 18, marginLeft: 12 },
});
