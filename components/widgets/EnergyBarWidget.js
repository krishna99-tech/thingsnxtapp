// EnergyBarWidget.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const EnergyBarWidget = ({ value }) => {
  const percent = Math.min(Math.max(value, 0), 100);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Energy Usage</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.percent}>{percent}%</Text>
    </View>
  );
};

export default EnergyBarWidget;

const styles = StyleSheet.create({
  card: {
    padding: 18,
    width: 200,
    borderRadius: 16,
    backgroundColor: "#7c3aed",
  },
  title: {
    color: "#fff",
    marginBottom: 10,
  },
  track: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 5,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: "#fff",
  },
  percent: {
    marginTop: 8,
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
