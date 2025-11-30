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
  Alert,
  Platform,
  UIManager,
  LayoutAnimation,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import Toast from "../components/Toast"; // 🟢 Import Toast
import { BASE_URL } from "../constants/config";
import { showToast } from "../components/Toast";
import { formatDate } from "../utils/format";

console.log("Backend:", BASE_URL);

// 🟢 Enable layout animation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 🔹 Animated Card Component (Moved outside for better structure)
const DashboardCard = React.memo(({ item, onPress }) => {
  const scale = new Animated.Value(1);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

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
          colors={["#FF9A8B", "#FF6A88", "#FF99AC"]}
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
  const { userToken, isDarkTheme } = useContext(AuthContext);
  const navigation = useNavigation();

  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [toast, setToast] = useState({ visible: false, message: "" });
  

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
    input: { color: isDarkTheme ? "#FFFFFF" : "#111", backgroundColor: isDarkTheme ? "#1E1E1E" : "#fafafa", borderColor: isDarkTheme ? "#444" : "#ddd" },
  };

  // 🔹 Fetch dashboards
  const fetchDashboards = async () => {
    if (!userToken) {
      showToast("Please login again.", "error");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/dashboards`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setDashboards(res.data || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err.response?.data || err.message);
      showToast("Could not load dashboards.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 Fetch when screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchDashboards();
      // Only refetch when userToken changes
    }, [userToken])
  );

  // 🔹 Add new dashboard
  const addDashboard = async () => {
    if (!newName.trim()) {
      showToast("Please enter a dashboard name.", "error");
      return;
    }
    if (!userToken) {
      showToast("Cannot add dashboard. Please login again.", "error");
      return;
    }
    try {
      const res = await axios.post(
        `${BASE_URL}/dashboards`,
        { name: newName, description: newDescription },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setDashboards((prev) => [...prev, res.data]);
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
      showToast(msg, "error");
    }
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
    <LinearGradient colors={isDarkTheme ? ["#2C5364", "#203A43", "#0F2027"] : ["#FF6347", "#FF8264"]} style={styles.header}>
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
      <FlatList
        data={dashboards}
        keyExtractor={(item) => item._id || item.id || item.name}
        renderItem={({ item }) => <DashboardCard item={item} onPress={openDashboard} />}
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

    {/* 🪟 Create Dashboard Modal */}
    <Modal visible={modalVisible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalView, themeStyles.modalView]}>
          <Text style={[styles.modalTitle, themeStyles.modalTitle]}>Create Dashboard</Text>

          {/* 📝 Inputs */}
          <TextInput
            style={[styles.input, themeStyles.input]}
            placeholder="Dashboard Name"
            placeholderTextColor="#888"
            value={newName}
            onChangeText={setNewName}
          />
          <TextInput
            style={[styles.input, { height: 80 }, themeStyles.input]}
            placeholder="Description (optional)"
            placeholderTextColor="#888"
            value={newDescription}
            onChangeText={setNewDescription}
            multiline
          />

          {/* 🎛️ Buttons */}
          <View style={styles.modalButtons}>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable style={styles.addBtn} onPress={addDashboard}>
              <LinearGradient
                colors={["#FF6347", "#FF8264"]}
                style={styles.addBtnGradient}
              >
                <Text style={styles.addText}>Add</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>

    <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
    />
    </LinearGradient>
  );
}

// 💅 STYLES
const styles = StyleSheet.create({
  container: { flex: 1, marginBottom: 50 },

  header: {
    paddingTop: 60,
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
    backgroundColor: "#fff",
    padding: 22,
    borderRadius: 18,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    textAlign: "center",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    backgroundColor: "#fafafa",
    color: "#111",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  cancelBtn: {
    marginRight: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cancelText: { color: "#888", fontSize: 16 },
  addBtn: { borderRadius: 10, overflow: "hidden" },
  addBtnGradient: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  addText: { color: "#fff", fontWeight: "bold", fontSize: 16, textAlign: "center" },
});
