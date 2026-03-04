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

const OCCURRENCE_TYPES = [
  'Medical Emergency',
  'Vehicle Incident',
  'Near Miss',
  'Equipment Failure',
  'Patient Fall',
  'Other',
];

export default function IncidentStep1Screen() {
  const router = useRouter();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [callNumber, setCallNumber] = useState('');
  const [occurrenceType, setOccurrenceType] = useState('');
  const [description, setDescription] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EMS Occurrence Report</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Step 1: Incident Basics</Text>
          <Text style={styles.progressPct}>20%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '20%' }]} />
        </View>
        {/* Step dots */}
        <View style={styles.stepDots}>
          {[1, 2, 3, 4].map((s) => (
            <View key={s} style={[styles.dot, s === 1 && styles.dotActive]} />
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date & Time row */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#94a3b8"
              value={date}
              onChangeText={setDate}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Time</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM"
              placeholderTextColor="#94a3b8"
              value={time}
              onChangeText={setTime}
            />
          </View>
        </View>

        {/* Call Number */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Call Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. CN-88291"
            placeholderTextColor="#94a3b8"
            value={callNumber}
            onChangeText={setCallNumber}
          />
        </View>

        {/* Occurrence Type */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Occurrence Type</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowTypeDropdown(!showTypeDropdown)}
          >
            <Text style={[styles.dropdownText, !occurrenceType && styles.dropdownPlaceholder]}>
              {occurrenceType || 'Select type...'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#94a3b8" />
          </TouchableOpacity>
          {showTypeDropdown && (
            <View style={styles.dropdownList}>
              {OCCURRENCE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={styles.dropdownItem}
                  onPress={() => { setOccurrenceType(t); setShowTypeDropdown(false); }}
                >
                  <Text style={styles.dropdownItemText}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Brief Description */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Brief Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Briefly describe what happened..."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => router.push('/(app)/incident/step2')}
        >
          <Text style={styles.nextBtnText}>Next →</Text>
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

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1, gap: 6 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0f172a',
  },
  textarea: { minHeight: 100 },

  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  dropdownText: { fontSize: 14, color: '#0f172a' },
  dropdownPlaceholder: { color: '#94a3b8' },
  dropdownList: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, marginTop: -8, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownItemText: { fontSize: 14, color: '#334155' },

  footer: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  cancelBtn: {
    flex: 1, borderRadius: 9999, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  nextBtn: {
    flex: 2, backgroundColor: PRIMARY, borderRadius: 9999, paddingVertical: 14, alignItems: 'center',
  },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
