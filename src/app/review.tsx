import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList, Platform, Pressable, RefreshControl,
  StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { API_BASE, fetchJson } from '@/constants/config';
import { useAsync } from '@/hooks/use-async';
import { ContentBadges } from '@/components/content-badges';
import { CONTENT_TYPE_META, VENDOR_META, getContentType, getVendor, type Vendor } from '@/constants/content-types';
import { Colors, Fonts } from '@/constants/theme';
import { ErrorCard } from '@/components/ui/error-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { RouteErrorFallback } from '@/components/ui/route-error-fallback';
import type { KnowledgeNode } from '@/types/nexus';

/* Ámbar de "certification" (content-type), distinto del ámbar de dimensión
   ANALYTICAL en theme.ts — esta pantalla es vendor-filtered, no dimension-
   filtered, así que no usa DimensionBadge/getDimensionMeta en absoluto. */
const AMBER = CONTENT_TYPE_META.certification.color;

type QueueNode = KnowledgeNode;
type QueueResult = { nodes: QueueNode[]; source: 'backend' | 'fallback' };

export default function ReviewQueueScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [vendorFilter, setVendorFilter] = useState<Vendor | null>(null);

  /* Auditoria Codex EH-02 (hallazgo mas severo de esta pantalla): antes, si
     AMBOS niveles del fallback fallaban, el catch interno solo hacia
     console.warn y dejaba queue=[] — se veia igual que "cola realmente
     vacia". Ahora el fallback que falla queda DENTRO de la funcion que le
     pasamos a useAsync: si el segundo intento tambien lanza, la excepcion
     sale sin capturar y useAsync cae a status:'error' con retry, nunca a
     'empty'. */
  const fetchQueue = useCallback(async (): Promise<QueueResult> => {
    // Contrato extendido (G4): cola ordenada por último repaso en el backend.
    const params = vendorFilter ? `?vendor=${vendorFilter}` : '';
    try {
      const data = await fetchJson<any>(`${API_BASE}/api/v1/nexus/review-queue${params}`);
      const nodes = Array.isArray(data) ? data : data?.nodes;
      if (Array.isArray(nodes)) return { nodes, source: 'backend' };
      throw { kind: 'parse', message: 'review-queue not available' };
    } catch {
      // Fallback hasta que G4 exista: los nodos cert de /nodes, sin historial.
      const data = await fetchJson<QueueNode[]>(`${API_BASE}/api/v1/nexus/nodes`);
      return { nodes: data.filter(n => getContentType(n) === 'certification'), source: 'fallback' };
    }
  }, [vendorFilter]);

  const asyncState = useAsync<QueueResult>(fetchQueue, {
    isEmpty: result => result.nodes.length === 0,
  });
  const hasQueue = asyncState.status === 'success' || asyncState.status === 'empty';
  const queue = hasQueue ? asyncState.data.nodes : [];
  const queueSource = hasQueue ? asyncState.data.source : 'fallback';

  const visibleQueue = useMemo(
    () => (vendorFilter && queueSource === 'fallback'
      ? queue.filter(n => getVendor(n) === vendorFilter)
      : queue),
    [queue, vendorFilter, queueSource],
  );

  const availableVendors = useMemo(
    () => [...new Set(queue.map(getVendor).filter(Boolean))] as Vendor[],
    [queue],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.headerContainer}>
        <Text style={styles.overline}>CERTIFICATION MODE</Text>
        <Text style={styles.header}>Review</Text>
        <Text style={styles.subheader}>
          {queueSource === 'backend'
            ? 'Least-recently reviewed first — clear the queue.'
            : 'All certification topics — review history not yet enabled.'}
        </Text>

        {availableVendors.length > 1 && (
          <View style={styles.filterRow}>
            {availableVendors.map(vendor => {
              const active = vendorFilter === vendor;
              const meta = VENDOR_META[vendor];
              return (
                <Pressable
                  key={vendor}
                  onPress={() => setVendorFilter(active ? null : vendor)}
                  style={[styles.filterChip, active && { borderColor: meta.color }]}
                >
                  <View style={[styles.filterDot, { backgroundColor: meta.color }]} />
                  <Text style={[styles.filterText, active && { color: Colors.dark.text }]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {asyncState.status === 'loading' ? (
        <SkeletonList count={5} variant="row" />
      ) : asyncState.status === 'error' ? (
        <ErrorCard
          message={asyncState.error.message}
          style={styles.errorCard}
          onRetry={asyncState.retry}
          retrying={asyncState.retrying}
        />
      ) : (
        <FlatList
          data={visibleQueue}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={asyncState.retrying}
              onRefresh={asyncState.retry}
              tintColor={AMBER}
            />
          }
          ListEmptyComponent={
            <EmptyState
              glyph="◇"
              accentColor={AMBER}
              title="Nothing to review yet"
              description="Certification topics appear here once study material is ingested into the knowledge base."
            />
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={({ pressed }) => [styles.queueCard, pressed && { opacity: 0.75 }]}
              onPress={() => router.push({ pathname: '/node/[id]', params: { id: item.id } })}
            >
              <Text style={styles.queuePosition}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.queueBody}>
                <View style={styles.queueHeaderRow}>
                  <ContentBadges node={item} />
                  {item.lastReviewed
                    ? <Text style={styles.lastReviewed}>last: {item.lastReviewed.slice(0, 10)}</Text>
                    : <Text style={styles.neverReviewed}>never reviewed</Text>}
                </View>
                <Text style={styles.queueTitle} numberOfLines={2}>{item.title}</Text>
                {item.capitulo && <Text style={styles.queueMeta} numberOfLines={1}>{item.capitulo}</Text>}
              </View>
              <Text style={styles.queueGlyph}>⟶</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <RouteErrorFallback error={error} retry={retry} />;
}

/* ═══════════════════════════════ STYLESHEET ═══════════════════════════════ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },

  headerContainer: { paddingHorizontal: 24, paddingBottom: 18, paddingTop: 8 },
  overline: { fontSize: 11, fontWeight: '800', color: AMBER, letterSpacing: 4, marginBottom: 6 },
  header: {
    fontSize: 44, color: Colors.dark.text, fontFamily: Fonts.serif,
    fontWeight: Platform.OS === 'android' ? 'normal' : '700',
    letterSpacing: -0.5, lineHeight: 50,
  },
  subheader: { color: Colors.dark.textDim, fontSize: 13, marginTop: 8, lineHeight: 19 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterText: { color: Colors.dark.textDim, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },

  listContainer: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 6 },
  errorCard: { marginHorizontal: 24, marginTop: 6 },
  queueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: 18, padding: 18, marginBottom: 12,
  },
  queuePosition: {
    color: Colors.dark.textFaint, fontSize: 15, fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  queueBody: { flex: 1, minWidth: 0 },
  queueHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8, marginBottom: 8,
  },
  lastReviewed: { color: Colors.dark.textFaint, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  neverReviewed: { color: AMBER, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  queueTitle: { color: Colors.dark.text, fontSize: 17, fontFamily: Fonts.serif, lineHeight: 24 },
  queueMeta: { color: Colors.dark.textDim, fontSize: 12, fontWeight: '600', marginTop: 4 },
  queueGlyph: { color: AMBER, fontSize: 16 },
});
