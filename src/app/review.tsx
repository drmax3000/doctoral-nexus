import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Platform, Pressable, RefreshControl,
  StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { API_BASE, fetchWithTimeout } from '@/constants/config';
import { ContentBadges } from '@/components/content-badges';
import { VENDOR_META, getContentType, getVendor, type Vendor } from '@/constants/content-types';
import type { KnowledgeNode } from '@/types/nexus';

/* ═══════════════════════ DESIGN TOKENS · NEXUS DARK ═══════════════════════ */
const C = {
  bg: '#05060E',
  surface: 'rgba(16, 21, 38, 0.72)',
  line: 'rgba(148, 163, 184, 0.10)',
  text: '#F4F6FB',
  textDim: '#8A94AD',
  textFaint: '#586176',
  violet: '#A78BFA',
  amber: '#F59E0B',
};

const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, "Times New Roman", serif',
});

type QueueNode = KnowledgeNode;

export default function ReviewQueueScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendorFilter, setVendorFilter] = useState<Vendor | null>(null);
  const [queueSource, setQueueSource] = useState<'backend' | 'fallback'>('fallback');

  /* Sin setState síncrono aquí: el flag de refresh lo pone el caller
     (onRefresh), y este callback solo toca estado tras los await. */
  const loadQueue = useCallback(async () => {
    try {
      // Contrato extendido (G4): cola ordenada por último repaso en el backend.
      const params = vendorFilter ? `?vendor=${vendorFilter}` : '';
      const response = await fetchWithTimeout(`${API_BASE}/api/v1/nexus/review-queue${params}`);
      if (response.ok) {
        const data = await response.json();
        const nodes = Array.isArray(data) ? data : data?.nodes;
        if (Array.isArray(nodes)) {
          setQueue(nodes);
          setQueueSource('backend');
          return;
        }
      }
      throw new Error('review-queue not available');
    } catch {
      // Fallback hasta que G4 exista: los nodos cert de /nodes, sin historial.
      try {
        const response = await fetchWithTimeout(`${API_BASE}/api/v1/nexus/nodes`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setQueue(data.filter((n: QueueNode) => getContentType(n) === 'certification'));
          setQueueSource('fallback');
        }
      } catch (err: any) {
        console.warn('Review queue error:', err?.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vendorFilter]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

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
                  <Text style={[styles.filterText, active && { color: C.text }]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={C.amber} />
        </View>
      ) : (
        <FlatList
          data={visibleQueue}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadQueue(); }}
              tintColor={C.amber}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyGlyph}>◇</Text>
              <Text style={styles.emptyTitle}>Nothing to review yet</Text>
              <Text style={styles.emptyText}>
                Certification topics appear here once study material is ingested into the knowledge base.
              </Text>
            </View>
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

/* ═══════════════════════════════ STYLESHEET ═══════════════════════════════ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  headerContainer: { paddingHorizontal: 24, paddingBottom: 18, paddingTop: 8 },
  overline: { fontSize: 11, fontWeight: '800', color: C.amber, letterSpacing: 4, marginBottom: 6 },
  header: {
    fontSize: 44, color: C.text, fontFamily: SERIF,
    fontWeight: Platform.OS === 'android' ? 'normal' : '700',
    letterSpacing: -0.5, lineHeight: 50,
  },
  subheader: { color: C.textDim, fontSize: 13, marginTop: 8, lineHeight: 19 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.line,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterText: { color: C.textDim, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  listContainer: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 6 },
  queueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.line,
    borderRadius: 18, padding: 18, marginBottom: 12,
  },
  queuePosition: {
    color: C.textFaint, fontSize: 15, fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  queueBody: { flex: 1, minWidth: 0 },
  queueHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8, marginBottom: 8,
  },
  lastReviewed: { color: C.textFaint, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  neverReviewed: { color: C.amber, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  queueTitle: { color: C.text, fontSize: 17, fontFamily: SERIF, lineHeight: 24 },
  queueMeta: { color: C.textDim, fontSize: 12, fontWeight: '600', marginTop: 4 },
  queueGlyph: { color: C.amber, fontSize: 16 },

  emptyContainer: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 16 },
  emptyGlyph: { color: C.amber, fontSize: 36, marginBottom: 12, opacity: 0.7 },
  emptyTitle: { color: C.text, fontSize: 20, fontFamily: SERIF, marginBottom: 8, textAlign: 'center' },
  emptyText: { color: C.textDim, fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
