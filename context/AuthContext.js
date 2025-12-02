import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL, WS_URL } from "../constants/config";
import API from "../services/api";
import { showToast } from "../components/Toast";

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
  const [email, setEmail] = useState(null);
  const [devices, setDevices] = useState([]);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const wsRef = useRef(null);
  const sseAbortController = useRef(null); // For aborting SSE fetch
  const isReconnecting = useRef(true); // Flag to control WS reconnection
  
  const messageListeners = useRef(new Set());
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  // ====================================
  // 🏁 INIT: restore session
  // ====================================
  useEffect(() => {
    const init = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const storedUser = await AsyncStorage.getItem("username");
        const storedEmail = await AsyncStorage.getItem("email");
        const storedTheme = await AsyncStorage.getItem("theme");

        if (storedTheme) {
          setIsDarkTheme(storedTheme === "dark");
        }

        if (token && storedUser && storedEmail) {
          setUserToken(token);
          setUsername(storedUser);
          // Ensure devices are fetched BEFORE connecting to WebSocket
          await fetchDevices(token); 
          connectWebSocket(token);
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const showAlert = (config) => {
    setAlertConfig({
      ...config,
      buttons: config.buttons.map(btn => ({
        ...btn,
        onPress: () => { setAlertVisible(false); btn.onPress?.(); }
      }))
    });
    setAlertVisible(true);
  };
  // ====================================
  // 📡 REAL-TIME MESSAGE SUBSCRIPTION
  // ====================================
  const subscribeToMessages = useCallback((callback) => {
    messageListeners.current.add(callback);
    return () => messageListeners.current.delete(callback); // Return an unsubscribe function
  }, []);


  // ====================================
  // 🔄 PERIODIC DEVICE REFRESH (DISABLED - Using real-time updates only)
  // ====================================
  // Periodic refresh is disabled to rely purely on real-time WebSocket updates
  // Only refresh on app focus or manual refresh
  // Uncomment below if you need periodic sync (e.g., every 5 minutes)
  /*
  useEffect(() => {
    if (!userToken) return;
    
    // Refresh devices every 5 minutes as a safety net (only if needed)
    const refreshInterval = setInterval(() => {
      console.log("[CTX] 🔄 Periodic device refresh (safety net)...");
      fetchDevices(userToken).catch(err => console.error("Periodic device refresh failed:", err));
    }, 300000); // 5 minutes - only as safety net
    
    return () => clearInterval(refreshInterval);
  }, [userToken]);
  */

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
          "username", data.user?.username || usernameInput.trim()
        );
        await AsyncStorage.setItem("email", data.user?.email || "");

        setUserToken(data.access_token);
        setUsername(data.user?.username || usernameInput.trim());
        setEmail(data.user?.email || "");

        // Ensure devices are fetched BEFORE connecting to WebSocket
        await fetchDevices(data.access_token);
        connectWebSocket(data.access_token);

        showAlert({
          type: 'success',
          title: "Login Success",
          message: `Welcome ${data.user?.username || ""}!`,
          buttons: [{ text: "Continue" }]
        });
        navigation?.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      } else {
        throw new Error(data?.detail || "Invalid credentials");
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      showAlert({
        type: 'error', title: "Login Failed", message: err.message || "Check your credentials", buttons: [{ text: "OK" }]
      });
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
        await AsyncStorage.setItem("email", data.user?.email);
        setUserToken(data.access_token);
        setUsername(data.user?.username);
        setEmail(data.user?.email);
        await fetchDevices(data.access_token);
        connectWebSocket(data.access_token); // Use WebSocket for consistency
        showAlert({
          type: 'success', title: "Signup Success", message: "Welcome!", buttons: [{ text: "OK" }]
        });
      } else {
        throw new Error("Signup failed");
      }
    } catch (err) {
      showAlert({
        type: 'error',
        title: "Signup Error",
        message: err.message,
        buttons: [{ text: "OK" }]
      });
    }
  };

  // ====================================
  // 🚪 LOGOUT
  // ====================================
  const logout = async () => {
    try {
      await API.logout();
      isReconnecting.current = false; // Prevent WS from reconnecting on logout
      wsRef.current?.close(4000, "User logged out"); // Use a custom code for intentional closure
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
        "email",
        "refreshToken",
      ]);
      setUserToken(null);
      setUsername(null);
      setEmail(null);
      setDevices([]);
    };
    wsRef.current = null;
  };

  // ====================================
  // 🌗 THEME
  // ====================================
  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkTheme;
      setIsDarkTheme(newTheme);
      await AsyncStorage.setItem("theme", newTheme ? "dark" : "light");
    } catch (err) {
      console.error("Failed to save theme:", err);
      showAlert({
        type: 'error', title: "Error", message: "Could not save theme preference.", buttons: [{ text: "OK" }]
      });
    }
  };

  // ====================================
  // ⚙️ DEVICES
  // ====================================
  const fetchDevices = useCallback(async (token = userToken) => {
    setIsRefreshing(true);
    try {
      const data = await API.getDevices();
      if (Array.isArray(data)) {
        setDevices((prevDevices) => {
          const prevDevicesMap = new Map(
            prevDevices.map((d) => {
              // Create entries for both _id and id to ensure matching works
              const id1 = String(d._id || d.id);
              const id2 = String(d.id || d._id);
              return [[id1, d], [id2, d]];
            }).flat()
          );
          
          const updatedDevices = data.map((serverDev) => {
            // Ensure we have both _id and id for compatibility
            const serverId = String(serverDev._id || serverDev.id);
            const local = prevDevicesMap.get(serverId);
            
            // Preserve telemetry and other local state if it exists
            if (local) {
              // Use server status if it's more recent (device was updated on server)
              // But preserve local telemetry which might be more recent from WebSocket
              const serverStatus = serverDev.status || "offline";
              const localStatus = local.status;
              
              // Use server status if it's "online" (more authoritative) or if local doesn't have status
              const finalStatus = (serverStatus === "online" || !localStatus) ? serverStatus : localStatus;
              
              return {
                ...serverDev,
                // Ensure both _id and id are available for matching
                _id: serverDev._id || serverDev.id,
                id: serverDev.id || serverDev._id,
                // Preserve telemetry if it exists locally (real-time updates)
                telemetry: local.telemetry || serverDev.telemetry || {},
                lastTelemetry: local.lastTelemetry || serverDev.lastTelemetry,
                // Use the most recent status
                status: finalStatus,
                // Use server last_active if it's more recent
                last_active: serverDev.last_active || local.last_active,
              };
            }
            // New device - ensure status is set and both ID fields are available
            return {
              ...serverDev,
              _id: serverDev._id || serverDev.id,
              id: serverDev.id || serverDev._id,
              status: serverDev.status || "offline",
              telemetry: serverDev.telemetry || {},
            };
          });
          
          console.log("[CTX] Devices fetched:", updatedDevices.length, "Statuses:", updatedDevices.map(d => ({ id: d._id || d.id, status: d.status })));
          return updatedDevices;
        });
      }
    } catch (err) {
      console.error("Fetch devices failed:", err);
    } finally {
      setIsRefreshing(false);
    };
  }, [userToken]);

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
          const newDeviceId = String(data.id || data._id);
          const exists = prev.some((d) => {
            const deviceId = String(d.id || d._id);
            return deviceId === newDeviceId || d.device_token === data.device_token;
          });
          
          if (exists) {
            // Update existing device, preserve telemetry if it exists
            return prev.map((d) => {
              const deviceId = String(d.id || d._id);
              if (deviceId === newDeviceId) {
                return {
                  ...data,
                  _id: data._id || data.id,
                  id: data.id || data._id,
                  telemetry: d.telemetry || {},
                  lastTelemetry: d.lastTelemetry,
                  status: d.status || data.status || "offline",
                };
              }
              return d;
            });
          }
          // New device - ensure it has proper initial state and both ID fields
          return [...prev, {
            ...data,
            _id: data._id || data.id,
            id: data.id || data._id,
            status: data.status || "offline",
            telemetry: {},
          }];
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

  const updateDevice = async (deviceId, deviceData) => {
    try {
      if (!deviceData?.name?.trim()) {
        throw new Error("Device name cannot be empty");
      }
      // Assuming you have an API.updateDevice method in your services
      const updatedDevice = await API.updateDevice(deviceId, deviceData);
      if (updatedDevice) {
        setDevices((prev) =>
          prev.map((d) =>
            (d.id || d._id) === (updatedDevice.id || updatedDevice._id)
              ? { ...d, ...updatedDevice }
              : d
          )
        );
        return updatedDevice;
      }
      throw new Error("Invalid response from server on update");
    } catch (err) {
      console.error("Update device error:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Failed to update device";
      throw new Error(errorMessage);
    }
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
      showAlert({
        type: 'error', title: "Delete failed", message: err.message || "Failed to delete device", buttons: [{ text: "OK" }]
      });
      throw err;
    };
  };

  const updateUser = async (userData) => {
    try {
      // Assuming you have an API.updateUser method
      const updatedUser = await API.updateUser(userData);
      if (updatedUser) {
        // Update state and AsyncStorage
        if (updatedUser.username) {
          setUsername(updatedUser.username);
          await AsyncStorage.setItem("username", updatedUser.username);
        }
        if (updatedUser.email) {
          setEmail(updatedUser.email);
          await AsyncStorage.setItem("email", updatedUser.email);
        }
        return updatedUser;
      }
    } catch (err) {
      console.error("Update user error:", err);
      throw new Error(err.response?.data?.detail || "Failed to update profile.");
    }
  };
  // ====================================
  // 🌐 TELEMETRY
  // ====================================
  const fetchTelemetry = async (device_token) => {
    try {
      const json = await API.getTelemetry(device_token);
      // Also update in context
      if (json?.device_id && json?.data) {
        setDevices((prev) =>
          prev.map((d) => {
            const deviceId = String(d.id ?? d._id);
            const jsonDeviceId = String(json.device_id);
            if (deviceId === jsonDeviceId) {
              // Merge with existing telemetry to preserve real-time updates
              const existingTelemetry = d.telemetry || {};
              const updatedDevice = {
                ...d,
                telemetry: { ...existingTelemetry, ...json.data },
                lastTelemetry: json.timestamp || new Date().toISOString(),
                // Update status to online when telemetry is fetched
                status: "online",
                last_active: json.timestamp || new Date().toISOString(),
              };
              
              // Sync common telemetry fields to top level
              if (json.data.temperature !== undefined) {
                updatedDevice.value = json.data.temperature;
                updatedDevice.unit = "°C";
              } else if (json.data.humidity !== undefined) {
                updatedDevice.value = json.data.humidity;
                updatedDevice.unit = "%";
              } else if (json.data.value !== undefined) {
                updatedDevice.value = json.data.value;
              }
              
              console.log("[CTX] Telemetry fetched for device", json.device_id);
              return updatedDevice;
            }
            return d;
          })
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
    if (!msg || typeof msg !== "object") {
      console.warn("[CTX] Invalid message received:", msg);
      return;
    }
    
    let m;
    // Standardize message parsing: unwrap payload or global_event data
    if (msg.type === "global_event" && msg.data) { // For SSE global events
      m = msg.data;
    } else if (msg.payload && typeof msg.payload === "object") { // For messages with a payload wrapper
      m = { ...msg.payload, type: msg.type }; // Combine type with payload content
    } else { // For flat messages (WebSocket direct messages)
      m = msg;
    }

    if (!m || !m.type) {
      console.warn("[CTX] Message missing type:", m);
      return; // Ignore messages without a type after parsing
    }

    // Helper function to normalize device IDs for comparison
    const normalizeDeviceId = (deviceId) => {
      if (!deviceId) return null;
      // Handle both string and ObjectId-like formats
      const str = String(deviceId).trim();
      return str;
    };

    // Helper function to match device IDs - handles both _id and id fields
    const matchesDevice = (device, targetId) => {
      if (!device || !targetId) return false;
      
      // Try multiple ID formats for robust matching
      const deviceId1 = normalizeDeviceId(device.id);
      const deviceId2 = normalizeDeviceId(device._id);
      const target = normalizeDeviceId(targetId);
      
      // Check if any device ID matches the target
      return deviceId1 === target || deviceId2 === target;
    };

    // Log important messages only (skip ping/pong and connected messages)
    if (__DEV__ && m.type !== "pong" && m.type !== "ping" && m.type !== "connected") {
      console.log("[CTX] Processing message type:", m.type, "device_id:", m.device_id);
    }

    // Handle telemetry updates
    if (m.type === "telemetry_update" && m.device_id && m.data) {
      setDevices((prevDevices) => {
        let found = false;
        let deviceName = "Unknown";
        
        const updated = prevDevices.map((d) => {
          if (matchesDevice(d, m.device_id)) {
            found = true;
            deviceName = d.name || "Unknown";
            
            // Preserve existing telemetry and merge new data
            const existingTelemetry = d.telemetry || {};
            const newTelemetry = { ...existingTelemetry, ...m.data };

            // Also update device-level properties if they exist in telemetry
            const updatedDevice = {
              ...d,
              telemetry: newTelemetry,
              lastTelemetry: m.timestamp || new Date().toISOString(),
              // Update status to online when telemetry is received (device is active)
              status: "online",
              last_active: m.timestamp || new Date().toISOString(),
            };

            // Sync top-level `value` if it exists in telemetry, for components like DeviceCard
            if (m.data.value !== undefined) {
              updatedDevice.value = m.data.value;
            }

            // Also sync other common telemetry fields to top level for easier access
            if (m.data.temperature !== undefined) {
              updatedDevice.value = m.data.temperature;
              updatedDevice.unit = "°C";
            } else if (m.data.humidity !== undefined) {
              updatedDevice.value = m.data.humidity;
              updatedDevice.unit = "%";
            }

            if (__DEV__) {
              console.log("[CTX] ✅ Telemetry updated for device", m.device_id, deviceName, "Status: online", Object.keys(m.data));
            }
            return updatedDevice;
          }
          return d;
        });
        
        if (!found) {
          // Only log if this is a persistent issue (device should exist)
          // Don't fetch devices immediately - wait for next natural refresh
          // Real-time updates should handle this via WebSocket
          if (__DEV__) {
            console.warn("[CTX] ⚠️ Telemetry update for device not in current state:", m.device_id);
          }
        }
        
        return updated;
      });
      setLastUpdated(m.timestamp || new Date().toISOString());
    } 
    // Handle status updates (device_status or status_update)
    // Handle initial state sent from backend on WebSocket connect
    else if (m.type === "initial_state" && Array.isArray(m.devices)) {
      console.log("[CTX] ✅ Received initial device state from WebSocket.");
      // This completely replaces the current device list with the authoritative one from the server
      setDevices(m.devices.map(d => ({
        ...d,
        _id: d._id || d.id, // Ensure both ID formats are present
        id: d.id || d._id,
      })));
    } else if ((m.type === "device_status" || m.type === "status_update") && m.device_id) {

      setDevices((prevDevices) => {
        let found = false;
        let deviceName = "Unknown";
        
        const updated = prevDevices.map((d) => {
          if (matchesDevice(d, m.device_id)) {
            found = true;
            deviceName = d.name || "Unknown";
            const updated = {
              ...d,
              status: m.status || d.status || "offline",
              last_active: m.timestamp || m.last_active || d.last_active || new Date().toISOString(),
            };
            if (__DEV__) {
              console.log("[CTX] ✅ Status updated for device", m.device_id, deviceName, "Status:", updated.status);
            }
            return updated;
          }
          return d;
        });
        
        if (!found) {
          // Only log if this is a persistent issue (device should exist)
          // Don't fetch devices immediately - wait for next natural refresh
          // Real-time updates should handle this via WebSocket
          if (__DEV__) {
            console.warn("[CTX] ⚠️ Status update for device not in current state:", m.device_id);
          }
        }
        
        return updated;
      });
    } 
    // Handle ping/pong (ignore)
    else if (m.type === "pong" || m.type === "ping") {
      // Silently ignore ping/pong messages
    } 
    // Log other message types for debugging
    // Handle new notifications
    else if (m.type === "notification" && m.notification) {
      const { title, message } = m.notification;
      showToast.info(title, message, {
        isDarkTheme: isDarkTheme,
      });
    }
    else {
      console.log("[CTX] 📨 Received unhandled message type:", m.type, m);
    }
  };
  
  // This function will be called by the WebSocket onmessage handler
  const broadcastMessage = (msg) => {
    messageListeners.current.forEach(listener => listener(msg));
  };

  // ====================================
  // ⚡ WEBSOCKET
  // ====================================
  // ====================================
// ⚡ WEBSOCKET CONNECTION
// ====================================
const connectWebSocket = (token) => {  
  // Ensure token is a non-empty string before connecting
  if (!token || typeof token !== 'string' || token.trim() === '') {
    console.warn("[WS] Connection attempt aborted: Invalid or empty token.");
    return;
  }
  isReconnecting.current = true; // Allow reconnection for this session

  // Avoid duplicate connections
  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
    console.log("WebSocket already connected");
    return;
  }

  const ws = new WebSocket(`${WS_URL}?token=${token}`);
  wsRef.current = ws;

  let pingInterval = null; // Initialize to null

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
      // Ensure event.data is a non-empty string before parsing
      if (typeof event.data !== 'string' || event.data.trim() === '') {
        console.log("[WS] Received empty or non-string message.");
        return;
      }

      const msg = JSON.parse(event.data);
      
      // Log received messages for debugging
      console.log("[WS] 📨 Received message:", {
        type: msg.type,
        device_id: msg.device_id || 'N/A',
        status: msg.status || 'N/A',
        hasData: !!msg.data,
        dataKeys: msg.data ? Object.keys(msg.data) : []
      });
      
      handleRealtimeMessage(msg); // Handle in AuthContext
      broadcastMessage(msg);      // Broadcast to other listeners (like DashboardContext)
    } catch (err) {
      // Log the raw data for debugging if JSON parsing fails
      console.error("❌ WebSocket JSON parse error:", err.message);
      console.log("Raw WebSocket data:", event.data);
      // Don't throw - continue processing other messages
    }
  };

  // ✅ Handle close (auto reconnect)
  ws.onclose = (e) => {
    console.warn("⚠️ WS closed:", e.code, e.reason);
    if (pingInterval) clearInterval(pingInterval);

    // Do not reconnect if it was an intentional closure (e.g., logout)
    // We use code 4000 in the logout function for this purpose.
    const isIntentionalClosure = e.code === 4000;

    if (isReconnecting.current && !isIntentionalClosure) {
      setTimeout(() => {
        console.log("🔄 Attempting to reconnect WebSocket...");
        // Before reconnecting, try to get a fresh token.
        // The `userToken` state variable is the most up-to-date token.
        AsyncStorage.getItem("userToken").then(freshToken => {
          if (freshToken) {
            console.log("Reconnecting with fresh token.");
            connectWebSocket(freshToken);
          } else {
            console.warn("No token found for WebSocket reconnect. Aborting.");
            logout(); // If no token, log out to be safe.
          }
        });
      }, 5000);
    }
  };

  // ✅ Handle errors
  ws.onerror = (err) => {
    console.error("❌ WS error:", err.message || err);
    if (pingInterval) clearInterval(pingInterval);
    ws.close();
  };
};

  // ====================================
  // 🌍 CONTEXT PROVIDER VALUE
  // ====================================
  useEffect(() => {
    if (devices && __DEV__) {
      console.log("[CTX] Devices state:", devices.map(d => ({ 
        id: d.id || d._id, 
        _id: d._id,
        name: d.name,
        status: d.status,
        hasTelemetry: !!d.telemetry,
        telemetryKeys: d.telemetry ? Object.keys(d.telemetry) : []
      })));
    }
  }, [devices]);

  // While the app is restoring the session from storage, show a loading screen.
  // This prevents the rest of the app from rendering with incomplete auth data.
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }


  return (
    <SafeAreaProvider>
      <AuthContext.Provider
        value={{
          userToken,
          username,
          email,
          devices,
          addDevice,
          updateDevice,
          deleteDevice,
          fetchDevices,
          updateUser,
          handleRealtimeMessage, // Expose if needed by components, otherwise can be kept internal
          fetchTelemetry,
          connectWebSocket,
          connectSSE,
          login,
          signup,
          logout,
          isDarkTheme,
          toggleTheme, // Use the new function
          loading,
          isRefreshing,
          lastUpdated,
          wsRef,
          alertVisible,
          subscribeToMessages,
          alertConfig,
          showAlert,
        }}
      >
        {children}
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
};
  
                