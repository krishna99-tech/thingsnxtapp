import { Platform } from "react-native";

const DEFAULT_LOCAL_HOST = "192.168.29.139";
const DEFAULT_LOCAL_PORT = "8000";

const trimTrailingSlash = (url) => (typeof url === "string" ? url.trim().replace(/\/$/, "") : "");

const getWebHost = () => {
  if (typeof window !== "undefined" && window.location?.hostname) {
    return window.location.hostname;
  }
  return "";
};

const ENVIRONMENT =
  typeof __DEV__ !== "undefined" ? (__DEV__ ? "development" : "production") : "development";

const envBaseUrl = trimTrailingSlash(process.env.EXPO_PUBLIC_API_BASE_URL);
const envHost = process.env.EXPO_PUBLIC_API_HOST?.trim();
const envPort = process.env.EXPO_PUBLIC_API_PORT?.trim() || DEFAULT_LOCAL_PORT;
const runtimeHost =
  envHost || (Platform.OS === "web" ? getWebHost() : "") || DEFAULT_LOCAL_HOST;
const derivedBaseUrl = trimTrailingSlash(`http://${runtimeHost}:${envPort}`);
const configuredApiUrl = envBaseUrl || derivedBaseUrl;

const normalizeWsUrl = (url) => {
  if (typeof url !== "string" || !url) return null;
  const lower = url.toLowerCase();
  if (lower.startsWith("ws://") || lower.startsWith("wss://")) return url;
  if (lower.startsWith("https://")) return url.replace(/^https:\/\//i, "wss://");
  if (lower.startsWith("http://")) return url.replace(/^http:\/\//i, "ws://");
  return `wss://${url}`;
};

export const BASE_URL = configuredApiUrl;
export const API_BASE = BASE_URL;
export const WS_URL = normalizeWsUrl(
  process.env.EXPO_PUBLIC_WS_URL || `${BASE_URL.replace(/\/$/, "")}/ws`
);

export const IS_DEV = ENVIRONMENT !== "production";
export const PROD_URL = BASE_URL;

// Enable verbose API logging outside of development by setting to true
export const ENABLE_API_LOGS = false;

