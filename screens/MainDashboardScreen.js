import React, { useState, useRef, useCallback, useEffect, useContext,useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  UIManager,
  LayoutAnimation,
  Animated,
  RefreshControl,
  KeyboardAvoidingView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import { showToast } from "../components/Toast";
import CustomAlert from "../components/CustomAlert";
import { formatDate } from "../utils/format";
import { 
  Bell, 
  Plus, 
  ChevronRight, 
  Trash2, 
  Layout, 
  Clock, 
  MoreVertical,
  Layers,
  Search,
  Zap
} from "lucide-react-native";
import { SwipeListView } from 'react-native-swipe-list-view';

// 🟢 Enable layout animation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Utility for color opacity
const alpha = (hex, opacity) => {
  const o = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + o;
};

const DashboardCard = React.memo(({ item, onPress, isDarkTheme, Colors }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}
        activeOpacity={0.9}
        onPress={() => onPress(item)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <LinearGradient
          colors={[alpha(Colors.primary, 0.08), 'transparent']}
          style={styles.cardGlow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconWrapper, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
            <Layout size={22} color={Colors.primary} strokeWidth={2.5} />
          </View>
          <View style={styles.cardTitleContent}>
            <Text style={[styles.cardTitle, { color: Colors.text }]}>{item.name}</Text>
            <View style={styles.cardMeta}>
              <Clock size={12} color={Colors.textSecondary} />
              <Text style={[styles.cardDate, { color: Colors.textSecondary }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} strokeWidth={2.5} />
        </View>

        {item.description && (
          <Text style={[styles.cardSubtitle, { color: Colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <View style={[styles.widgetBadge, { backgroundColor: alpha(Colors.secondary, 0.12) }]}>
            <Zap size={12} color={Colors.secondary} strokeWidth={2.5} />
            <Text style={[styles.widgetBadgeText, { color: Colors.secondary }]}>
              {item.widgets?.length || 0} Widgets
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});


export default function MainDashboardScreen() {
  // *** MAIN FIX: use userToken from context! ***
  const { userToken, isDarkTheme, logout } = useContext(AuthContext);
  const navigation = useNavigation();

  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const slideAnim = useRef(new Animated.Value(300)).current;
  const insets = useSafeAreaInsets();

  // Animate modal slide-in/out
  useEffect(() => {
    if (modalVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [modalVisible]);

  const Colors = useMemo(() => ({
    background: isDarkTheme ? "#0A0E27" : "#F8FAFC",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    card: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    cardBorder: isDarkTheme ? "#252B4A" : "#E2E8F0",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    secondary: isDarkTheme ? "#A855F7" : "#8B5CF6",
    text: isDarkTheme ? "#F8FAFC" : "#0F172A",
    textSecondary: isDarkTheme ? "#94A3B8" : "#64748B",
    gradientStart: isDarkTheme ? "#6366F1" : "#3B82F6",
    gradientEnd: isDarkTheme ? "#8B5CF6" : "#6366F1",
    danger: "#EF4444",
  }), [isDarkTheme]);

  // 🔹 Fetch dashboards
  const fetchDashboards = async (showLoading = true) => {
    if (!userToken) {
      setAlertConfig({
        type: 'error',
        title: "Error",
        message: "Please login again.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      return;
    }
    try {
      if (showLoading) setLoading(true);
      const data = await api.getDashboards();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setDashboards(data || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err.message); // API service will handle 401
      setAlertConfig({
        type: 'error',
        title: "Error",
        message: "Could not load dashboards.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // 🟢 Fetch when screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchDashboards();
      // Only refetch when userToken changes
    }, [userToken])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboards(false);
    setRefreshing(false);
  }, [userToken]);

  // 🔹 Add new dashboard
  const addDashboard = async () => {
    if (!newName.trim()) {
      setAlertConfig({
        type: 'warning',
        title: "Missing Name",
        message: "Please enter a dashboard name.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
      return;
    }
    if (!userToken) {
      setAlertConfig({
        type: 'error',
        title: "Error",
        message: "Cannot add dashboard. Please login again.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
      return;
    }
    try {
      const newDashboard = await api.addDashboard({ name: newName, description: newDescription });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setDashboards((prev) => [...prev, newDashboard]);
      setModalVisible(false);
      setNewName("");
      setNewDescription("");
      showToast("Dashboard created!", "success");
    } catch (err) {
      // Backend may have more info in err.response?.data?.detail
      let msg = "Failed to create dashboard.";
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      console.error("Add dashboard error:", err.response?.data || err.message);
      setAlertConfig({
        type: 'error',
        title: "Error",
        message: msg,
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
    }
  };

  // 🔹 Delete dashboard
  const deleteDashboard = (dashboardId) => {
    setAlertConfig({
      type: 'confirm',
      title: "Delete Dashboard",
      message: "Are you sure you want to delete this dashboard? This action cannot be undone.",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setAlertVisible(false);
            try {
              await api.deleteDashboard(dashboardId);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setDashboards((prev) => prev.filter((d) => d._id !== dashboardId));
              showToast.success("Dashboard deleted");
            } catch (err) {
              console.error("Delete dashboard error:", err.message);
              setAlertConfig({
                type: 'error',
                title: "Error",
                message: "Failed to delete dashboard.",
                buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
              });
              setAlertVisible(true);
            }
          },
        },
      ],
    });
    setAlertVisible(true);
  };

  // 🔹 Open dashboard details (update as needed)
  const openDashboard = (dashboard) => {
    navigation.navigate("Dashboard", { dashboard });
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
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
          <View>
            <Text style={styles.title}>My Dashboards</Text>
            <Text style={styles.subtitle}>{dashboards.length} Control Centers</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            style={styles.addButton}
          >
            <Plus size={24} color="#FFFFFF" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* 🧭 Dashboard List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: Colors.textSecondary }]}>Powering up dashboards...</Text>
        </View>
      ) : (
        <SwipeListView
          data={dashboards}
          keyExtractor={(item) => item._id || item.id || item.name}
          renderItem={({ item }) => (
            <DashboardCard item={item} onPress={() => openDashboard(item)} isDarkTheme={isDarkTheme} Colors={Colors} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          renderHiddenItem={({ item }) => (
            <View style={styles.rowBack}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteDashboard(item._id)}
              >
                <Trash2 size={24} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
          rightOpenValue={-100}
          disableRightSwipe={true}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrapper, { backgroundColor: alpha(Colors.primary, 0.1) }]}>
                <Layers size={48} color={alpha(Colors.primary, 0.4)} />
              </View>
              <Text style={[styles.emptyTitle, { color: Colors.text }]}>No Dashboards Yet</Text>
              <Text style={[styles.emptySubtitle, { color: Colors.textSecondary }]}>
                Create your first control center to organize your devices.
              </Text>
              <TouchableOpacity 
                style={[styles.emptyCreateBtn, { backgroundColor: Colors.primary }]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.emptyCreateText}>CREATE DASHBOARD</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* 🪟 New Dashboard Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <Animated.View style={[styles.modalView, { backgroundColor: Colors.surface, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.grabber} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors.text }]}>New Dashboard</Text>
              <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>Architect your next monitoring hub.</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: Colors.textSecondary }]}>HUB NAME</Text>
              <TextInput
                style={[styles.input, { color: Colors.text, backgroundColor: alpha(Colors.primary, 0.05), borderColor: Colors.cardBorder }]}
                placeholder="e.g., Industrial Sector A"
                placeholderTextColor={alpha(Colors.textSecondary, 0.5)}
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: Colors.textSecondary }]}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, { height: 100, paddingTop: 12, textAlignVertical: 'top', color: Colors.text, backgroundColor: alpha(Colors.primary, 0.05), borderColor: Colors.cardBorder }]}
                placeholder="Define the purpose of this registry..."
                placeholderTextColor={alpha(Colors.textSecondary, 0.5)}
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: Colors.textSecondary }]}>DISCARD</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: Colors.primary }]} onPress={addDashboard}>
                <Text style={styles.addBtnText}>INITIALIZE</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />
    </View>
  );
}

// 💅 STYLES
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Card
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 150,
    height: 150,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  cardIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  widgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  widgetBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Swipe Actions
  rowBack: {
    flex: 1,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    gap: 8,
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Empty State
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 32,
  },
  emptyCreateBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  emptyCreateText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalView: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  grabber: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalHeader: {
    marginBottom: 28,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  input: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1.5,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  addBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
