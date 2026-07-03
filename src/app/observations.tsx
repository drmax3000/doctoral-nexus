import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, Pressable, ScrollView, Platform, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE, fetchWithTimeout } from '@/constants/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ═══════════════════════ DESIGN TOKENS · NEXUS DARK ═══════════════════════ */
const C = {
  bg: '#05060E',
  surface: 'rgba(16, 21, 38, 0.72)',
  surfaceHi: 'rgba(24, 31, 54, 0.85)',
  inputBg: 'rgba(5, 6, 14, 0.65)',
  line: 'rgba(148, 163, 184, 0.10)',
  text: '#F4F6FB',
  textDim: '#8A94AD',
  textFaint: '#586176',
  violet: '#A78BFA',
  cyan: '#67E8F9',
};

const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, "Times New Roman", serif',
});

/* Cada dimensión posee identidad cromática propia — el color se propaga
   al historial para que la clasificación sea legible de un vistazo. */
const DIMENSIONS = [
  { key: 'THEORETICAL',    color: '#A78BFA', tint: 'rgba(167, 139, 250, 0.12)', border: 'rgba(167, 139, 250, 0.35)', hint: 'Frameworks & constructs' },
  { key: 'METHODOLOGICAL', color: '#67E8F9', tint: 'rgba(103, 232, 249, 0.10)', border: 'rgba(103, 232, 249, 0.35)', hint: 'Design & instruments' },
  { key: 'EMPIRICAL',      color: '#34D399', tint: 'rgba(52, 211, 153, 0.10)',  border: 'rgba(52, 211, 153, 0.35)',  hint: 'Evidence & data' },
  { key: 'ANALYTICAL',     color: '#FBBF24', tint: 'rgba(251, 191, 36, 0.10)',  border: 'rgba(251, 191, 36, 0.35)',  hint: 'Interpretation & critique' },
] as const;

type DimensionKey = typeof DIMENSIONS[number]['key'];

interface Observation {
  id: string;
  text: string;
  dimension: DimensionKey;
  createdAt: string;
  /* Trazabilidad relacional: de qué nodo de la Library nació esta síntesis. */
  source?: { nodeId: string; title: string; author?: string; capitulo?: string };
}



export default function ObservationsScreen() {
  const insets = useSafeAreaInsets();
  const [observation, setObservation] = useState('');
  const [dimension, setDimension] = useState<DimensionKey | null>(null);
  const router = useRouter();
  const [history, setHistory] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const loadHistory = async () => {
    setNetworkError(null);
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/v1/nexus/observations`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        throw new Error('Failed to load');
      }
    } catch (error: any) {
      setNetworkError('Data link failure. Server unreachable.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadHistory();
  }, []);

  const canSave = observation.trim().length > 0 && dimension !== null;

  const handleSave = async () => {
    if (!canSave || !dimension) return;
    try {
      const payload = { text: observation.trim(), dimension };
      const response = await fetchWithTimeout(`${API_BASE}/api/v1/nexus/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const newObs = await response.json();
        setHistory(prev => [newObs, ...prev]);
        setObservation('');
        setDimension(null);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save observation. Draft kept.');
    }
  };

  const dimMeta = (key: DimensionKey) => DIMENSIONS.find(d => d.key === key)!;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View pointerEvents="none" style={styles.ambientHalo} />

      <View style={styles.headerContainer}>
        <Text style={styles.overline}>DOCTORAL NEXUS</Text>
        <Text style={styles.header}>Synthesis</Text>
        <Text style={styles.subtitle}>Where technical data becomes doctoral insight</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Editor ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New observation</Text>

          <TextInput
            style={styles.inputArea}
            multiline
            placeholder="Distill what this evidence means for your thesis…"
            placeholderTextColor={C.textFaint}
            value={observation}
            onChangeText={setObservation}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{observation.length} chars</Text>

          <Text style={styles.dimensionLabel}>DIMENSION — the final human judgment</Text>
          <View style={styles.dimensionSelector}>
            {DIMENSIONS.map(dim => {
              const active = dimension === dim.key;
              return (
                <Pressable
                  key={dim.key}
                  style={[
                    styles.dimButton,
                    { borderColor: active ? dim.color : C.line, backgroundColor: active ? dim.tint : 'transparent' },
                  ]}
                  onPress={() => setDimension(dim.key)}
                >
                  <View style={[styles.dimDot, { backgroundColor: dim.color, opacity: active ? 1 : 0.35 }]} />
                  <View style={styles.dimTextWrap}>
                    <Text style={[styles.dimButtonText, active && { color: dim.color }]}>{dim.key}</Text>
                    <Text style={styles.dimHint}>{dim.hint}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              canSave ? styles.saveButtonEnabled : styles.saveButtonDisabled,
              pressed && canSave && { transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={[styles.saveButtonText, canSave && styles.saveButtonTextEnabled]}>
              {canSave ? 'COMMIT TO THESIS' : dimension ? 'WRITE YOUR INSIGHT' : 'SELECT A DIMENSION'}
            </Text>
          </Pressable>
        </View>

        {/* ── Historial relacional ───────────────────────────────── */}
        <Text style={styles.historyTitle}>RECENT INSIGHTS</Text>

        {networkError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>⚠ Connection error</Text>
            <Text style={styles.errorText}>{networkError}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={C.violet} />
          </View>
        ) : (
          history.map(obs => {
            const meta = dimMeta(obs.dimension);
            return (
              <View key={obs.id} style={styles.historyItem}>
                <View style={[styles.historyRail, { backgroundColor: meta.color, boxShadow: `0px 0px 10px ${meta.color}` }]} />
                <View style={styles.historyBody}>

                  <View style={styles.historyHeaderRow}>
                    <View style={[styles.dimBadge, { backgroundColor: meta.tint, borderColor: meta.border }]}>
                      <Text style={[styles.dimBadgeText, { color: meta.color }]}>{obs.dimension}</Text>
                    </View>
                    <Text style={styles.historyMeta}>{obs.createdAt}</Text>
                  </View>

                  <Text style={styles.historyText}>“{obs.text}”</Text>

                  {/* Chip de origen: la observación nunca pierde su genealogía. */}
                  {obs.source && (
                    <Pressable 
                      style={({ pressed }) => [styles.sourceChip, pressed && { opacity: 0.8 }]}
                      onPress={() => router.push({ pathname: '/node/[id]', params: { id: obs.source!.nodeId } })}
                    >
                      <Text style={styles.sourceGlyph}>◈</Text>
                      <View style={styles.sourceTextWrap}>
                        <Text style={styles.sourceTitle} numberOfLines={1}>{obs.source.title}</Text>
                        <Text style={styles.sourceMeta} numberOfLines={1}>
                          {obs.source.author || 'Unknown'}{obs.source.capitulo ? `  ·  ${obs.source.capitulo}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.sourceArrow}>⟶</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
    backgroundColor: 'rgba(34, 118, 148, 0.13)',
    transform: [{ scaleX: 1.4 }],
  },

  headerContainer: { paddingHorizontal: 24, paddingBottom: 18, paddingTop: 8 },
  overline: { fontSize: 11, fontWeight: '800', color: C.cyan, letterSpacing: 4, marginBottom: 6 },
  header: {
    fontSize: 44, color: C.text, fontFamily: SERIF,
    fontWeight: Platform.OS === 'android' ? 'normal' : '700',
    letterSpacing: -0.5, lineHeight: 50,
  },
  subtitle: { fontSize: 13, color: C.textDim, fontWeight: '500', marginTop: 6, letterSpacing: 0.3 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 80, paddingTop: 10 },

  /* Editor glass. */
  card: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1, borderColor: C.line,
    boxShadow: '0px 12px 28px rgba(0, 0, 0, 0.45)',
    marginBottom: 32,
  },
  cardTitle: { color: C.text, fontSize: 22, fontFamily: SERIF, marginBottom: 16 },

  inputArea: {
    backgroundColor: C.inputBg,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.line,
    color: C.text,
    padding: 16,
    minHeight: 140,
    fontSize: 16, lineHeight: 26,
    fontFamily: SERIF,               // se escribe con la misma voz tipográfica con la que se lee
    marginBottom: 6,
  },
  charCount: { color: C.textFaint, fontSize: 11, fontWeight: '600', textAlign: 'right', marginBottom: 18 },

  dimensionLabel: {
    color: C.textDim, fontSize: 10, fontWeight: '900',
    marginBottom: 12, letterSpacing: 2.5,
  },
  dimensionSelector: { gap: 10, marginBottom: 22 },
  dimButton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  dimDot: { width: 8, height: 8, borderRadius: 4 },
  dimTextWrap: { flex: 1 },
  dimButtonText: { color: C.textDim, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  dimHint: { color: C.textFaint, fontSize: 11, fontWeight: '500', marginTop: 2 },

  saveButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1 },
  saveButtonEnabled: {
    backgroundColor: '#7C5CE0',
    borderColor: 'rgba(167, 139, 250, 0.6)',
    boxShadow: '0px 6px 24px rgba(124, 92, 224, 0.45)',
  },
  saveButtonDisabled: { backgroundColor: 'transparent', borderColor: C.line },
  saveButtonText: { color: C.textFaint, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  saveButtonTextEnabled: { color: '#FFFFFF' },

  /* Historial relacional. */
  historyTitle: {
    color: C.textDim, fontSize: 11, fontWeight: '900',
    marginBottom: 14, letterSpacing: 3, paddingHorizontal: 4,
  },
  
  errorCard: {
    backgroundColor: 'rgba(251, 113, 133, 0.08)',
    borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.35)',
    borderRadius: 16, padding: 16, marginBottom: 16,
  },
  errorTitle: { color: '#FB7185', fontWeight: '800', fontSize: 14, marginBottom: 4, letterSpacing: 0.5 },
  errorText: { color: C.text, fontSize: 13, lineHeight: 20 },

  loaderContainer: { paddingVertical: 40, justifyContent: 'center', alignItems: 'center' },

  historyItem: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1, borderColor: C.line,
    overflow: 'hidden',
    marginBottom: 14,
    boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.35)',
  },
  historyRail: { width: 3 },
  historyBody: { flex: 1, padding: 18 },

  historyHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  dimBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  dimBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  historyMeta: { color: C.textFaint, fontSize: 11, fontWeight: '600' },

  historyText: {
    color: C.text, fontSize: 15, lineHeight: 25,
    fontFamily: SERIF, fontStyle: 'italic', marginBottom: 14,
  },

  sourceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(5, 6, 14, 0.55)',
    borderWidth: 1, borderColor: C.line,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
  },
  sourceGlyph: { color: C.violet, fontSize: 14 },
  sourceTextWrap: { flex: 1 },
  sourceTitle: { color: C.text, fontSize: 12.5, fontWeight: '700' },
  sourceMeta: { color: C.textFaint, fontSize: 11, fontWeight: '500', marginTop: 1 },
  sourceArrow: { color: C.textFaint, fontSize: 14 },
});
