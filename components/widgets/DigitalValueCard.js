// DigitalValueCard.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DigitalValueCard = ({ title, value, telemetry, icon }) => {
  const display = telemetry !== undefined ? telemetry : value;

  return (
    <View style={styles.card}>
      <Ionicons name={icon || "speedometer"} size={28} color="#fff" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{display}</Text>
    </View>
  );
};

export default DigitalValueCard;

const styles = StyleSheet.create({
  card: {
    width: 160,
    padding: 16,
    backgroundColor: "#2563eb",
    borderRadius: 18,
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 14,
    marginTop: 5,
  },
  value: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 6,
  },
});
