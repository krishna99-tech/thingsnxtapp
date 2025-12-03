// TankLevelWidget.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const TankLevelWidget = ({ level }) => {
  // FIX: convert level into number safely
  const value = parseFloat(level) || 0;

  const percent = Math.min(Math.max(value, 0), 100);

  console.log("Tank Level Received:", level, "Parsed:", value);

  return (
    <View style={styles.card}>
      <View style={styles.tank}>
        <View style={[styles.fill, { height: `${percent}%` }]} />
      </View>

      <Text style={styles.text}>Tank Level</Text>
      <Text style={styles.percent}>{percent}%</Text>
    </View>
  );
};

export default TankLevelWidget;

const styles = StyleSheet.create({
  card: {
    width: 140,
    padding: 16,
    backgroundColor: "#0284c7",
    alignItems: "center",
    borderRadius: 18,
  },
  tank: {
    width: 50,
    height: 120,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
    marginBottom: 10,
  },
  fill: {
    backgroundColor: "#38bdf8",
    width: "100%",
    position: "absolute",
    bottom: 0,
  },
  text: {
    color: "#fff",
    fontSize: 14,
  },
  percent: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
});
