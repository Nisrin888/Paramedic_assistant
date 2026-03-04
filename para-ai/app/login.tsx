import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { login, loginWithEmail } from '@/services/auth';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { token, user, setAuth } = useAuth();

  const [loginMode, setLoginMode] = useState<'badge' | 'email'>('badge');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Navigate after token state has committed — route by role
  useEffect(() => {
    if (token && user) {
      if (user.role_type === 'Supervisor') {
        router.replace('/(app)/supervisor');
      } else {
        router.replace('/(app)');
      }
    }
  }, [token, user]);

  const handleLogin = async () => {
    if (loginMode === 'badge' && !badgeNumber.trim()) {
      Alert.alert('Missing Field', 'Please enter your badge number.');
      return;
    }
    if (loginMode === 'email' && !email.trim()) {
      Alert.alert('Missing Field', 'Please enter your email.');
      return;
    }
    if (!password) {
      Alert.alert('Missing Field', 'Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const result =
        loginMode === 'email'
          ? await loginWithEmail({ email: email.trim(), password })
          : await login({ badgeNumber: badgeNumber.trim(), password });
      setAuth(result.token, result.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      Alert.alert('Login Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header / Logo */}
          <View style={styles.headerSection}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="hospital-box" size={48} color="#0a6fbd" />
            </View>
            <Text style={styles.appTitle}>Para AI</Text>
            <Text style={styles.appSubtitle}>Field Operations Login</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formCard}>
            {loginMode === 'badge' ? (
              /* Badge Number */
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Badge Number</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="badge" size={22} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. B-3047"
                    placeholderTextColor="#94a3b8"
                    value={badgeNumber}
                    onChangeText={setBadgeNumber}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>
            ) : (
              /* Email */
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="email" size={22} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="supervisor@example.com"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>
              </View>
            )}

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={22} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingRight: 8 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={22}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, isLoading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="login" size={24} color="#ffffff" />
                  <Text style={styles.loginBtnText}>LOG IN</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Mode toggle link */}
            <View style={styles.supervisorRow}>
              {loginMode === 'badge' ? (
                <>
                  <Text style={styles.supervisorText}>Supervisor? </Text>
                  <TouchableOpacity onPress={() => setLoginMode('email')}>
                    <Text style={styles.supervisorLink}>Log in with email</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={() => setLoginMode('badge')}>
                  <Text style={styles.supervisorLink}>Back to badge login</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <MaterialCommunityIcons name="shield-lock" size={14} color="#94a3b8" />
                <Text style={styles.badgeText}>HIPAA COMPLIANT</Text>
              </View>
              <View style={styles.badge}>
                <MaterialCommunityIcons name="account-heart" size={14} color="#94a3b8" />
                <Text style={styles.badgeText}>EMS READY</Text>
              </View>
            </View>
            <Text style={styles.footerDisclaimer}>
              Authorized use only. All session data is encrypted and logged for quality assurance
              and compliance monitoring.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = '#0a6fbd';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7f8' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 32, gap: 24 },
  headerSection: { alignItems: 'center', gap: 8 },
  iconWrapper: {
    width: 80, height: 80, borderRadius: 12,
    backgroundColor: '#0a6fbd1A',
    alignItems: 'center', justifyContent: 'center',
  },
  appTitle: { fontSize: 30, fontWeight: '700', color: '#0f172a', letterSpacing: -0.5 },
  appSubtitle: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  formCard: {
    backgroundColor: '#ffffff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    padding: 20, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  fieldGroup: { gap: 8 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: '#475569',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    height: 64, borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, backgroundColor: '#ffffff', paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 18, fontWeight: '500', color: '#0f172a', height: '100%' },
  loginBtn: {
    height: 64, backgroundColor: PRIMARY, borderRadius: 9999,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: 4,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  loginBtnText: { color: '#ffffff', fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  supervisorRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 8 },
  supervisorText: { fontSize: 15, color: '#64748b' },
  supervisorLink: { fontSize: 15, color: PRIMARY, fontWeight: '700' },
  footer: { alignItems: 'center', gap: 12, paddingBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 24 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#94a3b8', letterSpacing: 0.5 },
  footerDisclaimer: {
    fontSize: 10, color: '#94a3b8', textAlign: 'center',
    lineHeight: 15, paddingHorizontal: 24,
  },
});
