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
  Bell,
  LayoutDashboard,
  Star,
  Clock,
  TrendingUp,
  Gauge,
  Home,
} from "lucide-react-native";
import StatCard from "../components/home/StatCard";
import HomeSection from "../components/home/HomeSection";
import HomeHeader from "../components/home/HomeHeader";
import DashboardCard from "../components/home/DashboardCard";
import DeviceCard from "../components/home/DeviceCard";
import EmptyState from "../components/home/EmptyState";
// import QuickActionCard from "../components/home/QuickActionCard";
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

export default function HomeScreen() {
  const navigation = useNavigation();
  const { username, devices = [], isDarkTheme, userToken, user } = useContext(AuthContext);
  
  // State Management
  const [dashboards, setDashboards] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);

  // Force refresh every 5 seconds to update relative times/statuses
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-hide welcome banner after 10 seconds
  useEffect(() => {
    if (devices.length > 0) {
      const timer = setTimeout(() => setShowWelcome(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [devices.length]);

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

  // Enhanced Stats calculations
  const { 
    onlineDevices, 
    offlineDevices, 
    activeDevices, 
    favoriteDevices, 
    recentDevices,
    deviceTypes,
    healthScore 
  } = useMemo(() => {
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

    // Calculate device types distribution
    const types = devices.reduce((acc, device) => {
      const type = device.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Calculate health score (percentage of online devices)
    const health = devices.length > 0 
      ? Math.round((online / devices.length) * 100) 
      : 100;

    return { 
      onlineDevices: online, 
      offlineDevices: offline, 
      activeDevices: active, 
      favoriteDevices: favorites, 
      recentDevices: recents,
      deviceTypes: types,
      healthScore: health
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
        {/* Welcome Banner (dismissible, auto-hide) */}
        {devices.length === 0 && showWelcome && (
          <View style={styles.welcomeSection}>
            <View style={[styles.welcomeBanner, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <LinearGradient
                colors={[alpha(Colors.primary, 0.08), 'transparent']}
                style={styles.welcomeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.welcomeContent}>
                <View style={[styles.welcomeIcon, { backgroundColor: alpha(Colors.primary, 0.15) }]}>
                  <Home size={28} color={Colors.primary} strokeWidth={2.5} />
                </View>
                <View style={styles.welcomeText}>
                  <Text style={[styles.welcomeTitle, { color: Colors.text }]}>
                    Welcome to ThingsNXT! 👋
                  </Text>
                  <Text style={[styles.welcomeMessage, { color: Colors.textSecondary }]}>
                    Get started by adding your first IoT device
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowWelcome(false)}
                  style={styles.welcomeClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.welcomeCloseText, { color: Colors.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}



        {/* Overview Section */}
        <HomeSection 
          title="Overview" 
          titleColor={Colors.text}
          icon={<Gauge size={18} color={Colors.primary} strokeWidth={2.5} />}
        >
          {loading ? (
            <View style={styles.statsGrid}>
              <StatCardSkeleton Colors={Colors} />
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
                onPress={() => navigation.navigate('Devices')}
              />
              <StatCard
                colors={[Colors.success, "#059669"]}
                icon={<Wifi size={26} color={Colors.white} strokeWidth={2.5} />}
                value={onlineDevices}
                title="Online"
                onPress={() => navigation.navigate('Devices')}
              />
              <StatCard
                colors={[Colors.warning, "#D97706"]}
                icon={<Zap size={26} color={Colors.white} strokeWidth={2.5} />}
                value={activeDevices}
                title="Active"
                onPress={() => navigation.navigate('Devices')}
              />
              <StatCard
                colors={[Colors.danger, "#DC2626"]}
                icon={<WifiOff size={26} color={Colors.white} strokeWidth={2.5} />}
                value={offlineDevices}
                title="Offline"
                onPress={() => navigation.navigate('Devices')}
              />
            </View>
          )}
        </HomeSection>

        {/* System Health Indicator (if there are offline devices) */}
        {!loading && offlineDevices > 0 && (
          <View style={styles.healthSection}>
            <View style={[styles.healthBanner, { backgroundColor: alpha(Colors.warning, 0.12), borderColor: alpha(Colors.warning, 0.3) }]}>
              <AlertTriangle size={20} color={Colors.warning} strokeWidth={2.5} />
              <Text style={[styles.healthText, { color: Colors.text }]}>
                {offlineDevices} device{offlineDevices > 1 ? 's are' : ' is'} offline
              </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Devices')}
                style={[styles.healthButton, { backgroundColor: alpha(Colors.warning, 0.15) }]}
              >
                <Text style={[styles.healthButtonText, { color: Colors.warning }]}>View</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Dashboards Section */}
        <HomeSection
          title="Dashboards"
          linkText="View All"
          onLinkPress={() => navigation.navigate("Dashboards")}
          titleColor={Colors.text}
          linkColor={Colors.primary}
          icon={<LayoutDashboard size={18} color={Colors.primary} strokeWidth={2.5} />}
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

        {/* Device Types Summary (if more than 3 devices) */}
        {!loading && devices.length > 3 && Object.keys(deviceTypes).length > 1 && (
          <HomeSection 
            title="Device Distribution" 
            titleColor={Colors.text}
            icon={<TrendingUp size={18} color={Colors.primary} strokeWidth={2.5} />}
          >
            <View style={styles.distributionContainer}>
              {Object.entries(deviceTypes)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([type, count]) => (
                  <View 
                    key={type} 
                    style={[styles.distributionItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                  >
                    <View style={styles.distributionInfo}>
                      <Text style={[styles.distributionType, { color: Colors.text }]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                      <Text style={[styles.distributionCount, { color: Colors.textSecondary }]}>
                        {count} device{count > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={[styles.distributionBadge, { backgroundColor: alpha(Colors.primary, 0.15) }]}>
                      <Text style={[styles.distributionBadgeText, { color: Colors.primary }]}>
                        {Math.round((count / devices.length) * 100)}%
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          </HomeSection>
        )}

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

  // Welcome Banner
  welcomeSection: {
    paddingHorizontal: CARD_PADDING,
    marginBottom: 24,
  },
  welcomeBanner: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  welcomeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    flex: 1,
    gap: 4,
  },
  welcomeTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  welcomeMessage: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  welcomeClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeCloseText: {
    fontSize: 20,
    fontWeight: '400',
  },

  // Quick Actions
  quickActionsScroll: {
    gap: 12,
    paddingRight: CARD_PADDING,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },

  // Health Section
  healthSection: {
    paddingHorizontal: CARD_PADDING,
    marginBottom: 24,
  },
  healthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1.5,
  },
  healthText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  healthButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  healthButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
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

  // Distribution
  distributionContainer: {
    gap: 12,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  distributionInfo: {
    flex: 1,
    gap: 4,
  },
  distributionType: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  distributionCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  distributionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  distributionBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
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