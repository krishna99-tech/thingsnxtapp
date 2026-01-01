import React, { useState, useRef, useCallback, useEffect, useContext } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient"; // Keep this for the header and card gradients
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import { showToast } from "../components/Toast";
import CustomAlert from "../components/CustomAlert";
import { formatDate } from "../utils/format"; // Keep this for date formatting
import { SwipeListView } from 'react-native-swipe-list-view';

// 🟢 Enable layout animation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 🎨 Theme-aware card gradients
const LIGHT_CARD_GRADIENT = ["#FF9A8B", "#FF6A88", "#FF99AC"];
const DARK_CARD_GRADIENT = ["#434343", "#232526"];

// 🔹 Animated Card Component (Moved outside for better structure)
const DashboardCard = React.memo(({ item, onPress, isDarkTheme }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const cardGradientColors = isDarkTheme ? DARK_CARD_GRADIENT : LIGHT_CARD_GRADIENT;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => onPress(item)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <LinearGradient
          colors={cardGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </View>
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {item.description || "No description provided"}
          </Text>
          <Text style={styles.cardDate}>
            Created: {formatDate(item.created_at)}
          </Text>
        </LinearGradient>
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

  // Theme-based styles
  const themeStyles = {
    header: {
      backgroundColor: isDarkTheme ? "#1F1F1F" : "#FF6347",
    },
    modalView: {
      backgroundColor: isDarkTheme ? "#2C2C2C" : "#fff",
    },
    modalTitle: {
      color: isDarkTheme ? "#FFFFFF" : "#222",
    },
    input: { 
      color: isDarkTheme ? "#FFFFFF" : "#111", 
      backgroundColor: isDarkTheme ? "#1F2937" : "#F3F4F6", 
      borderColor: isDarkTheme ? "#4B5563" : "#D1D5DB" 
    },
    modalLabel: { color: isDarkTheme ? "#E5E7EB" : "#374151" },
  };

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
    <LinearGradient
      colors={
        isDarkTheme
          ? ["#0f2027", "#203a43", "#2c5364"]
          : ["#e6f3ff", "#ffffff"]
      }
      style={styles.container}>
    {/* 🌈 Gradient Header */}
    <LinearGradient colors={isDarkTheme ? ["#2C5364", "#203A43", "#0F2027"] : ["#FF6347", "#FF8264"]} style={[styles.header, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>My Dashboards</Text>
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle" size={36} color="#fff" />
      </TouchableOpacity>
    </LinearGradient>

    {/* 🧭 Dashboard List */}
    {loading ? (
      <ActivityIndicator
        size="large"
        color="#FF6347"
        style={{ marginTop: 30 }}
      />
    ) : (
      <SwipeListView
        data={dashboards}
        keyExtractor={(item) => item._id || item.id || item.name}
        renderItem={({ item }, rowMap) => (
          <DashboardCard item={item} onPress={() => openDashboard(item)} isDarkTheme={isDarkTheme} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDarkTheme ? "#FFFFFF" : "#000000"}
            colors={[isDarkTheme ? "#FFFFFF" : "#000000"]}
          />
        }
        renderHiddenItem={({ item }) => (
          <View style={styles.rowBack}>
            <TouchableOpacity
              style={[styles.backRightBtn, styles.backRightBtnRight]}
              onPress={() => deleteDashboard(item._id)}
            >
              <Ionicons name="trash-outline" size={25} color="white" />
              <Text style={styles.backTextWhite}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        rightOpenValue={-100} // How much to open from the right
        disableRightSwipe={true} // Only allow left swipe (revealing the right button)
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={() => (
          <Text
            style={{
              textAlign: "center",
              marginTop: 40,
              color: isDarkTheme ? "#999" : "#666",
              fontSize: 16,
            }}
          >
            No dashboards yet. Tap + to add one.
          </Text>
        )}
      />
    )}

    {/* 🪟 entDashboard Modal */}
    <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
        <Animated.View style={[styles.modalView, themeStyles.modalView, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.grabber} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, themeStyles.modalTitle]}>New Dashboard</Text>
            <Text style={styles.modalSubtitle}>Organize your devices into a new dashboard.</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, themeStyles.modalLabel]}>Dashboard Name</Text>
            <TextInput
              style={[styles.input, themeStyles.input]}
              placeholder="e.g., Living Room"
              placeholderTextColor="#9CA3AF"
              value={newName}
              onChangeText={setNewName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, themeStyles.modalLabel]}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, paddingTop: 12 }, themeStyles.input]}
              placeholder="A short description of this dashboard"
              placeholderTextColor="#9CA3AF"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
              <Text style={[styles.modalButtonText, styles.cancelText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.addBtn]} onPress={addDashboard}>
              <Text style={[styles.modalButtonText, styles.addText]}>Create</Text>
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
    </LinearGradient>
  );
}

// 💅 STYLES
const styles = StyleSheet.create({
  container: { flex: 1, marginBottom: 50 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 6,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  title: { fontSize: 26, fontWeight: "bold", color: "#fff" },

  card: {
    borderRadius: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  gradientCard: {
    borderRadius: 14,
    padding: 16,
    minHeight: 120, // Ensures a minimum height for better visual balance
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  cardSubtitle: { fontSize: 14, color: "#fff", opacity: 0.9, marginTop: 6 },
  cardDate: { fontSize: 12, color: "#fff", opacity: 0.7, marginTop: 8 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "90%",
    padding: 22,
    borderRadius: 18,
    elevation: 6,
    paddingTop: 12,
  },
  grabber: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: '#E5E7EB',
  },
  cancelText: { 
    color: "#374151", 
  },
  addBtn: { 
    backgroundColor: '#FF6347',
  },
  addText: { 
    color: "#fff", 
  },
  // Swipe-to-delete styles
  rowBack: {
    alignItems: 'center',
    backgroundColor: '#DDD', // Fallback, will be covered by button
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14, // Match card margin
    borderRadius: 14, // Match card borderRadius
    overflow: 'hidden', // Ensure button doesn't overflow rounded corners
  },
  backRightBtn: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 100,
    borderRadius: 14, // Apply to the button itself
  },
  backRightBtnRight: {
    backgroundColor: '#FF3B30', // Red for delete
    right: 0,
  },
  backTextWhite: {
    color: '#FFF',
  },
});
