// BatteryWidget.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BatteryCharging, Battery, BatteryLow } from "lucide-react-native";

const BatteryWidget = ({ level }) => {
  const percent = Math.min(Math.max(level, 0), 100);

  const Icon =
    percent > 60 ? Battery :
    percent > 20 ? BatteryCharging :
    BatteryLow;

  return (
    <View style={styles.container}>
      <Icon size={40} color="#fff" />
      <Text style={styles.percent}>{percent}%</Text>
    </View>
  );
};

export default BatteryWidget;

const styles = StyleSheet.create({
  container: {
    width: 160,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
  },
  percent: {
    marginTop: 10,
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
  },
});
