import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { BASE_URL, WS_URL } from "../screens/config";
import API from "../services/api";

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

        connectWebSocket(data.access_token);

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
        connectWebSocket(data.access_token);
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
      wsRef.current?.close();
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
    }
  };

  // ====================================
  // ⚙️ DEVICES
  // ====================================
  const fetchDevices = async (token = userToken) => {
    try {
      const data = await API.getDevices();
      if (Array.isArray(data)) {
        setDevices(data);
      }
    } catch (err) {
      console.error("Fetch devices failed:", err);
    }
  };

  const addDevice = async (deviceData) => {
    try {
      const data = await API.addDevice(deviceData);
      if (data) {
        setDevices((prev) => [...prev, data]);
        Alert.alert("Device added successfully");
      }
    } catch (err) {
      Alert.alert("Add device failed", err.message);
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
      Alert.alert("Delete failed", err.message || "Failed to delete device");
      throw err;
    }
  };


  // ====================================
  // 🌐 TELEMETRY
  // ====================================
  const fetchTelemetry = async (device_token) => {
    try {
      const json = await API.getTelemetry(device_token);
      return json?.data || {};
    } catch (err) {
      console.error("Fetch telemetry error:", err);
      return {};
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

  // Avoid duplicate connections
  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
    console.log("WebSocket already connected");
    return;
  }

  const ws = new WebSocket(`${WS_URL}?token=${token}`);
  wsRef.current = ws;

  let pingInterval;

  // ✅ Local helper function — must come BEFORE usage
  const updateDeviceStatus = (deviceId, newStatus) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId ? { ...d, status: newStatus } : d
      )
    );
  };

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
      if (!msg || typeof msg !== "object") return;

      console.log("📩 WS message:", msg);

      switch (msg.type) {
        case "status_update":
          updateDeviceStatus(msg.device_id, msg.status);
          // Update lastUpdated to trigger UI refresh
          setLastUpdated(new Date());
          break;

        case "telemetry_update":
          setDevices((prev) =>
            prev.map((d) => {
              const dId = d.id || d._id;
              const msgDeviceId = msg.device_id;
              if (dId === msgDeviceId || String(dId) === String(msgDeviceId)) {
                return { ...d, telemetry: msg.data, lastTelemetry: msg.timestamp };
              }
              return d;
            })
          );

          // ✅ Update widgets linked to this device - handle virtual pins for LEDs
          setWidgets((prev) =>
            prev.map((w) => {
              const wDeviceId = w.device_id;
              const msgDeviceId = msg.device_id;
              if (wDeviceId === msgDeviceId || String(wDeviceId) === String(msgDeviceId)) {
                // For LED widgets, check virtual pin
                if (w.type === "led" && w.virtual_pin && msg.data) {
                  const virtualPinKey = w.virtual_pin.toLowerCase();
                  if (msg.data[virtualPinKey] !== undefined) {
                    return {
                      ...w,
                      value: msg.data[virtualPinKey] ? 1 : 0,
                      latest_telemetry: msg.data,
                    };
                  }
                }
                // For other widgets, update telemetry
                return { ...w, latest_telemetry: msg.data };
              }
              return w;
            })
          );
          break;

        case "widget_update":
          setWidgets((prev) => {
            const exists = prev.some((w) => w._id === msg.widget._id);
            return exists
              ? prev.map((w) =>
                  w._id === msg.widget._id ? { ...w, ...msg.widget } : w
                )
              : [...prev, msg.widget];
          });
          break;

        case "device_added":
          setDevices((prev) =>
            prev.some((d) => d.id === msg.data.id)
              ? prev
              : [...prev, msg.data]
          );
          break;

        case "device_removed":
          // Handle device removal - support both id and _id formats
          const removedDeviceId = msg.device_id || msg.data?.id;
          if (removedDeviceId) {
            setDevices((prev) => 
              prev.filter((d) => {
                const dId = d.id || d._id;
                return dId !== removedDeviceId && String(dId) !== String(removedDeviceId);
              })
            );
            setLastUpdated(new Date());
          }
          break;

        case "notification":
          // Handle notifications from WebSocket (also handled by SSE)
          // This is a backup in case SSE is not available
          if (msg.notification) {
            // Notifications are primarily handled by SSE in NotificationsScreen
            // This is just for logging/debugging
            console.log("📬 Notification via WebSocket:", msg.notification);
          }
          break;

        case "pong":
          // Ignore ping-pong keepalives
          break;

        default:
          console.warn("⚠️ Unknown WS message type:", msg.type);
      }

      // ✅ Timestamp refresh for UI
      setLastUpdated(new Date());
    } catch (err) {
      console.error("❌ WebSocket parse error in DeviceDetailScreen:", err);
      console.log("Raw event data:", event.data);
    }
  };

  // ✅ Handle close (auto reconnect)
  ws.onclose = (e) => {
    console.warn("⚠️ WS closed:", e.code, e.reason);
    clearInterval(pingInterval);

    // Attempt reconnection
    setTimeout(() => {
      console.log("🔄 Reconnecting WebSocket...");
      connectWebSocket(token);
    }, 5000);
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
        fetchTelemetry,
        connectWebSocket,
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
