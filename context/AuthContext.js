import React, {
  createContext,
  useContext,
  useState,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { BASE_URL, WS_URL } from "../screens/config";
import API from "../services/api";
import { useEffect } from "react";

export const AuthContext = createContext(null);

// ====================================
// ✅ Custom Hook
// ====================================
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

// ====================================
// 🌐 Auth Provider
// ====================================
export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [username, setUsername] = useState(null);
  const [devices, setDevices] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const wsRef = useRef(null);
  const sseAbortController = useRef(null); // For aborting SSE fetch
  const isReconnecting = useRef(true); // Flag to control WS reconnection

  // ====================================
  // 🏁 INIT: restore session
  // ====================================
  useEffect(() => {
    const init = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const storedUser = await AsyncStorage.getItem("username");
        if (token && storedUser) {
          setUserToken(token);
          setUsername(storedUser);
          await fetchDevices(token);

          connectWebSocket(token); // USE WEBSOCKET FOR REAL-TIME
          // connectSSE(token); // Or use SSE if that's what your backend requires
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ====================================
  // 🔐 LOGIN
  // ====================================
  const login = async (usernameInput, passwordInput, navigation) => {
    try {
      if (!usernameInput?.trim() || !passwordInput)
        throw new Error("Username/email and password required");

      const data = await API.login(usernameInput.trim(), passwordInput);

      if (data?.access_token) {
        await AsyncStorage.setItem("userToken", data.access_token);
        await AsyncStorage.setItem("refreshToken", data.refresh_token || "");
        await AsyncStorage.setItem(
          "username",
          data.user?.username || usernameInput.trim()
        );

        setUserToken(data.access_token);
        setUsername(data.user?.username || usernameInput.trim());

        await fetchDevices(data.access_token);

        // USE WEBSOCKET FOR REAL-TIME
        connectWebSocket(data.access_token);
        // connectSSE(data.access_token); // Or use SSE if that's what your backend requires

        Alert.alert("Login Success", `Welcome ${data.user?.username || ""}!`);
        navigation?.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      } else {
        throw new Error(data?.detail || "Invalid credentials");
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      Alert.alert("Login Failed", err.message || "Check your credentials");
    }
  };

  // ====================================
  // 🧩 SIGNUP
  // ====================================
  const signup = async (userData) => {
    try {
      const data = await API.signup(userData);
      if (data?.access_token) {
        await AsyncStorage.setItem("userToken", data.access_token);
        await AsyncStorage.setItem("username", data.user?.username);
        setUserToken(data.access_token);
        setUsername(data.user?.username);
        await fetchDevices(data.access_token);
        connectWebSocket(data.access_token); // Use WebSocket for consistency
        Alert.alert("Signup Success", "Welcome!");
      } else {
        throw new Error("Signup failed");
      }
    } catch (err) {
      Alert.alert("Signup Error", err.message);
    }
  };

  // ====================================
  // 🚪 LOGOUT
  // ====================================
  const logout = async () => {
    try {
      await API.logout();
      isReconnecting.current = false; // Prevent WS from reconnecting on logout
      wsRef.current?.close();
      // Abort any ongoing SSE connection
      if (sseAbortController.current) {
        sseAbortController.current.abort();
        sseAbortController.current = null;
      }
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      await AsyncStorage.multiRemove([
        "userToken",
        "username",
        "refreshToken",
      ]);
      setUserToken(null);
      setUsername(null);
      setDevices([]);
      setWidgets([]);
    };
  };

  // ====================================
  // ⚙️ DEVICES
  // ====================================
  const fetchDevices = async (token = userToken) => {
    try {
      const data = await API.getDevices();
      if (Array.isArray(data)) {
        // Before replacing state entirely, merge with existing:
        setDevices((prevDevices) =>
          data.map((serverDev) => {
            const local = prevDevices.find(
              (d) => String(d.id ?? d._id) === String(serverDev.id ?? serverDev._id)
            );
            return local && local.telemetry
              ? { ...serverDev, telemetry: local.telemetry, lastTelemetry: local.lastTelemetry }
              : serverDev;
          })
        );
      }
    } catch (err) {
      console.error("Fetch devices failed:", err);
    };
  };

  const addDevice = async (deviceData) => {
    try {
      // Validate input
      if (!deviceData?.name?.trim()) {
        throw new Error("Device name is required");
      };
      
      const data = await API.addDevice(deviceData);
      if (data) {
        // Add device to state immediately for optimistic update
        setDevices((prev) => {
          // Check if device already exists (prevent duplicates)
          const exists = prev.some((d) => 
            (d.id || d._id) === (data.id || data._id) ||
            d.device_token === data.device_token
          );
          if (exists) {
            // Update existing device
            return prev.map((d) => 
              (d.id || d._id) === (data.id || data._id) ? data : d
            );
          }
          return [...prev, data];
        });
        return data;
      }
      throw new Error("Invalid response from server");
    } catch (err) {
      console.error("Add device error:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Failed to add device";
      throw new Error(errorMessage);
    };
  };

  const deleteDevice = async (deviceId) => {
    try {
      await API.deleteDevice(deviceId);
      // Update state immediately - handle both id and _id formats
      setDevices((prev) => 
        prev.filter((d) => {
          const dId = d.id || d._id;
          const targetId = deviceId;
          return dId !== targetId && String(dId) !== String(targetId);
        })
      );
      // Don't show alert here - let the calling component handle it
      return true;
    } catch (err) {
      console.error("Delete device error:", err);
      Alert.alert("Delete failed", err.message || "Failed to delete device");
      throw err;
    };
  };

  // ====================================
  // 🌐 TELEMETRY
  // ====================================
  const fetchTelemetry = async (device_token) => {
    try {
      const json = await API.getTelemetry(device_token);
      // Also update in context
      if (json?.device_id) {
        setDevices((prev) =>
          prev.map((d) =>
            String(d.id ?? d._id) === String(json.device_id)
              ? { ...d, telemetry: json.data, lastTelemetry: json.timestamp }
              : d
          )
        );
      }
      return json?.data || {};
    } catch (err) {
      console.error("Fetch telemetry error:", err);
      return {};
    };
  };

  // ====================================
  // ⚡ SERVER-SENT EVENTS (SSE)
  // ====================================
  const connectSSE = async (token) => { // Make connectSSE an async function
    if (!token) return;

    // Prevent duplicate connections
    if (sseAbortController.current) {
      console.log("SSE connection already active. Aborting old one.");
      sseAbortController.current.abort();
    }

    const controller = new AbortController();
    sseAbortController.current = controller;

    // ✅ Define the message handler inside the connection function
    // This ensures it has access to the latest state setters.
    const handleSSEMessage = (msg) => {
      handleRealtimeMessage(msg);
    };

    // Move the logic directly into connectSSE
    try {
      console.log("🔄 Connecting to SSE stream...");
      const response = await fetch(`${BASE_URL}/events/stream`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: controller.signal, // Pass the abort signal to fetch
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      console.log("✅ SSE stream connected");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("SSE stream finished.");
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data:")) {
            try {
              const dataStr = line.substring(5).trim();
              if (dataStr) {
                const msg = JSON.parse(dataStr);
                handleSSEMessage(msg);
              }
            } catch (parseErr) {
              console.error("❌ Error parsing SSE data:", parseErr, "Raw data:", line);
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("SSE connection aborted successfully.");
        return; // This is an expected error on logout, so we exit gracefully.
      }
      console.error("❌ SSE connection error:", err);
      // Clean up before retrying
      if (sseAbortController.current === controller) {
        sseAbortController.current = null;
      }
      // Reconnect after a delay if not aborted
      setTimeout(() => connectSSE(token), 5000);
    }
  };

  // ====================================
  // ⚡ REAL-TIME MESSAGE HANDLER (for WS & SSE)
  // ====================================
  const handleRealtimeMessage = (msg) => {
    if (!msg || typeof msg !== "object") return;
    // Determine if backend is sending {type, payload: {device_id, data, ...}} or {type, device_id, data, timestamp}
    let m = msg;
    if (msg.payload && typeof msg.payload === "object") {
      m = { ...msg.payload, type: msg.type };
    }

    if (m.type === "telemetry_update" && m.device_id && m.data) {
      setDevices((prevDevices) =>
        prevDevices.map((d) =>
          String(d.id ?? d._id) === String(m.device_id)
            ? { ...d, telemetry: { ...(d.telemetry || {}), ...m.data }, lastTelemetry: m.timestamp || new Date().toISOString() }
            : d
        )
      );
      setLastUpdated(new Date().toISOString());
      console.log("[CTX] Telemetry updated for device", m.device_id, m.data);
    } else if ((m.type === "device_status" || m.type === "status_update") && m.device_id) {
      setDevices((prevDevices) =>
        prevDevices.map((d) =>
          String(d.id ?? d._id) === String(m.device_id)
            ? { ...d, status: m.status, last_active: m.timestamp }
            : d
        )
      );
    } else if (m.type !== "pong" && m.type !== "ping") {
      // Log other message types for debugging, ignoring pings/pongs
      console.log("[CTX] Received unhandled message type:", m.type, m);
    }
  };

  // ====================================
  // ⚡ WEBSOCKET
  // ====================================
  // ====================================
// ⚡ WEBSOCKET CONNECTION
// ====================================
const connectWebSocket = (token) => {
  if (!token) return;
  isReconnecting.current = true; // Allow reconnection for this session

  // Avoid duplicate connections
  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
    console.log("WebSocket already connected");
    return;
  }

  const ws = new WebSocket(`${WS_URL}?token=${token}`);
  wsRef.current = ws;

  let pingInterval; // Moved here to be accessible in all ws event handlers

  // ✅ Connection opened
  ws.onopen = () => {
    console.log("✅ WebSocket connected");

    // Send periodic pings to keep connection alive
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  };

  // ✅ Handle incoming messages
  ws.onmessage = async (event) => {
    try {
      if (!event.data) return; // Skip empty messages

      const msg = JSON.parse(event.data);
      handleRealtimeMessage(msg);
    } catch (err) {
      console.error("❌ WebSocket parse error:", err);
      console.log("Raw event data:", event.data);
    }
  };

  // ✅ Handle close (auto reconnect)
  ws.onclose = (e) => {
    console.warn("⚠️ WS closed:", e.code, e.reason);
    clearInterval(pingInterval);

    // Attempt reconnection only if not intentionally disconnected (e.g., logout)
    if (isReconnecting.current) {
      setTimeout(() => {
        console.log("🔄 Reconnecting WebSocket...");
        connectWebSocket(token);
      }, 5000);
    }
  };

  // ✅ Handle errors
  ws.onerror = (err) => {
    console.error("❌ WS error:", err.message || err);
    clearInterval(pingInterval);
    ws.close();
  };
};

  // ====================================
  // 🌍 CONTEXT PROVIDER VALUE
  // ====================================
  useEffect(() => {
    if (devices) {
      console.log("[CTX] Devices after update:", devices.map(d => ({ id: d.id || d._id, telemetry: d.telemetry })));
    }
  }, [devices]);

  return (
    <AuthContext.Provider
      value={{
        userToken,
        username,
        devices,
        widgets,
        setWidgets,
        addDevice,
        deleteDevice,
        fetchDevices,
        handleRealtimeMessage, // Expose if needed by components, otherwise can be kept internal
        fetchTelemetry,
        connectWebSocket,
        connectSSE,
        login,
        signup,
        logout,
        isDarkTheme,
        setIsDarkTheme,
        loading,
        lastUpdated,
        wsRef,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
  
                