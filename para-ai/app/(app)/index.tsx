import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { API_URL } from '@/services/auth';
import BottomNav from '@/components/BottomNav';

const PRIMARY = '#0a6fbd';

type ShiftData = {
  shift_id: string;
  station: string;
  start_time: string;
  end_time: string;
  vehicle_number: string;
  vehicle_description: string;
  service: string;
  partner: { name: string; badge_number: string } | null;
};

const PROFILE_IMG = {
  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpDpJDP6FGQJNYK9SjhX_e_m9HiYqOzveOJsGRSTwRaccnpvVSkcwmTyaZmTrc4bfNp0cJa0fwR2Za-AcEA2oGdzhovEfDeCodu8dokqeF4R2oDnm6-bsIasf5VmF_clW1-ruA02OAIInbRkW4atwCJrpaaf9nVS2puVAsm75oT-v5FhDWFB2i9xjvVGHBHApnTmsw_IrpVihqAqQOV__uQblgExJGgViPNiBE6itYiGe6MOF0i42V6T7u272kckjlGB0a2xv267g',
};

function formatTimeLeft(): string {
  const now = new Date();
  const endToday = new Date(now);
  endToday.setHours(19, 0, 0, 0); // 7 PM today
  const startToday = new Date(now);
  startToday.setHours(7, 0, 0, 0); // 7 AM today

  if (now < startToday) return 'Shift starts at 7:00 AM';
  if (now >= endToday) return 'Shift ended';

  const diff = endToday.getTime() - now.getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `Shift ends in ${h}h ${m}m`;
  return `Shift ends in ${m}m`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { user, token, signOut } = useAuth();
  const router = useRouter();
  const [shift, setShift] = useState<ShiftData | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);

  const fetchShift = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/shifts/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setShift(await res.json());
    } catch {
      // silent — will show fallback
    } finally {
      setShiftLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchShift(); }, [fetchShift]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const displayName = user?.persona?.preferred_name ?? user?.first_name ?? 'there';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.homeIconBtn}>
            <MaterialCommunityIcons name="robot" size={20} color="#ffffff" />
          </View>
          <Text style={styles.brandName}>Para AI</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notifBtn} onPress={handleSignOut}>
            <MaterialIcons name="notifications" size={24} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarWrapper} onPress={() => router.push('/profile')}>
            <Image source={PROFILE_IMG} style={styles.avatar} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>{getGreeting()}, Paramedic {displayName}</Text>
        </View>

        {/* Active Shift Card */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/recent')}>
          <View style={styles.shiftCard}>
            {shiftLoading ? (
              <ActivityIndicator color="#ffffff" style={{ paddingVertical: 30 }} />
            ) : shift ? (
              <>
                <Text style={styles.shiftLabel}>ACTIVE SHIFT</Text>
                <View style={styles.shiftMainRow}>
                  <View style={styles.shiftInfo}>
                    <Text style={styles.stationName}>STATION: {shift.station.toUpperCase()}</Text>
                    <View style={styles.shiftDetailRow}>
                      <MaterialIcons name="local-shipping" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.shiftDetailText}>UNIT #{shift.vehicle_number}</Text>
                    </View>
                    {shift.partner && (
                      <View style={styles.shiftDetailRow}>
                        <MaterialIcons name="person" size={14} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.shiftDetailText}>PARTNER: {shift.partner.name}</Text>
                      </View>
                    )}
                    <View style={styles.shiftTimePill}>
                      <MaterialIcons name="schedule" size={13} color={PRIMARY} />
                      <Text style={styles.shiftTimePillText}>{formatTimeLeft()}</Text>
                    </View>
                  </View>
                  <View style={styles.shiftIconBtn}>
                    <MaterialIcons name="open-in-new" size={20} color="#ffffff" />
                  </View>
                </View>
              </>
            ) : (
              <Text style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', paddingVertical: 20, fontSize: 14 }}>
                No active shift
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Checklist Summary */}
        <TouchableOpacity style={styles.section} activeOpacity={0.7} onPress={() => router.push('/checklist')}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionTitle}>Checklist Summary</Text>
            <View style={styles.completeBadge}>
              <Text style={styles.completeBadgeText}>3/5 COMPLETE</Text>
            </View>
          </View>

          {/* Driver's License — red (most severe) */}
          <View style={styles.checkRow}>
            <View style={styles.checkRowLeft}>
              <View style={[styles.checkIcon, { backgroundColor: '#fee2e2' }]}>
                <MaterialIcons name="cancel" size={18} color="#ef4444" />
              </View>
              <Text style={styles.checkRowText}>Driver's License</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}>
              <Text style={[styles.statusBadgeText, { color: '#ef4444' }]}>ACTION{'\n'}REQUIRED</Text>
            </View>
          </View>

          {/* Overdue ACRs — amber */}
          <View style={styles.checkRow}>
            <View style={styles.checkRowLeft}>
              <View style={[styles.checkIcon, { backgroundColor: '#fef3c7' }]}>
                <MaterialIcons name="warning" size={18} color="#d97706" />
              </View>
              <Text style={styles.checkRowText}>3 overdue ACRs</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
              <Text style={[styles.statusBadgeText, { color: '#d97706' }]}>ACTION{'\n'}REQUIRED</Text>
            </View>
          </View>

          {/* Vehicle Inspection — pending */}
          <View style={styles.checkRow}>
            <View style={styles.checkRowLeft}>
              <View style={[styles.checkIcon, { backgroundColor: '#f1f5f9' }]}>
                <MaterialIcons name="directions-car" size={18} color="#64748b" />
              </View>
              <Text style={styles.checkRowText}>Vehicle Inspection</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9' }]}>
              <MaterialIcons name="radio-button-unchecked" size={12} color="#64748b" />
              <Text style={[styles.statusBadgeText, { color: '#64748b' }]}>PENDING</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Outstanding Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outstanding Items</Text>

          <View style={styles.outstandingCard}>
            <View style={[styles.outstandingIcon, { backgroundColor: '#fee2e2' }]}>
              <MaterialIcons name="warning" size={22} color="#ef4444" />
            </View>
            <View style={styles.outstandingBody}>
              <Text style={styles.outstandingTitle}>Checklist</Text>
              <Text style={styles.outstandingOverdue}>2h overdue</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
          </View>

          <View style={styles.outstandingCard}>
            <View style={[styles.outstandingIcon, { backgroundColor: '#fef3c7' }]}>
              <MaterialIcons name="warning" size={22} color="#d97706" />
            </View>
            <View style={styles.outstandingBody}>
              <Text style={styles.outstandingTitle}>Occurrence Report</Text>
              <Text style={styles.outstandingDesc}>14:32 Today</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
          </View>
        </View>
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/chat')}>
        <MaterialCommunityIcons name="robot" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* ── Bottom Nav ── */}
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7f8' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: 18, fontWeight: '700', color: '#0f172a', letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarWrapper: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${PRIMARY}20`, borderWidth: 2, borderColor: `${PRIMARY}33`,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 110, gap: 24 },

  // Greeting
  greetingSection: { gap: 4 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },

  // Active Shift Card (blue)
  shiftCard: {
    backgroundColor: PRIMARY, borderRadius: 16, padding: 18, gap: 10,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  shiftLabel: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  shiftMainRow: { flexDirection: 'row', alignItems: 'flex-start' },
  shiftInfo: { flex: 1, gap: 6 },
  stationName: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  shiftDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shiftDetailText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  shiftTimePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff', borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 5,
    marginTop: 4,
  },
  shiftTimePillText: { fontSize: 11, fontWeight: '700', color: PRIMARY },
  shiftIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Section
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  sectionLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  completeBadge: {
    backgroundColor: `${PRIMARY}15`, borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  completeBadgeText: { fontSize: 11, fontWeight: '700', color: PRIMARY },

  // Checklist rows
  checkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  checkRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  checkIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  checkRowText: { fontSize: 14, fontWeight: '500', color: '#0f172a' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // Outstanding Items
  outstandingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#ffffff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  outstandingIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  outstandingBody: { flex: 1, gap: 2 },
  outstandingTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  outstandingOverdue: { fontSize: 13, fontWeight: '500', color: '#ef4444' },
  outstandingDesc: { fontSize: 13, color: '#64748b' },

  // FAB
  fab: {
    position: 'absolute', bottom: 80, right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
});
