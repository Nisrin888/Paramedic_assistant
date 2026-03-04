import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/context/AuthContext';
import { WS_URL } from '@/services/auth';

const PRIMARY = '#0a6fbd';

type VoiceState = 'listening' | 'recording' | 'processing' | 'ai-speaking';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'error' | 'system';
  content: string;
  action?: string;
  data?: Record<string, unknown>;
}

// Use the built-in preset directly — no overrides to avoid config conflicts
const RECORDING_OPTIONS = Audio.RecordingOptionsPresets.HIGH_QUALITY;

export default function ChatScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('listening');
  const voiceModeRef = useRef(false);
  const msgIdRef = useRef(0);

  const addMessage = useCallback((msg: Omit<Message, 'id'>) => {
    const id = String(++msgIdRef.current);
    setMessages(prev => [...prev, { ...msg, id }]);
  }, []);

  // ── WebSocket ──────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/agent/chat?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setIsThinking(false);

      if (data.type === 'error') {
        addMessage({ type: 'error', content: data.content });
        // If in voice mode and got an error, go back to listening
        if (voiceModeRef.current) {
          setVoiceState('listening');
        }
      } else {
        addMessage({
          type: 'ai',
          content: data.content,
          action: data.action ?? undefined,
          data: data.data ?? undefined,
        });
        if (data.audio) {
          console.log(`[AUDIO] Received TTS audio (${data.audio.length} chars)`);
          if (voiceModeRef.current) {
            setVoiceState('ai-speaking');
          }
          playAudioBase64(data.audio, voiceModeRef.current).catch(e =>
            addMessage({ type: 'error', content: `Audio playback failed: ${e}` })
          );
        } else {
          console.log('[AUDIO] No audio in response — TTS may have failed on backend');
        }
        if (!data.audio && voiceModeRef.current) {
          // No audio in response but in voice mode — auto-resume recording
          startVoiceRecording();
        }
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token, addMessage]);

  // ── Audio playback ─────────────────────────────────────────
  const playAudioBase64 = async (base64: string, autoLoop = false) => {
    // Unload previous sound if any
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }

    // Switch audio mode from recording → playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    // Use data URI — avoids file system issues entirely
    const dataUri = `data:audio/mp3;base64,${base64}`;

    const { sound } = await Audio.Sound.createAsync(
      { uri: dataUri },
      { shouldPlay: true, volume: 1.0 },
    );
    soundRef.current = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        soundRef.current = null;
        if (autoLoop && voiceModeRef.current) {
          startVoiceRecording();
        }
      }
    });
  };

  // ── Send text ──────────────────────────────────────────────
  const sendText = () => {
    const text = inputText.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    addMessage({ type: 'user', content: text });
    wsRef.current.send(JSON.stringify({ type: 'text', content: text, respond_audio: true }));
    setInputText('');
    setIsThinking(true);
  };

  // ── Voice recording ────────────────────────────────────────
  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      // Clean up any leftover recording BEFORE changing audio mode
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }

      // Unload any playing sound — iOS can't record while playing
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      recordingRef.current = recording;
      setIsRecording(true);
      console.log('Recording started');
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (!uri) return;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        addMessage({ type: 'user', content: '[Voice message]' });
        wsRef.current.send(
          JSON.stringify({
            type: 'audio',
            content: base64,
            format: 'm4a',
            respond_audio: true,
          })
        );
        setIsThinking(true);
      }
    } catch (e) {
      console.warn('Failed to stop recording:', e);
      setIsRecording(false);
    }
  };

  // ── Voice mode ──────────────────────────────────────────────
  const startVoiceRecording = async () => {
    if (!voiceModeRef.current) return;
    try {
      // Clean up any leftover recording BEFORE changing audio mode
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }

      // Unload any playing sound — iOS can't record while playing
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      recordingRef.current = recording;
      setVoiceState('recording');
      console.log('Voice recording started');
    } catch (e) {
      console.error('Voice recording failed:', e);
      if (voiceModeRef.current) {
        setVoiceState('listening');
        setTimeout(() => startVoiceRecording(), 1000);
      }
    }
  };

  const stopVoiceRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri || !voiceModeRef.current) return;

      setVoiceState('processing');

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        addMessage({ type: 'user', content: '[Voice message]' });
        wsRef.current.send(
          JSON.stringify({
            type: 'audio',
            content: base64,
            format: 'm4a',
            respond_audio: true,
          })
        );
        setIsThinking(true);
      }
    } catch (e) {
      console.warn('Voice mode: failed to stop recording:', e);
      if (voiceModeRef.current) setVoiceState('listening');
    }
  };

  const enterVoiceMode = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        console.warn('Voice: mic permission denied');
        return;
      }
      voiceModeRef.current = true;
      setVoiceMode(true);
      setVoiceState('listening');
      // Start recording directly — permissions already granted
      startVoiceRecording();
    } catch (e) {
      console.error('Enter voice mode failed:', e);
    }
  };

  const exitVoiceMode = async () => {
    voiceModeRef.current = false;
    setVoiceMode(false);
    setVoiceState('listening');
    // Stop any in-progress recording
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    // Stop any playing audio
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  };

  // ── Cleanup ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  // ── Form card actions ────────────────────────────────────────
  const FORM_ACTIONS = new Set([
    'form_update', 'form_submitted',
  ]);

  // Actions where the AI text already says everything — suppress badge + JSON dump
  const SILENT_ACTIONS = new Set([
    'email_sent', 'form_submitted', 'report_reviewed',
  ]);

  const isFormAction = (action?: string) => action && FORM_ACTIONS.has(action);

  // Section definitions for occurrence report layout
  const OCCURRENCE_SECTIONS: Record<string, string[]> = {
    'Incident Details': ['incident_date_time', 'service', 'vehicle_number', 'badge_number', 'report_creator', 'role'],
    'Occurrence': ['classification', 'occurrence_type', 'call_number'],
    'Description': ['brief_description', 'description_of_event'],
    'Response': ['action_taken', 'suggested_resolution', 'other_services_involved'],
  };

  const FIELD_LABELS: Record<string, string> = {
    incident_date_time: 'Date & Time',
    service: 'Service',
    vehicle_number: 'Vehicle #',
    badge_number: 'Badge #',
    report_creator: 'Report Creator',
    role: 'Role',
    classification: 'Classification',
    occurrence_type: 'Type',
    call_number: 'Call #',
    brief_description: 'Brief Description',
    description_of_event: 'Description of Event',
    action_taken: 'Action Taken',
    suggested_resolution: 'Suggested Resolution',
    other_services_involved: 'Other Services',
    occurrence_reference: 'Reference #',
    recipient_type: 'Recipient Type',
    recipient_age: 'Recipient Age',
    recipient_gender: 'Recipient Gender',
    distribution_timestamp: 'Date & Time',
  };

  const formatFieldValue = (key: string, val: unknown): string => {
    if (key === 'incident_date_time' || key === 'distribution_timestamp') {
      try {
        const d = new Date(val as string);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
          ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } catch { return String(val); }
    }
    return String(val);
  };

  const renderFormCard = (data: Record<string, unknown>, action: string) => {
    const formType = (data.form_type as string) || 'occurrence';
    const completion = typeof data.completion === 'number' ? data.completion : null;
    const status = (data.status as string) || 'Draft';
    const filledMap = (data.filled ?? {}) as Record<string, { label: string; value: unknown; auto: boolean }>;
    const missingList = (data.missing ?? []) as Array<{ field: string; label: string; required: boolean }>;
    const isReady = status === 'Ready to Submit' || status === 'Submitted';

    // Build a flat field→value map from the filled data
    const fieldValues: Record<string, unknown> = {};
    for (const [key, info] of Object.entries(filledMap)) {
      fieldValues[key] = info.value;
    }

    // Get reference number
    const refNumber = fieldValues['occurrence_reference'] as string | undefined;

    // Count missing required
    const missingRequired = missingList.filter(m => m.required).length;

    // Title based on form type
    const title = formType === 'teddy_bear' ? 'TEDDY BEAR TRACKING' : 'EMS OCCURRENCE REPORT';

    // For teddy bear, use a simpler layout
    const sections = formType === 'teddy_bear'
      ? { 'Details': ['distribution_timestamp', 'recipient_type', 'recipient_age', 'recipient_gender'] }
      : OCCURRENCE_SECTIONS;

    return (
      <View style={styles.formCard}>
        {/* Official header */}
        <View style={[styles.fcHeader, isReady && styles.fcHeaderReady]}>
          <View style={styles.fcHeaderLeft}>
            <Text style={styles.fcTitle}>{title}</Text>
            {refNumber && <Text style={styles.fcRef}>Ref: {refNumber}</Text>}
          </View>
          <View style={[styles.fcBadge, isReady && styles.fcBadgeReady]}>
            <Text style={styles.fcBadgeText}>{status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Sections */}
        {Object.entries(sections).map(([sectionName, sectionFields]) => {
          // Check if section has any filled fields
          const hasFilled = sectionFields.some(f => fieldValues[f] != null);
          // Description section always shows if form is occurrence
          const alwaysShow = sectionName === 'Description' && formType === 'occurrence';
          if (!hasFilled && !alwaysShow) return null;

          // Special handling for description_of_event — full-width text block
          const hasDescriptionField = sectionFields.includes('description_of_event');
          const descriptionValue = fieldValues['description_of_event'] as string | undefined;
          const tableFields = sectionFields.filter(f => f !== 'description_of_event');

          return (
            <View key={sectionName} style={styles.fcSection}>
              <Text style={styles.fcSectionTitle}>{sectionName.toUpperCase()}</Text>
              {/* Table rows */}
              {tableFields.length > 0 && (
                <View style={styles.fcTable}>
                  {tableFields.map(fieldKey => {
                    const val = fieldValues[fieldKey];
                    const label = FIELD_LABELS[fieldKey] || fieldKey.replace(/_/g, ' ');
                    const isMissing = val == null;
                    const missingInfo = missingList.find(m => m.field === fieldKey);
                    const isRequired = missingInfo?.required;
                    // Skip optional missing fields
                    if (isMissing && !isRequired) return null;
                    return (
                      <View key={fieldKey} style={styles.fcRow}>
                        <Text style={styles.fcLabel}>{label}</Text>
                        <Text style={[styles.fcValue, isMissing && styles.fcValueMissing]}>
                          {isMissing ? '—' : formatFieldValue(fieldKey, val)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
              {/* Description text block */}
              {hasDescriptionField && (
                descriptionValue ? (
                  <View style={styles.fcDescBlock}>
                    <Text style={styles.fcDescText}>{descriptionValue}</Text>
                  </View>
                ) : (
                  <View style={styles.fcDescBlock}>
                    <Text style={styles.fcDescMissing}>Description of Event: —</Text>
                  </View>
                )
              )}
            </View>
          );
        })}

        {/* Progress bar */}
        {completion != null && (
          <View style={styles.fcProgressSection}>
            <View style={styles.fcProgressBar}>
              <View style={[
                styles.fcProgressFill,
                { width: `${Math.min(completion, 100)}%` },
                isReady && styles.fcProgressFillReady,
              ]} />
            </View>
            <View style={styles.fcProgressInfo}>
              <Text style={styles.fcProgressPct}>{completion}%</Text>
              <Text style={styles.fcProgressNote}>
                {missingRequired > 0
                  ? `${missingRequired} field${missingRequired > 1 ? 's' : ''} remaining`
                  : 'Ready to Submit'}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ── Render message ─────────────────────────────────────────
  const renderMessage = ({ item }: { item: Message }) => {
    if (item.type === 'system') {
      return <Text style={styles.systemMsg}>{item.content}</Text>;
    }

    if (item.type === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userBubbleText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    // AI or error
    const isError = item.type === 'error';
    const hasFormData = isFormAction(item.action) && item.data && Object.keys(item.data).length > 0;

    return (
      <View style={styles.botRow}>
        <View style={styles.botAvatar}>
          <MaterialCommunityIcons name="robot" size={16} color="#ffffff" />
        </View>
        <View style={styles.botMsgWrap}>
          <Text style={styles.botName}>Para AI</Text>
          <View style={[styles.botBubble, isError && styles.errorBubble]}>
            <Text style={[styles.botBubbleText, isError && styles.errorText]}>
              {item.content}
            </Text>
          </View>

          {/* Rich form card for form actions */}
          {hasFormData && renderFormCard(item.data!, item.action!)}

          {/* Action badge for non-form, non-silent actions */}
          {item.action && !hasFormData && !SILENT_ACTIONS.has(item.action) && (
            <View style={styles.actionBadge}>
              <MaterialIcons name="bolt" size={12} color={PRIMARY} />
              <Text style={styles.actionBadgeText}>{item.action}</Text>
            </View>
          )}

          {/* Data preview fallback — only for actions worth showing raw */}
          {item.data && Object.keys(item.data).length > 0 && !hasFormData && !SILENT_ACTIONS.has(item.action ?? '') && (
            <View style={styles.dataPreview}>
              <Text style={styles.dataPreviewText}>
                {JSON.stringify(item.data, null, 2)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const displayName = user?.persona?.preferred_name ?? user?.first_name ?? 'there';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#475569" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Para AI</Text>
          <View style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
        </View>
        <TouchableOpacity
          style={[styles.headerBtn, voiceMode && styles.headerBtnActive]}
          onPress={voiceMode ? exitVoiceMode : enterVoiceMode}
          disabled={!isConnected}
        >
          <MaterialIcons
            name={voiceMode ? 'mic-off' : 'record-voice-over'}
            size={22}
            color={voiceMode ? '#ffffff' : '#475569'}
          />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="robot" size={40} color={PRIMARY} />
            </View>
            <Text style={styles.emptyTitle}>Hi {displayName}!</Text>
            <Text style={styles.emptySubtitle}>
              {isConnected
                ? "I'm ready to help. Ask me anything or use voice."
                : 'Connecting to server...'}
            </Text>
          </View>
        }
        ListFooterComponent={
          isThinking ? (
            <View style={styles.thinkingRow}>
              <View style={styles.botAvatar}>
                <MaterialCommunityIcons name="robot" size={16} color="#ffffff" />
              </View>
              <View style={styles.thinkingBubble}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={styles.thinkingText}>Thinking...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Input bar — voice mode or text mode */}
      {voiceMode ? (
        <View style={styles.voiceBar}>
          <View style={styles.voiceIndicatorWrap}>
            <View style={[
              styles.voicePulse,
              voiceState === 'recording' && styles.voicePulseRecording,
              voiceState === 'processing' && styles.voicePulseProcessing,
              voiceState === 'ai-speaking' && styles.voicePulseSpeaking,
            ]} />
            <Text style={styles.voiceStateLabel}>
              {voiceState === 'listening' && 'Starting...'}
              {voiceState === 'recording' && 'Listening...'}
              {voiceState === 'processing' && 'Processing...'}
              {voiceState === 'ai-speaking' && 'AI Speaking...'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.voiceActionBtn}
            onPress={voiceState === 'recording' ? stopVoiceRecording : undefined}
            disabled={voiceState !== 'recording'}
          >
            <MaterialIcons
              name={voiceState === 'recording' ? 'stop' : 'mic'}
              size={28}
              color={voiceState === 'recording' ? '#ef4444' : '#94a3b8'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.voiceEndBtn} onPress={exitVoiceMode}>
            <Text style={styles.voiceEndBtnText}>End Voice</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnRecording]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isRecording ? 'stop' : 'mic'}
                size={24}
                color={isRecording ? '#ffffff' : '#64748b'}
              />
            </TouchableOpacity>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={sendText}
                returnKeyType="send"
                editable={!isRecording}
              />
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || !isConnected) && styles.sendBtnDisabled]}
              onPress={sendText}
              disabled={!inputText.trim() || !isConnected}
            >
              <MaterialIcons name="send" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: PRIMARY, letterSpacing: -0.3 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotConnected: { backgroundColor: '#22c55e' },
  dotDisconnected: { backgroundColor: '#ef4444' },

  // Messages
  scrollContent: { padding: 16, paddingBottom: 8, gap: 12, flexGrow: 1 },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: `${PRIMARY}15`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  emptySubtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', paddingHorizontal: 32 },

  // User messages
  userRow: { alignItems: 'flex-end' },
  userBubble: {
    backgroundColor: PRIMARY, borderRadius: 18, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: '80%',
  },
  userBubbleText: { fontSize: 15, color: '#ffffff', lineHeight: 21 },

  // Bot messages
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  botAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  botMsgWrap: { flex: 1, gap: 6 },
  botName: { fontSize: 12, fontWeight: '600', color: '#64748b', marginLeft: 4 },
  botBubble: {
    backgroundColor: '#ffffff', borderRadius: 18, borderTopLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: '95%',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  botBubbleText: { fontSize: 15, color: '#334155', lineHeight: 21 },

  // Error
  errorBubble: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  errorText: { color: '#991b1b' },

  // Action badge
  actionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${PRIMARY}12`, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, marginTop: 8,
    alignSelf: 'flex-start',
  },
  actionBadgeText: { fontSize: 11, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase' },

  // Data preview
  dataPreview: {
    marginTop: 8, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8,
  },
  dataPreviewText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#475569' },

  // Form card — official report document
  formCard: {
    backgroundColor: '#ffffff', borderRadius: 10, overflow: 'hidden', marginTop: 2,
    borderWidth: 1, borderColor: '#cbd5e1',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  fcHeader: {
    backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12,
  },
  fcHeaderReady: { backgroundColor: '#15803d' },
  fcHeaderLeft: { flex: 1, gap: 2 },
  fcTitle: { fontSize: 12, fontWeight: '800', color: '#ffffff', letterSpacing: 1.2 },
  fcRef: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  fcBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  fcBadgeReady: { backgroundColor: 'rgba(255,255,255,0.25)' },
  fcBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff', letterSpacing: 1 },
  fcSection: { borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  fcSectionTitle: {
    fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 1,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6,
  },
  fcTable: { paddingHorizontal: 14, paddingBottom: 10 },
  fcRow: {
    flexDirection: 'row', paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f1f5f9',
  },
  fcLabel: { width: 110, fontSize: 12, color: '#64748b', fontWeight: '500' },
  fcValue: { flex: 1, fontSize: 12, color: '#0f172a', fontWeight: '600' },
  fcValueMissing: { color: '#cbd5e1', fontWeight: '400', fontStyle: 'italic' },
  fcDescBlock: {
    marginHorizontal: 14, marginBottom: 10, padding: 10,
    backgroundColor: '#f8fafc', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0',
  },
  fcDescText: { fontSize: 12, color: '#334155', lineHeight: 18, fontStyle: 'italic' },
  fcDescMissing: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' },
  fcProgressSection: {
    borderTopWidth: 1, borderTopColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  fcProgressBar: {
    height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden',
  },
  fcProgressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 4 },
  fcProgressFillReady: { backgroundColor: '#22c55e' },
  fcProgressInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6,
  },
  fcProgressPct: { fontSize: 12, fontWeight: '700', color: '#334155' },
  fcProgressNote: { fontSize: 11, color: '#64748b' },

  // System message
  systemMsg: { fontSize: 12, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', paddingVertical: 4 },

  // Thinking indicator
  thinkingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  thinkingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ffffff', borderRadius: 18, borderTopLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  thinkingText: { fontSize: 14, color: '#94a3b8' },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  micBtnRecording: { backgroundColor: '#ef4444' },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 24, paddingHorizontal: 16,
  },
  textInput: { flex: 1, minHeight: 42, fontSize: 15, color: '#0f172a', paddingVertical: 8 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  // Header voice toggle
  headerBtnActive: { backgroundColor: PRIMARY },

  // Voice mode bar
  voiceBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b',
  },
  voiceIndicatorWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  voicePulse: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#64748b',
  },
  voicePulseRecording: { backgroundColor: '#22c55e' },
  voicePulseProcessing: { backgroundColor: '#eab308' },
  voicePulseSpeaking: { backgroundColor: '#a855f7' },
  voiceStateLabel: {
    fontSize: 15, fontWeight: '600', color: '#e2e8f0',
  },
  voiceActionBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
  },
  voiceEndBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#ef4444',
  },
  voiceEndBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
});
