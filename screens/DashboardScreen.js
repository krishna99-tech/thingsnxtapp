import React, { useEffect, useRef, useContext, useState, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DraggableGrid } from "react-native-draggable-grid";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import { DashboardProvider, useDashboard } from "../context/DashboardContext";

import CustomAlert from "../components/CustomAlert";
// 🧩 Widget components
import CardWidget from "../components/CardWidget";
import GaugeWidget from "../components/GaugeWidget";
import IndicatorWidget from "../components/IndicatorWidget";
import LEDControlWidget from "../components/LEDControlWidget";
import ChartWidget from "../components/ChartWidget";
import { showToast } from "../components/Toast";
import { formatDate } from "../utils/format";
import { moderateScale } from "../utils/scaling";

// 🎯 Memoized Widget Component - Prevents unnecessary re-renders
const MemoizedWidget = memo(({ 
  item, 
  editMode, 
  isDarkTheme,
  onWidgetLongPress,
  onDeleteWidget,
  onResizeWidget
}) => {
  if (!item) return null;

  // Select the correct component
  let component = null;

  switch (item.type) {
    case "gauge":
      component = (
        <GaugeWidget
          title={item.label}
          value={item.value}
          telemetry={item.telemetry?.[item.config?.key]}
        />
      );
      break;

    case "indicator":
      component = (
        <IndicatorWidget
          title={item.label}
          value={item.value}
          telemetry={item.telemetry?.[item.config?.key]}
        />
      );
      break;

    case "led":
      component = (
        <LEDControlWidget
          title={item.label}
          widgetId={item._id}
          deviceId={item.device_id}
          deviceToken={item.device_token}
          virtualPin={item.virtual_pin}
          initialState={!!item.value}
          nextSchedule={item.next_schedule}
          onLongPress={() => onWidgetLongPress(item._id)}
          onDelete={() => onDeleteWidget(item._id)}
        />
      );
      break;

    case "chart":
      component = (
        <ChartWidget
          title={item.label}
          deviceId={item.device_id}
          config={item.config}
          isDarkTheme={isDarkTheme}
          lastUpdated={item.lastUpdated}
        />
      );
      break;

    default:
      component = (
        <CardWidget
          title={item.label}
          value={item.value}
          telemetry={item.telemetry?.[item.config?.key]}
          isDarkTheme={isDarkTheme}
        />
      );
  }

  const isLarge = item.width === 2;

  return (
    <View style={[styles.widgetWrapper, isLarge && styles.widgetWrapperLarge]}>
      <View style={{ flex: 1 }}>
        {component}
      </View>

      {editMode && (
        <View style={styles.editOverlay}>
          {/* Resize */}
          <TouchableOpacity
            style={styles.resizeHandle}
            onPress={() => onResizeWidget(item._id, item.width)}
          >
            <Ionicons
              name={isLarge ? "contract-outline" : "expand-outline"}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            style={styles.deleteHandle}
            onPress={() => onDeleteWidget(item._id)}
            onPressIn={(e) => e.stopPropagation()}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.item._id === nextProps.item._id &&
    prevProps.item.value === nextProps.item.value &&
    prevProps.item.width === nextProps.item.width &&
    prevProps.item.height === nextProps.item.height &&
    prevProps.item.next_schedule === nextProps.item.next_schedule &&
    prevProps.item.lastUpdated === nextProps.item.lastUpdated &&
    prevProps.editMode === nextProps.editMode &&
    prevProps.isDarkTheme === nextProps.isDarkTheme
  );
});

// 🎯 Main Dashboard Component
function DashboardContent({ route, navigation }) {
  const { dashboard } = route.params || {};
  const { logout, devices, isDarkTheme } = useContext(AuthContext);
  const { widgets, setWidgets, loading, refreshing, onRefresh, fetchWidgets } = useDashboard();

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [addLedModalVisible, setAddLedModalVisible] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [ledLabel, setLedLabel] = useState("");
  const [creatingLed, setCreatingLed] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const insets = useSafeAreaInsets();

  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Theme-based styles
  const themeStyles = useMemo(() => ({
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
  }), [isDarkTheme]);

  // 🧹 Delete dashboard
  const handleDeleteDashboard = useCallback(() => {
    setAlertConfig({
      type: 'confirm',
      title: "Delete Dashboard",
      message: "Are you sure you want to delete this dashboard?",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setAlertVisible(false);
            try {
              await api.deleteDashboard(dashboard._id);
              showToast.success("Dashboard removed successfully");
              navigation.goBack();
            } catch (err) {
              console.error("❌ Delete dashboard error:", err);
              if (err.response?.status === 401) logout();
              showToast.error("Failed to delete dashboard");
            }
          },
        },
      ],
    });
    setAlertVisible(true);
  }, [dashboard._id, logout, navigation]);

  const handleOpenAddLed = useCallback(() => {
    if (!devices || devices.length === 0) {
      setAlertConfig({
        type: 'warning', 
        title: "No devices", 
        message: "Add a device first before creating LED widgets.", 
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }
    setSelectedDeviceId(devices[0]?._id || null);
    setLedLabel("");
    setAddLedModalVisible(true);
  }, [devices]);

  const handleCreateLedWidget = useCallback(async () => {
    if (!selectedDeviceId) {
      setAlertConfig({
        type: 'warning', 
        title: "Select a device", 
        message: "Please choose a device for the LED widget.", 
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }
    
    if (creatingLed) return;
    
    try {
      setCreatingLed(true);
      const newWidgetData = await api.addWidget({
        dashboard_id: dashboard._id,
        device_id: selectedDeviceId,
        type: "led",
        label: ledLabel?.trim() || "LED Control",
        value: 0,
      });

      if (newWidgetData) {
        const newWidget = {
          ...newWidgetData,
          _id: newWidgetData._id || newWidgetData.id || `temp-led-${Date.now()}`,
          device_token: devices.find((d) => d._id === selectedDeviceId)?.device_token || null,
          virtual_pin: newWidgetData.config?.virtual_pin,
          key: (newWidgetData._id || newWidgetData.id || `temp-led-${Date.now()}`).toString(),
          width: newWidgetData.width || 1,
          height: newWidgetData.height || 1,
        };
        
        setWidgets((prev) => {
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
  }, [selectedDeviceId, creatingLed, dashboard._id, ledLabel, devices, fetchWidgets, logout]);

  const availableDevices = useMemo(
    () => (Array.isArray(devices) ? devices : []),
    [devices]
  );

  useEffect(() => {
    if (addLedModalVisible && availableDevices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(availableDevices[0]._id);
    }
  }, [addLedModalVisible, availableDevices, selectedDeviceId]);

  // 🗑️ Delete widget
  const handleDeleteWidget = useCallback((widgetId) => {
    setAlertConfig({
      type: 'confirm',
      title: "Delete Widget",
      message: "Are you sure you want to delete this widget?",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setAlertVisible(false);
            try {
              await api.deleteWidget(widgetId);
              setWidgets((prev) => prev.filter((w) => String(w._id) !== String(widgetId)));
              showToast.success("Widget deleted successfully");
            } catch (err) {
              console.error("❌ Delete widget error:", err);
              if (err.response?.status === 401) logout();
              showToast.error("Failed to delete widget");
            }
          },
        },
      ],
    });
    setAlertVisible(true);
  }, [logout]);

  const handleWidgetLongPress = useCallback((widgetId) => {
    setAlertConfig({
      type: 'confirm',
      title: "Widget Options",
      message: "What would you like to do with this widget?",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        { text: "Edit", onPress: () => {
            setAlertVisible(false);
            console.log("Edit widget:", widgetId);
            showToast.info("Coming Soon!", "Editing widgets will be available in a future update.");
          }
        },
        { text: "Delete", style: "destructive", onPress: () => {
            setAlertVisible(false);
            handleDeleteWidget(widgetId);
          }
        },
      ]
    });
    setAlertVisible(true);
  }, [handleDeleteWidget]);

  const handleSaveLayout = useCallback(async () => {
    if (!hasChanges) {
      setEditMode(false);
      return;
    }
    try {
      const layoutData = widgets.map(w => ({
        id: w._id,
        width: w.width,
        height: w.height,
      }));
      await api.updateDashboardLayout(dashboard._id, layoutData);
      showToast.success("Layout saved!");
      setHasChanges(false);
      setEditMode(false);
    } catch (err) {
      console.error("❌ Save layout error:", err);
      showToast.error("Failed to save layout.");
    }
  }, [hasChanges, widgets, dashboard._id]);

  // 🎯 Handle widget resize
  const handleResizeWidget = useCallback((widgetId, currentWidth) => {
    setWidgets(prev =>
      prev.map(w =>
        w._id === widgetId
          ? { ...w, width: currentWidth === 1 ? 2 : 1 }
          : w
      )
    );
    setHasChanges(true);
  }, []);

  // 🎯 Render widget with memoization
  const renderWidget = useCallback(({ item }) => {
    return (
      <MemoizedWidget
        item={item}
        editMode={editMode}
        isDarkTheme={isDarkTheme}
        onWidgetLongPress={handleWidgetLongPress}
        onDeleteWidget={handleDeleteWidget}
        onResizeWidget={handleResizeWidget}
      />
    );
  }, [editMode, isDarkTheme, handleWidgetLongPress, handleDeleteWidget, handleResizeWidget]);

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
      <View style={[styles.header, themeStyles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={[styles.title, themeStyles.title]}>{dashboard?.name || "Dashboard"}</Text>
          <Text style={[styles.subtitle, themeStyles.subtitle]}>
            {dashboard?.description || "Monitor your devices"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {editMode ? (
            <TouchableOpacity style={styles.headerActionBtn} onPress={handleSaveLayout}>
              <Ionicons name="save-outline" size={22} color="#0369a1" />
              <Text style={[styles.headerActionText, hasChanges && {fontWeight: 'bold'}]}>
                {hasChanges ? "Save Layout" : "Done"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.headerActionBtn} onPress={handleOpenAddLed}>
              <Ionicons name="bulb-outline" size={22} color="#0369a1" />
              <Text style={styles.headerActionText}>Add LED</Text>
            </TouchableOpacity>
          )}

          <Pressable
            style={styles.headerIconBtn}
            onPress={() => setEditMode(!editMode)}
          >
            <Ionicons name={editMode ? "close-circle" : "create-outline"} size={26} color={editMode ? "#ff3b30" : "#007AFF"} />
          </Pressable>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleDeleteDashboard}
          >
            <Ionicons name="trash-outline" size={26} color="#ff3b30" />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <ScrollView
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={isDarkTheme ? "#FFFFFF" : "#000000"} 
            />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {widgets.length > 0 ? (
            <DraggableGrid
              numColumns={2}
              data={widgets}
              renderItem={(item) => (
                <View style={{ flex: 1 }}>
                  {renderWidget({ item })}
                </View>
              )}
              onDragRelease={(data) => {
                setWidgets(data);
                setHasChanges(true);
              }}
              itemHeight={150}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="bulb-outline" size={50} color="#666" />
              <Text style={styles.placeholder}>No widgets yet. Tap the bulb icon to add one.</Text>
            </View>
          )}
        </ScrollView>
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
                    style={[
                      styles.deviceRow,
                      themeStyles.deviceRow,
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
              placeholderTextColor={isDarkTheme ? "#888" : "#999"}
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

      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />
    </LinearGradient>
  );
}

const DashboardScreen = ({ route, navigation }) => {
  const { dashboard } = route.params || {};
  if (!dashboard?._id) return null; // Or return an error screen

  return (
    <DashboardProvider dashboardId={dashboard._id}>
      <DashboardContent route={route} navigation={navigation} />
    </DashboardProvider>
  );
};

// 🎯 Export with memo to prevent unnecessary re-renders from parent
export default memo(DashboardScreen, (prevProps, nextProps) => {
  // Only re-render if dashboard ID changes
  return prevProps.route.params?.dashboard?._id === nextProps.route.params?.dashboard?._id;
});

// 💅 Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#ffffffcc",
    elevation: 6,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: { fontSize: moderateScale(26), fontWeight: "bold", color: "#111" },
  subtitle: { fontSize: 14, color: "#555", marginTop: 4 },
  headerActions: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: 'space-between', 
    marginTop: 8, 
    gap: 12 
  },
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
    fontWeight: "500",
    color: "#0369a1",
  },
  headerIconBtn: { padding: 6 },
  widgetWrapper: { height: 150, padding: 6 },
  widgetWrapperLarge: { width: '100%' },
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
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteHandle: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
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