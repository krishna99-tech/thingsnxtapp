import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { API_BASE } from "../screens/config";

//if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
 // UIManager.setLayoutAnimationEnabledExperimental(true);
//}

export default function NotificationsScreen() {
  const { isDarkTheme, userToken, logout } = useContext(AuthContext);
  const theme = isDarkTheme ? "dark" : "light";

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [lastUpdated, setLastUpdated] = useState(null);
  const eventSourceRef = useRef(null);

  // Load notifications from API
  const loadNotifications = async () => {
    if (!userToken) return;
    
    try {
      const response = await axios.get(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` },
        params: { limit: 50 },
      });
      
      const data = response.data?.notifications || [];
      // Format notifications for display
      const formatted = data.map((notif) => ({
        id: notif._id || notif.id,
        title: notif.title,
        message: notif.message,
        type: notif.type || "info",
        details: notif.details || "",
        time: notif.time || (notif.created_at ? new Date(notif.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""),
        read: notif.read || false,
      }));
      
      setNotifications(formatted);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load notifications:", err);
      if (err.response?.status === 401) logout();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Setup SSE connection for real-time notifications
  useEffect(() => {
    if (!userToken) return;

    // Load initial notifications
    loadNotifications();
    
    // Setup SSE connection
    const setupSSE = () => {
      try {
        // For React Native, we need to use EventSource polyfill or fetch-based SSE
        // Using fetch with streaming for React Native compatibility
        const connectSSE = async () => {
          try {
            const response = await fetch(`${API_BASE}/notifications/stream`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${userToken}`,
                Accept: "text/event-stream",
              },
            });

            if (!response.ok) {
              throw new Error(`SSE connection failed: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            const readStream = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  const chunk = decoder.decode(value);
                  const lines = chunk.split("\n");

                  for (const line of lines) {
                    if (line.startsWith("data: ")) {
                      try {
                        const data = JSON.parse(line.substring(6));
                        
                        if (data.type === "notification") {
                          // New notification received
                          const notif = data.notification;
                          setNotifications((prev) => [
                            {
                              id: notif.id,
                              title: notif.title,
                              message: notif.message,
                              type: notif.type || "info",
                              details: notif.details || "",
                              time: notif.time || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                              read: false,
                            },
                            ...prev,
                          ]);
                          setLastUpdated(new Date());
                        } else if (data.type === "initial") {
                          // Initial notifications
                          if (data.notifications && data.notifications.length > 0) {
                            const formatted = data.notifications.map((notif) => ({
                              id: notif.id || notif._id,
                              title: notif.title,
                              message: notif.message,
                              type: notif.type || "info",
                              details: notif.details || "",
                              time: notif.time || (notif.created_at ? new Date(notif.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""),
                              read: notif.read || false,
                            }));
                            setNotifications((prev) => {
                              const existingIds = new Set(prev.map((n) => n.id));
                              const newNotifs = formatted.filter((n) => !existingIds.has(n.id));
                              return [...newNotifs, ...prev];
                            });
                          }
                        }
                      } catch (parseErr) {
                        console.error("Error parsing SSE data:", parseErr);
                      }
                    }
                  }
                }
              } catch (readErr) {
                console.error("SSE read error:", readErr);
                // Reconnect after delay
                setTimeout(connectSSE, 5000);
              }
            };

            readStream();
          } catch (err) {
            console.error("SSE connection error:", err);
            // Retry connection after delay
            setTimeout(connectSSE, 5000);
          }
        };

        connectSSE();
      } catch (err) {
        console.error("SSE setup error:", err);
      }
    };

    setupSSE();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    return () => {
      // Cleanup SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [userToken]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const markAsRead = async (notificationId) => {
    if (!userToken) return;
    
    try {
      await axios.put(
        `${API_BASE}/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
      if (err.response?.status === 401) logout();
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!userToken) return;

    try {
      await axios.delete(`${API_BASE}/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
    } catch (err) {
      console.error("Error deleting notification:", err);
      Alert.alert(
        "Error",
        "Could not delete the notification. Please try again."
      );
      if (err.response?.status === 401) logout();
    }
  };

  const renderIcon = (type) => {
    switch (type) {
      case "warning":
        return { name: "alert-circle", color: "#ffcc00" };
      case "info":
        return { name: "information-circle", color: "#4dabf7" };
      case "success":
        return { name: "checkmark-circle", color: "#00e676" };
      case "error":
        return { name: "close-circle", color: "#ff3b30" };
      case "update":
        return { name: "arrow-up-circle", color: "#00e676" };
      default:
        return { name: "notifications-outline", color: "#aaa" };
    }
  };

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(expanded === id ? null : id);
  };

  const renderItem = ({ item }) => {
    const { name, color } = renderIcon(item.type);
    const isExpanded = expanded === item.id;

    const renderRightActions = (progress, dragX) => {
      const trans = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [0, 80],
        extrapolate: "clamp",
      });
      return (
        <TouchableOpacity onPress={() => deleteNotification(item.id)}>
          <Animated.View
            style={[styles.deleteBox, { transform: [{ translateX: trans }] }]}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
            <Text style={styles.deleteText}>Delete</Text>
          </Animated.View>
        </TouchableOpacity>
      );
    };

    return (
      <Swipeable renderRightActions={renderRightActions}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            toggleExpand(item.id);
            if (!item.read) markAsRead(item.id);
          }}
        >
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor:
                  theme === "dark" ? "rgba(255,255,255,0.05)" : "#ffffffcc",
                borderColor: theme === "dark" ? "#333" : "#ccc",
                opacity: item.read ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <Ionicons name={name} size={30} color={color} style={styles.icon} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.title,
                    { color: theme === "dark" ? "#fff" : "#000" },
                  ]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.message,
                    { color: theme === "dark" ? "#ccc" : "#333" },
                  ]}
                >
                  {item.message}
                </Text>
              </View>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={22}
                color={theme === "dark" ? "#aaa" : "#333"}
              />
            </View>

            {isExpanded && (
              <View style={styles.detailsContainer}>
                <Text
                  style={[
                    styles.detailsText,
                    { color: theme === "dark" ? "#aaa" : "#444" },
                  ]}
                >
                  {item.details}
                </Text>
                <Text
                  style={[
                    styles.timeText,
                    { color: theme === "dark" ? "#777" : "#555" },
                  ]}
                >
                  {item.time}
                </Text>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <LinearGradient
      colors={
        theme === "dark"
          ? ["#0f2027", "#203a43", "#2c5364"]
          : ["#e0eafc", "#cfdef3"]
      }
      style={styles.gradient}
    ><GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <Text
            style={[styles.header, { color: theme === "dark" ? "#fff" : "#000" }]}
          >
            Notifications
          </Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={theme === "dark" ? "#80b3ff" : "#007bff"}
            />
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme === "dark" ? "#fff" : "#000"}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme === "dark" ? "#aaa" : "#666" },
                    ]}
                  >
                    No new notifications.
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 80 }}
            />
          )}

          {lastUpdated && (
            <Text
              style={[
                styles.timestamp,
                { color: theme === "dark" ? "#aaa" : "#555" },
              ]}
            >
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
      </Animated.View>
      </GestureHandlerRootView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 80,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  message: {
    fontSize: 14,
    marginTop: 2,
  },
  detailsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 8,
  },
  detailsText: {
    fontSize: 14,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    textAlign: "right",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    fontStyle: "italic",
  },
  timestamp: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  deleteBox: {
    backgroundColor: "#ff3b30",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderRadius: 12,
    marginVertical: 6,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    marginTop: 4,
  },
});
