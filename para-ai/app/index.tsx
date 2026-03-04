import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  if (user?.role_type === 'Supervisor') {
    return <Redirect href="/(app)/supervisor" />;
  }

  return <Redirect href="/(app)" />;
}
