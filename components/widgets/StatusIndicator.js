// StatusIndicator.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const StatusIndicator = ({ status }) => {
  const map = {
    1: "#22c55e",  // ON
    0: "#ef4444",  // OFF
    2: "#facc15",  // WARNING
  };

  return (
    <View style={styles.box}>
      <View style={[styles.led, { backgroundColor: map[status] || "#6b7280" }]} />
      <Text style={styles.text}>
        {status === 1 ? "ON" : status === 0 ? "OFF" : status === 2 ? "WARNING" : "UNKNOWN"}
      </Text>
    </View>
  );
};

export default StatusIndicator;

const styles = StyleSheet.create({
  box: {
    width: 140,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  led: {
    width: 30,
    height: 30,
    borderRadius: 100,
    marginBottom: 10,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
