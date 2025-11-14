// DevicesScreen.js
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";

export default function DevicesScreen({ navigation }) {
  const { userToken, isDarkTheme, devices, fetchDevices, addDevice, deleteDevice } =
    useContext(AuthContext);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const theme = isDarkTheme ? "dark" : "light";

  const [addDeviceModal, setAddDeviceModal] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [loading, setLoading] = useState(false);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch devices when user logs in
  useEffect(() => {
    if (userToken) fetchDevices();
  }, [userToken]);

  // Refresh devices when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (userToken) {
        fetchDevices();
      }
    }, [userToken])
  );

  const handleAddDevice = async () => {
    if (!deviceName || !deviceType) {
      Alert.alert("Error", "Please enter both device name and type.");
      return;
    }

    setLoading(true);
    try {
      await addDevice({ name: deviceName, type: deviceType });
      Alert.alert("✅ Success", "Device added successfully!");
      setAddDeviceModal(false);
      setDeviceName("");
      setDeviceType("");
    } catch (err) {
      console.error("Add Device Error:", err);
      Alert.alert("Error", err.message || "Failed to add device");
    } finally {
      setLoading(false);
    }
  };

  const getDeviceKey = (device, index) => {
    // Ensure stable, unique keys
    return (
      device._id ||
      device.id ||
      device.device_token ||
      `${device.name || "device"}-${index}-${Date.now()}`
    );
  };

  return (
    <LinearGradient
      colors={
        theme === "dark"
          ? ["#0f2027", "#203a43", "#2c5364"]
          : ["#dfe9f3", "#ffffff"]
      }
      style={styles.gradient}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text
            style={[
              styles.title,
              { color: theme === "dark" ? "#fff" : "#111" },
            ]}
          >
            🔌 My Devices
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme === "dark" ? "#bbb" : "#555" },
            ]}
          >
            Tap a device to view details
          </Text>

          {/* ➕ Add Device Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setAddDeviceModal(true)}
          >
            <Ionicons name="add-circle-outline" size={26} color="#fff" />
            <Text style={styles.addText}>Add Device</Text>
          </TouchableOpacity>

          {/* 📱 Device List */}
          {Array.isArray(devices) && devices.length > 0 ? (
            <View style={styles.cardsContainer}>
              {devices.map((device, index) => (
                <TouchableOpacity
                  key={getDeviceKey(device, index)}
                  style={[
                    styles.card,
                    {
                      backgroundColor:
                        theme === "dark"
                          ? "rgba(255,255,255,0.08)"
                          : "#ffffffee",
                      borderColor:
                        device.status === "online" ? "#4ade80" : "#f87171",
                    },
                  ]}
                  onPress={() => navigation.navigate("DeviceDetail", { device })}
                >
                  <Ionicons
                    name={device.status === "online" ? "wifi" : "wifi-outline"}
                    size={34}
                    color={device.status === "online" ? "#4ade80" : "#f87171"}
                  />
                  <Text
                    style={[
                      styles.deviceName,
                      { color: theme === "dark" ? "#fff" : "#000" },
                    ]}
                  >
                    {device.name || "Unnamed Device"}
                  </Text>
                  <Text
                    style={{
                      color: device.status === "online" ? "#4ade80" : "#f87171",
                      fontWeight: "bold",
                      marginTop: 4,
                    }}
                  >
                    {device.status?.toUpperCase() || "UNKNOWN"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text
              style={{
                color: theme === "dark" ? "#aaa" : "#555",
                textAlign: "center",
                marginTop: 30,
              }}
            >
              No devices added yet.
            </Text>
          )}
        </Animated.View>
      </ScrollView>

      {/* 🧭 Add Device Modal */}
      <Modal
        visible={addDeviceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddDeviceModal(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme === "dark" ? "#1E1E1E" : "#fff" },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: theme === "dark" ? "#fff" : "#000" },
              ]}
            >
              Add Device
            </Text>

            <TextInput
              placeholder="Device Name"
              placeholderTextColor={theme === "dark" ? "#aaa" : "#666"}
              style={[
                styles.input,
                {
                  backgroundColor: theme === "dark" ? "#2C2C2C" : "#f2f2f2",
                  color: theme === "dark" ? "#fff" : "#000",
                },
              ]}
              value={deviceName}
              onChangeText={setDeviceName}
            />

            <TextInput
              placeholder="Device Type"
              placeholderTextColor={theme === "dark" ? "#aaa" : "#666"}
              style={[
                styles.input,
                {
                  backgroundColor: theme === "dark" ? "#2C2C2C" : "#f2f2f2",
                  color: theme === "dark" ? "#fff" : "#000",
                },
              ]}
              value={deviceType}
              onChangeText={setDeviceType}
            />

            <Pressable style={styles.saveButton} onPress={handleAddDevice}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </Pressable>

            <Pressable onPress={() => setAddDeviceModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flexGrow: 1, padding: 20, paddingTop: 80,paddingBottom:90 },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: { textAlign: "center", marginBottom: 25, fontSize: 15 },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "47%",
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  deviceName: { fontSize: 18, fontWeight: "bold", marginTop: 6 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4B9EFF",
    padding: 12,
    borderRadius: 10,
    alignSelf: "center",
    marginVertical: 10,
  },
  addText: { color: "#fff", marginLeft: 6, fontWeight: "600", fontSize: 16 },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "85%",
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: "#4B9EFF",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginVertical: 10,
  },
  saveText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  cancelText: { color: "#bbb", textAlign: "center", marginTop: 8 },
});
