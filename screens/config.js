import { Platform } from "react-native";

// 🖥️ Your local backend
const LOCAL_IP = "192.168.29.139";
const LOCAL_PORT = 8000;

// 🧩 Base URLs (for development)
export const BASE_URL = `http://${LOCAL_IP}:${LOCAL_PORT}`;
export const API_BASE = BASE_URL;
export const WS_URL = `ws://${LOCAL_IP}:${LOCAL_PORT}/ws`;

// 🧩 Base URLs (for development)
//export const BASE_URL = `http://${LOCAL_IP}`;
//export const API_BASE = BASE_URL;
//export const WS_URL = `ws://${LOCAL_IP}/ws`;

// 🌐 Optional for production
export const IS_DEV = true; // switch to false in production
export const PROD_URL = BASE_URL; // e.g., "https://myapp.com/api"

