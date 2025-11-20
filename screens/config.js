const LOCAL_IP = "192.168.29.139";
const LOCAL_PORT = "8000";

const DEV_BASE_URL = `http://${LOCAL_IP}:${LOCAL_PORT}`;

// Use a real environment detection if available (e.g. __DEV__ in RN)
const ENVIRONMENT = typeof __DEV__ !== "undefined" ? (__DEV__ ? "development" : "production") : "development";

const configuredApiUrl = `http://${LOCAL_IP}:${LOCAL_PORT}`.replace(/\/$/, "");

const normalizeWsUrl = (url) => {
  if (typeof url !== "string" || !url) return null;
  const lower = url.toLowerCase();
  if (lower.startsWith("ws://") || lower.startsWith("wss://")) return url;
  if (lower.startsWith("https://")) return url.replace(/^https:\/\//i, "wss://");
  if (lower.startsWith("http://")) return url.replace(/^http:\/\//i, "ws://");
  return `wss://${url}`;
};

export const BASE_URL = configuredApiUrl || DEV_BASE_URL;
export const API_BASE = BASE_URL;
export const WS_URL = normalizeWsUrl(`${BASE_URL.replace(/\/$/, "")}/ws`);

export const IS_DEV = ENVIRONMENT !== "production";
export const PROD_URL = BASE_URL;

// Enable verbose API logging outside of development by setting to true
export const ENABLE_API_LOGS = false;
