import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PRIMARY = '#0a6fbd';

type VoiceOption = 'female' | 'male';
type StyleOption = 'brief' | 'conversational';

export default function ProfileScreen() {
  const router = useRouter();
  const [voice, setVoice] = useState<VoiceOption>('female');
  const [speakingStyle, setSpeakingStyle] = useState<StyleOption>('conversational');
  const [darkMode, setDarkMode] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [biometric, setBiometric] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={56} color={PRIMARY} />
            </View>
            <TouchableOpacity style={styles.cameraBtn}>
              <MaterialIcons name="camera-alt" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.avatarName}>Jordan Riley</Text>
          <Text style={styles.avatarBadge}>Badge: B-3047</Text>
        </View>

        {/* Voice Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>VOICE SELECTION</Text>
          <View style={styles.segmented}>
            {(['female', 'male'] as VoiceOption[]).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.segBtn, voice === v && styles.segBtnActive]}
                onPress={() => setVoice(v)}
              >
                <Text style={[styles.segBtnText, voice === v && styles.segBtnTextActive]}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Speaking Style */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SPEAKING STYLE</Text>
          <View style={styles.segmented}>
            <TouchableOpacity
              style={[styles.segBtn, speakingStyle === 'brief' && styles.segBtnActive]}
              onPress={() => setSpeakingStyle('brief')}
            >
              <Text style={[styles.segBtnText, speakingStyle === 'brief' && styles.segBtnTextActive]}>
                Brief / Direct
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segBtn, speakingStyle === 'conversational' && styles.segBtnActive]}
              onPress={() => setSpeakingStyle('conversational')}
            >
              <Text style={[styles.segBtnText, speakingStyle === 'conversational' && styles.segBtnTextActive]}>
                Conversational
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wake Word Sensitivity */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WAKE WORD SENSITIVITY</Text>
          <View style={styles.sliderCard}>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Low</Text>
              <Text style={styles.sliderLabel}>High</Text>
            </View>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: '80%' }]} />
              <View style={styles.sliderThumb} />
            </View>
            <Text style={styles.sliderValue}>80%</Text>
          </View>
        </View>

        {/* System Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SYSTEM SETTINGS</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#1e293b' }]}>
                  <MaterialIcons name="dark-mode" size={16} color="#ffffff" />
                </View>
                <Text style={styles.settingLabel}>Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#e2e8f0', true: `${PRIMARY}99` }}
                thumbColor={darkMode ? PRIMARY : '#ffffff'}
              />
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#0d9488' }]}>
                  <MaterialIcons name="notifications" size={16} color="#ffffff" />
                </View>
                <Text style={styles.settingLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={pushNotif}
                onValueChange={setPushNotif}
                trackColor={{ false: '#e2e8f0', true: `${PRIMARY}99` }}
                thumbColor={pushNotif ? PRIMARY : '#ffffff'}
              />
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#7c3aed' }]}>
                  <MaterialIcons name="fingerprint" size={16} color="#ffffff" />
                </View>
                <Text style={styles.settingLabel}>Biometric Login</Text>
              </View>
              <Switch
                value={biometric}
                onValueChange={setBiometric}
                trackColor={{ false: '#e2e8f0', true: `${PRIMARY}99` }}
                thumbColor={biometric ? PRIMARY : '#ffffff'}
              />
            </View>
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Save Changes Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 24, gap: 20 },

  avatarSection: { alignItems: 'center', gap: 8, paddingBottom: 8 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 112, height: 112, borderRadius: 56,
    backgroundColor: `${PRIMARY}1A`,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: `${PRIMARY}33`,
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#ffffff',
  },
  avatarName: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  avatarBadge: { fontSize: 13, color: '#64748b' },

  section: { gap: 10 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1.2, paddingHorizontal: 2,
  },

  voiceRow: { flexDirection: 'row', gap: 10 },
  voicePill: {
    flex: 1, borderRadius: 9999, paddingVertical: 10, alignItems: 'center',
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  voicePillActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  voicePillText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  voicePillTextActive: { color: '#ffffff' },

  segmented: {
    flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 9999, padding: 4,
  },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 9999, alignItems: 'center' },
  segBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  segBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  segBtnTextActive: { color: PRIMARY },

  sliderCard: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  sliderTrack: {
    height: 6, backgroundColor: '#e2e8f0', borderRadius: 9999,
    flexDirection: 'row', alignItems: 'center', overflow: 'visible',
  },
  sliderFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 9999 },
  sliderThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: PRIMARY, borderWidth: 3, borderColor: '#ffffff',
    marginLeft: -10,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  sliderValue: { fontSize: 12, fontWeight: '700', color: PRIMARY, textAlign: 'right' },

  settingsCard: {
    backgroundColor: '#ffffff', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '500', color: '#0f172a' },
  settingDivider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 },

  footer: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 9999, paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
