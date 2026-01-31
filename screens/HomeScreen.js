// screens/HomeScreen.js
import React, { useContext, useState, useMemo, useCallback, useEffect } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../context/AuthContext";
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
  LayoutDashboard,
  Lightbulb,
  Thermometer,
  Star,
  Clock,
} from "lucide-react-native";
import StatCard from "../components/home/StatCard";
import HomeSection from "../components/home/HomeSection";
import HomeHeader from "../components/home/HomeHeader";
import DashboardCard from "../components/home/DashboardCard";
import DeviceCard from "../components/home/DeviceCard";
import EmptyState from "../components/home/EmptyState";
import { 
  StatCardSkeleton, 
  DashboardCardSkeleton, 
  DeviceCardSkeleton 
} from "../components/home/HomeSkeletons";
import { getDeviceStatus, parseDate } from "../utils/device";
import api from "../services/api";
import { moderateScale } from "../utils/scaling";
import { getThemeColors, alpha } from "../utils/theme";

// CARD LAYOUT CONSTANTS
const { width, height } = Dimensions.get("window");
const CARD_PADDING = 20;
const CARD_GAP = 14;

// Internal sub-components successfully refactored to standalone files in ../components/home/

export default function HomeScreen() {
  const navigation = useNavigation();
  const { username, devices = [], isDarkTheme, userToken } = useContext(AuthContext);
  const [dashboards, setDashboards] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  // Force refresh every 5 seconds to update relative times/statuses
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const Colors = useMemo(() => getThemeColors(isDarkTheme), [isDarkTheme]);

  const fetchData = async (isInitialLoad = false) => {
    if (!userToken) return;
    if (isInitialLoad) setLoading(true);
    try {
      const [dashboardsData, notificationsData] = await Promise.all([
        api.getDashboards().catch(err => {
          console.error("Failed to load dashboards:", err.message);
          return [];
        }),
        api.getNotifications({ limit: 100, read: false }).catch(err => {
          console.warn("Failed to load notifications:", err.message);
          return { notifications: [] };
        })
      ]);

      setDashboards(dashboardsData || []);
      setUnreadNotifications(notificationsData?.notifications?.length || 0);
    } catch (err) {
      console.error("Home Screen fetch error:", err.message);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [userToken])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData(false);
    } catch (error) {
      console.error("Failed to refresh home screen:", error);
    }
    setRefreshing(false);
  }, [userToken]);

  // Stats calculations
  const { onlineDevices, offlineDevices, activeDevices, favoriteDevices, recentDevices } = useMemo(() => {
    const online = devices.filter((d) => getDeviceStatus(d) === "online").length;
    const offline = devices.filter((d) => getDeviceStatus(d) === "offline").length;
    const active = devices.filter((d) => getDeviceStatus(d) === "online" && d?.isOn).length;
    const favorites = devices.filter(d => d.is_favorite === true).slice(0, 4);
    const recents = [...devices]
      .sort((a, b) => {
        const dateA = a.last_active ? parseDate(a.last_active).getTime() : 0;
        const dateB = b.last_active ? parseDate(b.last_active).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 4);

    return { 
      onlineDevices: online, 
      offlineDevices: offline, 
      activeDevices: active, 
      favoriteDevices: favorites, 
      recentDevices: recents 
    };
  }, [devices, tick]);

  const renderDashboardItem = useCallback(({ item }) => (
    <DashboardCard
      dashboard={item}
      onPress={(d) => navigation.navigate('Dashboard', { dashboard: d })}
      Colors={Colors}
    />
  ), [navigation, Colors]);

  const renderDeviceItem = useCallback(({ item }) => (
    <DeviceCard
      device={item}
      Colors={Colors}
      onPress={(d) => navigation.navigate("DeviceDetail", { deviceId: String(d.id || d._id) })}
    />
  ), [navigation, Colors]);

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <StatusBar 
        barStyle={isDarkTheme ? "light-content" : "dark-content"} 
        backgroundColor="transparent"
        translucent
      />

      <HomeHeader
        username={username}
        isDarkTheme={isDarkTheme}
        Colors={Colors}
        onNotificationPress={() => navigation.navigate('Notifications')}
        unreadCount={unreadNotifications}
      />

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
            progressViewOffset={120}
          />
        }
      >
        {/* Overview Section */}
        <HomeSection title="Overview" titleColor={Colors.text}>
          {loading ? (
            <View style={styles.statsGrid}>
              <StatCardSkeleton isLarge Colors={Colors} />
              <StatCardSkeleton Colors={Colors} />
              <StatCardSkeleton Colors={Colors} />
              <StatCardSkeleton Colors={Colors} />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <StatCard
                colors={[Colors.primary, Colors.primaryDark]}
                icon={<Activity size={26} color={Colors.white} strokeWidth={2.5} />}
                value={devices.length}
                title="Total Devices"
                isLarge
              />
              <StatCard
                colors={[Colors.success, "#059669"]}
                icon={<Wifi size={26} color={Colors.white} strokeWidth={2.5} />}
                value={onlineDevices}
                title="Online"
              />
              <StatCard
                colors={[Colors.warning, "#D97706"]}
                icon={<Zap size={26} color={Colors.white} strokeWidth={2.5} />}
                value={activeDevices}
                title="Active"
              />
              <StatCard
                colors={[Colors.danger, "#DC2626"]}
                icon={<WifiOff size={26} color={Colors.white} strokeWidth={2.5} />}
                value={offlineDevices}
                title="Offline"
              />
            </View>
          )}
        </HomeSection>

        {/* Dashboards Section */}
        <HomeSection
          title="Dashboards"
          linkText="View All"
          onLinkPress={() => navigation.navigate("Dashboards")}
          titleColor={Colors.text}
          linkColor={Colors.primary}
        >
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dashboardsScroll}
            data={loading ? [{key: 's1'}, {key: 's2'}] : dashboards}
            renderItem={loading ? () => <DashboardCardSkeleton Colors={Colors} /> : renderDashboardItem}
            keyExtractor={(item, index) => item._id || `skeleton-${index}`}
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  icon={LayoutDashboard}
                  title="No Dashboards Yet"
                  message="Create custom dashboards to visualize and monitor your device data in real-time."
                  buttonText="Create Dashboard"
                  onButtonPress={() => navigation.navigate("Dashboards")}
                  Colors={Colors}
                />
              ) : null
            }
          />
        </HomeSection>

        {/* Favorites Section */}
        {favoriteDevices.length > 0 && (
          <HomeSection
            title="Favorites"
            icon={<Star size={18} color={Colors.primary} strokeWidth={2.5} />}
            linkText="See All"
            onLinkPress={() => navigation.navigate("Devices")}
            titleColor={Colors.text}
            linkColor={Colors.primary}
          >
            <FlatList
              scrollEnabled={false}
              contentContainerStyle={styles.devicesGrid}
              data={loading ? Array(2).fill({}).map((_, i) => ({key: `fs-${i}`})) : favoriteDevices}
              renderItem={loading ? () => <DeviceCardSkeleton Colors={Colors} /> : renderDeviceItem}
              keyExtractor={(item, index) => String(item.id || item._id || `skeleton-fav-${index}`)}
              numColumns={2}
            />
          </HomeSection>
        )}

        {/* Recent Activity Section */}
        <HomeSection 
          title="Recent Activity" 
          icon={<Clock size={18} color={Colors.primary} strokeWidth={2.5} />}
          titleColor={Colors.text}
        >
          <FlatList
            scrollEnabled={false}
            contentContainerStyle={styles.devicesGrid}
            data={loading && recentDevices.length === 0 ? Array(2).fill({}).map((_, i) => ({key: `rs-${i}`})) : recentDevices}
            renderItem={loading && recentDevices.length === 0 ? () => <DeviceCardSkeleton Colors={Colors} /> : renderDeviceItem}
            keyExtractor={(item, index) => String(item.id || item._id || `skeleton-rec-${index}`)}
            numColumns={2}
            ListEmptyComponent={
              !loading && devices.length === 0 ? (
                <EmptyState
                  icon={Cpu}
                  title="No Devices Found"
                  message="Get started by adding your first IoT device to the platform and start monitoring."
                  buttonText="Add Device"
                  onButtonPress={() => navigation.navigate("Devices")}
                  Colors={Colors}
                />
              ) : !loading && recentDevices.length === 0 ? (
                <View style={styles.noActivityContainer}>
                  <Text style={[styles.noActivityText, { color: Colors.textMuted }]}>
                    No recent device activity
                  </Text>
                </View>
              ) : null
            }
          />
        </HomeSection>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 60,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  // List Spacing
  dashboardsScroll: {
    gap: 14,
    paddingRight: CARD_PADDING,
  },
  devicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },

  // No Activity
  noActivityContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noActivityText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});