import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const BACKEND_PORT = 8000;

function getApiUrl(): string {
  // 1. Explicit env var always wins (e.g. production builds)
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit;

  // 2. In dev, derive from Expo's dev-server host IP so both devices
  //    just need to be on the same network — no hardcoded IP needed.
  const debuggerHost =
    Constants.expoConfig?.hostUri ?? // SDK 49+
    (Constants as any).manifest?.debuggerHost; // older SDKs
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0]; // strip Expo port
    return `http://${ip}:${BACKEND_PORT}`;
  }

  return '';
}

export const API_URL = getApiUrl();
export const WS_URL = API_URL.replace(/^http/, 'ws');

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface LoginCredentials {
  badgeNumber: string;
  password: string;
}

export interface EmailLoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  user_id: string;
  email: string;
  role_type: string;
  first_name: string;
  last_name: string;
  badge_number: string | null;
  persona?: {
    speaking_style: string;
    voice_preference: string;
    preferred_name: string | null;
    guidance_level_override: string | null;
  } | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  if (!API_URL) {
    throw new Error('API_URL is not configured. Set EXPO_PUBLIC_API_URL in your .env file.');
  }

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      badge_number: credentials.badgeNumber,
      password: credentials.password,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail ?? error.message ?? `Login failed (${response.status})`);
  }

  const data = await response.json();
  // Backend returns { access_token, user } — map to our format
  const result: AuthResponse = {
    token: data.access_token,
    user: data.user,
  };

  await SecureStore.setItemAsync(TOKEN_KEY, result.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.user));
  return result;
}

export async function loginWithEmail(credentials: EmailLoginCredentials): Promise<AuthResponse> {
  if (!API_URL) {
    throw new Error('API_URL is not configured. Set EXPO_PUBLIC_API_URL in your .env file.');
  }

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail ?? error.message ?? `Login failed (${response.status})`);
  }

  const data = await response.json();
  const result: AuthResponse = {
    token: data.access_token,
    user: data.user,
  };

  await SecureStore.setItemAsync(TOKEN_KEY, result.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.user));
  return result;
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
