import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet, Text, View, FlatList, RefreshControl,
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
import { Colors, Fonts } from '@/constants/theme';
import { Loader } from '@/components/ui/loader';
import { ErrorCard } from '@/components/ui/error-card';
import { EmptyState } from '@/components/ui/empty-state';

import type { KnowledgeNode } from '@/types/nexus';

type DocumentNode = KnowledgeNode;

/* ─────────────── Micro-interacción: tarjeta con escala al presionar ───────────────
   Animated.View (no <Card>) a propósito: el press-scale necesita un nodo animable,
   y este es el elemento con más renders del app (FlatList) — misma paleta de
   theme.ts que <Card>, sin forzar el primitivo no-animado a un caso que no cubre. */
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
              <Text style={styles.confidenceText}>{(item.confidence ?? 0).toFixed(0)}%</Text>
            </View>
          </View>

          {/* Certificación: item.title es solo el slug del vendor ("aws"),
              redundante con el badge — capitulo ya es un titulo legible
              ("Chapter 1: ...") y hace de titulo de tarjeta en su lugar. */}
          <Text style={styles.nodeTitle} numberOfLines={3}>
            {getContentType(item) === 'certification' ? (item.capitulo || item.title) : item.title}
          </Text>

          {getContentType(item) !== 'certification' && (
            <Text style={styles.nodeByline} numberOfLines={1}>
              {item.author || 'Unknown author'}
              {item.enfoque ? `  ·  ${item.enfoque}` : ''}
            </Text>
          )}

          {/* Preview de repaso (G10): la tarjeta cert adelanta la trampa nº1 y
              cuántas preguntas esperan — doctoral no cambia. */}
          {item.reviewSummary && (
            <View style={styles.reviewPreview}>
              {!!item.reviewSummary.topTrap && (
                <Text style={styles.reviewTrap} numberOfLines={2}>⚠ {item.reviewSummary.topTrap}</Text>
              )}
              {(item.reviewSummary.quizCount ?? 0) > 0 && (
                <Text style={styles.reviewQuizCount}>◇ {item.reviewSummary.quizCount} self-check questions</Text>
              )}
            </View>
          )}

          <View style={styles.nodeFooter}>
            <View style={styles.taxonomyContainer}>
              {/* tema == capitulo para certificacion (ya es el titulo de la
                  tarjeta arriba) -- mostrarlo aqui tambien seria la tercera
                  repeticion del mismo dato. */}
              {item.tema && getContentType(item) !== 'certification' && (
                <View style={styles.taxonomyTag}>
                  <Text style={styles.taxonomyText}>{item.tema}</Text>
                </View>
              )}
              <View style={[styles.taxonomyTag, styles.versionTag]}>
                <Text style={[styles.taxonomyText, styles.versionText]}>v{item.version ?? 1}</Text>
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
     mas de un mundo; con una biblioteca 100% doctoral la UI queda como siempre.
     Los chips se arman dinamicamente segun que tipos existan de verdad. */
  const hasCertContent = useMemo(() => nodes.some(n => getContentType(n) === 'certification'), [nodes]);
  const hasGeneralContent = useMemo(() => nodes.some(n => getContentType(n) === 'general'), [nodes]);
  const showTypeFilter = hasCertContent || hasGeneralContent;
  const typeChips = useMemo(() => {
    const chips: ContentType[] = ['doctoral'];
    if (hasCertContent) chips.push('certification');
    if (hasGeneralContent) chips.push('general');
    return chips;
  }, [hasCertContent, hasGeneralContent]);
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
      <EmptyState
        title={nodes.length === 0 ? "Knowledge base is empty" : `Nothing matches "${searchQuery}"`}
        description={nodes.length === 0
          ? "Run 'npm run ingest' to populate your SQLite database with documents."
          : "Your knowledge base does contain these threads — pull one:"}
      >
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
      </EmptyState>
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
            placeholderTextColor={Colors.dark.textFaint}
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

        {showTypeFilter && (
          <View style={styles.filterRow}>
            {typeChips.map(type => {
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
                  <Text style={[styles.filterChipText, active && { color: Colors.dark.text }]}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {networkError && <ErrorCard message={networkError} style={styles.errorCard} />}

      {loading && !refreshing ? (
        <Loader label="SYNCHRONIZING K3s SWARM" />
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
              tintColor={Colors.dark.violet}
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
  container: { flex: 1, backgroundColor: Colors.dark.background },

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
    fontSize: 11, fontWeight: '800', color: Colors.dark.violet,
    letterSpacing: 4, marginBottom: 6,
  },
  header: {
    fontSize: 44, color: Colors.dark.text, fontFamily: Fonts.serif,
    fontWeight: Platform.OS === 'android' ? 'normal' : '700',
    letterSpacing: -0.5, lineHeight: 50,
  },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 },
  statText: { color: Colors.dark.textDim, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  statValue: { color: Colors.dark.text, fontWeight: '800', fontSize: 13 },
  statDivider: { width: 1, height: 12, backgroundColor: Colors.dark.border },

  /* Buscador glass con estado de foco (glow violeta). */
  searchContainer: {
    marginTop: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.border,
    paddingHorizontal: 16,
    boxShadow: '0px 6px 18px rgba(0, 0, 0, 0.35)',
  },
  searchContainerFocused: {
    borderColor: Colors.dark.borderFocus,
    boxShadow: '0px 0px 22px rgba(167, 139, 250, 0.18)',
  },
  searchIcon: { color: Colors.dark.textDim, fontSize: 18, marginRight: 10 },
  searchInput: {
    flex: 1, color: Colors.dark.text, paddingVertical: 14,
    fontSize: 15, fontWeight: '500',
  },
  searchClear: { color: Colors.dark.textFaint, fontSize: 13, fontWeight: '800', padding: 4 },

  /* Chips de filtro tipo/vendor: mismo lenguaje glass que el buscador. */
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 14 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  filterChipText: { color: Colors.dark.textDim, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  filterVendorDot: { width: 6, height: 6, borderRadius: 3 },
  filterDivider: { width: 1, height: 14, backgroundColor: Colors.dark.border, marginHorizontal: 2 },

  errorCard: { marginHorizontal: 24, marginBottom: 16 },

  /* Zero-state: chips accionables, nunca texto muerto. */
  suggestionWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  suggestionChip: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.25)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9,
    maxWidth: 280,
  },
  suggestionChipPressed: { backgroundColor: Colors.dark.surfaceHi, borderColor: Colors.dark.borderFocus },
  suggestionKind: { color: Colors.dark.violet, fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 2 },
  suggestionLabel: { color: Colors.dark.text, fontSize: 13, fontWeight: '600' },

  /* Tarjeta de nodo: glass estratificado + riel luminoso. */
  listContainer: { paddingHorizontal: 20, paddingBottom: 80, paddingTop: 6 },
  nodeCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 22,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.dark.border,
    boxShadow: '0px 12px 28px rgba(0, 0, 0, 0.45)',
  },
  nodeRail: {
    width: 3,
    backgroundColor: Colors.dark.violet,
    boxShadow: '0px 0px 12px rgba(167, 139, 250, 0.8)',
  },
  nodeContent: { padding: 20, flex: 1 },

  nodeHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10, gap: 12,
  },
  nodeEyebrow: {
    flex: 1, fontSize: 10, fontWeight: '900',
    color: Colors.dark.textDim, letterSpacing: 2.5,
  },
  confidenceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.10)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  confidenceDot: {
    width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.dark.emerald,
    boxShadow: '0px 0px 6px rgba(52, 211, 153, 0.9)',
  },
  confidenceText: { color: Colors.dark.emerald, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  nodeTitle: {
    fontSize: 21, color: Colors.dark.text, fontFamily: Fonts.serif,
    lineHeight: 29, marginBottom: 8,
  },
  nodeByline: { color: Colors.dark.textDim, fontSize: 13, fontWeight: '600', marginBottom: 16 },

  /* Preview de repaso en tarjetas de certificación. */
  reviewPreview: {
    borderLeftWidth: 2, borderLeftColor: 'rgba(245, 158, 11, 0.5)',
    paddingLeft: 12, marginTop: -6, marginBottom: 16, gap: 4,
  },
  reviewTrap: { color: '#FDE68A', fontSize: 12, lineHeight: 18 },
  reviewQuizCount: { color: '#F59E0B', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  nodeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taxonomyContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  taxonomyTag: {
    backgroundColor: 'rgba(103, 232, 249, 0.07)',
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(103, 232, 249, 0.18)',
  },
  taxonomyText: { color: Colors.dark.cyan, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  versionTag: {
    backgroundColor: 'rgba(148, 163, 184, 0.06)',
    borderColor: Colors.dark.border,
  },
  versionText: { color: Colors.dark.textFaint },
  readGlyph: { color: Colors.dark.violet, fontSize: 18, marginLeft: 12 },
});
