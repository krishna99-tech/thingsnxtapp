import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Platform,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { API_BASE } from "../constants/config";
import { showToast } from "../components/Toast";
import { formatDate } from "../utils/format";
import axios from "axios";
import {
  Wifi,
  AlertTriangle,
  Trash2,
  RefreshCw,
  MapPin,
  Clock,
  Cpu,
  Activity,
  Thermometer,
  Droplets,
  Wind,
  Lightbulb,
  Flame,
  Zap,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#0A0E27",
  card: "#1A1F3A",
  cardBorder: "#252B4A",
  primary: "#00D9FF",
  secondary: "#7B61FF",
  success: "#00FF88",
  warning: "#FFB800",
  danger: "#FF3366",
  text: "#FFFFFF",
  textSecondary: "#8B91A7",
  online: "#00FF88",
  offline: "#FF3366",
};

function getSensorIcon(type, size, color) {
  switch (type) {
    case "temperature":
      return <Thermometer size={size} color={color} />;
    case "humidity":
      return <Droplets size={size} color={color} />;
    case "light":
      return <Lightbulb size={size} color={color} />;
    case "pressure":
      return <Wind size={size} color={color} />;
    case "gas":
      return <Flame size={size} color={color} />;
    case "motion":
    case "door":
    case "smoke":
      return <Zap size={size} color={color} />;
    default:
      return <Activity size={size} color={color} />;
  }
}

function getTimeSince(date) {
  if (!date) return "never";
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function DeviceDetailScreen({ route, navigation }) {
  const { deviceId } = route.params;
  const { devices, deleteDevice, fetchTelemetry, userToken, logout } = useContext(AuthContext);

  // State for modals
  const [widgetModalVisible, setWidgetModalVisible] = useState(false);
  const [dashboardModalVisible, setDashboardModalVisible] = useState(false);
  const [dashboards, setDashboards] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedWidgetType, setSelectedWidgetType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const device = devices.find((d) => String(d.id || d._id) === String(deviceId));

  const sensors = useMemo(() => {
    if (!device?.telemetry) return [];
    return Object.entries(device.telemetry).map(([key, value]) => ({
      id: key,
      type: key, // Assuming type is same as key for icon mapping
      label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value: value,
      unit: key.toLowerCase().includes("temp") ? "°C" : key.toLowerCase().includes("hum") ? "%" : "",
      timestamp: new Date(device.lastTelemetry || device.last_active || Date.now()),
    }));
  }, [device]);

  useEffect(() => {
    if (device) {
      navigation.setOptions({
        headerTitle: device.name,
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.text,
        headerRight: () => (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleRefresh} style={styles.headerButton}>
              <RefreshCw size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteDevice} style={styles.headerButton}>
              <Trash2 size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [device, navigation]);

  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={64} color={COLORS.danger} />
          <Text style={styles.errorTitle}>Device not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleDeleteDevice = () => {
    Alert.alert("Delete Device", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDevice(device.id || device._id);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleRefresh = () => {
    if (!device?.device_token) return;
    setRefreshing(true);
    fetchTelemetry(device.device_token)
      .catch((err) => {
        console.error("Failed to refresh telemetry:", err);
        Alert.alert("Refresh Failed", "Could not fetch latest device data.");
      })
      .finally(() => {
        setRefreshing(false);
      });
  };

  const handleSensorPress = (sensor) => {
    setSelectedSensor(sensor);
    setWidgetModalVisible(true);
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

  const handleWidgetSelect = (type) => {
    setSelectedWidgetType(type);
    setWidgetModalVisible(false);
    fetchDashboards();
    setDashboardModalVisible(true);
  };

  const exportToDashboard = async (dashboardId) => {
    if (!userToken || !selectedSensor || !selectedWidgetType) {
      Alert.alert("Error", "Missing required information.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { label, value } = selectedSensor;

      const payload = {
        dashboard_id: dashboardId,
        device_id: device._id,
        type: selectedWidgetType,
        label: label,
        config: { key: selectedSensor.id }, // Use sensor ID as the key
      };

      if (selectedWidgetType === "led") {
        payload.value = value ? 1 : 0;
      } else {
        payload.value = value;
      }

      await axios.post(`${API_BASE}/widgets`, payload, {
        headers: { Authorization: `Bearer ${userToken}` },
        timeout: 10000,
      });

      setDashboardModalVisible(false);
      setSelectedSensor(null);
      setSelectedWidgetType(null);
      showToast.success(`Widget '${label}' added to dashboard`);
    } catch (err) {
      console.error("Export to dashboard error:", err);

      if (err.response?.status === 401) {
        logout();
        Alert.alert("Session Expired", "Please login again.");
      } else if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        Alert.alert("Timeout", "Request took too long. Please check your connection.");
      } else {
        const errorMessage =
          err.response?.data?.detail || err.message || "Failed to export telemetry";
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColor =
    device.status === "online"
      ? COLORS.online
      : device.status === "offline"
      ? COLORS.offline
      : COLORS.warning;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.deviceIcon}>
              <Cpu size={32} color={COLORS.primary} />
            </View>
            <View style={styles.statusInfo}>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {device.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.deviceType}>{device.type}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <MapPin size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{device.location || "Not set"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Clock size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoLabel}>Last Seen</Text>
              <Text style={styles.infoValue}>{getTimeSince(device.last_active)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Wifi size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoLabel}>IP Address</Text>
              <Text style={styles.infoValue}>{device.ipAddress || "Unknown"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Activity size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoLabel}>Firmware</Text>
              <Text style={styles.infoValue}>
                {device.firmwareVersion || "Unknown"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Access Token</Text>
          </View>
          <View style={styles.tokenCard}>
            <Text selectable style={styles.tokenText}>{device.device_token}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Sensors ({sensors.length})
            </Text>
          </View>
          <View style={styles.sensorsGrid}>
            {sensors.map((sensor) => (
              <TouchableOpacity key={sensor.id} style={styles.sensorCard} activeOpacity={0.8} onPress={() => handleSensorPress(sensor)}>
                <View style={styles.sensorIconContainer}>
                  {getSensorIcon(sensor.type, 24, COLORS.primary)}
                </View>
                <Text style={styles.sensorLabel}>{sensor.label}</Text>
                <View style={styles.sensorValueContainer}>
                  <Text style={styles.sensorValue}>
                    {typeof sensor.value === "number"
                      ? sensor.value.toFixed(sensor.type === "temperature" ? 1 : 0)
                      : String(sensor.value)}
                  </Text>
                  <Text style={styles.sensorUnit}>{sensor.unit}</Text>
                </View>
                <Text style={styles.sensorTimestamp}>
                  Updated {getTimeSince(sensor.timestamp)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {sensors.length === 0 && (
            <View style={styles.emptyState}>
              <Activity size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateText}>No sensors configured</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <Text style={styles.refreshButtonText}>Refresh Telemetry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Widget Type Modal */}
      <Modal visible={widgetModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Add Widget for:</Text>
            <Text style={styles.modalSub}>{selectedSensor?.label}</Text>
            <View style={styles.widgetOptions}>
              {["card", "gauge", "indicator"].map((type) => (
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
                        : "albums-outline"
                    }
                    size={22}
                    color="#007AFF"
                  />
                  <Text style={styles.widgetText}>
                    {type.toUpperCase()}
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
            {isSubmitting ? <ActivityIndicator style={{ marginVertical: 20 }}/> : (
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
                ListEmptyComponent={() => (
                  <Text style={{ textAlign: 'center', color: '#888' }}>No dashboards found.</Text>
                )}
              />
            )}
            <Pressable
              onPress={() => setDashboardModalVisible(false)}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
    marginRight: 8,
  },
  headerButton: {
    padding: 8,
  },
  statusCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 16,
  },
  deviceIcon: {
    width: 64,
    height: 64,
    backgroundColor: "rgba(0, 217, 255, 0.1)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusInfo: {
    flex: 1,
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deviceType: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  infoItem: {
    width: "48%",
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  tokenCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tokenText: {
    fontSize: 14,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
    color: COLORS.primary,
  },
  sensorsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  sensorCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    width: "48%",
    gap: 8,
  },
  sensorIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: "rgba(0, 217, 255, 0.1)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  sensorLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
  },
  sensorValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  sensorValue: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.primary,
  },
  sensorUnit: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sensorTimestamp: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  refreshButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  refreshButtonText: {
    color: COLORS.background,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.background,
  },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalView: { width: "85%", backgroundColor: "#1F2937", borderRadius: 16, padding: 20, elevation: 6 },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: '#FFF', marginBottom: 10, textAlign: 'center' },
  modalSub: { color: "#D1D5DB", marginBottom: 12, textAlign: "center", fontSize: 16 },
  widgetOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  widgetOption: {
    width: "40%",
    margin: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  widgetText: {
    color: "#00D9FF",
    fontWeight: "bold",
    marginTop: 4
  },
  dashboardItem: {
    backgroundColor: "#374151",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  dashboardName: {
    fontWeight: "bold",
    fontSize: 16,
    color: '#FFF'
  },
  dashboardDesc: {
    color: "#9CA3AF",
    fontSize: 14
  },
  cancelText: {
    color: "#00D9FF",
    textAlign: "center",
    marginTop: 10,
    fontSize: 16,
    padding: 8
  },
});
