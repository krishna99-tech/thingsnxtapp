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
import { 
  Bell, 
  Plus, 
  ChevronLeft, 
  Trash2, 
  Layout, 
  Clock, 
  MoreVertical,
  Layers,
  Search,
  Zap,
  Save,
  X,
  PlusCircle,
  Lightbulb,
  Edit2,
  Check
} from "lucide-react-native";
const alpha = (hex, opacity) => {
  const o = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + o;
};

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

  // Theme-aware Colors (Elite Style)
  const Colors = useMemo(() => ({
    background: isDarkTheme ? "#0A0E27" : "#F8FAFC",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    card: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    cardBorder: isDarkTheme ? "#252B4A" : "#E2E8F0",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    secondary: isDarkTheme ? "#A855F7" : "#8B5CF6",
    success: isDarkTheme ? "#10B981" : "#16A34A",
    warning: isDarkTheme ? "#F59E0B" : "#F59E0B",
    danger: isDarkTheme ? "#EF4444" : "#DC2626",
    text: isDarkTheme ? "#F8FAFC" : "#0F172A",
    textSecondary: isDarkTheme ? "#94A3B8" : "#64748B",
    gradientStart: isDarkTheme ? "#6366F1" : "#3B82F6",
    gradientEnd: isDarkTheme ? "#8B5CF6" : "#6366F1",
    white: "#FFFFFF",
  }), [isDarkTheme]);

  const themeStyles = useMemo(() => ({
    modalCard: { backgroundColor: Colors.surface },
    modalTitle: { color: Colors.text },
    modalSubtitle: { color: Colors.textSecondary },
    modalLabel: { color: Colors.textSecondary },
    deviceRow: { backgroundColor: isDarkTheme ? alpha(Colors.primary, 0.05) : "#f8fafc" },
    deviceName: { color: Colors.text },
    deviceToken: { color: Colors.textSecondary },
    input: { color: Colors.text, borderColor: Colors.cardBorder },
  }), [isDarkTheme, Colors]);

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
      <View style={[styles.container, { backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: Colors.textSecondary }]}>Powering up dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* 🌈 Elite Header */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative Elements */}
        <View style={styles.headerDecoration}>
          <View style={[styles.decorCircle, styles.circle1]} />
          <View style={[styles.decorCircle, styles.circle2]} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.headerBtn}
            >
              <ChevronLeft size={24} color="#FFF" strokeWidth={3} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{dashboard?.name || "Dashboard"}</Text>
              <Text style={styles.headerSubtitle}>{widgets.length} ACTIVE WIDGETS</Text>
            </View>

            <View style={styles.headerActions}>
              {editMode ? (
                <TouchableOpacity 
                  style={[styles.headerBtn, hasChanges && {backgroundColor: 'rgba(255,255,255,0.3)'}]} 
                  onPress={handleSaveLayout}
                >
                  <Save size={20} color="#FFF" strokeWidth={2.5} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.headerBtn} onPress={handleOpenAddLed}>
                  <PlusCircle size={20} color="#FFF" strokeWidth={2.5} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.headerBtn, editMode && {backgroundColor: 'rgba(255,100,100,0.3)'}]}
                onPress={() => setEditMode(!editMode)}
              >
                {editMode ? (
                  <X size={20} color="#FFF" strokeWidth={2.5} />
                ) : (
                  <Edit2 size={20} color="#FFF" strokeWidth={2.5} />
                )}
              </TouchableOpacity>
              
              {!editMode && (
                <TouchableOpacity
                  style={[styles.headerBtn, {backgroundColor: 'rgba(255,100,100,0.15)'}]}
                  onPress={handleDeleteDashboard}
                >
                  <Trash2 size={20} color="#FFF" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>

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
              <View style={styles.emptyIconWrapper}>
                <Lightbulb size={48} color={Colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: Colors.text }]}>No widgets found</Text>
              <Text style={[styles.emptySubtitle, { color: Colors.textSecondary }]}>
                Tap the bulb icon in the header to add your first interactive widget to this dashboard.
              </Text>
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
    </View>
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
  container: {
    flex: 1,
  },
  
  // Header
  header: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  headerDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -40,
  },
  circle2: {
    width: 120,
    height: 120,
    bottom: -30,
    left: -20,
  },
  headerContent: {
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },

  // Content
  loader: {
    marginTop: 80,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  gridContent: {
    padding: 10,
    paddingBottom: 40,
  },
  widgetWrapper: {
    padding: 6,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
});