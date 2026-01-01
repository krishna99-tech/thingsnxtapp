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
  Dimensions,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DraggableGrid } from "react-native-draggable-grid";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import { DashboardProvider, useDashboard } from "../context/DashboardContext";
import MemoizedDashboardWidget from "../components/dashboard/MemoizedDashboardWidget";

import WidgetRenderer from "../components/widgets/WidgetRenderer";
import AddLedWidgetModal from "../components/dashboard/AddLedWidgetModal";
import EditWidgetModal from "../components/dashboard/EditWidgetModal";
import CustomAlert from "../components/CustomAlert";
import WidgetSkeleton from "../components/WidgetSkeleton";
import { showToast } from "../components/Toast";
import { formatDate } from "../utils/format";
import { moderateScale } from "../utils/scaling";

// --- Responsive Grid Constants ---
const { width: screenWidth } = Dimensions.get("window");
const WIDGET_BASE_WIDTH = 170; // Based on LEDControlWidget width
const WIDGET_MARGIN = 6 * 2; // From widgetWrapper padding
const MIN_COLUMNS = 2;
const calculateNumColumns = () => Math.max(MIN_COLUMNS, Math.floor(screenWidth / (WIDGET_BASE_WIDTH + WIDGET_MARGIN)));

// 🎯 Main Dashboard Component
function DashboardContent({ route, navigation }) {
  const { dashboard } = route.params || {};
  const { isDarkTheme, showAlert } = useContext(AuthContext);
  const { widgets, setWidgets, loading, refreshing, onRefresh, fetchWidgets } = useDashboard();

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [addLedModalVisible, setAddLedModalVisible] = useState(false);
  const [editWidgetModalVisible, setEditWidgetModalVisible] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const insets = useSafeAreaInsets();

  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // --- Responsive Grid State ---
  const [numColumns, setNumColumns] = useState(calculateNumColumns());
  const baseItemHeight = useMemo(() => screenWidth / numColumns * 0.85, [numColumns]);

  // Theme-based styles
  const themeStyles = useMemo(() => ({
    gradient: isDarkTheme ? ["#0f2027", "#203a43", "#2c5364"] : ["#e6f3ff", "#ffffff"],
    header: {
      backgroundColor: isDarkTheme ? "rgba(0,0,0,0.3)" : "#ffffffcc",
    },
    title: { color: isDarkTheme ? "#FFFFFF" : "#111" },
    subtitle: { color: isDarkTheme ? "#CCCCCC" : "#555" },
    // Add modal styles back for AddLedWidgetModal
    modalCard: { backgroundColor: isDarkTheme ? "#2C2C2C" : "#fff" },
    modalTitle: { color: isDarkTheme ? "#FFFFFF" : "#0f172a" },
    modalSubtitle: { color: isDarkTheme ? "#A0A0A0" : "#475569" },
    modalLabel: { color: isDarkTheme ? "#E0E0E0" : "#1f2937" },
    deviceRow: { backgroundColor: isDarkTheme ? "#1E1E1E" : "#f8fafc" },
    deviceName: { color: isDarkTheme ? "#FFFFFF" : "#0f172a" },
    deviceToken: { color: isDarkTheme ? "#A0A0A0" : "#475569" },
    input: { color: isDarkTheme ? "#FFFFFF" : "#111827", borderColor: isDarkTheme ? "#444" : "#cbd5f5" },
  }), [isDarkTheme]);

  // --- Handle screen dimension changes ---
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setNumColumns(Math.max(MIN_COLUMNS, Math.floor(window.width / (WIDGET_BASE_WIDTH + WIDGET_MARGIN))));
    });
    return () => {
      subscription?.remove();
    };
  }, []);

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
            } catch (err) { // API service will handle 401
              console.error("❌ Delete dashboard error:", err);
              showToast.error("Failed to delete dashboard");
            }
          },
        },
      ],
    });
    setAlertVisible(true);
  }, [dashboard._id, navigation]);

  const handleOpenAddLed = useCallback(() => {
    setAddLedModalVisible(true);
  }, []);

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
            } catch (err) { // API service will handle 401
              console.error("❌ Delete widget error:", err);
              showToast.error("Failed to delete widget");
            }
          },
        },
      ],
    });
    setAlertVisible(true);
  }, []);

  const handleWidgetLongPress = useCallback((widgetId) => {
    // Find the widget to edit
    const widget = widgets.find(w => String(w._id) === String(widgetId));
    
    setAlertConfig({
      type: 'confirm',
      title: "Widget Options",
      message: "What would you like to do with this widget?",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        { text: "Edit", onPress: () => {
            setAlertVisible(false);
            if (widget) {
              setSelectedWidget(widget);
              setEditWidgetModalVisible(true);
            }
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
  }, [handleDeleteWidget, widgets]);

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
  const handleResizeWidth = useCallback((widgetId, currentWidth) => {
    setWidgets(prev =>
      prev.map(w =>
        w._id === widgetId
          ? { ...w, width: currentWidth === 1 ? 2 : 1 }
          : w
      )
    );
    setHasChanges(true);
  }, []);

  const handleResizeHeight = useCallback((widgetId, currentHeight) => {
    setWidgets(prev =>
      prev.map(w =>
        w._id === widgetId
          ? {
              ...w,
              // Toggle between 1x and 2x height, default to 1 if undefined
              height: (currentHeight || 1) === 1 ? 2 : 1,
            }
          : w
      )
    );
    setHasChanges(true);
  }, []);

  // 🎯 Render widget with memoization
  const renderWidget = useCallback(({ item }) => {
    return (
      item.isSkeleton ? 
      <View style={styles.widgetWrapper}><WidgetSkeleton isDarkTheme={isDarkTheme} /></View> :
      (<MemoizedDashboardWidget
        item={item}
        editMode={editMode}
        isDarkTheme={isDarkTheme}
        onLongPress={handleWidgetLongPress}
        onDeleteWidget={() => handleDeleteWidget(item._id)}
        onResizeWidth={handleResizeWidth}
        onResizeHeight={handleResizeHeight}
      />
    ));
  }, [editMode, isDarkTheme, handleWidgetLongPress, handleDeleteWidget, handleResizeWidth, handleResizeHeight]);

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
              <Text style={styles.headerActionText}>Add Button</Text>
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
              numColumns={numColumns}
              data={loading ? Array.from({ length: 6 }).map((_, i) => ({ key: `skeleton-${i}`, isSkeleton: true })) : widgets}
              renderItem={(item) => (
                <View style={{ flex: 1 }}>
                  {renderWidget({ item })}
                </View>
              )}
              onDragRelease={(data) => {
                setWidgets(data);
                setHasChanges(true);
              }}
              itemHeight={(item) => {
                return baseItemHeight * (item.height || 1);
              }}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="bulb-outline" size={50} color="#666" />
              <Text style={styles.placeholder}>No widgets yet. Tap the bulb icon to add one.</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <AddLedWidgetModal
        visible={addLedModalVisible}
        onClose={() => setAddLedModalVisible(false)}
        dashboardId={dashboard._id}
        onWidgetAdded={fetchWidgets} // Refetch widgets after one is added
        themeStyles={themeStyles}
      />

      <EditWidgetModal
        visible={editWidgetModalVisible}
        onClose={() => {
          setEditWidgetModalVisible(false);
          setSelectedWidget(null);
        }}
        widget={selectedWidget}
        onWidgetUpdated={fetchWidgets} // Refetch widgets after update
        themeStyles={themeStyles}
      />

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
  resizeHandleWidth: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resizeHandleHeight: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    width: 30,
    height: 30,
    borderRadius: 15,
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
});