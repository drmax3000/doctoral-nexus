import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE, fetchWithTimeout } from '@/constants/config';

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
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Sincronizando telemetría...</Text>
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
          <Text style={{fontSize: 24}}>📄</Text>
          <Text style={styles.statValue}>{data.nodes.total}</Text>
          <Text style={styles.statLabel}>Extractos Totales</Text>
        </View>
        
        <View style={styles.statBox}>
          <Text style={{fontSize: 24}}>💡</Text>
          <Text style={styles.statValue}>{data.observations.total}</Text>
          <Text style={styles.statLabel}>Observaciones</Text>
        </View>
      </View>

      {/* SYSTEM HEALTH */}
      <Text style={styles.sectionTitle}>Salud del Motor IA</Text>
      <View style={styles.metricCard}>
        <View style={styles.metricRow}>
          <View>
            <Text style={styles.metricLabel}>FTS5 Search Engine</Text>
            <Text style={[styles.metricValue, { color: data.system.ftsEnabled ? '#10b981' : '#f43f5e' }]}>
              {data.system.ftsEnabled ? 'Online & Active' : 'Offline / Fallback'}
            </Text>
            <Text style={styles.metricSub}>Full-Text Search AI Correlations</Text>
          </View>
          <Text style={{fontSize: 32}}>{data.system.ftsEnabled ? "🟢" : "⚠️"}</Text>
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
              <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: '#0ea5e9' }]} />
            </View>
          </View>
        );
      })}

      {/* OBSERVATION DIMENSIONS */}
      <Text style={styles.sectionTitle}>Distribución de Observaciones</Text>
      {data.observations.byDimension && data.observations.byDimension.map((item: any, index: number) => {
        // Find a cool color per dimension
        const color = item.dimension === 'THEORETICAL' ? '#3b82f6' : 
                      item.dimension === 'METHODOLOGICAL' ? '#f59e0b' : 
                      item.dimension === 'EMPIRICAL' ? '#10b981' : '#a855f7';
        
        const percentage = Math.min((item.count / data.observations.total) * 100, 100);

        return (
          <View key={`obs-${index}`} style={styles.barContainer}>
            <View style={styles.barHeader}>
              <Text style={styles.barTitle}>{item.dimension}</Text>
              <Text style={styles.barCount}>{item.count}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: color }]} />
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
    backgroundColor: '#020617', // Very dark slate
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
    fontWeight: '900', 
    color: '#f8fafc', 
    letterSpacing: -1 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#06b6d4', 
    marginTop: 4, 
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  loadingText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600'
  },
  errorText: {
    color: '#ef4444',
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
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#f8fafc',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 16,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  metricCard: { 
    backgroundColor: '#0f172a', 
    padding: 24, 
    borderRadius: 20, 
    marginBottom: 32, 
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: { fontSize: 13, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  metricValue: { fontSize: 22, fontWeight: '900', marginTop: 6, marginBottom: 4 },
  metricSub: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  barContainer: {
    marginBottom: 16,
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  barTitle: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '700',
    flex: 1,
    paddingRight: 10,
  },
  barCount: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  }
});
