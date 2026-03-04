import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';


const PRIMARY = '#0a6fbd';

const STEPS = [
  { icon: 'badge' as const, title: 'Verify License on File', desc: 'Confirm current DL is uploaded to your profile' },
  { icon: 'calendar-today' as const, title: 'Check Expiry Date', desc: 'Ensure license is valid and not expired' },
  { icon: 'local-hospital' as const, title: 'Medical Certification', desc: 'Attach DOT medical examiner certificate' },
  { icon: 'fact-check' as const, title: 'Endorsement Check', desc: 'Confirm ambulance/emergency vehicle endorsement' },
  { icon: 'upload-file' as const, title: 'Upload Renewal', desc: 'If expired, upload renewed license document' },
];

export default function ComplianceDLScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compliance Check</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <MaterialIcons name="more-vert" size={24} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.titleRow}>
            <View style={styles.titleIcon}>
              <MaterialIcons name="directions-car" size={24} color="#ef4444" />
            </View>
            <Text style={styles.statusCardTitle}>Driver's License Validity</Text>
          </View>

          <View style={styles.certBadge}>
            <Text style={styles.certBadgeText}>CERT-DL</Text>
          </View>

          <View style={styles.alertRow}>
            <MaterialIcons name="error" size={18} color="#ef4444" />
            <Text style={styles.alertLabel}>BLOCKING — RESOLVE BEFORE SHIFT</Text>
          </View>

          <Text style={styles.statusDesc}>
            Your driver's license on file has expired or could not be verified. Per EMS regulations, a valid driver's license with emergency vehicle endorsement is required before operating any unit.
          </Text>

          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>License #</Text>
              <Text style={styles.detailValue}>DL-8847291</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Expiry</Text>
              <Text style={[styles.detailValue, { color: '#ef4444' }]}>2026-02-28</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={[styles.detailValue, { color: '#ef4444' }]}>EXPIRED</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Endorsement</Text>
              <Text style={styles.detailValue}>Class E / EVO</Text>
            </View>
          </View>

          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>ALERT RED</Text>
          </View>
        </View>

        {/* Steps to Resolve */}
        <Text style={styles.sectionLabel}>Steps to resolve</Text>

        {STEPS.map((step, i) => (
          <TouchableOpacity key={i} style={styles.stepRow} activeOpacity={0.7}>
            <View style={styles.stepIcon}>
              <MaterialIcons name={step.icon} size={22} color={PRIMARY} />
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
          </TouchableOpacity>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.uploadBtn}>
          <MaterialIcons name="cloud-upload" size={20} color="#ffffff" />
          <Text style={styles.uploadBtnText}>Upload Renewed License</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ackBtn} onPress={() => router.back()}>
          <Text style={styles.ackBtnText}>Acknowledge</Text>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  // Status card
  statusCard: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 20, gap: 12,
    borderWidth: 1, borderColor: '#fecaca',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fee2e2',
    alignItems: 'center', justifyContent: 'center',
  },
  statusCardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', flex: 1 },
  certBadge: {
    alignSelf: 'flex-start', backgroundColor: '#fee2e2', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  certBadgeText: { fontSize: 11, fontWeight: '800', color: '#991b1b', letterSpacing: 1 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertLabel: { fontSize: 12, fontWeight: '800', color: '#ef4444', letterSpacing: 0.5 },
  statusDesc: { fontSize: 14, color: '#475569', lineHeight: 20 },

  // Detail grid
  detailGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 0,
    borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12,
  },
  detailItem: { width: '50%', paddingVertical: 6 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 2 },

  alertBadge: {
    alignSelf: 'flex-start', backgroundColor: '#fee2e2', borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  alertBadgeText: { fontSize: 11, fontWeight: '800', color: '#ef4444', letterSpacing: 1 },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 4,
  },

  // Steps
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#ffffff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  stepIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${PRIMARY}15`, alignItems: 'center', justifyContent: 'center',
  },
  stepText: { flex: 1, gap: 2 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  stepDesc: { fontSize: 12, color: '#64748b' },

  // Footer
  footer: {
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 9999, paddingVertical: 14,
  },
  uploadBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  ackBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff', borderRadius: 9999, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  ackBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' },
});
