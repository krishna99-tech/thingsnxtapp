import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Pressable,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { API_BASE } from "../screens/config";

export default function DeviceDetailScreen({ route, navigation }) {
  const { device } = route.params;
  const { devices, fetchTelemetry, deleteDevice, userToken, wsRef } = useContext(AuthContext);

  const [telemetry, setTelemetry] = useState(device.telemetry || null);
  const [loading, setLoading] = useState(false);
  const [dashboards, setDashboards] = useState([]);
  const [selectedTelemetry, setSelectedTelemetry] = useState(null);
  const [widgetModalVisible, setWidgetModalVisible] = useState(false);
  const [dashboardModalVisible, setDashboardModalVisible] = useState(false);
  const [selectedWidgetType, setSelectedWidgetType] = useState(null);

  // Update telemetry when devices change
  useEffect(() => {
    const currentDevice = devices.find((d) => d._id === device._id);
    if (currentDevice?.telemetry) setTelemetry(currentDevice.telemetry);
  }, [devices, device._id]);

  // Listen for live telemetry updates via WebSocket
  useEffect(() => {
    if (!wsRef || !wsRef.current) return;

    const handleWSMessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "telemetry_update" && msg.device_id === device._id) {
          setTelemetry(msg.data);
          console.log("📡 Live telemetry updated:", msg.data);
        }
      } catch (err) {
        console.error("WS parse error in DeviceDetailScreen:", err);
      }
    };

    wsRef.current.addEventListener("message", handleWSMessage);

    return () => {
      if (wsRef.current) {
        wsRef.current.removeEventListener("message", handleWSMessage);
      }
    };
  }, [device._id, wsRef]);

  const handleFetchTelemetry = async () => {
    try {
      setLoading(true);
      const data = await fetchTelemetry(device.device_token);
      if (data) {
        setTelemetry(data);
        console.log("📡 Telemetry fetched:", data);
      } else {
        Alert.alert("No Data", "No telemetry found for this device.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to fetch telemetry");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Device", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const deviceId = device._id || device.id;
            await deleteDevice(deviceId);
            Alert.alert("✅ Success", "Device deleted successfully");
            navigation.goBack();
          } catch (err) {
            console.error("Delete device error:", err);
            // Error alert is already shown in deleteDevice
          }
        },
      },
    ]);
  };

  const renderTelemetryData = (data) => {
    if (!data) return [];
    const items = [];
    const traverse = (obj, prefix = "") => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === "object" && !Array.isArray(value)) {
          traverse(value, fullKey);
        } else {
          items.push([fullKey, value]);
        }
      });
    };
    traverse(data);
    return items;
  };

  const handleTelemetryPress = (key, value) => {
    setSelectedTelemetry({ key, value });
    setWidgetModalVisible(true);
  };

  const handleWidgetSelect = (type) => {
    setSelectedWidgetType(type);
    setWidgetModalVisible(false);
    fetchDashboards();
    setDashboardModalVisible(true);
  };

  const fetchDashboards = async () => {
    if (!userToken) {
      Alert.alert("Session expired", "Please login again.");
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/dashboards`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setDashboards(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not load dashboards");
    }
  };

  const exportToDashboard = async (dashboardId) => {
    if (!userToken || !selectedTelemetry || !selectedWidgetType) {
      Alert.alert("Error", "Missing required information.");
      return;
    }
    
    try {
      const { key, value } = selectedTelemetry;

      const payload = {
        dashboard_id: dashboardId,
        device_id: device._id,
        type: selectedWidgetType,
        label: key,
      };

      if (selectedWidgetType === "led") {
        payload.value = value ? 1 : 0;
      } else {
        payload.value = value;
        payload.config = { key };
      }

      await axios.post(
        `${API_BASE}/widgets`,
        payload,
        { 
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 10000, // 10 second timeout
        }
      );

      setDashboardModalVisible(false);
      setSelectedTelemetry(null);
      setSelectedWidgetType(null);
      Alert.alert("✅ Success", `Widget '${key}' added to dashboard`);
    } catch (err) {
      console.error("Export to dashboard error:", err);
      
      if (err.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again.");
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        Alert.alert("Timeout", "Request took too long. Please check your connection.");
      } else {
        const errorMessage = err.response?.data?.detail || err.message || "Failed to export telemetry";
        Alert.alert("Error", errorMessage);
      }
    }
  };

  return (
    <LinearGradient colors={["#1f4037", "#99f2c8"]} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{device.name}</Text>
        <Text style={styles.label}>Status: {device.status}</Text>

        <Text style={styles.label}>Access Token:</Text>
        <Text selectable style={styles.tokenBox}>
          {device.device_token}
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleFetchTelemetry}>
          <Ionicons name="bar-chart-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Fetch Telemetry</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : telemetry && Object.keys(telemetry).length > 0 ? (
          <ScrollView style={styles.telemetryBox}>
            {renderTelemetryData(telemetry).map(([key, value]) => (
              <TouchableOpacity
                key={key}
                style={styles.telemetryRow}
                onPress={() => handleTelemetryPress(key, value)}
              >
                <Text style={styles.telemetryKey}>{key}</Text>
                <Text style={styles.telemetryValue}>
                  {key.toLowerCase().includes("timestamp")
                    ? new Date(value).toLocaleString()
                    : String(value)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.note}>No telemetry data yet.</Text>
        )}

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.deleteText}>Delete Device</Text>
        </TouchableOpacity>
      </View>

      {/* Widget Modal */}
      <Modal visible={widgetModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Add Widget for:</Text>
            <Text style={styles.modalSub}>{selectedTelemetry?.key}</Text>
            <View style={styles.widgetOptions}>
              {["card", "gauge", "indicator", "led"].map((type) => (
                <Pressable
                  key={type}
                  style={styles.widgetOption}
                  onPress={() => handleWidgetSelect(type)}
                >
                  <Ionicons
                    name={
                      type === "gauge"
                        ? "speedometer-outline"
                        : type === "indicator"
                        ? "radio-button-on-outline"
                        : type === "led"
                        ? "bulb-outline"
                        : "albums-outline"
                    }
                    size={22}
                    color="#007AFF"
                  />
                  <Text style={styles.widgetText}>
                    {type === "led" ? "LED" : type.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setWidgetModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Dashboard Selection Modal */}
      <Modal visible={dashboardModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Select Dashboard</Text>
            <FlatList
              data={dashboards}
              keyExtractor={(item) => item._id.toString()}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.dashboardItem}
                  onPress={() => exportToDashboard(item._id)}
                >
                  <Text style={styles.dashboardName}>{item.name}</Text>
                  <Text style={styles.dashboardDesc}>{item.description}</Text>
                </Pressable>
              )}
            />
            <Pressable onPress={() => setDashboardModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  card: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 20,
    width: "95%",
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 15 },
  label: { color: "#eee", fontSize: 16, marginBottom: 8 },
  tokenBox: {
    backgroundColor: "#ffffff22",
    color: "#fff",
    padding: 10,
    borderRadius: 10,
    fontFamily: "monospace",
    marginBottom: 15,
  },
  button: {
    flexDirection: "row",
    backgroundColor: "#22c55e",
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: { color: "#fff", marginLeft: 6, fontWeight: "bold" },
  telemetryBox: { marginTop: 10, maxHeight: 350 },
  telemetryRow: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  telemetryKey: { color: "#fff", fontWeight: "bold" },
  telemetryValue: { color: "#d4d4d4", fontSize: 15 },
  note: { color: "#ccc", textAlign: "center", marginVertical: 10 },
  deleteButton: {
    flexDirection: "row",
    backgroundColor: "#ef4444",
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  deleteText: { color: "#fff", marginLeft: 6, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalView: { width: "85%", backgroundColor: "#fff", borderRadius: 16, padding: 20, elevation: 6 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  modalSub: { color: "#333", marginBottom: 12, textAlign: "center" },
  // ✅ FIXED: Widget option layout
  widgetOptions: {
    flexDirection: "row",
    flexWrap: "wrap",        // allows wrapping to next row
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },

  widgetOption: {
    width: "40%",            // two items per row
    margin: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },

  widgetText: { 
    color: "#007AFF", 
    fontWeight: "bold", 
    marginTop: 4 
  },

  dashboardItem: { backgroundColor: "#f0f0f0", padding: 12, borderRadius: 10, marginBottom: 8 },
  dashboardName: { fontWeight: "bold", fontSize: 16 },
  dashboardDesc: { color: "#555", fontSize: 14 },
  cancelText: { color: "#007AFF", textAlign: "center", marginTop: 10, fontSize: 16 },
});
