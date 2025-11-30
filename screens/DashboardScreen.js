
import React, { useEffect, useRef, useContext, useState, useMemo,useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Animated,
  RefreshControl,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { API_BASE } from "../constants/config";

// 🧩 Widget components
import CardWidget from "../components/CardWidget";
import GaugeWidget from "../components/GaugeWidget";
import IndicatorWidget from "../components/IndicatorWidget";
import LEDControlWidget from "../components/LEDControlWidget";
import { showToast } from "../components/Toast";
import { formatDate } from "../utils/format";

export default function DashboardScreen({ route, navigation }) {
  const { dashboard } = route.params || {};
  const { userToken, logout, wsRef, devices, isDarkTheme } =
    useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState([]); // Use local state for widgets
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const mountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const [addLedModalVisible, setAddLedModalVisible] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [ledLabel, setLedLabel] = useState("");
  const [creatingLed, setCreatingLed] = useState(false);

  // Theme-based styles
  const themeStyles = {
    gradient: isDarkTheme ? ["#0f2027", "#203a43", "#2c5364"] : ["#e6f3ff", "#ffffff"],
    header: {
      backgroundColor: isDarkTheme ? "rgba(0,0,0,0.3)" : "#ffffffcc",
    },
    title: { color: isDarkTheme ? "#FFFFFF" : "#111" },
    subtitle: { color: isDarkTheme ? "#CCCCCC" : "#555" },
    modalCard: {
      backgroundColor: isDarkTheme ? "#2C2C2C" : "#fff",
    },
    modalTitle: { color: isDarkTheme ? "#FFFFFF" : "#0f172a" },
    modalSubtitle: { color: isDarkTheme ? "#A0A0A0" : "#475569" },
    modalLabel: { color: isDarkTheme ? "#E0E0E0" : "#1f2937" },
    deviceRow: { backgroundColor: isDarkTheme ? "#1E1E1E" : "#f8fafc" },
    deviceName: { color: isDarkTheme ? "#FFFFFF" : "#0f172a" },
    deviceToken: { color: isDarkTheme ? "#A0A0A0" : "#475569" },
    input: { color: isDarkTheme ? "#FFFFFF" : "#111827", borderColor: isDarkTheme ? "#444" : "#cbd5f5" },
  };

  // 🧹 Delete dashboard
  const handleDeleteDashboard = () => {
    Alert.alert("Delete Dashboard", "Delete this dashboard?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API_BASE}/dashboards/${dashboard._id}`, {
              headers: { Authorization: `Bearer ${userToken}` },
            });
            showToast.success("Dashboard removed successfully");
            navigation.goBack();
          } catch (err) {
            console.error("❌ Delete dashboard error:", err);
            if (err.response?.status === 401) logout();
            showToast.error("Failed to delete dashboard");
          }
        },
      },
    ]);
  };

  // 🧩 Map devices to tokens (for LED widgets)
  const fetchDevicesMap = async () => {
    try {
      const res = await axios.get(`${API_BASE}/devices`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      return res.data.reduce((map, d) => {
        map[d._id] = d.device_token;
        return map;
      }, {});
    } catch (err) {
      console.error("❌ Fetch devices error:", err);
      if (err.response?.status === 401) logout();
      return {};
    }
  };

  // 📦 Fetch widgets
  const fetchWidgets = useCallback(async () => {
    if (isFetchingRef.current || !userToken || !dashboard?._id) return;
    isFetchingRef.current = true;
  
    try {
      if (!refreshing) setLoading(true);
      console.log("📡 Fetching widgets for dashboard:", dashboard._id);

      const deviceMap = await fetchDevicesMap();
      const res = await axios.get(`${API_BASE}/widgets/${dashboard._id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
  
      const fetched =
        Array.isArray(res.data) ? res.data : res.data.widgets || [];

      if (!Array.isArray(fetched)) {
        console.error("❌ Invalid widgets format from API:", res.data);
        return;
      }
  
      const processed = fetched
        .map((w, i) => {
          const id = w._id?.toString?.() || `temp-${dashboard._id}-${i}`;
          const ledValue =
            typeof w.value === "number"
              ? w.value
              : w.value
              ? 1
              : 0;
          return {
            ...w,
            _id: id, // ✅ Ensure stable string ID
            device_token:
              w.type === "led" && w.device_id
                ? deviceMap[w.device_id] || null
                : null,
            value:
              w.type === "led"
                ? ledValue
                : w.value ?? "--",
            virtual_pin: w.config?.virtual_pin,
          };
        })
        .filter((w) => w.type !== "led" || w.device_token);
  
      if (mountedRef.current) {
        console.log("✅ Widgets loaded:", processed.length);
        setWidgets(processed);
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.5,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (err) {
      console.error("❌ Fetch widgets error:", err);
      if (err.response?.status === 401) logout();
      showToast.error("Failed to load widgets.");
    } finally {
      isFetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userToken, dashboard?._id, refreshing, setWidgets, mountedRef, isFetchingRef, logout]);

  // 📡 WebSocket listener for telemetry + widget updates
  useEffect(() => {
    if (!wsRef?.current || !dashboard?._id) return;
  
    const handleWSMessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "widget_update" && String(msg.dashboard_id) === String(dashboard._id)) {
          setWidgets((prev) => {
            const found = prev.some((w) => String(w._id) === String(msg.widget._id));
            if (found) {
              return prev.map((w) => {
                if (String(w._id) === String(msg.widget._id)) {
                  // For LED widgets, ensure value is properly set
                  const updated = { ...w, ...msg.widget };
                  if (updated.type === "led" && updated.value !== undefined) {
                    updated.value = updated.value ? 1 : 0;
                  }
                  // Ensure virtual_pin is preserved
                  if (updated.config?.virtual_pin) {
                    updated.virtual_pin = updated.config.virtual_pin;
                  }
                  return updated;
                }
                return w;
              });
            }
            return [...prev, msg.widget];
          });
        } else if (
          (msg.type === "led_schedule_executed" ||
            msg.type === "led_schedule_cancelled") &&
          String(msg.dashboard_id) === String(dashboard._id)
        ) {
          // Update schedules via WebSocket, no need to refetch
          // The LED widget will handle schedule updates internally
        } else if (msg.type === "widget_deleted" && String(msg.dashboard_id) === String(dashboard._id)) {
          // Remove deleted widget from state immediately
          setWidgets((prev) => prev.filter((w) => String(w._id) !== String(msg.widget_id)));
        } else if (msg.type === "telemetry_update" && msg.device_id) {
          setWidgets((prev) =>
            prev.map((w) => {
              const wDeviceId = w.device_id;
              const msgDeviceId = msg.device_id;
              // Match device IDs using robust String check
              if (String(wDeviceId) === String(msgDeviceId)) {
                // Handle LED widgets with virtual pins - strict virtual pin matching
                if (w.type === "led" && w.virtual_pin) {
                  const virtualPinKey = w.virtual_pin.toLowerCase();
                  // Only update if this specific virtual pin is in the data
                  if (msg.data && msg.data[virtualPinKey] !== undefined) {
                    const newValue = msg.data[virtualPinKey];
                    const currentValue = w.value ? 1 : 0;
                    // Only update if value actually changed to prevent flickering
                    if (newValue !== currentValue) {
                      console.log(`📊 Dashboard: Updating LED widget ${w._id} (${virtualPinKey}) to ${newValue ? "ON" : "OFF"}`);
                      return {
                        ...w,
                        value: newValue ? 1 : 0,
                      };
                    }
                  }
                  // Don't update if virtual pin doesn't match
                  return w;
                }
                // Handle other widgets with config keys
                else {
                  const key = w.config?.key;
                  if (key && msg.data && key in msg.data) {
                    const newValue = msg.data[key];
                    return {
                      ...w,
                      value: newValue,
                      telemetry: { ...w.telemetry, [key]: newValue },
                    };
                  }
                }
              }
              return w;
            })
          );
        }
      } catch (err) {
        console.error("⚠️ WS parse error:", err);
      }
    };

    const socket = wsRef.current;
    socket.addEventListener("message", handleWSMessage);
    return () => socket.removeEventListener("message", handleWSMessage);
  }, [dashboard?._id, wsRef, setWidgets]); // Dependencies are correct here
  
  // 🧭 Fetch widgets on mount and when focused
  useEffect(() => {
    mountedRef.current = true;
    fetchWidgets(); // Initial fetch
    return () => { mountedRef.current = false; };
  }, [fetchWidgets]); // Now depends on the stable fetchWidgets function

  const onRefresh = () => {
    setRefreshing(true);
    fetchWidgets();
  };

  const handleOpenAddLed = () => {
    if (!devices || devices.length === 0) {
      Alert.alert("No devices", "Add a device first before creating LED widgets.");
      return;
    }
    setSelectedDeviceId(devices[0]?._id || null);
    setLedLabel("");
    setAddLedModalVisible(true);
  };

  const handleCreateLedWidget = async () => {
    if (!selectedDeviceId) {
      Alert.alert("Select a device", "Please choose a device for the LED widget.");
      return;
    }
    
    // Prevent duplicate submissions
    if (creatingLed) {
      return;
    }
    
    try {
      setCreatingLed(true);
      const response = await axios.post(
        `${API_BASE}/widgets`,
        {
          dashboard_id: dashboard._id,
          device_id: selectedDeviceId,
          type: "led",
          label: ledLabel?.trim() || "LED Control",
          value: 0,
        },
        { 
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 10000, // 10 second timeout
        }
      );
      
      // Add widget to state immediately for optimistic update
      if (response.data) {
        const newWidget = {
          ...response.data,
          _id: response.data._id || response.data.id || `temp-led-${Date.now()}`,
          device_token: devices.find((d) => d._id === selectedDeviceId)?.device_token || null,
          virtual_pin: response.data.config?.virtual_pin,
        };
        setWidgets((prev) => {
          // Check if widget already exists
          const exists = prev.some((w) => String(w._id) === String(newWidget._id));
          if (exists) {
            return prev.map((w) => String(w._id) === String(newWidget._id) ? newWidget : w);
          }
          return [...prev, newWidget];
        });
      }
      
      setAddLedModalVisible(false);
      setLedLabel("");
      setSelectedDeviceId(null);
      
      // Optionally refetch to ensure consistency
      setTimeout(() => {
        fetchWidgets();
      }, 500);
      
      showToast.success("LED widget created successfully.");
    } catch (err) {
      console.error("❌ Create LED widget error:", err);
      
      if (err.response?.status === 401) {
        logout();
        showToast.error("Session Expired", "Please login again.");
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        showToast.error("Timeout", "Request took too long. Please check your connection.");
      } else {
        const errorMessage = err.response?.data?.detail || err.message || "Failed to create LED widget";
        showToast.error("Error", errorMessage);
      }
    } finally {
      setCreatingLed(false);
    }
  };

  const availableDevices = useMemo(
    () => (Array.isArray(devices) ? devices : []),
    [devices]
  );

  useEffect(() => {
    if (
      addLedModalVisible &&
      availableDevices.length > 0 &&
      !selectedDeviceId
    ) {
      setSelectedDeviceId(availableDevices[0]._id);
    }
  }, [addLedModalVisible, availableDevices, selectedDeviceId]);

  // 🗑️ Delete widget
  const handleDeleteWidget = (widgetId) => {
    Alert.alert("Delete Widget", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API_BASE}/widgets/${widgetId}`, {
              headers: { Authorization: `Bearer ${userToken}` },
            });
            setWidgets((prev) => prev.filter((w) => String(w._id) !== String(widgetId)));
            showToast.success("Widget deleted successfully");
          } catch (err) {
            console.error("❌ Delete widget error:", err);
            if (err.response?.status === 401) logout();
            showToast.error("Failed to delete widget");
          }
        },
      },
    ]);
  };

  const handleWidgetLongPress = (widgetId) => {
    Alert.alert("Widget Options", "Manage this widget", [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: () => console.log("Edit widget:", widgetId) },
      { text: "Delete", onPress: () => handleDeleteWidget(widgetId) },
    ]);
  };

  const renderWidget = ({ item }) => {
    const commonProps = {
      title: item.label || "Unnamed",
      value: item.value ?? "--",
      icon: item.icon || "speedometer-outline",
    };

    let component;
    switch (item.type) {
      case "gauge":
        component = <GaugeWidget {...commonProps} />;
        break;
      case "indicator":
        component = <IndicatorWidget {...commonProps} />;
        break;
      case "led":
        component = (
          <LEDControlWidget
            title={item.label || "LED Control"}
            widgetId={item._id}
            deviceId={item.device_id}
            deviceToken={item.device_token}
            virtualPin={item.virtual_pin}
            nextSchedule={item.next_schedule}
            initialState={!!item.value}
            onLongPress={() => handleWidgetLongPress(item._id)}
            onDelete={() => handleDeleteWidget(item._id)}
          />
        );
        break;
      default:
        component = <CardWidget {...commonProps} />;
        break;
    }

    return (
      item.type === "led" ? (
        <View style={styles.widgetItem}>{component}</View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          delayLongPress={600}
          onLongPress={() => handleWidgetLongPress(item._id)}
          style={styles.widgetItem}
        >
          {component}
        </TouchableOpacity>
      )
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={themeStyles.gradient} style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={themeStyles.gradient} style={styles.container}>
      <View style={[styles.header, themeStyles.header]}>
        <View>
          <Text style={[styles.title, themeStyles.title]}>{dashboard?.name || "Dashboard"}</Text>
          <Text style={[styles.subtitle, themeStyles.subtitle]}>
            {dashboard?.description || "Monitor your devices"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={handleOpenAddLed}
          >
            <Ionicons name="bulb-outline" size={22} color="#007AFF" />
            <Text style={styles.headerActionText}>Add LED</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleDeleteDashboard}
          >
            <Ionicons name="trash-outline" size={26} color="#ff3b30" />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <FlatList
          data={widgets}
          renderItem={renderWidget}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.widgetGrid}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#007AFF"]}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="bulb-outline" size={50} color="#666" />
              <Text style={styles.placeholder}>
                No widgets yet. Add one from the dashboard editor.
              </Text>
            </View>
          )}
        />
      </Animated.View>

      <Modal
        visible={addLedModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddLedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, themeStyles.modalCard]}>
            <Text style={[styles.modalTitle, themeStyles.modalTitle]}>Add LED Widget</Text>
            <Text style={[styles.modalSubtitle, themeStyles.modalSubtitle]}>
              Choose a device to control its LED. Each widget gets a unique virtual pin automatically.
            </Text>

            <Text style={[styles.modalLabel, themeStyles.modalLabel]}>Select Device</Text>
            <ScrollView style={styles.deviceList}>
              {availableDevices.map((device) => {
                const isSelected = selectedDeviceId === device._id;
                return (
                  <TouchableOpacity
                    key={device._id}
                    style={[styles.deviceRow, themeStyles.deviceRow,
                      styles.deviceRow,
                      isSelected && styles.deviceRowSelected,
                    ]}
                    onPress={() => setSelectedDeviceId(device._id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.deviceName, themeStyles.deviceName]}>
                        {device.name || "Unnamed Device"}
                      </Text>
                      <Text style={[styles.deviceToken, themeStyles.deviceToken]}>
                        Token: {device.device_token}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.modalLabel, themeStyles.modalLabel]}>Widget Label</Text>
            <TextInput
              style={[styles.input, themeStyles.input]}
              placeholder="Living room LED"
              value={ledLabel}
              onChangeText={setLedLabel}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setAddLedModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={handleCreateLedWidget}
                disabled={creatingLed}
              >
                <Text style={styles.modalConfirmText}>
                  {creatingLed ? "Adding..." : "Add Widget"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// 💅 Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#ffffffcc",
    elevation: 6,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#111" },
  subtitle: { fontSize: 14, color: "#555", marginTop: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  headerActionText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#0369a1",
  },
  headerIconBtn: { padding: 6 },
  widgetGrid: { padding: 12, paddingBottom: 60 },
  row: { justifyContent: "space-around" },
  widgetItem: { margin: 8 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  placeholder: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    fontStyle: "italic",
    marginTop: 10,
  },
  loader: { marginTop: 80 },
  loadingText: { color: "#666", textAlign: "center", marginTop: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "#0f172a" },
  modalSubtitle: {
    fontSize: 14,
    color: "#475569",
    marginVertical: 10,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 14,
    marginBottom: 6,
  },
  deviceList: { maxHeight: 200 },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  deviceRowSelected: {
    borderWidth: 1,
    borderColor: "#3b82f6",
    backgroundColor: "#dbeafe",
  },
  deviceName: {
    fontWeight: "600",
    color: "#0f172a",
  },
  deviceToken: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: "#111827",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 18,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancel: { backgroundColor: "#e2e8f0" },
  modalConfirm: { backgroundColor: "#2563eb" },
  modalCancelText: { color: "#1e293b", fontWeight: "600" },
  modalConfirmText: { color: "#fff", fontWeight: "700" },
});
