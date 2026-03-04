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


const PRIMARY = '#0a6fbd';

type CheckItem = {
  id: string;
  title: string;
  status: 'verified' | 'pending' | 'action-required-amber' | 'action-required-red';
  route?: string;
};

const ITEMS: CheckItem[] = [
  { id: '1', title: 'Narcotics Log', status: 'verified' },
  { id: '2', title: 'Vehicle Inspection', status: 'pending' },
  { id: '3', title: 'ACR Completion', status: 'action-required-amber', route: '/(app)/compliance-acr' },
  { id: '4', title: "CERT-DL Driver's License", status: 'action-required-red', route: '/(app)/compliance-dl' },
  { id: '5', title: 'Continuing Education', status: 'verified' },
  { id: '6', title: 'Uniform Compliance', status: 'verified' },
];

const STATUS_CONFIG = {
  verified: { label: 'Verified', color: '#10b981', bg: '#d1fae5', icon: 'check-circle' as const },
  pending: { label: 'Pending', color: '#64748b', bg: '#f1f5f9', icon: 'radio-button-unchecked' as const },
  'action-required-amber': { label: 'Action Required', color: '#d97706', bg: '#fef3c7', icon: 'warning' as const },
  'action-required-red': { label: 'Action Required', color: '#ef4444', bg: '#fee2e2', icon: 'cancel' as const },
};

export default function FormsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.replace('/(app)')}>
          <MaterialIcons name="arrow-back" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shift Checklist</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <MaterialIcons name="more-vert" size={24} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* Progress Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressCardRow}>
          <View style={styles.progressCardIcon}>
            <MaterialIcons name="assignment" size={20} color="#ffffff" />
          </View>
          <View style={styles.progressCardText}>
            <Text style={styles.progressCardLabel}>Daily Compliance</Text>
            <Text style={styles.progressCardSub}>Shift checklist review</Text>
          </View>
          <Text style={styles.progressCardPct}>50%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
        <Text style={styles.progressNote}>3 of 6 items completed</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.listLabel}>CHECKLIST ITEMS</Text>

        {ITEMS.map((item) => {
          const cfg = STATUS_CONFIG[item.status];
          return (
            <TouchableOpacity key={item.id} style={styles.checkRow} activeOpacity={0.7} onPress={() => item.route && router.push(item.route)}>
              {/* Left icon circle */}
              <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
                <MaterialIcons name={cfg.icon} size={20} color={cfg.color} />
              </View>

              {/* Title */}
              <Text style={styles.checkTitle}>{item.title}</Text>

              {/* Status pill */}
              <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>

              <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed footer button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.ackBtn}>
          <MaterialIcons name="check-circle" size={20} color="#ffffff" />
          <Text style={styles.ackBtnText}>Acknowledge &amp; Start Shift</Text>
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

  progressCard: {
    margin: 16, backgroundColor: '#ffffff', borderRadius: 14,
    padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  progressCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressCardIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
  progressCardText: { flex: 1 },
  progressCardLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  progressCardSub: { fontSize: 12, color: '#64748b' },
  progressCardPct: { fontSize: 22, fontWeight: '800', color: PRIMARY },
  progressTrack: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 9999 },
  progressNote: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  listLabel: {
    fontSize: 10, fontWeight: '700', color: '#94a3b8',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 2,
  },

  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff', borderRadius: 9999,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  checkTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: '#0f172a' },
  statusPill: { borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  footer: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  ackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 9999, paddingVertical: 14,
  },
  ackBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
    paddingTop: 10, paddingBottom: 16,
  },
  navItem: { alignItems: 'center', gap: 3 },
  navLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  navLabelActive: { color: PRIMARY },
});
