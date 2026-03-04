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

export default function IncidentStep3Screen() {
  const router = useRouter();
  const [requestedBy, setRequestedBy] = useState('');
  const [requestedDetails, setRequestedDetails] = useState('');
  const [creatorDetails, setCreatorDetails] = useState('');
  const [confirmed, setConfirmed] = useState(false);

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
          <Text style={styles.progressLabel}>Step 3: Submission Info</Text>
          <Text style={styles.progressPct}>100%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
        {/* Step dots */}
        <View style={styles.stepDots}>
          {[1, 2, 3, 4].map((s) => (
            <View key={s} style={[styles.dot, s === 3 && styles.dotActive, s < 3 && styles.dotDone]} />
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Requested By Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>Requested By</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name..."
              placeholderTextColor="#94a3b8"
              value={requestedBy}
              onChangeText={setRequestedBy}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Details</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Role, department, contact info..."
              placeholderTextColor="#94a3b8"
              value={requestedDetails}
              onChangeText={setRequestedDetails}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Creator Details Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>Creator Details</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Details</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Your role and additional context..."
              placeholderTextColor="#94a3b8"
              value={creatorDetails}
              onChangeText={setCreatorDetails}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Confirmation Checkbox */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setConfirmed(!confirmed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
            {confirmed && <MaterialIcons name="check" size={14} color="#ffffff" />}
          </View>
          <Text style={styles.checkboxLabel}>
            I confirm that the information provided is accurate and complete to the best of my knowledge.
          </Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, !confirmed && styles.submitBtnDisabled]}
          disabled={!confirmed}
          onPress={() => router.replace('/(app)/form-confirm')}
        >
          <MaterialIcons name="send" size={16} color="#ffffff" />
          <Text style={styles.submitBtnText}>Submit Report</Text>
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

  sectionBlock: { gap: 12 },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0f172a',
  },
  textarea: { minHeight: 80 },

  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  checkboxLabel: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 19 },

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
  submitBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: PRIMARY, borderRadius: 9999, paddingVertical: 14,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
