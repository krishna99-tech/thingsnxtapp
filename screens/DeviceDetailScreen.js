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
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../context/AuthContext";
import CustomAlert from "../components/CustomAlert";
import { showToast } from "../components/Toast";
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
  ArrowLeft,
  ChevronRight,
  Plus,
  Gauge,
  WifiOff,
  LayoutDashboard,
} from "lucide-react-native";
import api from "../services/api";
import WidgetRenderer from "../components/widgets/WidgetRenderer";
import DeviceDetailSkeleton from "../components/Devices/DeviceDetailSkeleton";
import { getDeviceStatus, parseDate } from "../utils/device";
import { BASE_URL } from "../constants/config";

const { width } = Dimensions.get('window');

// Utility for colors
const alpha = (hex, opacity) => {
  const o = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + o;
};

function getSensorIcon(type, size, color) {
  const strokeWidth = 2.5;
  switch (type) {
    case "temperature":
      return <Thermometer size={size} color={color} strokeWidth={strokeWidth} />;
    case "humidity":
      return <Droplets size={size} color={color} strokeWidth={strokeWidth} />;
    case "light":
      return <Lightbulb size={size} color={color} strokeWidth={strokeWidth} />;
    case "pressure":
      return <Wind size={size} color={color} strokeWidth={strokeWidth} />;
    case "gas":
      return <Flame size={size} color={color} strokeWidth={strokeWidth} />;
    case "motion":
    case "door":
    case "smoke":
      return <Zap size={size} color={color} strokeWidth={strokeWidth} />;
    default:
      return <Activity size={size} color={color} strokeWidth={strokeWidth} />;
  }
}

function getTimeSince(date) {
  if (!date) return "never";
  const seconds = Math.floor((new Date().getTime() - parseDate(date).getTime()) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Memoized Sensor Card Component
const SensorCard = React.memo(({ sensor, onPress, Colors }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={[styles.sensorCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
        activeOpacity={0.8}
        onPress={() => onPress(sensor)}
      >
        <LinearGradient
          colors={[alpha(Colors.primary, 0.08), 'transparent']}
          style={styles.sensorGlow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <View style={styles.sensorHeader}>
          <View style={[styles.sensorIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
            {getSensorIcon(sensor.type, 22, Colors.primary)}
          </View>
        </View>
        
        <View style={styles.sensorBody}>
          <Text style={[styles.sensorLabel, { color: Colors.textSecondary }]} numberOfLines={1}>
            {sensor.label}
          </Text>
          <View style={styles.sensorValueRow}>
            <Text style={[styles.sensorValue, { color: Colors.text }]}>
              {typeof sensor.value === "number"
                ? sensor.value.toFixed(sensor.type === "temperature" ? 1 : 0)
                : String(sensor.value)}
            </Text>
            <Text style={[styles.sensorUnit, { color: Colors.primary }]}>{sensor.unit}</Text>
          </View>
          <View style={styles.sensorFooter}>
            <Clock size={11} color={Colors.textMuted} strokeWidth={2.5} />
            <Text style={[styles.sensorTimestamp, { color: Colors.textMuted }]}>
              {getTimeSince(sensor.timestamp)}
            </Text>
          </View>
        </View>
        
        <View style={[styles.addWidgetBadge, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
          <Plus size={14} color={Colors.primary} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function DeviceDetailScreen({ route, navigation }) {
  const { deviceId } = route.params;
  const { 
    devices, 
    deleteDevice, 
    fetchTelemetry, 
    userToken, 
    isDarkTheme, 
    isRefreshing: isContextRefreshing 
  } = useContext(AuthContext);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState('select_widget');
  const [dashboards, setDashboards] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedWidgetType, setSelectedWidgetType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const [tick, setTick] = useState(0);
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [selectedCodeType, setSelectedCodeType] = useState('esp32');
  const [isFavorite, setIsFavorite] = useState(false);
  
  const insets = useSafeAreaInsets();

  // Force refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  // Theme Colors
  const Colors = useMemo(() => ({
    background: isDarkTheme ? "#0A0E27" : "#F8FAFC",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#252B4A" : "#F1F5F9",
    border: isDarkTheme ? "#2D3454" : "#E2E8F0",
    borderLight: isDarkTheme ? "#1F2541" : "#F1F5F9",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    primaryLight: isDarkTheme ? "#1AE4FF" : "#60A5FA",
    secondary: isDarkTheme ? "#A855F7" : "#8B5CF6",
    success: isDarkTheme ? "#10B981" : "#16A34A",
    warning: isDarkTheme ? "#F59E0B" : "#F59E0B",
    danger: isDarkTheme ? "#EF4444" : "#DC2626",
    info: isDarkTheme ? "#3B82F6" : "#0EA5E9",
    white: "#FFFFFF",
    text: isDarkTheme ? "#F8FAFC" : "#0F172A",
    textSecondary: isDarkTheme ? "#94A3B8" : "#64748B",
    textMuted: isDarkTheme ? "#64748B" : "#94A3B8",
    gradientStart: isDarkTheme ? "#6366F1" : "#3B82F6",
    gradientEnd: isDarkTheme ? "#8B5CF6" : "#6366F1",
  }), [isDarkTheme]);

  const device = devices.find((d) => String(d.id || d._id) === String(deviceId));

  const sensors = useMemo(() => {
    if (!device?.telemetry) return [];
    return Object.entries(device.telemetry).map(([key, value]) => ({
      id: key,
      type: key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value: value,
      unit: key.toLowerCase().includes("temp") ? "°C" : key.toLowerCase().includes("hum") ? "%" : "",
      timestamp: parseDate(device.lastTelemetry || device.last_active) || new Date(),
    }));
  }, [device]);

  const actualStatus = useMemo(() => {
    if (!device) return "offline";
    if (device.status === 'offline') return 'offline';
    
    if (device.last_active) {
      const lastActive = parseDate(device.last_active);
      const now = new Date();
      const secondsSinceActive = (now - lastActive) / 1000;
      
      if (secondsSinceActive > 60) return "offline";
      return "online";
    }
    
    return device.status || "offline";
  }, [device, tick]);

  const handleRefresh = useCallback(() => {
    if (!device?.device_token) return;
    setRefreshing(true);
    fetchTelemetry(device.device_token)
      .catch((err) => {
        console.error("Failed to refresh telemetry:", err);
      })
      .finally(() => setRefreshing(false));
  }, [device?.device_token, fetchTelemetry]);

  useEffect(() => {
    if (device) {
      navigation.setOptions({
        headerShown: false,
      });
    }
  }, [device, navigation]);

  if (isContextRefreshing && !device) {
    return <DeviceDetailSkeleton isDarkTheme={isDarkTheme} />;
  }

  if (!device) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconContainer, { backgroundColor: alpha(Colors.danger, 0.12) }]}>
            <AlertTriangle size={64} color={Colors.danger} strokeWidth={2} />
          </View>
          <Text style={[styles.errorTitle, { color: Colors.text }]}>Device not found</Text>
          <Text style={[styles.errorMessage, { color: Colors.textSecondary }]}>
            This device may have been removed or doesn't exist
          </Text>
          <TouchableOpacity 
            style={styles.errorButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              style={styles.errorButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <ArrowLeft size={18} color="#FFF" strokeWidth={2.5} />
              <Text style={styles.errorButtonText}>Go Back</Text>
            </LinearGradient>
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
      message: "Are you sure you want to delete this device? This action cannot be undone.",
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

  const handleSensorPress = useCallback((sensor) => {
    setSelectedSensor(sensor);
    setModalStep('select_widget');
    setModalVisible(true);
  }, []);

  const fetchDashboards = async () => {
    if (!userToken) return;
    try {
      const data = await api.getDashboards();
      setDashboards(data);
    } catch (err) {
      console.error(err);
      setAlertConfig({
        type: 'error', 
        title: "Error", 
        message: "Could not load dashboards", 
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }]
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
    if (!userToken || !selectedSensor || !selectedWidgetType) return;
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      const widgetLabel = selectedSensor?.label;

      const payload = {
        dashboard_id: dashboardId,
        device_id: device._id,
        type: selectedWidgetType,
        label: widgetLabel,
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
      const errorMessage = err.response?.data?.detail || err.message || "Failed to export telemetry";
      setAlertConfig({
        type: 'error', 
        title: "Error", 
        message: errorMessage, 
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColor = actualStatus === "online" ? Colors.success : Colors.danger;
  const isOnline = actualStatus === "online";

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <StatusBar 
        barStyle={isDarkTheme ? "light-content" : "dark-content"} 
        backgroundColor="transparent"
        translucent 
      />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressViewOffset={120}
          />
        }
      >
        {/* Enhanced Hero Header */}
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={[styles.heroSection, { paddingTop: insets.top + 16 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative Elements */}
          <View style={styles.heroDecoration}>
            <View style={[styles.decorCircle, styles.circle1]} />
            <View style={[styles.decorCircle, styles.circle2]} />
            <View style={[styles.decorCircle, styles.circle3]} />
          </View>

          <View style={styles.heroHeader}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
            
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={() => setIsFavorite(!isFavorite)} 
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <Star 
                  size={20} 
                  color={isFavorite ? Colors.warning : "#FFF"} 
                  fill={isFavorite ? Colors.warning : 'transparent'} 
                  strokeWidth={2.5} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setCodeModalVisible(true)} 
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <FileCode size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleRefresh} 
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <RefreshCw size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroIconWrapper}>
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.heroIconGradient}
              >
                <Cpu size={36} color="#FFF" strokeWidth={2.5} />
              </LinearGradient>
            </View>
            
            <View style={styles.heroTextContent}>
              <Text style={styles.heroTitle} numberOfLines={1}>{device.name}</Text>
              <View style={styles.heroMeta}>
                <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={styles.statusText}>{actualStatus.toUpperCase()}</Text>
                </View>
                {device.type && (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{device.type}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.contentBody}>
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <View style={[styles.statIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
                <MapPin size={20} color={Colors.primary} strokeWidth={2.5} />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Location</Text>
                <Text style={[styles.statValue, { color: Colors.text }]} numberOfLines={1}>
                  {device.location || "Not set"}
                </Text>
              </View>
            </View>

            <View style={[styles.statCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <View style={[styles.statIconContainer, { backgroundColor: alpha(Colors.success, 0.12) }]}>
                <Clock size={20} color={Colors.success} strokeWidth={2.5} />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Last Seen</Text>
                <Text style={[styles.statValue, { color: Colors.text }]}>
                  {getTimeSince(device.last_active)}
                </Text>
              </View>
            </View>
          </View>

          {/* Device Identity Section */}
          <View style={styles.identitySection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
                <Shield size={16} color={Colors.primary} strokeWidth={2.5} />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Device Identity</Text>
                <Text style={[styles.sectionSubtitle, { color: Colors.textSecondary }]}>
                  Cryptographic identifiers
                </Text>
              </View>
            </View>
            
            <View style={[styles.identityCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <View style={styles.identityItem}>
                <Text style={[styles.identityLabel, { color: Colors.textSecondary }]}>
                  DEVICE ID
                </Text>
                <TouchableOpacity 
                  style={[styles.identityValueBox, { backgroundColor: Colors.surfaceLight }]}
                  onPress={() => { 
                    Clipboard.setStringAsync(String(device._id || device.id)); 
                    showToast.success('ID copied!'); 
                  }}
                  activeOpacity={0.7}
                >
                  <Text 
                    style={[styles.identityValue, { color: Colors.text }]} 
                    numberOfLines={1} 
                    ellipsizeMode="middle"
                  >
                    {String(device._id || device.id)}
                  </Text>
                  <View style={[styles.copyIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
                    <Copy size={14} color={Colors.primary} strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.identityDivider, { backgroundColor: Colors.borderLight }]} />
              
              <View style={styles.identityItem}>
                <Text style={[styles.identityLabel, { color: Colors.textSecondary }]}>
                  AUTH TOKEN
                </Text>
                <TouchableOpacity 
                  style={[styles.identityValueBox, { backgroundColor: Colors.surfaceLight }]}
                  onPress={handleCopyToken}
                  activeOpacity={0.7}
                >
                  <Text 
                    style={[styles.identityValue, { color: Colors.primary }]} 
                    numberOfLines={1} 
                    ellipsizeMode="middle"
                  >
                    {device.device_token}
                  </Text>
                  <View style={[styles.copyIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
                    <Copy size={14} color={Colors.primary} strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Sensors Section */}
          <View style={styles.sensorsSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: alpha(Colors.secondary, 0.12) }]}>
                <Activity size={16} color={Colors.secondary} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Sensor Telemetry</Text>
                <Text style={[styles.sectionSubtitle, { color: Colors.textSecondary }]}>
                  Real-time sensor data
                </Text>
              </View>
              <View style={[styles.sensorCountBadge, { backgroundColor: alpha(Colors.secondary, 0.12) }]}>
                <Gauge size={14} color={Colors.secondary} strokeWidth={2.5} />
                <Text style={[styles.sensorCountText, { color: Colors.secondary }]}>
                  {sensors.length}
                </Text>
              </View>
            </View>
            
            {sensors.length > 0 ? (
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
            ) : (
              <View style={[styles.emptyState, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                <View style={[styles.emptyIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
                  <Activity size={40} color={Colors.primary} strokeWidth={2} />
                </View>
                <Text style={[styles.emptyTitle, { color: Colors.text }]}>No Sensors Detected</Text>
                <Text style={[styles.emptyMessage, { color: Colors.textSecondary }]}>
                  Waiting for sensor data from this device
                </Text>
                <TouchableOpacity 
                  style={styles.emptyButton} 
                  onPress={handleRefresh}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryLight]}
                    style={styles.emptyButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <RefreshCw size={16} color="#FFF" strokeWidth={2.5} />
                    <Text style={styles.emptyButtonText}>Scan for Sensors</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Delete Section */}
          <View style={styles.dangerSection}>
            <View style={[styles.dangerCard, { backgroundColor: Colors.surface, borderColor: alpha(Colors.danger, 0.3) }]}>
              <View style={styles.dangerContent}>
                <View style={[styles.dangerIconContainer, { backgroundColor: alpha(Colors.danger, 0.12) }]}>
                  <Trash2 size={20} color={Colors.danger} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dangerTitle, { color: Colors.text }]}>Delete Device</Text>
                  <Text style={[styles.dangerMessage, { color: Colors.textSecondary }]}>
                    Permanently remove this device
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.dangerButton, { backgroundColor: alpha(Colors.danger, 0.12) }]}
                onPress={handleDeleteDevice}
                activeOpacity={0.7}
              >
                <Text style={[styles.dangerButtonText, { color: Colors.danger }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Widget Selection Modal */}
      <Modal 
        visible={modalVisible} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { backgroundColor: Colors.surface }]}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <X size={24} color={Colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>

            {modalStep === 'select_widget' && (
              <>
                <View style={[styles.modalIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
                  <Gauge size={32} color={Colors.primary} strokeWidth={2.5} />
                </View>
                
                <Text style={[styles.modalTitle, { color: Colors.text }]}>
                  Add Widget
                </Text>
                <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
                  Select a widget style for "{selectedSensor?.label}"
                </Text>
                
                <ScrollView style={styles.widgetScrollView} showsVerticalScrollIndicator={false}>
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
                            borderColor: Colors.border,
                            backgroundColor: Colors.surfaceLight
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
                        <View style={[styles.widgetLabel, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
                          <Text style={[styles.widgetText, { color: Colors.primary }]}>
                            {type.toUpperCase()}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {modalStep === 'select_dashboard' && (
              <>
                <View style={[styles.modalIconContainer, { backgroundColor: alpha(Colors.secondary, 0.12) }]}>
                  <LayoutDashboard size={32} color={Colors.secondary} strokeWidth={2.5} />
                </View>
                
                <Text style={[styles.modalTitle, { color: Colors.text }]}>
                  Select Dashboard
                </Text>
                <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
                  Choose where to add this widget
                </Text>
                
                {isSubmitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                  </View>
                ) : (
                  <FlatList
                    data={dashboards}
                    keyExtractor={(item) => item._id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.dashboardItem, { backgroundColor: Colors.surfaceLight }]}
                        onPress={() => exportToDashboard(item._id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dashboardContent}>
                          <Text style={[styles.dashboardName, { color: Colors.text }]}>
                            {item.name}
                          </Text>
                          {item.description && (
                            <Text style={[styles.dashboardDesc, { color: Colors.textSecondary }]}>
                              {item.description}
                            </Text>
                          )}
                        </View>
                        <ChevronRight size={20} color={Colors.textMuted} strokeWidth={2.5} />
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={() => (
                      <View style={styles.emptyDashboards}>
                        <Text style={[styles.emptyDashboardsText, { color: Colors.textSecondary }]}>
                          No dashboards available
                        </Text>
                      </View>
                    )}
                    style={styles.dashboardList}
                  />
                )}
              </>
            )}
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
          <View style={[styles.codeModalView, { backgroundColor: Colors.surface }]}>
            <View style={styles.codeModalHeader}>
              <View style={styles.codeModalTitleRow}>
                <View style={[styles.codeModalIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
                  <FileCode size={20} color={Colors.primary} strokeWidth={2.5} />
                </View>
                <View>
                  <Text style={[styles.codeModalTitle, { color: Colors.text }]}>
                    Integration Code
                  </Text>
                  <Text style={[styles.codeModalSubtitle, { color: Colors.textSecondary }]}>
                    Example code for this device
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => setCodeModalVisible(false)}
                style={styles.codeModalCloseButton}
              >
                <X size={24} color={Colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Code Type Selector */}
            <View style={styles.codeTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.codeTypeButton,
                  { 
                    backgroundColor: selectedCodeType === 'esp32' 
                      ? alpha(Colors.primary, 0.15) 
                      : Colors.surfaceLight 
                  },
                  selectedCodeType === 'esp32' && { 
                    borderColor: Colors.primary, 
                    borderWidth: 2 
                  }
                ]}
                onPress={() => setSelectedCodeType('esp32')}
                activeOpacity={0.7}
              >
                <Code 
                  size={18} 
                  color={selectedCodeType === 'esp32' ? Colors.primary : Colors.textMuted} 
                  strokeWidth={2.5}
                />
                <Text 
                  style={[
                    styles.codeTypeText, 
                    { color: selectedCodeType === 'esp32' ? Colors.primary : Colors.textMuted }
                  ]}
                >
                  ESP32 (Arduino)
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.codeTypeButton,
                  { 
                    backgroundColor: selectedCodeType === 'python' 
                      ? alpha(Colors.primary, 0.15) 
                      : Colors.surfaceLight 
                  },
                  selectedCodeType === 'python' && { 
                    borderColor: Colors.primary, 
                    borderWidth: 2 
                  }
                ]}
                onPress={() => setSelectedCodeType('python')}
                activeOpacity={0.7}
              >
                <Code 
                  size={18} 
                  color={selectedCodeType === 'python' ? Colors.primary : Colors.textMuted}
                  strokeWidth={2.5}
                />
                <Text 
                  style={[
                    styles.codeTypeText, 
                    { color: selectedCodeType === 'python' ? Colors.primary : Colors.textMuted }
                  ]}
                >
                  Python
                </Text>
              </TouchableOpacity>
            </View>

            {/* Code Display */}
            <View style={[styles.codeContainer, { backgroundColor: isDarkTheme ? '#0d1117' : '#f6f8fa', borderColor: Colors.border }]}>
              <View style={[styles.codeHeader, { borderBottomColor: Colors.border }]}>
                <Text style={[styles.codeHeaderTitle, { color: Colors.text }]}>
                  {selectedCodeType === 'esp32' ? 'ESP32 Arduino' : 'Python'}
                </Text>
                <TouchableOpacity
                  style={[styles.copyCodeButton, { backgroundColor: alpha(Colors.primary, 0.12) }]}
                  onPress={async () => {
                    const code = selectedCodeType === 'esp32' 
                      ? generateESP32Code(device, BASE_URL)
                      : generatePythonCode(device, BASE_URL);
                    await Clipboard.setStringAsync(code);
                    showToast.success("Code copied!");
                  }}
                  activeOpacity={0.7}
                >
                  <Copy size={14} color={Colors.primary} strokeWidth={2.5} />
                  <Text style={[styles.copyCodeText, { color: Colors.primary }]}>Copy</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.codeScrollView}
                contentContainerStyle={styles.codeScrollContent}
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
      </Modal>

      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />
    </View>
  );
}

// Code generation functions
function generateESP32Code(device, baseUrl) {
  const deviceId = String(device._id || device.id);
  const deviceToken = device.device_token || 'YOUR_DEVICE_TOKEN_HERE';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  return `/* ESP32 Integration with ThingsNXT */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ThingsNXT Configuration
const char* deviceToken = "${deviceToken}";
String serverUrl = "${cleanBaseUrl}/devices/${deviceId}/telemetry";

// Virtual Pin Mapping
struct PinMapping { uint8_t vPin; uint8_t gpio; };
PinMapping VIRTUAL_PIN_MAPPING[] = {
  {0, 2}, // Map Virtual Pin v0 to GPIO 2
};
const uint8_t PIN_COUNT = sizeof(VIRTUAL_PIN_MAPPING) / sizeof(VIRTUAL_PIN_MAPPING[0]);

void setup() {
  Serial.begin(115200);
  for (uint8_t i = 0; i < PIN_COUNT; i++) 
    pinMode(VIRTUAL_PIN_MAPPING[i].gpio, OUTPUT);
  
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
      
      for (uint8_t i = 0; i < PIN_COUNT; i++) {
        String key = "v" + String(VIRTUAL_PIN_MAPPING[i].vPin);
        if (data.containsKey(key)) {
          digitalWrite(VIRTUAL_PIN_MAPPING[i].gpio, 
                      data[key] ? HIGH : LOW);
        }
      }
    }
    http.end();
  }
  delay(2000);
}`;
}

function generatePythonCode(device, baseUrl) {
  const deviceId = String(device._id || device.id);
  const deviceToken = device.device_token || 'YOUR_DEVICE_TOKEN_HERE';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  return `import requests
import time

# Configuration
DEVICE_ID = "${deviceId}"
DEVICE_TOKEN = "${deviceToken}"
BASE_URL = "${cleanBaseUrl}"
SERVER_URL = f"{BASE_URL}/devices/{DEVICE_ID}/telemetry"

def send_telemetry():
    payload = {
        "device_token": DEVICE_TOKEN,
        "temperature": 25.5,
        "humidity": 60.0,
        "uptime": int(time.time())
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(
            SERVER_URL, 
            json=payload, 
            headers=headers
        )
        print(f"Status: {response.status_code}")
        print(response.json())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    while True:
        send_telemetry()
        time.sleep(2)`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  errorMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  errorButton: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  errorButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 10,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circle1: {
    width: 280,
    height: 280,
    top: -120,
    right: -80,
  },
  circle2: {
    width: 180,
    height: 180,
    bottom: -40,
    left: -60,
  },
  circle3: {
    width: 120,
    height: 120,
    top: 40,
    left: -30,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
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
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
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
    overflow: 'hidden',
    borderRadius: 20,
  },
  heroIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
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
    color: '#FFF',
    letterSpacing: 0.5,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },

  // Content Body
  contentBody: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 12,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Identity Section
  identitySection: {
    marginBottom: 24,
  },
  identityCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
  },
  identityItem: {
    gap: 10,
  },
  identityLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  identityValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 12,
  },
  identityValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  copyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityDivider: {
    height: 1,
    marginVertical: 16,
  },

  // Sensors Section
  sensorsSection: {
    marginBottom: 32,
  },
  sensorCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  sensorCountText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sensorsGrid: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sensorCard: {
    width: (width - 40 - 14) / 2,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    minHeight: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  sensorGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  sensorHeader: {
    marginBottom: 16,
  },
  sensorIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorBody: {
    gap: 6,
  },
  sensorLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  sensorValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  sensorValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sensorUnit: {
    fontSize: 16,
    fontWeight: '700',
  },
  sensorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  sensorTimestamp: {
    fontSize: 11,
    fontWeight: '600',
  },
  addWidgetBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyButton: {
    overflow: 'hidden',
    borderRadius: 14,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },

  // Danger Section
  dangerSection: {
    marginBottom: 24,
  },
  dangerCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  dangerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dangerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  dangerMessage: {
    fontSize: 13,
    fontWeight: '500',
  },
  dangerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalView: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 40,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  widgetScrollView: {
    maxHeight: 400,
  },
  widgetOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  widgetOption: {
    width: (width - 56 - 12) / 2,
    height: 130,
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  widgetPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetLabel: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  widgetText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  dashboardList: {
    maxHeight: 300,
  },
  dashboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  dashboardContent: {
    flex: 1,
  },
  dashboardName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  dashboardDesc: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyDashboards: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyDashboardsText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Code Modal
  codeModalView: {
    width: '100%',
    height: '90%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  codeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  codeModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  codeModalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  codeModalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  codeModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  codeTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  codeTypeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  codeContainer: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1.5,
  },
  codeHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  copyCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyCodeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  codeScrollView: {
    flex: 1,
  },
  codeScrollContent: {
    padding: 16,
  },
  codeText: {
    fontSize: 13,
    lineHeight: 20,
  },
});