import React, { useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  Modal,
  FlatList,
  Pressable,
  PermissionsAndroid,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../context/AuthContext";
import CustomAlert from "../components/CustomAlert";
import { showToast } from "../components/Toast";
import { formatDate } from "../utils/format";
import * as Clipboard from "expo-clipboard";
import { ActivityIndicator } from "react-native";
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
  Copy,
  Star,
  FileCode,
  Code,
  X,
  Shield,
} from "lucide-react-native";
import api from "../services/api";
import { moderateScale } from "../utils/scaling";
import WidgetRenderer from "../components/widgets/WidgetRenderer";
import DeviceDetailSkeleton from "../components/Devices/DeviceDetailSkeleton";
import { getDeviceStatus, parseDate } from "../utils/device";
import { BASE_URL } from "../constants/config";

const { width } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 14;

// Utility for colors
const alpha = (hex, opacity) => {
  const o = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + o;
};

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

// getTimeSince is specific to this screen's details and uses the central parseDate helper

function getTimeSince(date) {
  if (!date) return "never";
  const seconds = Math.floor((new Date().getTime() - parseDate(date).getTime()) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// --- Memoized Sensor Card Component ---
const SensorCard = React.memo(({ sensor, onPress, Colors }) => (
  <TouchableOpacity
    style={[styles.sensorCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}
    activeOpacity={0.8}
    onPress={() => onPress(sensor)}
  >
    <LinearGradient
      colors={[alpha(Colors.primary, 0.05), 'transparent']}
      style={styles.notifGlow}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    />
    
    <View style={styles.sensorHeader}>
      <View style={[styles.sensorIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
        {getSensorIcon(sensor.type, 20, Colors.primary)}
      </View>
      <View style={styles.sensorHeaderInfo}>
        <Text style={[styles.sensorLabel, { color: Colors.textSecondary }]} numberOfLines={1}>{sensor.label}</Text>
        <View style={styles.timeContainer}>
          <Clock size={10} color={Colors.textSecondary} />
          <Text style={[styles.sensorTimestamp, { color: Colors.textSecondary }]}>
            {getTimeSince(sensor.timestamp)}
          </Text>
        </View>
      </View>
    </View>
    
    <View style={styles.sensorBody}>
      <Text style={[styles.sensorValue, { color: Colors.text }]}>
        {typeof sensor.value === "number"
          ? sensor.value.toFixed(sensor.type === "temperature" ? 1 : 0)
          : String(sensor.value)}
        <Text style={[styles.sensorUnit, { color: Colors.primary }]}> {sensor.unit}</Text>
      </Text>
    </View>
  </TouchableOpacity>
));

export default function DeviceDetailScreen({ route, navigation }) {
  const { deviceId } = route.params;
  const { devices, deleteDevice, fetchTelemetry, userToken, logout, isDarkTheme, showAlert, isRefreshing: isContextRefreshing } = useContext(AuthContext);

  // --- Refactored State for Single Modal Flow ---
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState('select_widget'); // 'select_widget' or 'select_dashboard'
  const [dashboards, setDashboards] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedWidgetType, setSelectedWidgetType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const [tick, setTick] = useState(0);
  const insets = useSafeAreaInsets();

  // Force refresh every 5 seconds to update relative times/statuses
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);
  
  // --- Code Examples Modal ---
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [selectedCodeType, setSelectedCodeType] = useState('esp32'); // 'esp32' or 'python'
  
  // --- FAVORITES (New Feature) ---
  // In a real app, this state and toggle function would come from AuthContext
  const [isFavorite, setIsFavorite] = useState(false); 

  // --- Theme-aware Colors ---
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
    online: "#10B981",
    offline: "#EF4444",
    gradientStart: isDarkTheme ? "#6366F1" : "#3B82F6",
    gradientEnd: isDarkTheme ? "#8B5CF6" : "#6366F1",
  }), [isDarkTheme]);

  const device = devices.find((d) => String(d.id || d._id) === String(deviceId));

  const sensors = useMemo(() => {
    if (!device?.telemetry) return [];
    return Object.entries(device.telemetry).map(([key, value]) => ({
      id: key,
      type: key, // Assuming type is same as key for icon mapping
      label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value: value,
      unit: key.toLowerCase().includes("temp") ? "°C" : key.toLowerCase().includes("hum") ? "%" : "",
      timestamp: parseDate(device.lastTelemetry || device.last_active) || new Date(),
    }));
  }, [device]);

  // Calculate device status based on last_active timestamp
  const getDeviceStatus = useCallback((device) => {
    if (!device) return "offline";
    
    // Trust explicit offline status from server/context
    if (device.status === 'offline') return 'offline';
    
    // Check last_active with 60s threshold
    if (device.last_active) {
      const lastActive = parseDate(device.last_active);
      const now = new Date();
      const secondsSinceActive = (now - lastActive) / 1000;
      
      if (secondsSinceActive > 60) {
        return "offline";
      }
      return "online";
    }
    
    return device.status || "offline";
  }, [tick]);

  const handleRefresh = useCallback(() => {
    if (!device?.device_token) return;
    setRefreshing(true);
    fetchTelemetry(device.device_token)
      .catch((err) => {
        console.error("Failed to refresh telemetry:", err);
        showAlert({ type: 'error', title: "Refresh Failed", message: "Could not fetch latest device data." });
      })
      .finally(() => setRefreshing(false));
  }, [device?.device_token, fetchTelemetry, showAlert]);

  useEffect(() => {
    if (device) {
      navigation.setOptions({
        headerTitle: device.name,
      });
    }
  }, [device, navigation, Colors]);

  // Request Notification Permission for Android 13+
  useEffect(() => {
    const requestPermission = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
        } catch (err) {
          console.warn('Failed to request notification permission:', err);
        }
      }
    };
    requestPermission();
  }, []);

  // Show skeleton while context is refreshing and device is not yet found
  if (isContextRefreshing && !device) {
    return <DeviceDetailSkeleton isDarkTheme={isDarkTheme} />;
  }

  if (!device) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={64} color={Colors.danger} />
          <Text style={[styles.errorTitle, { color: Colors.text }]}>Device not found</Text>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: Colors.primary }]} onPress={() => navigation.goBack()}>
            <Text style={[styles.backButtonText, { color: Colors.background }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCopyToken = useCallback(async () => {
    await Clipboard.setStringAsync(device.device_token);
    showToast.success("Token copied to clipboard!");
  }, [device.device_token]);

  const handleDeleteDevice = useCallback(() => {
    setAlertConfig({
      type: 'confirm',
      title: "Delete Device",
      message: "Are you sure?",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setAlertVisible(false);
            await deleteDevice(device.id || device._id);
            navigation.goBack();
          },
        },
      ]
    });
    setAlertVisible(true);
  }, [deleteDevice, device, navigation]);

  // Set header options
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleSensorPress = useCallback((sensor) => {
    setSelectedSensor(sensor);
    setModalStep('select_widget');
    setModalVisible(true);
  }, []);

  const fetchDashboards = async () => {
    if (!userToken) {
      setAlertConfig({
        type: 'error', title: "Session expired", message: "Please login again.", buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }
    try {
      const data = await api.getDashboards();
      setDashboards(data);
    } catch (err) {
      console.error(err);
      setAlertConfig({ // API service will handle 401
        type: 'error', title: "Error", message: "Could not load dashboards", buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  };

  const handleWidgetSelect = (type) => {
    setSelectedWidgetType(type);
    setModalStep('select_dashboard');
    fetchDashboards();
  };

  const exportToDashboard = async (dashboardId) => {
    if (!userToken || !selectedSensor || !selectedWidgetType) {
      setAlertConfig({
        type: 'error', title: "Error", message: "Missing required information.", buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Store label before resetting state
      const widgetLabel = selectedSensor?.label;

      const payload = {
        dashboard_id: dashboardId,
        device_id: device._id,
        type: selectedWidgetType,        label: widgetLabel,
        config: { key: selectedSensor.id },
      };

      if (selectedWidgetType === "led") {
        payload.value = selectedSensor.value ? 1 : 0;
      } else {
        payload.value = selectedSensor.value;
      }

      await api.addWidget(payload);

      setModalVisible(false);
      setSelectedSensor(null);
      setSelectedWidgetType(null);
      showToast.success(`Widget '${widgetLabel || 'Sensor'}' added to dashboard`);
    } catch (err) {
      console.error("Export to dashboard error:", err);

      // API service will handle 401 and logout if refresh fails
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        setAlertConfig({
          type: 'error', title: "Timeout", message: "Request took too long. Please check your connection.", buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
      } else {
        const errorMessage =
          err.response?.data?.detail || err.message || "Failed to export telemetry";
        setAlertConfig({
          type: 'error', title: "Error", message: errorMessage, buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate actual device status based on last_active
  const actualStatus = useMemo(() => getDeviceStatus(device), [device, getDeviceStatus]);
  
  const statusColor =
    actualStatus === "online" ? Colors.online
    : actualStatus === "offline" ? Colors.offline
    : Colors.warning;

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFFFFF"
          />
        }
      >
        {/* Immersive Hero Header */}
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={[styles.heroSection, { paddingTop: insets.top + 10 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative Elements */}
          <View style={styles.heroDecoration}>
            <View style={[styles.decorCircle, styles.circle1]} />
            <View style={[styles.decorCircle, styles.circle2]} />
          </View>

          <View style={styles.heroHeader}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <X size={24} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)} style={styles.actionButton}>
                <Star size={22} color={isFavorite ? Colors.warning : "#FFFFFF"} fill={isFavorite ? Colors.warning : 'transparent'} strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCodeModalVisible(true)} style={styles.actionButton}>
                <FileCode size={22} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRefresh} style={styles.actionButton}>
                <RefreshCw size={22} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroIconWrapper}>
              <Cpu size={32} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <View style={styles.heroTextContent}>
              <Text style={styles.heroTitleName} numberOfLines={1}>{device.name}</Text>
              <View style={styles.heroMeta}>
                <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={styles.statusText}>{actualStatus.toUpperCase()}</Text>
                </View>
                <Text style={styles.heroType}>{device.type}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.contentBody}>
          {/* Device Registry (ID & Token) */}
          <View style={styles.registrySection}>
            <View style={[styles.registryCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
              <LinearGradient
                colors={[alpha(Colors.primary, 0.08), 'transparent']}
                style={styles.cardGlow}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.registryHeader}>
                <View style={[styles.iconBox, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
                  <Shield size={18} color={Colors.primary} strokeWidth={2.5} />
                </View>
                <View>
                  <Text style={[styles.registryTitle, { color: Colors.text }]}>Identity & Security</Text>
                  <Text style={[styles.registrySubtitle, { color: Colors.textSecondary }]}>Device cryptographic identifiers</Text>
                </View>
              </View>
              
              <View style={styles.registryDetails}>
                <View style={styles.registryItem}>
                  <Text style={[styles.registryLabel, { color: Colors.textSecondary }]}>DEVICE REGISTRY ID</Text>
                  <TouchableOpacity 
                    style={[styles.registryValueBox, { backgroundColor: alpha(Colors.primary, 0.05) }]}
                    onPress={() => { Clipboard.setStringAsync(String(device._id || device.id)); showToast.success('ID copied!'); }}
                  >
                    <Text style={[styles.registryValue, { color: Colors.text }]} numberOfLines={1} ellipsizeMode="middle">
                      {String(device._id || device.id)}
                    </Text>
                    <Copy size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.registryItem}>
                  <Text style={[styles.registryLabel, { color: Colors.textSecondary }]}>AUTHENTICATION TOKEN</Text>
                  <TouchableOpacity 
                    style={[styles.registryValueBox, { backgroundColor: alpha(Colors.primary, 0.05) }]}
                    onPress={handleCopyToken}
                  >
                    <Text style={[styles.registryValue, { color: Colors.primary }]} numberOfLines={1} ellipsizeMode="middle">
                      {device.device_token}
                    </Text>
                    <Copy size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Device Info Grid */}
          <View style={styles.infoSection}>
            <View style={styles.infoGrid}>
              <View style={[styles.infoCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
                <MapPin size={18} color={Colors.primary} />
                <View>
                  <Text style={[styles.infoLabel, { color: Colors.textSecondary }]}>LOCATION</Text>
                  <Text style={[styles.infoValue, { color: Colors.text }]}>{device.location || "Not set"}</Text>
                </View>
              </View>
              <View style={[styles.infoCard, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
                <Clock size={18} color={Colors.primary} />
                <View>
                  <Text style={[styles.infoLabel, { color: Colors.textSecondary }]}>LAST SEEN</Text>
                  <Text style={[styles.infoValue, { color: Colors.text }]}>{getTimeSince(device.last_active)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Sensors Section */}
          <View style={styles.sensorsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Activity size={20} color={Colors.primary} />
                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Active Telemetry</Text>
              </View>
              <Text style={[styles.sensorCount, { color: Colors.textSecondary }]}>{sensors.length} SENSORS</Text>
            </View>
            
            <FlatList
              data={sensors}
              renderItem={({ item }) => (
                <SensorCard sensor={item} onPress={handleSensorPress} Colors={Colors} />
              )}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.sensorsGrid}
              scrollEnabled={false}
            />
            
            {sensors.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
                <Activity size={48} color={alpha(Colors.primary, 0.4)} strokeWidth={1} />
                <Text style={[styles.emptyStateText, { color: Colors.textSecondary }]}>No sensors detected yet</Text>
                <TouchableOpacity style={[styles.refreshButton, { backgroundColor: Colors.primary }]} onPress={handleRefresh}>
                  <Text style={[styles.refreshButtonText, { color: "#FFFFFF" }]}>SCAN FOR SENSORS</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* --- Refactored Add to Dashboard Modal --- */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { backgroundColor: Colors.card }]}>
            {modalStep === 'select_widget' && (
              <>
                <Text style={[styles.modalTitle, { color: Colors.text }]}>Add Widget for '{selectedSensor?.label}'</Text>
                <Text style={[styles.modalSub, { color: Colors.textSecondary }]}>Choose a widget style to display this sensor on a dashboard.</Text>
                <View style={styles.widgetOptions}>
                  {[
                    "card", "gauge", "indicator", "chart", 
                    "digital", "thermometer", "tank", "battery",
                    "status", "energy"
                  ].map((type) => (
                    <Pressable 
                      key={type} 
                      style={[
                        styles.widgetOption, 
                        { 
                          borderColor: Colors.cardBorder,
                          backgroundColor: isDarkTheme ? 'rgba(0,0,0,0.2)' : '#F8FAFC'
                        }
                      ]} 
                      onPress={() => handleWidgetSelect(type)}
                    >
                      <View style={styles.widgetPreview}>
                        <View style={{ transform: [{ scale: 0.65 }] }}>
                          <WidgetRenderer
                            item={{
                              type: type,
                              label: selectedSensor?.label,
                              value: selectedSensor?.value,
                              config: { key: selectedSensor?.id },
                              device_id: device?._id,
                            }}
                            isDarkTheme={isDarkTheme}
                          />
                        </View>
                      </View>
                      <View style={[styles.widgetLabelContainer, { backgroundColor: Colors.primary + '15' }]}>
                        <Text style={[styles.widgetText, { color: Colors.primary }]}>{type.toUpperCase()}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {modalStep === 'select_dashboard' && (
              <>
                <Text style={[styles.modalTitle, { color: Colors.text }]}>Select Dashboard</Text>
                <Text style={[styles.modalSub, { color: Colors.textSecondary }]}>Where should this widget be added?</Text>
                {isSubmitting ? <ActivityIndicator style={{ marginVertical: 20 }} color={Colors.primary} /> : (
                  <FlatList
                    data={dashboards}
                    keyExtractor={(item) => item._id.toString()}
                    renderItem={({ item }) => (
                      <Pressable
                        style={[styles.dashboardItem, { backgroundColor: Colors.cardBorder }]}
                        onPress={() => exportToDashboard(item._id)}
                      >
                        <Text style={[styles.dashboardName, { color: Colors.text }]}>{item.name}</Text>
                        <Text style={[styles.dashboardDesc, { color: Colors.textSecondary }]}>{item.description}</Text>
                      </Pressable>
                    )}
                    ListEmptyComponent={() => (
                      <Text style={{ textAlign: 'center', color: Colors.textSecondary, marginVertical: 20 }}>No dashboards found.</Text>
                    )}
                    style={{ maxHeight: 250, marginVertical: 10 }}
                  />
                )}
              </>
            )}

            <TouchableOpacity onPress={() => setModalVisible(false)} disabled={isSubmitting}>
              <Text style={[styles.cancelText, { color: Colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Code Examples Modal */}
      <Modal 
        visible={codeModalVisible} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setCodeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.codeModalView, { backgroundColor: Colors.card }]}>
            <View style={styles.codeModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileCode size={24} color={Colors.primary} />
                <Text style={[styles.codeModalTitle, { color: Colors.text }]}>Integration Code Examples</Text>
              </View>
              <TouchableOpacity onPress={() => setCodeModalVisible(false)}>
                <Text style={[styles.codeModalClose, { color: Colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Code Type Selector */}
            <View style={styles.codeTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.codeTypeButton,
                  { backgroundColor: selectedCodeType === 'esp32' ? Colors.primary + '20' : Colors.cardBorder },
                  selectedCodeType === 'esp32' && { borderColor: Colors.primary, borderWidth: 2 }
                ]}
                onPress={() => setSelectedCodeType('esp32')}
              >
                <Code size={18} color={selectedCodeType === 'esp32' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.codeTypeText, { color: selectedCodeType === 'esp32' ? Colors.primary : Colors.textSecondary }]}>
                  ESP32 (Arduino)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.codeTypeButton,
                  { backgroundColor: selectedCodeType === 'python' ? Colors.primary + '20' : Colors.cardBorder },
                  selectedCodeType === 'python' && { borderColor: Colors.primary, borderWidth: 2 }
                ]}
                onPress={() => setSelectedCodeType('python')}
              >
                <Code size={18} color={selectedCodeType === 'python' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.codeTypeText, { color: selectedCodeType === 'python' ? Colors.primary : Colors.textSecondary }]}>
                  Python
                </Text>
              </TouchableOpacity>
            </View>

            {/* Code Display */}
            <View style={styles.codeScrollView}>
              <View style={[styles.codeContainer, { backgroundColor: Colors.background, borderColor: Colors.cardBorder }]}>
                <View style={styles.codeBlockHeader}>
                  <Text style={[styles.codeBlockTitle, { color: Colors.text }]}>
                    {selectedCodeType === 'esp32' ? 'ESP32 Arduino Code' : 'Python Code'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.copyButton, { backgroundColor: Colors.primary + '20' }]}
                    onPress={async () => {
                      const code = selectedCodeType === 'esp32' 
                        ? generateESP32Code(device, BASE_URL)
                        : generatePythonCode(device, BASE_URL);
                      await Clipboard.setStringAsync(code);
                      showToast.success("Code copied to clipboard!");
                    }}
                  >
                    <Copy size={14} color={Colors.primary} />
                    <Text style={[styles.copyButtonText, { color: Colors.primary }]}>Copy</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView 
                  style={[styles.codeScrollView, { backgroundColor: isDarkTheme ? '#0d1117' : '#f6f8fa' }]}
                  contentContainerStyle={{ padding: 16 }}
                  showsVerticalScrollIndicator={true}
                >
                    <Text 
                      selectable
                      style={[
                        styles.codeText, 
                        { 
                            color: isDarkTheme ? '#c9d1d9' : '#24292e',
                            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' 
                        }
                      ]}
                    >
                      {selectedCodeType === 'esp32' 
                        ? generateESP32Code(device, BASE_URL)
                        : generatePythonCode(device, BASE_URL)}
                    </Text>
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Local Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />
    </View>
  );
}

// Generate ESP32 Integration Guide
function generateESP32Code(device, baseUrl) {
  const deviceId = String(device._id || device.id);
  const deviceToken = device.device_token || 'YOUR_DEVICE_TOKEN_HERE';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  return `/* ESP32 Integration with ThingsNXT */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// 📶 WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ☁️ ThingsNXT Configuration
const char* deviceToken = "${deviceToken}";
String serverUrl = "${cleanBaseUrl}/devices/${deviceId}/telemetry";

// 🔌 Virtual Pin Mapping (Example)
struct PinMapping { uint8_t vPin; uint8_t gpio; };
PinMapping VIRTUAL_PIN_MAPPING[] = {
  {0, 2}, // Map Virtual Pin v0 to GPIO 2
};
const uint8_t PIN_COUNT = sizeof(VIRTUAL_PIN_MAPPING) / sizeof(VIRTUAL_PIN_MAPPING[0]);

void setup() {
  Serial.begin(115200);
  for (uint8_t i = 0; i < PIN_COUNT; i++) pinMode(VIRTUAL_PIN_MAPPING[i].gpio, OUTPUT);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    DynamicJsonDocument doc(512);
    doc["device_token"] = deviceToken;
    doc["uptime"] = millis();
    
    String payload;
    serializeJson(doc, payload);
    
    int httpCode = http.POST(payload);
    
    if (httpCode > 0) {
      String response = http.getString();
      DynamicJsonDocument resDoc(2048);
      deserializeJson(resDoc, response);
      
      JsonObject data = resDoc["data"];
      
      // Handle Virtual Pins
      for (uint8_t i = 0; i < PIN_COUNT; i++) {
        String key = "v" + String(VIRTUAL_PIN_MAPPING[i].vPin);
        if (data.containsKey(key)) {
          digitalWrite(VIRTUAL_PIN_MAPPING[i].gpio, data[key] ? HIGH : LOW);
        }
      }
    }
    http.end();
  }
  delay(2000);
}`;
}

// Generate Python Integration Guide
function generatePythonCode(device, baseUrl) {
  const deviceId = String(device._id || device.id);
  const deviceToken = device.device_token || 'YOUR_DEVICE_TOKEN_HERE';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  return `import requests

# Configuration
DEVICE_ID = "${deviceId}"
DEVICE_TOKEN = "${deviceToken}"
BASE_URL = "${cleanBaseUrl}"
SERVER_URL = f"{BASE_URL}/devices/{DEVICE_ID}/telemetry"

def send_telemetry():
    payload = {
        "device_token": DEVICE_TOKEN,
        "temperature": 25.5,
        "humidity": 60.0
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(SERVER_URL, json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        print(response.json())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    send_telemetry()`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor is set dynamically
  },
  scrollView: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Hero Section
  heroSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heroDecoration: {
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
    width: 250,
    height: 250,
    top: -80,
    right: -60,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: -40,
    left: -30,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    zIndex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refreshButtonHeader: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 1,
  },
  heroIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextContent: {
    flex: 1,
  },
  heroTitleName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  heroType: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },


  // Body Content
  contentBody: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  
  // Registry Section
  registrySection: {
    marginBottom: 24,
  },
  registryCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  registryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registryTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  registrySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  registryDetails: {
    gap: 16,
  },
  registryItem: {
    gap: 8,
  },
  registryLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  registryValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
  },
  registryValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },

  // Info Section
  infoSection: {
    marginBottom: 32,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  infoCard: {
    flex: 1,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  // Sensors Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sensorCount: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sensorsGrid: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  
  // Sensor Card
  sensorCard: {
    width: (width - 40 - 14) / 2,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    minHeight: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  notifGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  sensorHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sensorIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  sensorLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sensorTimestamp: {
    fontSize: 10,
    fontWeight: '600',
  },
  sensorBody: {
    marginTop: 'auto',
  },
  sensorValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sensorUnit: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 16,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '600',
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Navigation Buttons
  backIconButton: {
    marginLeft: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    marginRight: 20,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalView: {
    width: "100%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modalSub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  widgetOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  widgetOption: {
    width: (width - 48 - 12) / 2,
    height: 120,
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  widgetPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetLabelContainer: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  widgetText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  dashboardItem: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  dashboardName: {
    fontSize: 16,
    fontWeight: '700',
  },
  dashboardDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  cancelText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },

  // Code Modal
  codeModalView: {
    width: "100%",
    height: "90%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  codeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  codeModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  codeModalClose: {
    fontSize: 20,
    fontWeight: '500',
  },
  codeTypeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  codeTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  codeTypeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  codeScrollView: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  codeContainer: {
    flex: 1,
    borderWidth: 1.5,
  },
  codeBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  codeBlockTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  codeText: {
    fontSize: 13,
  },
});