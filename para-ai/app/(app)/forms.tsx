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
import BottomNav from '@/components/BottomNav';

const PRIMARY = '#0a6fbd';

type FormItem = {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  desc: string;
  color: string;
  bg: string;
  route?: string;
};

const FORMS: FormItem[] = [
  {
    id: '1', icon: 'description', title: 'Ambulance Call Report (ACR)',
    desc: 'Patient care documentation', color: PRIMARY, bg: `${PRIMARY}15`,
  },
  {
    id: '2', icon: 'report-problem', title: 'Occurrence Report',
    desc: 'Incident and event reporting', color: '#d97706', bg: '#fef3c7',
    route: '/(app)/incident/step1',
  },
  {
    id: '3', icon: 'child-care', title: 'Teddy Bear Tracking Form',
    desc: 'Pediatric comfort item tracking', color: '#7c3aed', bg: '#ede9fe',
  },
  {
    id: '4', icon: 'medication', title: 'Narcotics Log',
    desc: 'Controlled substance tracking', color: '#0d9488', bg: '#ccfbf1',
  },
  {
    id: '5', icon: 'directions-car', title: 'Vehicle Inspection',
    desc: 'Daily unit check report', color: '#475569', bg: '#f1f5f9',
  },
  {
    id: '6', icon: 'local-hospital', title: 'Patient Refusal Form',
    desc: 'Refusal of treatment documentation', color: '#ef4444', bg: '#fee2e2',
  },
];

export default function FormsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Forms</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <MaterialIcons name="search" size={24} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.listLabel}>AVAILABLE FORMS</Text>

        {FORMS.map((form) => (
          <TouchableOpacity key={form.id} style={styles.formRow} activeOpacity={0.7} onPress={() => form.route && router.push(form.route as any)}>
            <View style={[styles.formIcon, { backgroundColor: form.bg }]}>
              <MaterialIcons name={form.icon} size={22} color={form.color} />
            </View>
            <View style={styles.formText}>
              <Text style={styles.formTitle}>{form.title}</Text>
              <Text style={styles.formDesc}>{form.desc}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#cbd5e1" />
          </TouchableOpacity>
        ))}

        <View style={{ height: 16 }} />
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7f8' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },

  listLabel: {
    fontSize: 10, fontWeight: '700', color: '#94a3b8',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4, paddingHorizontal: 2,
  },

  formRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#ffffff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  formIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  formText: { flex: 1, gap: 2 },
  formTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  formDesc: { fontSize: 12, color: '#64748b' },
});
