import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { API_BASE, fetchWithTimeout } from '@/constants/config';
import KnowledgeGraph from '@/components/knowledge-graph';
import { CONTENT_TYPE_META, VENDOR_META, type ContentType, type Vendor } from '@/constants/content-types';
import { Colors, Fonts, getDimensionMeta } from '@/constants/theme';
import { DimensionBadge } from '@/components/ui/dimension-badge';
import { Loader } from '@/components/ui/loader';

const { width } = Dimensions.get('window');

export default function TelemetryDashboard() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const fetchTelemetry = async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/v1/nexus/telemetry`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch telemetry', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Loader label="SINCRONIZANDO TELEMETRÍA" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>No se pudo cargar la telemetría.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 40 }}>

      <View style={styles.headerContainer}>
        <Text style={styles.header}>Estadísticas</Text>
        <Text style={styles.subtitle}>Doctoral Nexus Telemetry</Text>
      </View>

      {/* GLOBAL STATS */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <SymbolView name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }} size={24} tintColor={Colors.dark.textDim} />
          <Text style={styles.statValue}>{data.nodes.total}</Text>
          <Text style={styles.statLabel}>Extractos Totales</Text>
        </View>

        <View style={styles.statBox}>
          <SymbolView name={{ ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' }} size={24} tintColor={Colors.dark.violet} />
          <Text style={styles.statValue}>{data.observations.total}</Text>
          <Text style={styles.statLabel}>Observaciones</Text>
        </View>
      </View>

      {/* KNOWLEDGE GRAPH */}
      <Text style={styles.sectionTitle}>Knowledge Graph</Text>
      <KnowledgeGraph />

      {/* SYSTEM HEALTH */}
      <Text style={styles.sectionTitle}>Salud del Motor IA</Text>
      <View style={styles.metricCard}>
        <View style={styles.metricRow}>
          <View>
            <Text style={styles.metricLabel}>FTS5 Search Engine</Text>
            <Text style={[styles.metricValue, { color: data.system.ftsEnabled ? Colors.dark.emerald : Colors.dark.rose }]}>
              {data.system.ftsEnabled ? 'Online & Active' : 'Offline / Fallback'}
            </Text>
            <Text style={styles.metricSub}>Full-Text Search AI Correlations</Text>
          </View>
          <SymbolView
            name={data.system.ftsEnabled
              ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
              : { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
            size={30}
            tintColor={data.system.ftsEnabled ? Colors.dark.emerald : Colors.dark.rose}
          />
        </View>
      </View>

      {/* TOP TOPICS */}
      <Text style={styles.sectionTitle}>Temas Dominantes</Text>
      {data.nodes.byTema && data.nodes.byTema.map((item: any, index: number) => {
        // Calculate a fake percentage based on total for a visual progress bar
        const percentage = Math.min((item.count / data.nodes.total) * 100, 100);
        return (
          <View key={index} style={styles.barContainer}>
            <View style={styles.barHeader}>
              <Text style={styles.barTitle} numberOfLines={1}>{item.tema}</Text>
              <Text style={styles.barCount}>{item.count} nodos</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: Colors.dark.cyan }]} />
            </View>
          </View>
        );
      })}

      {/* CORPUS: doctoral vs certificación por vendor (contrato G9; se oculta
          solo si el backend aún no expone byContentType) */}
      {data.nodes.byContentType && data.nodes.byContentType.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Corpus</Text>
          {data.nodes.byContentType.map((item: any, index: number) => {
            const meta = CONTENT_TYPE_META[item.contentType as ContentType];
            const percentage = Math.min((item.count / data.nodes.total) * 100, 100);
            return (
              <View key={`ct-${index}`} style={styles.barContainer}>
                <View style={styles.barHeader}>
                  <Text style={styles.barTitle}>{meta?.label ?? item.contentType}</Text>
                  <Text style={styles.barCount}>{item.count} nodos</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: meta?.color ?? Colors.dark.textDim }]} />
                </View>
              </View>
            );
          })}
          {data.nodes.byVendor && data.nodes.byVendor.map((item: any, index: number) => {
            const meta = VENDOR_META[item.vendor as Vendor];
            const certTotal = data.nodes.byContentType
              .find((c: any) => c.contentType === 'certification')?.count ?? data.nodes.total;
            const percentage = Math.min((item.count / Math.max(certTotal, 1)) * 100, 100);
            return (
              <View key={`vd-${index}`} style={styles.barContainer}>
                <View style={styles.barHeader}>
                  <Text style={styles.barTitle}>{meta?.label ?? item.vendor}</Text>
                  <Text style={styles.barCount}>{item.count} temas</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: meta?.color ?? Colors.dark.textDim }]} />
                </View>
              </View>
            );
          })}
          {data.certification && data.certification.quizItemsTotal > 0 && (
            <Text style={[styles.certProgress, { color: CONTENT_TYPE_META.certification.color }]}>
              ◇ {data.certification.reviewedCount} temas repasados · {data.certification.quizItemsTotal} preguntas de autoevaluación en el corpus
            </Text>
          )}
        </>
      )}

      {/* OBSERVATION DIMENSIONS — la fuente de color es getDimensionMeta(), la
          misma que usan node/[id].tsx y observations.tsx; ya no una paleta propia. */}
      <Text style={styles.sectionTitle}>Distribución de Observaciones</Text>
      {data.observations.byDimension && data.observations.byDimension.map((item: any, index: number) => {
        const meta = getDimensionMeta(item.dimension);
        const percentage = Math.min((item.count / data.observations.total) * 100, 100);

        return (
          <View key={`obs-${index}`} style={styles.barContainer}>
            <View style={styles.barHeader}>
              <DimensionBadge dimension={item.dimension} />
              <Text style={styles.barCount}>{item.count}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: meta.color }]} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 20,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  header: {
    fontSize: 34,
    fontFamily: Fonts.serif,
    fontWeight: '900',
    color: Colors.dark.text,
    letterSpacing: -1
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.cyan,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  errorText: {
    color: Colors.dark.rose,
    fontSize: 18,
    fontWeight: '700'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statBox: {
    width: (width - 60) / 2,
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.dark.text,
    marginTop: 12,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.dark.textDim,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.serif,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 16,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  metricCard: {
    backgroundColor: Colors.dark.surface,
    padding: 24,
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: { fontSize: 13, color: Colors.dark.textDim, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  metricValue: { fontSize: 22, fontWeight: '900', marginTop: 6, marginBottom: 4 },
  metricSub: { fontSize: 14, color: Colors.dark.textFaint, fontWeight: '500' },
  barContainer: {
    marginBottom: 16,
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  barTitle: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '700',
    flex: 1,
    paddingRight: 10,
  },
  barCount: {
    fontSize: 14,
    color: Colors.dark.textDim,
    fontWeight: '600',
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  certProgress: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 18,
  }
});
