import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PRIMARY = '#0a6fbd';

export default function SupervisorReviewScreen() {
  const router = useRouter();
  const [reviewNotes, setReviewNotes] = useState('');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Blue Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Report</Text>
        <TouchableOpacity style={styles.moreBtn}>
          <MaterialIcons name="more-vert" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <MaterialIcons name="pending-actions" size={18} color={PRIMARY} />
        <Text style={styles.statusText}>Pending Supervisor Review</Text>
        <Text style={styles.statusId}>ID: CN-88291</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.reportTitle}>Occurrence - Near Miss</Text>
          <Text style={styles.reportSubtitle}>
            Submitted by Sarah Jenkins • Oct 24, 2023 14:32
          </Text>
        </View>

        {/* Metadata Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Classification</Text>
            <Text style={styles.metaValue}>Near Miss</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Severity Score</Text>
            <View style={styles.severityRow}>
              <View style={styles.yellowDot} />
              <Text style={styles.metaValue}>Low (Level 2)</Text>
            </View>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Department</Text>
            <Text style={styles.metaValue}>Emergency Care</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Location</Text>
            <Text style={styles.metaValue}>Zone B - Triage</Text>
          </View>
        </View>

        {/* Description Card */}
        <View style={styles.descCard}>
          <View style={styles.descHeader}>
            <MaterialIcons name="description" size={18} color="#4b5563" />
            <Text style={styles.descHeading}>Event Description</Text>
          </View>
          <Text style={styles.descBody}>
            During medication preparation for a patient in Zone B - Triage, a nurse prepared
            Heparin 10,000 units/mL instead of the ordered 1,000 units/mL. The error was caught
            by the attending paramedic before administration. No patient harm occurred. The
            incident highlights a need for additional medication labeling protocols and
            double-check procedures during high-acuity periods.
          </Text>
        </View>

        {/* Attachments */}
        <Text style={styles.sectionHeading}>Attachments (1)</Text>
        <View style={styles.attachmentRow}>
          <View style={styles.attachmentIcon}>
            <MaterialIcons name="image" size={22} color={PRIMARY} />
          </View>
          <View style={styles.attachmentInfo}>
            <Text style={styles.attachmentName}>photo_of_workstation.jpg</Text>
            <Text style={styles.attachmentSize}>1.2 MB</Text>
          </View>
          <TouchableOpacity style={styles.downloadBtn}>
            <MaterialIcons name="file-download" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Internal Review Notes */}
        <Text style={styles.sectionHeading}>Internal Review Notes</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Add your review notes here..."
          placeholderTextColor="#9aa0a6"
          multiline
          numberOfLines={5}
          value={reviewNotes}
          onChangeText={setReviewNotes}
          textAlignVertical="top"
        />

        {/* Footer Buttons */}
        <View style={styles.footerBtns}>
          <TouchableOpacity style={styles.revisionBtn}>
            <Text style={styles.revisionBtnText}>Request Revision</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveBtn}>
            <Text style={styles.approveBtnText}>Approve Report</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 8, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
  moreBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  statusBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#dbeafe', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  statusText: { flex: 1, fontSize: 13, fontWeight: '600', color: PRIMARY },
  statusId: { fontSize: 12, color: '#3b6ea5', fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 },
  titleSection: { marginBottom: 20 },
  reportTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 6 },
  reportSubtitle: { fontSize: 13, color: '#6b7280' },
  metaGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: '#f9fafb', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    marginBottom: 20, overflow: 'hidden',
  },
  metaCell: { width: '50%', padding: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  metaLabel: { fontSize: 11, color: '#9aa0a6', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  severityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  yellowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
  descCard: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, marginBottom: 20 },
  descHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  descHeading: { fontSize: 14, fontWeight: '700', color: '#374151' },
  descBody: { fontSize: 13, color: '#4b5563', lineHeight: 20 },
  sectionHeading: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  attachmentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 12, marginBottom: 20, gap: 12,
  },
  attachmentIcon: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: '#e8f1fb', justifyContent: 'center', alignItems: 'center',
  },
  attachmentInfo: { flex: 1 },
  attachmentName: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
  attachmentSize: { fontSize: 12, color: '#9aa0a6', marginTop: 2 },
  downloadBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  textInput: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#1a1a2e',
    backgroundColor: '#f9fafb', minHeight: 110, marginBottom: 24,
  },
  footerBtns: { flexDirection: 'row', gap: 12 },
  revisionBtn: {
    flex: 1, borderWidth: 1.5, borderColor: PRIMARY,
    borderRadius: 30, paddingVertical: 14, alignItems: 'center',
  },
  revisionBtnText: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  approveBtn: {
    flex: 1, backgroundColor: PRIMARY,
    borderRadius: 30, paddingVertical: 14, alignItems: 'center',
  },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
