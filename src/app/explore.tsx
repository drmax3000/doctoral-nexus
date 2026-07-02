import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TelemetryDashboard() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Cluster Telemetry</Text>
      <Text style={styles.subtitle}>Real-time Docker & K8s Metrics</Text>
      
      <ScrollView contentContainerStyle={{ marginTop: 10 }}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Redis In-Memory Cache</Text>
          <Text style={[styles.metricValue, { color: '#10b981' }]}>124 MB / 512 MB</Text>
          <Text style={styles.metricSub}>LRU Eviction Policy Active</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Docker Desktop WSL2</Text>
          <Text style={[styles.metricValue, { color: '#3b82f6' }]}>Stable</Text>
          <Text style={styles.metricSub}>Swap=0 Hard Limit Enforced</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>API Backend / FastAPI</Text>
          <Text style={[styles.metricValue, { color: '#10b981' }]}>Online (0.0.0.0:8000)</Text>
          <Text style={styles.metricSub}>Processing Subagent Nodes</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: '#f59e0b' }]}>
          <Text style={styles.metricLabel}>Mini K8s (K3s) Migration</Text>
          <Text style={[styles.metricValue, { color: '#f59e0b' }]}>Pending Deployment</Text>
          <Text style={styles.metricSub}>Rancher Desktop Switch required</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  header: { fontSize: 32, fontWeight: '900', color: '#f8fafc', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#94a3b8', marginBottom: 20, fontWeight: '500' },
  metricCard: { 
    backgroundColor: '#1e293b', 
    padding: 24, 
    borderRadius: 16, 
    marginBottom: 16, 
    borderLeftWidth: 4, 
    borderLeftColor: '#3b82f6',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  metricLabel: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  metricValue: { fontSize: 24, fontWeight: '900', marginTop: 8, marginBottom: 4 },
  metricSub: { fontSize: 14, color: '#64748b', fontWeight: '500' },
});
