import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PRIMARY = '#0a6fbd';

export default function IncidentStep2Screen() {
  const router = useRouter();
  const [observation, setObservation] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [suggestedResolution, setSuggestedResolution] = useState('');
  const [managementNotes, setManagementNotes] = useState('');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EMS Occurrence Report</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Step 2: Observation & Action</Text>
          <Text style={styles.progressPct}>50%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
        {/* Step dots */}
        <View style={styles.stepDots}>
          {[1, 2, 3, 4].map((s) => (
            <View key={s} style={[styles.dot, s === 2 && styles.dotActive, s < 2 && styles.dotDone]} />
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Observation / Description */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Observation / Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Describe what you observed..."
            placeholderTextColor="#94a3b8"
            value={observation}
            onChangeText={setObservation}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Action Taken */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Action Taken</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="What immediate actions were taken?"
            placeholderTextColor="#94a3b8"
            value={actionTaken}
            onChangeText={setActionTaken}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Suggested Resolution */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Suggested Resolution</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Any recommended follow-up actions?"
            placeholderTextColor="#94a3b8"
            value={suggestedResolution}
            onChangeText={setSuggestedResolution}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Management Notes */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Management Notes</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Additional notes for management..."
            placeholderTextColor="#94a3b8"
            value={managementNotes}
            onChangeText={setManagementNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => router.push('/(app)/incident/step3')}
        >
          <Text style={styles.nextBtnText}>Next Step →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7f8' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },

  progressSection: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 14, gap: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  progressPct: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  progressTrack: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 9999 },
  stepDots: { flexDirection: 'row', gap: 6, alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' },
  dotActive: { width: 24, backgroundColor: PRIMARY },
  dotDone: { backgroundColor: '#10b981' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0f172a',
  },
  textarea: { minHeight: 100 },

  footer: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  backBtn: {
    flex: 1, borderRadius: 9999, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  backBtnText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  nextBtn: {
    flex: 2, backgroundColor: PRIMARY, borderRadius: 9999, paddingVertical: 14, alignItems: 'center',
  },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
