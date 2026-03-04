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
  { icon: 'description' as const, title: 'Open Digital ACR Form', desc: 'Access the Para AI dashboard' },
  { icon: 'person' as const, title: 'Hit Patient Demographics', desc: 'Verify ID, DOB, and medical history' },
  { icon: 'assignment' as const, title: 'Document Assessment', desc: 'Record vitals and physical findings' },
  { icon: 'medical-services' as const, title: 'Record Treatment Plan', desc: 'Detail meds administered & interventions' },
  { icon: 'send' as const, title: 'Final Submission', desc: 'Review and sign for compliance' },
];

export default function ComplianceACRScreen() {
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
          <Text style={styles.statusCardTitle}>ACR Completion Status</Text>

          <View style={styles.alertRow}>
            <MaterialIcons name="warning" size={18} color="#d97706" />
            <Text style={styles.alertLabel}>BLOCKING — MUST RESOLVE</Text>
          </View>

          <Text style={styles.statusDesc}>
            Urgent action required to maintain compliance standards. The Ambulance Call Report (ACR) for Patient Case #4829-B is currently incomplete.
          </Text>

          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>ALERT AMBER</Text>
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
        <TouchableOpacity style={styles.resolveBtn}>
          <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
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
    borderWidth: 1, borderColor: '#fde68a',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statusCardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertLabel: { fontSize: 12, fontWeight: '800', color: '#d97706', letterSpacing: 0.5 },
  statusDesc: { fontSize: 14, color: '#475569', lineHeight: 20 },
  alertBadge: {
    alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  alertBadgeText: { fontSize: 11, fontWeight: '800', color: '#d97706', letterSpacing: 1 },

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
  resolveBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: PRIMARY, borderRadius: 9999, paddingVertical: 14,
  },
  resolveBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  ackBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff', borderRadius: 9999, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  ackBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' },
});
