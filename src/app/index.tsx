import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'https://mandatory-bumper-model-privilege.trycloudflare.com';
const TIMEOUT_MS = 8000; // 8 seconds timeout to prevent hanging

// Define types for our data
interface FileItem {
  id: string;
  title: string;
  status: string;
  color: string;
}

export default function KnowledgeVault() {
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Robust fetch with timeout to prevent hanging processes
  const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal as any });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  const loadData = async () => {
    try {
      // In a real scenario, this hits our Python FastAPI backend via Cloudflare Tunnel
      // For now, we simulate the network request to demonstrate the robust architecture
      // const response = await fetchWithTimeout(`${API_URL}/api/v1/documents`);
      // const data = await response.json();
      
      // Simulated delay to show loading state (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockData = [
        { id: '1', title: 'Chapter 2: B-Trees Analysis', status: 'Downloaded (Offline)', color: '#10b981' },
        { id: '2', title: 'Chapter 1: MySQL Architecture', status: 'Available in Backend', color: '#3b82f6' },
        { id: '3', title: 'Chapter 4: Hardware Optimization', status: 'Processing 7D', color: '#f59e0b' },
        { id: '4', title: 'Chapter 5: Distributed Transactions', status: 'Queued', color: '#64748b' }
      ];
      setFiles(mockData);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        Alert.alert('Network Timeout', 'The Cloudflare backend took too long to respond. Check if the Tunnel is alive.');
      } else {
        Alert.alert('Sync Error', 'Failed to connect to the Doctoral Backend.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Knowledge Vault 7D</Text>
      <Text style={styles.subtitle}>Doctoral Knowledge Base</Text>
      
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loaderText}>Syncing securely via Cloudflare...</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.7}>
              <View style={[styles.indicator, { backgroundColor: item.color }]} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardStatus}>{item.status}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 20 },
  header: { fontSize: 32, fontWeight: '900', color: '#f8fafc', letterSpacing: -0.5, marginTop: 10 },
  subtitle: { fontSize: 16, color: '#94a3b8', marginBottom: 20, fontWeight: '500' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { color: '#94a3b8', marginTop: 12, fontWeight: '500' },
  card: { 
    backgroundColor: '#1e293b', 
    borderRadius: 16, 
    marginBottom: 16, 
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  indicator: { width: 6, height: '100%' },
  cardContent: { padding: 20, flex: 1 },
  cardTitle: { fontSize: 18, color: '#f1f5f9', fontWeight: '700', marginBottom: 4 },
  cardStatus: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
});
