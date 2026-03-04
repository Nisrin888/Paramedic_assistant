import { useState } from 'react';
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
const TEAL = '#0d9488';

type Tab = 'past' | 'upcoming';

type ShiftItem = {
  id: string;
  month: string;
  day: string;
  location: string;
  unit: string;
  status: 'completed' | 'current';
};

const SHIFTS: ShiftItem[] = [
  { id: '1', month: 'OCT', day: '28', location: 'Main St Station', unit: 'Unit # 1122', status: 'current' },
  { id: '2', month: 'OCT', day: '24', location: 'Main St Station', unit: 'Unit # 1122', status: 'completed' },
  { id: '3', month: 'OCT', day: '20', location: 'River District Base', unit: 'Unit # 0934', status: 'completed' },
  { id: '4', month: 'OCT', day: '16', location: 'Main St Station', unit: 'Unit # 1122', status: 'completed' },
  { id: '5', month: 'OCT', day: '12', location: 'Eastside Dispatch', unit: 'Unit # 0512', status: 'completed' },
];

export default function RecentScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('past');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.replace('/(app)')}>
          <MaterialIcons name="arrow-back" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shift History</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <MaterialIcons name="filter-list" size={24} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>18</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: TEAL }]}>14</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>4</Text>
          <Text style={styles.statLabel}>Next</Text>
        </View>
      </View>

      {/* Segmented Toggle */}
      <View style={styles.toggleWrap}>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'past' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[styles.toggleBtnText, activeTab === 'past' && styles.toggleBtnTextActive]}>
              Past Shifts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'upcoming' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.toggleBtnText, activeTab === 'upcoming' && styles.toggleBtnTextActive]}>
              Upcoming
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SHIFTS.map((shift) => (
          <TouchableOpacity key={shift.id} style={styles.shiftCard} activeOpacity={0.8}>
            {/* Date Box */}
            <View style={[styles.dateBox, shift.status === 'current' ? styles.dateBoxCurrent : styles.dateBoxDone]}>
              <Text style={styles.dateMonth}>{shift.month}</Text>
              <Text style={styles.dateDay}>{shift.day}</Text>
            </View>

            {/* Info */}
            <View style={styles.shiftInfo}>
              <Text style={styles.shiftLocation}>{shift.location}</Text>
              <View style={styles.shiftUnitRow}>
                <MaterialIcons name="local-shipping" size={13} color="#94a3b8" />
                <Text style={styles.shiftUnit}>{shift.unit}</Text>
              </View>
            </View>

            {/* Badge */}
            <View style={[styles.badge, shift.status === 'current' ? styles.badgeCurrent : styles.badgeDone]}>
              <Text style={[styles.badgeText, shift.status === 'current' ? styles.badgeTextCurrent : styles.badgeTextDone]}>
                {shift.status === 'current' ? 'Current' : 'Completed'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Bottom Nav */}
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

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 40, backgroundColor: '#e2e8f0' },

  toggleWrap: { paddingHorizontal: 16, paddingVertical: 14 },
  toggle: {
    flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 9999,
    padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 9999, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  toggleBtnTextActive: { color: PRIMARY },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  shiftCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#ffffff', borderRadius: 14,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  dateBox: { width: 52, borderRadius: 10, alignItems: 'center', paddingVertical: 8, flexShrink: 0 },
  dateBoxCurrent: { backgroundColor: `${PRIMARY}1A` },
  dateBoxDone: { backgroundColor: `${TEAL}1A` },
  dateMonth: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 },
  dateDay: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  shiftInfo: { flex: 1, gap: 4 },
  shiftLocation: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  shiftUnitRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shiftUnit: { fontSize: 12, color: '#94a3b8' },
  badge: { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 5 },
  badgeCurrent: { backgroundColor: `${PRIMARY}1A` },
  badgeDone: { backgroundColor: `${TEAL}1A` },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextCurrent: { color: PRIMARY },
  badgeTextDone: { color: TEAL },

  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
    paddingTop: 10, paddingBottom: 16,
  },
  navItem: { alignItems: 'center', gap: 3 },
  navLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  navLabelActive: { color: PRIMARY },
});
