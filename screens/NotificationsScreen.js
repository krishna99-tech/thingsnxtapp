import React, { useEffect, useState, useContext, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  Shield,
  Zap,
  Activity,
  Settings as SettingsIcon,
  Check,
  X,
  Wifi,
  WifiOff,
  ArrowUpCircle,
  Inbox,
  CheckCheck,
} from "lucide-react-native";
import { AuthContext } from "../context/AuthContext";
import { formatDate } from "../utils/format";
import api from "../services/api";
import CustomAlert from "../components/CustomAlert";

// Utility function for color opacity
const alpha = (hex, opacity) => {
  const o = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + o;
};

const formatTimestamp = (date) => {
  if (!date) return "";
  const now = new Date();
  const notificationDate = new Date(date);
  const diffMs = now.getTime() - notificationDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return notificationDate.toLocaleDateString();
};

export default function NotificationsScreen() {
  const { isDarkTheme, userToken, logout } = useContext(AuthContext);
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  const Colors = useMemo(() => ({
    background: isDarkTheme ? "#0A0E27" : "#F8FAFC",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#252B4A" : "#F1F5F9",
    surfaceElevated: isDarkTheme ? "#242B4D" : "#FAFBFC",
    border: isDarkTheme ? "#2D3454" : "#E2E8F0",
    borderLight: isDarkTheme ? "#1F2541" : "#F1F5F9",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    primaryLight: isDarkTheme ? "#1AE4FF" : "#60A5FA",
    secondary: isDarkTheme ? "#A855F7" : "#8B5CF6",
    success: isDarkTheme ? "#10B981" : "#16A34A",
    danger: isDarkTheme ? "#EF4444" : "#DC2626",
    warning: isDarkTheme ? "#F59E0B" : "#F59E0B",
    info: isDarkTheme ? "#3B82F6" : "#0EA5E9",
    white: "#FFFFFF",
    text: isDarkTheme ? "#F8FAFC" : "#0F172A",
    textSecondary: isDarkTheme ? "#94A3B8" : "#64748B",
    textMuted: isDarkTheme ? "#64748B" : "#94A3B8",
    gradientStart: isDarkTheme ? "#6366F1" : "#3B82F6",
    gradientEnd: isDarkTheme ? "#8B5CF6" : "#6366F1",
  }), [isDarkTheme]);

  const getNotificationIcon = (type, category, size = 22) => {
    const strokeWidth = 2.5;
    if (type === "alert") return <AlertTriangle size={size} color={Colors.danger} strokeWidth={strokeWidth} />;
    if (type === "warning") return <Bell size={size} color={Colors.warning} strokeWidth={strokeWidth} />;
    if (type === "success") return <CheckCircle size={size} color={Colors.success} strokeWidth={strokeWidth} />;
    if (category === "security") return <Shield size={size} color={Colors.danger} strokeWidth={strokeWidth} />;
    if (category === "energy") return <Zap size={size} color={Colors.secondary} strokeWidth={strokeWidth} />;
    if (category === "device") return <Activity size={size} color={Colors.primary} strokeWidth={strokeWidth} />;
    if (type === "online") return <Wifi size={size} color={Colors.success} strokeWidth={strokeWidth} />;
    if (type === "offline") return <WifiOff size={size} color={Colors.danger} strokeWidth={strokeWidth} />;
    if (type === "update") return <ArrowUpCircle size={size} color={Colors.primary} strokeWidth={strokeWidth} />;
    return <Info size={size} color={Colors.info} strokeWidth={strokeWidth} />;
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "security": return Colors.danger;
      case "energy": return Colors.secondary;
      case "device": return Colors.primary;
      case "system": return Colors.success;
      default: return Colors.info;
    }
  };

  // Load notifications from API
  const loadNotifications = async () => {
    if (!userToken) return;
    
    try {
      const response = await api.getNotifications({ limit: 50 });
      
      const data = response?.notifications || [];
      const formatted = data.map((notif) => ({
        id: notif._id || notif.id,
        title: notif.title,
        message: notif.message,
        type: notif.type || "info",
        category: notif.category || "system",
        timestamp: new Date(notif.created_at),
        read: notif.read || false,
        deviceId: notif.details?.device_id,
      }));
      
      setNotifications(formatted);
    } catch (err) {
      if (err.message && (err.message.includes("404") || err.status === 404)) {
        console.warn("Notifications endpoint not found (404). Using empty list.");
        setNotifications([]);
      } else {
        console.error("Failed to load notifications:", err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!userToken) return;

    loadNotifications();
    
    let sseController;
    let isMounted = true;

    const connectWebSocket = () => {
      if (!isMounted) return;

      const handleSSEMessage = (data) => {
        if (!isMounted) return;
        
        if (data.type === "notification" && data.notification) {
          const notif = data.notification;
          setNotifications((prev) => [
            {
              id: notif._id || notif.id,
              title: notif.title,
              message: notif.message,
              type: notif.type || "info",
              category: notif.category || "system",
              timestamp: new Date(notif.created_at),
              read: false,
              deviceId: notif.details?.device_id,
            },
            ...prev,
          ]);
        } else if (data.type === "initial" && data.notifications?.length > 0) {
          const formatted = data.notifications.map((notif) => ({
            id: notif.id || notif._id,
            title: notif.title,
            message: notif.message,
            type: notif.type || "info",
            category: notif.category || "system",
            timestamp: new Date(notif.created_at),
            read: notif.read || false,
            deviceId: notif.details?.device_id,
          }));
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const newNotifs = formatted.filter((n) => !existingIds.has(n.id));
            return [...newNotifs, ...prev];
          });
        }
      };

      const handleSSEError = (err) => {
        if (!isMounted) return;
        console.error("SSE connection error:", err.message);
        
        if (err.message.includes("401") || err.message.includes("Session expired")) {
          logout();
          return;
        }
      };

      api.streamNotifications(handleSSEMessage, handleSSEError)
        .then(controller => {
          if (isMounted) {
            sseController = controller;
          } else {
            controller.abort();
          }
        })
        .catch(err => {
          handleSSEError(err);
        });
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (sseController) {
        sseController.abort();
      }
    };
  }, [userToken]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.read);
    } else if (filter !== "all") {
      filtered = filtered.filter((n) => n.category === filter);
    }
    return filtered.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAsRead = async (notificationId) => {
    if (!userToken) return;
    
    const notification = notifications.find(n => n.id === notificationId);
    if (notification?.read) return;

    try {
      api.markNotificationRead(notificationId).catch(err => 
        console.error("Mark as read failed:", err.message)
      );
      
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err.message);
    } 
  };

  const markAllAsRead = async () => {
    if (!userToken) return;
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err.message);
      setAlertConfig({
        type: 'error',
        title: "Error",
        message: "Could not mark all notifications as read.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
    }
  };

  const handleNotificationPress = (notification) => {
    markAsRead(notification.id);
    if (notification.deviceId) {
      navigation.navigate("DeviceDetail", { deviceId: notification.deviceId });
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!userToken) return;

    try {
      await api.deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
    } catch (err) {
      console.error("Error deleting notification:", err.message);
      setAlertConfig({
        type: 'error',
        title: "Error",
        message: "Could not delete the notification. Please try again.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
    }
  };

  const filters = [
    { key: "all", label: "All", icon: Inbox },
    { key: "unread", label: "Unread", icon: Bell },
    { key: "security", label: "Security", icon: Shield },
    { key: "energy", label: "Energy", icon: Zap },
    { key: "device", label: "Device", icon: Activity },
    { key: "system", label: "System", icon: SettingsIcon },
  ];

  const NotificationCard = ({ item }) => {
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
          style={[
            styles.notificationCard,
            { 
              backgroundColor: Colors.surface, 
              borderColor: !item.read ? alpha(Colors.primary, 0.3) : Colors.border,
            },
          ]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          {!item.read && (
            <LinearGradient
              colors={[alpha(Colors.primary, 0.05), 'transparent']}
              style={styles.notificationGlow}
            />
          )}

          <View style={styles.notificationContent}>
            <View style={[
              styles.notificationIcon, 
              { backgroundColor: alpha(getCategoryColor(item.category), 0.12) }
            ]}>
              {getNotificationIcon(item.type, item.category, 24)}
            </View>

            <View style={styles.notificationText}>
              <View style={styles.notificationHeader}>
                <Text 
                  style={[
                    styles.notificationTitle, 
                    { color: Colors.text },
                    !item.read && styles.notificationTitleUnread
                  ]} 
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {!item.read && (
                  <View style={[styles.unreadDot, { backgroundColor: Colors.primary }]} />
                )}
              </View>
              
              <Text 
                style={[styles.notificationMessage, { color: Colors.textSecondary }]} 
                numberOfLines={2}
              >
                {item.message}
              </Text>
              
              <View style={styles.notificationMeta}>
                <Text style={[styles.notificationTime, { color: Colors.textMuted }]}>
                  {formatTimestamp(item.timestamp)}
                </Text>
                <View style={[
                  styles.categoryBadge, 
                  { backgroundColor: alpha(getCategoryColor(item.category), 0.12) }
                ]}>
                  <Text 
                    style={[
                      styles.categoryBadgeText, 
                      { color: getCategoryColor(item.category) }
                    ]}
                  >
                    {item.category}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              deleteNotification(item.id);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View style={[styles.deleteIcon, { backgroundColor: alpha(Colors.danger, 0.1) }]}>
              <X size={16} color={Colors.danger} strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <StatusBar 
        barStyle={isDarkTheme ? "light-content" : "dark-content"} 
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative Elements */}
        <View style={styles.headerDecoration}>
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </View>

        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </Text>
          </View>
          
          {unreadCount > 0 && (
            <TouchableOpacity 
              onPress={markAllAsRead} 
              style={styles.markAllButton}
              activeOpacity={0.7}
            >
              <CheckCheck size={20} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: Colors.surface, borderBottomColor: Colors.borderLight }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {filters.map((filterItem) => {
            const isActive = filter === filterItem.key;
            const Icon = filterItem.icon;
            const filterCount = filterItem.key === "unread" 
              ? unreadCount 
              : filterItem.key === "all" 
                ? notifications.length 
                : notifications.filter(n => n.category === filterItem.key).length;

            return (
              <TouchableOpacity
                key={filterItem.key}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: Colors.surfaceLight, 
                    borderColor: Colors.border 
                  },
                  isActive && { 
                    backgroundColor: Colors.primary, 
                    borderColor: Colors.primary 
                  }
                ]}
                onPress={() => setFilter(filterItem.key)}
                activeOpacity={0.7}
              >
                {Icon && (
                  <Icon 
                    size={16} 
                    color={isActive ? Colors.white : Colors.textMuted} 
                    strokeWidth={2.5}
                  />
                )}
                <Text 
                  style={[
                    styles.filterChipText, 
                    { color: Colors.textMuted },
                    isActive && { color: Colors.white, fontWeight: '700' }
                  ]}
                >
                  {filterItem.label}
                </Text>
                {filterCount > 0 && (
                  <View style={[
                    styles.filterBadge, 
                    { 
                      backgroundColor: isActive 
                        ? 'rgba(255,255,255,0.25)' 
                        : alpha(Colors.primary, 0.15) 
                    }
                  ]}>
                    <Text style={[
                      styles.filterBadgeText,
                      { color: isActive ? Colors.white : Colors.primary }
                    ]}>
                      {filterCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: Colors.textMuted }]}>
            Loading notifications...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationCard item={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
                <Inbox size={48} color={Colors.primary} strokeWidth={2} />
              </View>
              <Text style={[styles.emptyTitle, { color: Colors.text }]}>
                {filter === "unread" ? "All caught up!" : "No notifications"}
              </Text>
              <Text style={[styles.emptyMessage, { color: Colors.textMuted }]}>
                {filter === "unread" 
                  ? "You've read all your notifications" 
                  : "Check back later for updates"}
              </Text>
            </View>
          }
        />
      )}

      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header Styles
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle1: {
    width: 240,
    height: 240,
    top: -100,
    right: -60,
  },
  decorCircle2: {
    width: 160,
    height: 160,
    bottom: -40,
    left: -50,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: '#FFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.2,
  },
  markAllButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filters
  filtersContainer: {
    borderBottomWidth: 1,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  filterBadge: {
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // List
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Notification Card
  notificationCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  notificationGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    flex: 1,
    gap: 6,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  notificationTitleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  deleteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});