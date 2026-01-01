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
} from "lucide-react-native";
import { AuthContext } from "../context/AuthContext";
import { formatDate } from "../utils/format";
import api from "../services/api";
import CustomAlert from "../components/CustomAlert";
// Use formatDate(notification.created_at) or similar for displaying dates in notification list.

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
  return `${diffDays}d ago`;
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

  const Colors = {
    background: isDarkTheme ? "#0A0E27" : "#F1F5F9",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#252B4A" : "#E2E8F0",
    border: isDarkTheme ? "#252B4A" : "#E2E8F0",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    secondary: isDarkTheme ? "#7B61FF" : "#6D28D9",
    success: isDarkTheme ? "#00FF88" : "#16A34A",
    danger: isDarkTheme ? "#FF3366" : "#DC2626",
    white: "#FFFFFF",
    text: isDarkTheme ? "#FFFFFF" : "#1E293B",
    textSecondary: isDarkTheme ? "#8B91A7" : "#64748B",
    textMuted: isDarkTheme ? "#8B91A7" : "#64748B",
    statusOnline: "#00FF88",
    statusWarning: "#FFB800",
  };

  const getNotificationIcon = (type, category, size = 20) => {
    if (type === "alert") return <AlertTriangle size={size} color={Colors.danger} />;
    if (type === "warning") return <Bell size={size} color={Colors.statusWarning} />;
    if (type === "success") return <CheckCircle size={size} color={Colors.success} />;
    if (category === "security") return <Shield size={size} color={Colors.primary} />;
    if (category === "energy") return <Zap size={size} color={Colors.secondary} />;
    if (category === "device") return <Activity size={size} color={Colors.primary} />;
    if (type === "online") return <Wifi size={size} color={Colors.success} />;
    if (type === "offline") return <WifiOff size={size} color={Colors.danger} />;
    if (type === "update") return <ArrowUpCircle size={size} color={Colors.primary} />;
    return <Info size={size} color={Colors.primary} />;
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "security": return Colors.danger;
      case "energy": return Colors.secondary;
      case "device": return Colors.primary;
      case "system": return Colors.statusOnline;
      default: return Colors.primary;
    }
  };

  // Load notifications from API
  const loadNotifications = async () => {
    if (!userToken) return;
    
    try {
      // Use the api service which handles tokens automatically
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
      // Handle 404 gracefully (endpoint might be missing)
      if (err.message && (err.message.includes("404") || err.status === 404)) {
        console.warn("Notifications endpoint not found (404). Using empty list.");
        setNotifications([]);
      } else {
        console.error("Failed to load notifications:", err.message);
      }
      // API service will handle 401 and logout if refresh fails
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

    // Cleanup function to abort the connection when the component unmounts
    return () => {
      isMounted = false;
      if (sseController) {
        sseController.abort();
      }
    };
  }, [userToken]);

  // Update header when unread count changes
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => unreadCount > 0 ? <HeaderRight /> : null,
    });
  }, [navigation, unreadCount]);

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
      // Use the api service (fire and forget)
      api.markNotificationRead(notificationId).catch(err => console.error("Mark as read failed:", err.message));
      
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) { // This catch is for synchronous errors, though the API call is now async
      console.error("Error marking notification as read:", err.message); // API service will handle 401
    } 
  };

  const markAllAsRead = async () => {
    if (!userToken) return;
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err.message); // API service will handle 401
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
      console.error("Error deleting notification:", err.message); // API service will handle 401
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
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "security", label: "Security", icon: Shield },
    { key: "energy", label: "Energy", icon: Zap },
    { key: "device", label: "Device", icon: Activity },
    { key: "system", label: "System", icon: SettingsIcon },
  ];

  const HeaderRight = () => (
    <TouchableOpacity onPress={markAllAsRead} style={styles.headerButton}>
      <Check size={20} color={Colors.primary} />
      <Text style={[styles.headerButtonText, { color: Colors.primary }]}>Mark all read</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.notificationCard,
          { backgroundColor: Colors.surface, borderColor: Colors.border },
          !item.read && { borderColor: Colors.primary + "40" },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.notificationIcon, { backgroundColor: getCategoryColor(item.category) + "20" }]}>
            {getNotificationIcon(item.type, item.category, 22)}
          </View>

          <View style={styles.notificationText}>
            <View style={styles.notificationHeader}>
              <Text style={[styles.notificationTitle, { color: Colors.text }, !item.read && styles.notificationTitleUnread]} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.read && <View style={[styles.unreadDot, { backgroundColor: Colors.primary }]} />}
            </View>
            <Text style={[styles.notificationMessage, { color: Colors.textSecondary }]} numberOfLines={2}>
              {item.message}
            </Text>
            <View style={styles.notificationMeta}>
              <Text style={[styles.notificationTime, { color: Colors.textMuted }]}>
                {formatTimestamp(item.timestamp)}
              </Text>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + "20" }]}>
                <Text style={[styles.categoryBadgeText, { color: getCategoryColor(item.category) }]}>
                  {item.category}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteNotification(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={isDarkTheme ? ["#0A0E27", "#1A1F3A"] : ["#FFFFFF", "#F1F5F9"]}
      style={styles.gradient}
    >
      <View style={[styles.container, { backgroundColor: "transparent" }]}>
        <View style={[styles.headerContainer, { backgroundColor: Colors.surface }]}>
          <Text style={[styles.header, { color: Colors.text }]}>Notifications</Text>
          {unreadCount > 0 && <HeaderRight />}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          style={[styles.filtersScroll, { backgroundColor: Colors.surface, borderBottomColor: Colors.border }]}
        >
          {filters.map((filterItem) => {
            const isActive = filter === filterItem.key;
            const Icon = filterItem.icon;
            return (
              <TouchableOpacity
                key={filterItem.key}
                style={[styles.filterChip, { backgroundColor: Colors.surfaceLight, borderColor: Colors.border }, isActive && [styles.filterChipActive, { backgroundColor: Colors.primary, borderColor: Colors.primary }]]}
                onPress={() => setFilter(filterItem.key)}
                activeOpacity={0.7}
              >
                {Icon && <Icon size={16} color={isActive ? Colors.white : Colors.textMuted} />}
                <Text style={[styles.filterChipText, { color: Colors.textMuted }, isActive && [styles.filterChipTextActive, { color: Colors.white }]]}>
                  {filterItem.label}
                </Text>
                {filterItem.key === "unread" && unreadCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: Colors.danger }]}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} />
          ) : (
            <FlatList
              data={filteredNotifications}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
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
                  <Bell size={64} color={Colors.textMuted} />
                  <Text style={[styles.emptyStateTitle, { color: Colors.text }]}>No notifications</Text>
                  <Text style={[styles.emptyStateText, { color: Colors.textMuted }]}>
                    {filter === "unread" ? "You're all caught up!" : "Check back later for updates"}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    fontSize: 32,
    fontWeight: "700",
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filtersScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {},
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
  },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
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
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  deleteButton: {
    padding: 4,
    alignSelf: 'flex-start',
  },
});
