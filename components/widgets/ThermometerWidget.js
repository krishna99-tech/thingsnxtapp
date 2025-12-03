// ThermometerWidget.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThermometerSun } from "lucide-react-native";

const ThermometerWidget = ({ title, value, telemetry }) => {
  // Prioritize real-time telemetry data over the static value
  const displayValue = telemetry !== undefined ? telemetry : value;
  
  // Safely parse the value and format it to one decimal place
  const numericValue = parseFloat(displayValue);
  const formattedDisplay = isNaN(numericValue) ? "--" : numericValue.toFixed(1);

  return (
    <View style={styles.box}>
      <ThermometerSun size={40} color="#fff" />
      <Text style={styles.temp}>{formattedDisplay}°C</Text>
      <Text style={styles.label}>{title || "Temperature"}</Text>
    </View>
  );
};

export default ThermometerWidget;

const styles = StyleSheet.create({
  box: {
    width: 160,
    height: 140,
    backgroundColor: "#dc2626",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  temp: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    marginTop: 8,
  },
  label: {
    color: "#fff",
    marginTop: 4,
    opacity: 0.9,
  },
});
