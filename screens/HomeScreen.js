// screens/HomeScreen.js
import React, { useContext, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { API_BASE } from "../constants/config";
import { showToast } from "../components/Toast";
import {
  Zap,
  Activity,
  Cpu,
  Wifi,
  WifiOff,
  AlertTriangle,
  DoorClosed,
  PowerPlug,
  Bell,
  TrendingUp,
  Camera,
  Lock,
  Shield,
  ChevronRight,
} from "lucide-react-native";
import { Lightbulb, Thermometer } from "lucide-react-native";
import StatCard from "../components/home/StatCard";
import HomeSection from "../components/home/HomeSection";

// 📱 Responsive scaling based on device width
const { width, height } = Dimensions.get("window");
const CARD_PADDING = 16;
const CARD_GAP = 12;

const getDeviceIcon = (type, size = 24, color = "#FFFFFF") => {
  const iconProps = { size, color };
  switch (type) {
    case "light":
      return <Lightbulb {...iconProps} />;
    case "thermostat":
      return <Thermometer {...iconProps} />;
    case "plug":
      return <PowerPlug {...iconProps} />;
    case "door":
      return <DoorClosed {...iconProps} />;
    case 'camera':
      return <Camera {...iconProps} />;
    case 'lock':
      return <Lock {...iconProps} />;
    default:
      return <Cpu {...iconProps} />;
  }
};

const getStatusIcon = (status, size = 16) => {
  switch (status) {
    case "online":
      return <Wifi size={size} color="#00FF88" />;
    case "offline":
      return <WifiOff size={size} color="#FF3366" />;
    case "warning":
      return <AlertTriangle size={size} color="#FFB800" />;
    default:
      return null;
  }
};

const getDashboardIcon = (type, size = 20) => {
  const iconProps = { size, color: "#FFFFFF" };
  switch (type) {
    case 'energy':
      return <Zap {...iconProps} />;
    case 'security':
      return <Shield {...iconProps} />;
    case 'climate':
      return <Thermometer {...iconProps} />;
    case 'lighting':
      return <Lightbulb {...iconProps} />;
    default:
      return <Activity {...iconProps} />;
  }
};

const getDashboardGradient = (type, Colors) => {
  switch (type) {
    case 'energy':
      return [Colors.secondary, '#DB2777'];
    case 'security':
      return [Colors.danger, '#DC2626'];
    case 'climate':
      return [Colors.primary, Colors.primaryDark];
    case 'lighting':
      return ['#F59E0B', '#D97706'];
    default:
      return [Colors.primary, Colors.primaryDark];
  }
};

const HomeHeader = ({ username, isDarkTheme, Colors, onNotificationPress }) => (
  <LinearGradient
    colors={isDarkTheme ? [Colors.background, Colors.surface] : ["#FFFFFF", "#F1F5F9"]}
    style={styles.header}
  >
    <View style={styles.headerContent}>
      <View>
        <Text style={[styles.greeting, { color: Colors.textSecondary }]}>Welcome back, {username || "User"} 👋</Text>
        <Text style={[styles.title, { color: Colors.text }]}>ThingsNXT</Text>
      </View>
      <TouchableOpacity
        style={[styles.notificationButton, { backgroundColor: Colors.surfaceLight }]}
        onPress={onNotificationPress}
      >
        <Bell size={24} color={Colors.white} />
      </TouchableOpacity>
    </View>
  </LinearGradient>
);

const DashboardCard = ({ dashboard, onPress, Colors }) => {
  const gradientColors = getDashboardGradient(dashboard.type, Colors);
  return (
    <TouchableOpacity
      style={styles.dashboardCard}
      onPress={() => onPress(dashboard)}
      activeOpacity={0.7}
    >
      <LinearGradient colors={gradientColors} style={styles.dashboardGradient}>
        <View style={styles.dashboardHeader}>
          <View style={styles.dashboardIconContainer}>
            {getDashboardIcon(dashboard.type, 24)}
          </View>
          <ChevronRight size={20} color={Colors.white} />
        </View>
        <Text style={styles.dashboardName}>{dashboard.name}</Text>
        <Text style={styles.dashboardValue}>
          {dashboard.primaryMetric?.value || '--'}
          {dashboard.primaryMetric?.unit && (
            <Text style={styles.dashboardUnit}> {dashboard.primaryMetric.unit}</Text>
          )}
        </Text>
        <Text style={styles.dashboardLabel}>
          {dashboard.primaryMetric?.label || 'Primary Metric'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const DeviceCard = ({ device, onPress, Colors }) => (
  <TouchableOpacity
    style={[styles.deviceCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
    onPress={() => onPress(device)}
    activeOpacity={0.7}
  >
    <View style={styles.deviceCardHeader}>
      <View style={[styles.deviceIcon, { backgroundColor: device.status === "online" ? Colors.primary + "20" : Colors.surfaceLight }]}>
        {getDeviceIcon(device.type, 20, device.status === 'online' ? Colors.primary : Colors.textMuted)}
      </View>
      {getStatusIcon(device.status, 14)}
    </View>
    <Text style={[styles.deviceName, { color: Colors.text }]} numberOfLines={1}>
      {device.name}
    </Text>
    <Text style={[styles.deviceRoom, { color: Colors.textMuted }]}>{device.type}</Text>
    {device.isOn !== undefined && !device.value && (
      <View style={[styles.deviceStatus, { backgroundColor: device.isOn ? Colors.success + "20" : Colors.surfaceLight }]}>
        <Text style={[styles.deviceStatusText, { color: device.isOn ? Colors.success : Colors.textMuted }]}>
          {device.isOn ? "ON" : "OFF"}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);


export default function HomeScreen() {
  const navigation = useNavigation();
  const { username, devices = [], isDarkTheme, userToken, logout } = useContext(AuthContext);
  const [dashboards, setDashboards] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const Colors = {
    background: isDarkTheme ? "#0A0E27" : "#F1F5F9",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#252B4A" : "#E2E8F0",
    border: isDarkTheme ? "#252B4A" : "#E2E8F0",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    primaryDark: isDarkTheme ? "#00B5D4" : "#2563EB",
    secondary: isDarkTheme ? "#7B61FF" : "#6D28D9",
    success: isDarkTheme ? "#00FF88" : "#16A34A",
    danger: isDarkTheme ? "#FF3366" : "#DC2626",
    white: "#FFFFFF",
    text: isDarkTheme ? "#FFFFFF" : "#1E293B",
    textSecondary: isDarkTheme ? "#8B91A7" : "#64748B",
    textMuted: isDarkTheme ? "#8B91A7" : "#64748B",
    statusOnline: "#00FF88",
    statusOffline: "#FF3366",
    statusWarning: "#FFB800",
  };

  const fetchDashboardsAndNotifications = async () => {
    if (!userToken) return;
    try {
      // Fetch Dashboards
      const dashboardsRes = await axios.get(`${API_BASE}/dashboards`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setDashboards(dashboardsRes.data || []);

    } catch (err) {
      console.error("Home Screen fetch error:", err.response?.data || err.message);
      if (err.response?.status === 401) logout();
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardsAndNotifications();
    }, [userToken])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDashboardsAndNotifications();
    } catch (error) {
      console.error("Failed to refresh home screen:", error);
    }
    setRefreshing(false);
  }, [userToken]);

  // 📊 Stats
  const onlineDevices = devices.filter((d) => d?.status === "online").length;
  const offlineDevices = devices.filter((d) => d?.status === "offline").length;
  const activeDevices = devices.filter(
    (d) => d?.status === "online" && d?.isOn
  ).length;

  const recentDevices = useMemo(() => {
    return devices.slice(0, 4); // Show up to 4 recent devices
  }, [devices]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
      <HomeHeader username={username} isDarkTheme={isDarkTheme} Colors={Colors} onNotificationPress={() => navigation.navigate('Notifications')} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.statsContainer}>
          <StatCard
            colors={[Colors.primary, Colors.primaryDark]}
            icon={<Activity size={24} color={Colors.white} />}
            value={devices.length}
            title="Total Devices"
            isLarge
          />
          <StatCard
            colors={[Colors.success, "#059669"]}
            icon={<Wifi size={24} color={Colors.white} />}
            value={onlineDevices}
            title="Online"
          />
          <StatCard
            colors={[Colors.secondary, "#DB2777"]}
            icon={<Zap size={24} color={Colors.white} />}
            value={activeDevices}
            title="Active"
          />
          <StatCard
            colors={[Colors.danger, "#C11B48"]}
            icon={<WifiOff size={24} color={Colors.white} />}
            value={offlineDevices}
            title="Offline"
          />
        </View>

        <HomeSection
          title="Dashboards"
          linkText="Customize"
          onLinkPress={() => navigation.navigate("Dashboards")}
          titleColor={Colors.text}
          linkColor={Colors.primary}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dashboardsScroll}
          >
            {dashboards.map(dashboard => (
              <DashboardCard
                key={dashboard._id}
                dashboard={dashboard}
                onPress={(d) => navigation.navigate('Dashboard', { dashboard: d })}
                Colors={Colors}
              />
            ))}
          </ScrollView>
        </HomeSection>

        <HomeSection
          title="Quick Access"
          linkText="See all"
          onLinkPress={() => navigation.navigate("Devices")}
          titleColor={Colors.text}
          linkColor={Colors.primary}
        >
          <View style={styles.devicesGrid}>
            {recentDevices.map((device) => (
              <DeviceCard
                key={String(device.id || device._id)}
                device={device}
                Colors={Colors}
                onPress={(d) =>
                  navigation.navigate("DeviceDetail", { deviceId: String(device.id || device._id) })
                }
              />
            ))}
          </View>
        </HomeSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: CARD_PADDING,
    paddingTop: 20,
    gap: CARD_GAP,
  },
   section: {
    marginTop: 28,
    paddingHorizontal: CARD_PADDING,
  },
  devicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  deviceCard: {
    width: (width - CARD_PADDING * 2 - CARD_GAP) / 2,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  deviceCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  deviceRoom: {
    fontSize: 12,
    marginBottom: 12,
  },
  deviceValue: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  deviceValueText: {
    fontSize: 13,
    fontWeight: "600",
  },
  deviceStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  deviceStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chartCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
  },
  chartValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    paddingHorizontal: 2,
  },
  chartBar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 11,
    marginTop: 8,
  },
  dashboardsScroll: {
    gap: 12,
    paddingRight: CARD_PADDING,
  },
  dashboardCard: {
    width: width * 0.65,
    borderRadius: 20,
    overflow: 'hidden',
  },
  dashboardGradient: {
    padding: 20,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardName: {
    fontSize: 18,
    fontWeight: '700',
    color: "#FFFFFF",
  },
  dashboardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: "#FFFFFF",
  },
  dashboardUnit: {
    fontSize: 20,
    fontWeight: '600',
  },
  dashboardLabel: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.9,
  },
});
