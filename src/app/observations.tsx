import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, Pressable, ScrollView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE, fetchWithTimeout } from '@/constants/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, getDimensionMeta, type DimensionKey } from '@/constants/theme';
import { Card } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { ErrorCard } from '@/components/ui/error-card';
import { DimensionBadge } from '@/components/ui/dimension-badge';

const DIMENSION_KEYS: DimensionKey[] = ['THEORETICAL', 'METHODOLOGICAL', 'EMPIRICAL', 'ANALYTICAL'];

/* Copy de apoyo del selector — no es parte del mapeo dimensión→color (eso vive
   en getDimensionMeta, theme.ts), solo texto de contexto para esta pantalla. */
const DIMENSION_HINTS: Record<DimensionKey, string> = {
  THEORETICAL: 'Frameworks & constructs',
  METHODOLOGICAL: 'Design & instruments',
  EMPIRICAL: 'Evidence & data',
  ANALYTICAL: 'Interpretation & critique',
};

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
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>New observation</Text>

          <TextInput
            style={styles.inputArea}
            multiline
            placeholder="Distill what this evidence means for your thesis…"
            placeholderTextColor={Colors.dark.textFaint}
            value={observation}
            onChangeText={setObservation}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{observation.length} chars</Text>

          <Text style={styles.dimensionLabel}>DIMENSION — the final human judgment</Text>
          <View style={styles.dimensionSelector}>
            {DIMENSION_KEYS.map(key => (
              <DimensionBadge
                key={key}
                dimension={key}
                variant="picker"
                selected={dimension === key}
                hint={DIMENSION_HINTS[key]}
                onPress={() => setDimension(key)}
              />
            ))}
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
        </Card>

        {/* ── Historial relacional ───────────────────────────────── */}
        <Text style={styles.historyTitle}>RECENT INSIGHTS</Text>

        {networkError && <ErrorCard message={networkError} style={styles.errorCard} />}

        {loading ? (
          <Loader fill={false} />
        ) : (
          history.map(obs => {
            const meta = getDimensionMeta(obs.dimension);
            return (
              <View key={obs.id} style={styles.historyItem}>
                <View style={[styles.historyRail, { backgroundColor: meta.color, boxShadow: `0px 0px 10px ${meta.color}` }]} />
                <View style={styles.historyBody}>

                  <View style={styles.historyHeaderRow}>
                    <DimensionBadge dimension={obs.dimension} />
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
  container: { flex: 1, backgroundColor: Colors.dark.background },

  ambientHalo: {
    position: 'absolute',
    top: -180, left: -80, right: -80, height: 340,
    borderRadius: 340,
    backgroundColor: 'rgba(34, 118, 148, 0.13)',
    transform: [{ scaleX: 1.4 }],
  },

  headerContainer: { paddingHorizontal: 24, paddingBottom: 18, paddingTop: 8 },
  overline: { fontSize: 11, fontWeight: '800', color: Colors.dark.cyan, letterSpacing: 4, marginBottom: 6 },
  header: {
    fontSize: 44, color: Colors.dark.text, fontFamily: Fonts.serif,
    fontWeight: Platform.OS === 'android' ? 'normal' : '700',
    letterSpacing: -0.5, lineHeight: 50,
  },
  subtitle: { fontSize: 13, color: Colors.dark.textDim, fontWeight: '500', marginTop: 6, letterSpacing: 0.3 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 80, paddingTop: 10 },

  /* Editor glass. */
  card: {
    padding: 22,
    marginBottom: 32,
  },
  cardTitle: { color: Colors.dark.text, fontSize: 22, fontFamily: Fonts.serif, marginBottom: 16 },

  inputArea: {
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 14,
    borderWidth: 1, borderColor: Colors.dark.border,
    color: Colors.dark.text,
    padding: 16,
    minHeight: 140,
    fontSize: 16, lineHeight: 26,
    fontFamily: Fonts.serif,               // se escribe con la misma voz tipográfica con la que se lee
    marginBottom: 6,
  },
  charCount: { color: Colors.dark.textFaint, fontSize: 11, fontWeight: '600', textAlign: 'right', marginBottom: 18 },

  dimensionLabel: {
    color: Colors.dark.textDim, fontSize: 10, fontWeight: '900',
    marginBottom: 12, letterSpacing: 2.5,
  },
  dimensionSelector: { gap: 10, marginBottom: 22 },

  saveButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1 },
  saveButtonEnabled: {
    backgroundColor: Colors.dark.violetDeep,
    borderColor: 'rgba(167, 139, 250, 0.6)',
    boxShadow: '0px 6px 24px rgba(124, 92, 224, 0.45)',
  },
  saveButtonDisabled: { backgroundColor: 'transparent', borderColor: Colors.dark.border },
  saveButtonText: { color: Colors.dark.textFaint, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  saveButtonTextEnabled: { color: '#FFFFFF' },

  /* Historial relacional. */
  historyTitle: {
    color: Colors.dark.textDim, fontSize: 11, fontWeight: '900',
    marginBottom: 14, letterSpacing: 3, paddingHorizontal: 4,
  },

  errorCard: { marginBottom: 16 },

  historyItem: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 18,
    borderWidth: 1, borderColor: Colors.dark.border,
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
  historyMeta: { color: Colors.dark.textFaint, fontSize: 11, fontWeight: '600' },

  historyText: {
    color: Colors.dark.text, fontSize: 15, lineHeight: 25,
    fontFamily: Fonts.serif, fontStyle: 'italic', marginBottom: 14,
  },

  sourceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(5, 6, 14, 0.55)',
    borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
  },
  sourceGlyph: { color: Colors.dark.violet, fontSize: 14 },
  sourceTextWrap: { flex: 1 },
  sourceTitle: { color: Colors.dark.text, fontSize: 12.5, fontWeight: '700' },
  sourceMeta: { color: Colors.dark.textFaint, fontSize: 11, fontWeight: '500', marginTop: 1 },
  sourceArrow: { color: Colors.dark.textFaint, fontSize: 14 },
});
