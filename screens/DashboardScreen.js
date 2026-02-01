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

// import WidgetRenderer from "../components/widgets/WidgetRenderer";
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
const WIDGET_BASE_WIDTH = 170;
const WIDGET_MARGIN = 6 * 2;
const MIN_COLUMNS = 2;
const calculateNumColumns = () => Math.max(MIN_COLUMNS, Math.floor(screenWidth / (WIDGET_BASE_WIDTH + WIDGET_MARGIN)));

// 🎯 Main Dashboard Component
function DashboardContent({ route, navigation }) {
  const { dashboard } = route.params || {};
  const { isDarkTheme, showAlert } = useContext(AuthContext);
  const { widgets, setWidgets, loading, refreshing, onRefresh, fetchWidgets } = useDashboard();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
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

  // Enhanced Theme-aware Colors
  const Colors = useMemo(() => ({
    background: isDarkTheme ? "#0F1117" : "#F9FAFB",
    surface: isDarkTheme ? "#1C1F26" : "#FFFFFF",
    card: isDarkTheme ? "#252B34" : "#F3F4F6",
    cardBorder: isDarkTheme ? "#30363D" : "#E5E7EB",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    primaryAlt: isDarkTheme ? "#58A6FF" : "#2563EB",
    secondary: isDarkTheme ? "#A855F7" : "#8B5CF6",
    success: isDarkTheme ? "#3FB950" : "#16A34A",
    warning: isDarkTheme ? "#D29922" : "#F59E0B",
    danger: isDarkTheme ? "#F85149" : "#DC2626",
    text: isDarkTheme ? "#E6EDF3" : "#111827",
    textSecondary: isDarkTheme ? "#8B949E" : "#6B7280",
    textTertiary: isDarkTheme ? "#6E7681" : "#9CA3AF",
    gradientStart: isDarkTheme ? "#1F6FEB" : "#3B82F6",
    gradientEnd: isDarkTheme ? "#7D3C98" : "#8B5CF6",
    accentGradientStart: isDarkTheme ? "#00D9FF" : "#06B6D4",
    accentGradientEnd: isDarkTheme ? "#7D3C98" : "#A855F7",
    white: "#FFFFFF",
    overlay: isDarkTheme ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.05)",
  }), [isDarkTheme]);

  const themeStyles = useMemo(() => ({
    modalCard: { backgroundColor: Colors.surface },
    modalTitle: { color: Colors.text },
    modalSubtitle: { color: Colors.textSecondary },
    modalLabel: { color: Colors.textSecondary },
    deviceRow: { backgroundColor: isDarkTheme ? alpha(Colors.primary, 0.08) : "#F3F4F6" },
    deviceName: { color: Colors.text },
    deviceToken: { color: Colors.textSecondary },
    input: { color: Colors.text, borderColor: Colors.cardBorder },
  }), [isDarkTheme, Colors]);

  // Animation effect on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
            } catch (err) {
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
            } catch (err) {
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
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loadingText, { color: Colors.textSecondary }]}>
              Powering up dashboard...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* 🌈 Enhanced Header */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        {/* Animated Background Elements */}
        <View style={styles.headerDecoration}>
          <View style={[styles.decorCircle, styles.circle1, { opacity: 0.12 }]} />
          <View style={[styles.decorCircle, styles.circle2, { opacity: 0.08 }]} />
          <View style={[styles.decorLine, styles.lineHorizontal]} />
        </View>

        {/* Header Content */}
        <View style={styles.headerInner}>
          {/* Top Section - Navigation */}
          <View style={styles.headerTop}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={[styles.headerIconBtn, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
              activeOpacity={0.7}
            >
              <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={styles.headerSpacer} />

            <View style={styles.actionButtonsGroup}>
              {editMode ? (
                <TouchableOpacity 
                  style={[
                    styles.headerIconBtn, 
                    hasChanges && styles.headerIconBtnActive
                  ]} 
                  onPress={handleSaveLayout}
                  activeOpacity={0.7}
                >
                  <Save size={20} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.headerIconBtn}
                  onPress={handleOpenAddLed}
                  activeOpacity={0.7}
                >
                  <PlusCircle size={20} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.headerIconBtn,
                  editMode && styles.headerIconBtnEdit
                ]}
                onPress={() => setEditMode(!editMode)}
                activeOpacity={0.7}
              >
                {editMode ? (
                  <X size={20} color="#FFFFFF" strokeWidth={2.5} />
                ) : (
                  <Edit2 size={20} color="#FFFFFF" strokeWidth={2.5} />
                )}
              </TouchableOpacity>
              
              {!editMode && (
                <TouchableOpacity
                  style={[styles.headerIconBtn, styles.headerIconBtnDelete]}
                  onPress={handleDeleteDashboard}
                  activeOpacity={0.7}
                >
                  <Trash2 size={20} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.headerTitle}>
            <Text style={styles.dashboardName}>{dashboard?.name || "Dashboard"}</Text>
            <View style={styles.headerSubtitleRow}>
              <View style={[styles.badge, { backgroundColor: alpha(Colors.white, 0.15) }]}>
                <Zap size={12} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.badgeText}>{widgets.length} WIDGETS</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <Animated.View 
        style={[
          styles.contentWrapper, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {widgets.length > 0 ? (
            <View style={styles.gridContainer}>
              <DraggableGrid
                numColumns={numColumns}
                data={loading ? Array.from({ length: 6 }).map((_, i) => ({ key: `skeleton-${i}`, isSkeleton: true })) : widgets}
                renderItem={(item) => (
                  <View style={styles.gridItem}>
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
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrapper, { backgroundColor: alpha(Colors.primary, 0.1) }]}>
                <Lightbulb size={52} color={Colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: Colors.text }]}>
                No widgets yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: Colors.textSecondary }]}>
                Tap the plus icon to add interactive widgets to your dashboard
              </Text>
              <TouchableOpacity 
                style={[styles.emptyActionBtn, { backgroundColor: Colors.primary }]}
                onPress={handleOpenAddLed}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.emptyActionBtnText}>Add Widget</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Modals */}
      <AddLedWidgetModal
        visible={addLedModalVisible}
        onClose={() => setAddLedModalVisible(false)}
        dashboardId={dashboard._id}
        onWidgetAdded={fetchWidgets}
        themeStyles={themeStyles}
      />

      <EditWidgetModal
        visible={editWidgetModalVisible}
        onClose={() => {
          setEditWidgetModalVisible(false);
          setSelectedWidget(null);
        }}
        widget={selectedWidget}
        onWidgetUpdated={fetchWidgets}
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
  if (!dashboard?._id) return null;

  return (
    <DashboardProvider dashboardId={dashboard._id}>
      <DashboardContent route={route} navigation={navigation} />
    </DashboardProvider>
  );
};

export default memo(DashboardScreen, (prevProps, nextProps) => {
  return prevProps.route.params?.dashboard?._id === nextProps.route.params?.dashboard?._id;
});

// 💅 Enhanced Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
    width: 240,
    height: 240,
    top: -80,
    right: -60,
  },
  circle2: {
    width: 140,
    height: 140,
    bottom: -40,
    left: -30,
  },
  decorLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  lineHorizontal: {
    height: 1,
    width: '120%',
    bottom: 90,
    left: '-10%',
  },
  headerInner: {
    zIndex: 1,
    gap: 18,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerIconBtnActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  headerIconBtnEdit: {
    backgroundColor: 'rgba(100, 150, 200, 0.2)',
    borderColor: 'rgba(100, 150, 200, 0.3)',
  },
  headerIconBtnDelete: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    borderColor: 'rgba(244, 67, 54, 0.25)',
  },
  headerSpacer: {
    flex: 1,
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  headerTitle: {
    gap: 8,
  },
  dashboardName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.8,
  },

  // Content
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  gridContainer: {
    padding: 12,
  },
  gridItem: {
    flex: 1,
    padding: 6,
  },
  widgetWrapper: {
    padding: 6,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
    gap: 20,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '400',
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});