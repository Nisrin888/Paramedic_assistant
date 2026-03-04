import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PRIMARY = '#0a6fbd';

type Message =
  | { id: string; role: 'bot'; text: string; chips?: string[] }
  | { id: string; role: 'user'; text: string };

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'bot',
    text: 'Report submitted successfully! Want me to send it to your supervisor for review?',
  },
  { id: '2', role: 'user', text: 'Yes please' },
  {
    id: '3',
    role: 'bot',
    text: 'Sent to Sam Torres (Supervisor). I\'ve also generated the report in two formats for your records.',
    chips: ['PDF Report', 'XML Export'],
  },
];

export default function FormConfirmScreen() {
  const router = useRouter();
  const [messages] = useState<Message[]>(INITIAL_MESSAGES);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.replace('/(app)')}>
          <MaterialIcons name="home" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Para AI</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <MaterialIcons name="share" size={24} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Heading */}
        <Text style={styles.summaryHeading}>Occurrence Report Summary</Text>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          {/* Colored banner */}
          <View style={styles.cardBanner}>
            <MaterialIcons name="assignment" size={28} color="#ffffff" />
            <View style={styles.cardBannerText}>
              <Text style={styles.cardBannerTitle}>Vehicle Collision</Text>
              <Text style={styles.cardBannerSub}>Incident #2940-B</Text>
            </View>
            <View style={styles.submittedBadge}>
              <MaterialIcons name="check-circle" size={14} color="#10b981" />
              <Text style={styles.submittedBadgeText}>Submitted</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.cardDetails}>
            {[
              { label: 'Date & Time', value: 'Oct 24, 2023 • 14:32' },
              { label: 'Badge #', value: '#4829' },
              { label: 'Vehicle', value: 'Ambulance Unit 7' },
              { label: 'Classification', value: 'Medical Emergency' },
            ].map((item) => (
              <View key={item.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}

            <View style={styles.detailDivider} />
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              Ambulance Unit 7 was involved in a low-speed collision at Main St & Oak Ave while
              responding to a call. Minor vehicle damage noted on the front bumper. No patient or
              crew injuries reported. Scene secured and documented.
            </Text>
          </View>

          {/* Card footer buttons */}
          <View style={styles.cardFooterBtns}>
            <TouchableOpacity style={styles.editBtn}>
              <MaterialIcons name="edit" size={16} color={PRIMARY} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitDoneBtn}>
              <MaterialIcons name="check" size={16} color="#ffffff" />
              <Text style={styles.submitDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat messages */}
        <View style={styles.chatSection}>
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
              {msg.role === 'bot' && (
                <View style={styles.botAvatar}>
                  <MaterialCommunityIcons name="robot" size={14} color="#ffffff" />
                </View>
              )}
              <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                  {msg.text}
                </Text>
                {msg.role === 'bot' && msg.chips && (
                  <View style={styles.chipRow}>
                    {msg.chips.map((chip) => (
                      <TouchableOpacity key={chip} style={styles.chip}>
                        <MaterialIcons
                          name={chip === 'PDF Report' ? 'picture-as-pdf' : 'code'}
                          size={14}
                          color={PRIMARY}
                        />
                        <Text style={styles.chipText}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(app)')}>
          <MaterialIcons name="home" size={20} color="#ffffff" />
          <Text style={styles.homeBtnText}>Back to Home</Text>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: PRIMARY },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  summaryHeading: { fontSize: 20, fontWeight: '800', color: '#0f172a' },

  summaryCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardBanner: {
    backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  cardBannerText: { flex: 1 },
  cardBannerTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  cardBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  submittedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  submittedBadgeText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },

  cardDetails: { padding: 16, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 12, color: '#64748b' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  detailDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  descriptionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  descriptionText: { fontSize: 13, color: '#334155', lineHeight: 19 },

  cardFooterBtns: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 14,
  },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 9999, paddingVertical: 10,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  submitDoneBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#10b981', borderRadius: 9999, paddingVertical: 10,
  },
  submitDoneBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

  chatSection: { gap: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },
  botAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: `${PRIMARY}CC`,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bubble: {
    maxWidth: '80%', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff',
  },
  bubbleBot: { borderTopLeftRadius: 2 },
  bubbleUser: { backgroundColor: PRIMARY, borderColor: PRIMARY, borderTopRightRadius: 2 },
  bubbleText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  bubbleTextUser: { color: '#ffffff' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${PRIMARY}0F`, borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: `${PRIMARY}33`,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: PRIMARY },

  footer: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  homeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 9999, paddingVertical: 14,
  },
  homeBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
