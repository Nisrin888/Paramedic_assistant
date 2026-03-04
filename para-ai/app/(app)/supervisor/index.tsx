import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

const PRIMARY = '#0a6fbd';
const BG = '#f5f7f8';

const AVATARS = {
  sam: 'https://lh3.googleusercontent.com/aida-public/AB6AXuASfeKu80wgpG2yl1xlicQBgKcCN-fiYFHOTCJELXibcIcbzniJBlnFyswHZqNAfR5WuyKdZW3jHtg81hD5IcLc0vJDf1jwQDBFZvndHkVfNxp6KiO5CUBWszA75JorMix8KoI5D4Q8upi-erKP1_AxvnOXriVHLCbycyFiGmKhoIgyMI3rtT7vmVLVvoFa4ZueLtmouTgr6seXwmdIhfAv9ac2fhz_nlfHc-TeG8Cz7HAR0DwLO2DSIfQG2wJdod0e8xQs8ts_xCM',
  jordan:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuASzLeFMv4zbe47OKhhY-pEAptP5ylX9CjiTb3H4OWyFlxHXGEsF5ZAzt-SCqat95qmCFLQk28Lq58jlk4AegD6_vLvgyLtfTKnClVQhTGgnkic0kYvdhywfywkORZAvFC9Hi3bLDeb9fxDQ7t_aSe3l2Z1LZ9JJA-0Qwc8--ovE9F624wZc4-NZXjvpe6qOKbtvlvZQNZH2qFnJ2sGwfYt4MJXgIk6zBIq5Mfe5TCQR6cXCKyN1sKy9on7xe7w0rag95jrxaciwaA',
  alex: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXJAY9tBoEjXEOSfT3AdxprxFAM1PiZJNzhFBrDz6H69dtEyFmxEW-HSeviiaAvKIujTud2_4s9D1mMS-IKZ1nlFU9tPRm83S9JCdqQ2VnNGaW7diLMys3M68B8Mq2POZ81w7xQr6qPAxPa66qyyypwhm1LSeCV1pz5KhPKdYK-mUSvm27yuFAzECNNtrrob7tyfIHNyqLpCDh1m9Q-dWXo-lmdcx9P5-1w2Smvl9e8aXXNizuBl3JWqmVQog6NIYb68ls3-SuhLc',
};

type NavTab = 'Team' | 'Reports' | 'Compliance' | 'Stats';

export default function SupervisorHomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('Team');

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarRing}>
            <Image source={{ uri: AVATARS.sam }} style={styles.samAvatar} />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerGreeting}>Hey Sam (Chief)</Text>
            <Text style={styles.headerSub}>Station 42 • On Duty</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialIcons name="search" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Team Overview Section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>TEAM OVERVIEW</Text>
          <TouchableOpacity style={styles.viewMapBtn}>
            <MaterialIcons name="map" size={14} color={PRIMARY} />
            <Text style={styles.viewMapText}>View Map</Text>
          </TouchableOpacity>
        </View>

        {/* Jordan Riley Card */}
        <View style={styles.card}>
          <Image source={{ uri: AVATARS.jordan }} style={styles.paraAvatar} />
          <View style={styles.cardInfo}>
            <Text style={styles.paraName}>Jordan Riley</Text>
            <View style={styles.statusRow}>
              <View style={styles.greenDot} />
              <Text style={styles.paraStatus}>On Shift • Unit A-102</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.chatBtn}>
            <MaterialIcons name="chat-bubble-outline" size={20} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Alex Chen Card */}
        <View style={styles.card}>
          <Image source={{ uri: AVATARS.alex }} style={styles.paraAvatar} />
          <View style={styles.cardInfo}>
            <Text style={styles.paraName}>Alex Chen</Text>
            <View style={styles.statusRow}>
              <View style={styles.greenDot} />
              <Text style={styles.paraStatus}>On Shift • Unit B-204</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.chatBtn}>
            <MaterialIcons name="chat-bubble-outline" size={20} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Pending Reports Section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>PENDING REPORTS</Text>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>2 NEW</Text>
          </View>
        </View>

        {/* Report Card: Near Miss */}
        <View style={styles.card}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Occurrence - Near Miss</Text>
            <View style={styles.highPriorityBadge}>
              <Text style={styles.highPriorityText}>High Priority</Text>
            </View>
          </View>
          <Text style={styles.reportMeta}>14m ago</Text>
          <Text style={styles.reportDesc} numberOfLines={2}>
            A near-miss medication error was identified during the handoff. The wrong dosage of
            Heparin was prepared before intervention.
          </Text>
          <View style={styles.reportFooter}>
            <Image source={{ uri: AVATARS.jordan }} style={styles.reportAvatar} />
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => router.push('/(app)/supervisor/review')}
            >
              <Text style={styles.reviewBtnText}>Review →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Report Card: Routine */}
        <View style={styles.card}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Teddy Bear - Patient Comfort</Text>
            <View style={styles.routineBadge}>
              <Text style={styles.routineText}>Routine</Text>
            </View>
          </View>
          <Text style={styles.reportMeta}>1h ago</Text>
          <Text style={styles.reportDesc} numberOfLines={2}>
            Patient comfort item (teddy bear) documented as part of pediatric transport protocol.
            No clinical concerns noted.
          </Text>
          <View style={styles.reportFooter}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => router.push('/(app)/supervisor/review')}
            >
              <Text style={styles.reviewBtnText}>Review →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Chat Section */}
        <View style={styles.aiCard}>
          <Text style={styles.aiHeading}>Ask about your team</Text>
          <Text style={styles.aiPrompts}>
            "Who is on shift tonight?" • "Show pending reports" • "Compliance status for Unit A"
          </Text>
          <TouchableOpacity style={styles.micButton} onPress={() => router.push('/(app)/chat')}>
            <MaterialIcons name="mic" size={32} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.micLabel}>Tap to speak</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Fixed Bottom Nav */}
      <View style={styles.bottomNav}>
        {(['Team', 'Reports', 'Compliance', 'Stats'] as NavTab[]).map((tab) => {
          const iconMap: Record<NavTab, keyof typeof MaterialIcons.glyphMap> = {
            Team: 'people',
            Reports: 'description',
            Compliance: 'verified-user',
            Stats: 'bar-chart',
          };
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.navItem}
              onPress={() => setActiveTab(tab)}
            >
              <MaterialIcons name={iconMap[tab]} size={24} color={isActive ? PRIMARY : '#9aa0a6'} />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecef',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: PRIMARY,
    padding: 2, justifyContent: 'center', alignItems: 'center',
  },
  samAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerTextBlock: { gap: 2 },
  headerGreeting: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  headerSub: { fontSize: 12, color: '#6b7280' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  redDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#e53935', borderWidth: 1, borderColor: '#ffffff',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, marginTop: 4,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#9aa0a6', letterSpacing: 1.2 },
  viewMapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewMapText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  paraAvatar: { width: 44, height: 44, borderRadius: 22, position: 'absolute', top: 16, left: 16 },
  cardInfo: { marginLeft: 56, gap: 4 },
  paraName: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  paraStatus: { fontSize: 12, color: '#6b7280' },
  chatBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#e8f1fb', justifyContent: 'center', alignItems: 'center',
  },
  newBadge: { backgroundColor: '#e53935', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  reportTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', flex: 1, marginRight: 8 },
  highPriorityBadge: { backgroundColor: '#fde8e8', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  highPriorityText: { fontSize: 11, fontWeight: '600', color: '#e53935' },
  routineBadge: { backgroundColor: '#e8f1fb', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  routineText: { fontSize: 11, fontWeight: '600', color: PRIMARY },
  reportMeta: { fontSize: 11, color: '#9aa0a6', marginBottom: 6 },
  reportDesc: { fontSize: 13, color: '#4b5563', lineHeight: 19, marginBottom: 12 },
  reportFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportAvatar: { width: 28, height: 28, borderRadius: 14 },
  reviewBtn: { backgroundColor: '#e8f1fb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  reviewBtnText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  aiCard: {
    backgroundColor: '#dbeafe', borderRadius: 20,
    padding: 20, marginTop: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  aiHeading: { fontSize: 17, fontWeight: '700', color: '#1e3a5f', marginBottom: 8 },
  aiPrompts: { fontSize: 12, color: '#3b6ea5', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  micButton: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6, marginBottom: 10,
  },
  micLabel: { fontSize: 13, color: '#3b6ea5', fontWeight: '500' },
  bottomNav: {
    flexDirection: 'row', backgroundColor: '#ffffff',
    borderTopWidth: 1, borderTopColor: '#e8ecef',
    paddingBottom: 16, paddingTop: 10,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navLabel: { fontSize: 10, color: '#9aa0a6', fontWeight: '500' },
  navLabelActive: { color: PRIMARY, fontWeight: '700' },
});
