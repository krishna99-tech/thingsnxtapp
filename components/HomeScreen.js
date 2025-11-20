// screens/HomeScreen.js
import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Platform,
} from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";

// 📱 Responsive scaling based on device width
const { width, height } = Dimensions.get("window");
const scale = width / 375; // base width = iPhone X (375)

export default function HomeScreen() {
  const { username, devices = [], isDarkTheme, lastUpdated } = useContext(AuthContext);

  const [currentTime, setCurrentTime] = useState(new Date());

  const theme = isDarkTheme ? "dark" : "light";

  // ⏱️ Clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 📊 Stats
  const onlineDevices = devices.filter((d) => d?.status === "online").length;
  const offlineDevices = devices.length - onlineDevices;

  const statCards = [
    {
      title: "Total Devices",
      value: devices.length,
      icon: "hardware-chip-outline",
      colors: ["#007aff", "#00c6ff"],
    },
    {
      title: "Online",
      value: onlineDevices,
      icon: "wifi-outline",
      colors: ["#00b09b", "#96c93d"],
    },
    {
      title: "Offline",
      value: offlineDevices,
      icon: "cloud-offline-outline",
      colors: ["#ff512f", "#dd2476"],
    },
  ];

  const actions = [
    {
      title: "Add Device",
      icon: "add-circle-outline",
      colors: ["#43cea2", "#185a9d"],
      onPress: () => alert("Navigate to Devices screen to add devices."),
    },
    {
      title: "Monitor",
      icon: "pulse-outline",
      colors: ["#f7971e", "#ffd200"],
      onPress: () => alert("Live monitoring feature coming soon."),
    },
    {
      title: "Settings",
      icon: "settings-outline",
      colors: ["#654ea3", "#eaafc8"],
      onPress: () => alert("Open Settings tab to customize your experience."),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={
          theme === "dark"
            ? ["#0f2027", "#203a43", "#2c5364"]
            : ["#e6f3ff", "#ffffff"]
        }
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <View>
            {/* 🌈 Header */}
            <MaskedView
              maskElement={
                <Text style={[styles.welcome, { fontSize: 20 * scale, fontFamily: "System" }]}>
                  Welcome, {username || "User"} 👋
                </Text>
              }
            >
              <LinearGradient
                colors={["#00c6ff", "#0072ff", "#00c6ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 50 }}
              />
            </MaskedView>

            <Text
              style={[
                styles.subtitle,
                { color: theme === "dark" ? "#d6eaff" : "#444", fontFamily: "System" },
              ]}
            >
              Your ThingsNXT Dashboard
            </Text>

            <Text
              style={[
                styles.time,
                { color: theme === "dark" ? "#cce7ff" : "#666", fontFamily: "monospace" },
              ]}
            >
              🕒 {currentTime.toLocaleTimeString()}
            </Text>

            {/* 🔴 Live update line */}
            <View
              style={{
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View style={styles.liveRow}>
                <View style={styles.liveDot} />
                <Text
                  style={[
                    styles.liveText,
                    { color: theme === "dark" ? "#9fe6a0" : "#008000", fontFamily: "System" },
                  ]}
                >
                  Live updates active
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13 * scale,
                  color: theme === "dark" ? "#aaa" : "#555",
                  marginTop: 2,
                  fontFamily: "System",
                }}
              >
                Last updated:{" "}
                {lastUpdated && new Date(lastUpdated).toLocaleTimeString
                  ? new Date(lastUpdated).toLocaleTimeString()
                  : "Waiting..."}
              </Text>
            </View>

            {/* 📊 Device Stats */}
            <View style={styles.statsContainer}>
              {statCards.map((stat, index) => (
                <LinearGradient
                  key={index}
                  colors={stat.colors}
                  style={[styles.statCard, { width: width * 0.44 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={stat.icon} size={32 * scale} color="#fff" />
                  <Text style={[styles.statValue, { fontSize: 26 * scale, fontFamily: "System" }]}>
                    {stat.value}
                  </Text>
                  <Text style={[styles.statTitle, { fontSize: 14 * scale, fontFamily: "System" }]}>
                    {stat.title}
                  </Text>
                </LinearGradient>
              ))}
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: theme === "dark" ? "#333" : "#ccc",
                marginVertical: 25,
                width: "80%",
                alignSelf: "center",
              }}
            />

            {/* ⚙️ Quick Actions */}
            <Text
              style={[
                styles.sectionTitle,
                { color: theme === "dark" ? "#eee" : "#222", fontFamily: "System" },
              ]}
            >
              Quick Actions ⚙️
            </Text>

            <View style={styles.actionContainer}>
              {actions.map((action, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.actionCardWrapper, { width: width * 0.42 }]}
                  activeOpacity={0.85}
                  onPress={action.onPress}
                >
                  <LinearGradient
                    colors={action.colors}
                    style={styles.actionCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name={action.icon} size={28 * scale} color="#fff" />
                    <Text style={[styles.actionText, { fontSize: 15 * scale, fontFamily: "System" }]}>
                      {action.title}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 80,
    paddingBottom: 100,
  },
  welcome: {
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  time: {
    textAlign: "center",
    fontSize: 15,
    marginBottom: 10,
    fontFamily: "monospace",
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00FF66",
  },
  liveText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  statValue: {
    color: "#fff",
    fontWeight: "bold",
    marginTop: 10,
  },
  statTitle: {
    color: "#fff",
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  actionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  actionCardWrapper: {
    marginBottom: 20,
  },
  actionCard: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
    marginTop: 8,
  },
});
