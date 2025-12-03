// ConnectivityWidget.js
import { View, Text, StyleSheet } from "react-native";
import React from "react";

const ConnectivityWidget = ({ online }) => {
  return (
    <View style={styles.box}>
      <View
        style={[
          styles.dot,
          { backgroundColor: online ? "#22c55e" : "#ef4444" },
        ]}
      />
      <Text style={styles.text}>{online ? "ONLINE" : "OFFLINE"}</Text>
    </View>
  );
};

export default ConnectivityWidget;

const styles = StyleSheet.create({
  box: {
    padding: 18,
    width: 160,
    borderRadius: 16,
    backgroundColor: "#0f172a",
    alignItems: "center",
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 20,
    marginBottom: 8,
  },
  text: {
    color: "#fff",
    fontSize: 18,
  },
});
