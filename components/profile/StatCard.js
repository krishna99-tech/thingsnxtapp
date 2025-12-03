import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Safe hex + opacity utility
const alpha = (hex, opacity) => {
  const o = Math.round(opacity * 255).toString(16).padStart(2, "0");
  return hex + o;
};

const StatCard = ({ icon, value, label, colors, isDarkTheme }) => {
  // theme text colors
  const ThemeColors = useMemo(
    () => ({
      text: isDarkTheme ? "#FFFFFF" : "#1E293B",
      textSecondary: isDarkTheme ? "#A8ACC5" : "#6B7280",
      fallback: isDarkTheme
        ? ["#1A1F3A", "#0F1229"]
        : ["#FFFFFF", "#F1F5F9"],
    }),
    [isDarkTheme]
  );

  // Gradient safety
  const safeColors =
    Array.isArray(colors) &&
    colors.length === 2 &&
    colors.every((c) => typeof c === "string" && c.startsWith("#"))
      ? colors
      : ThemeColors.fallback;

  return (
    <View style={styles.container}>
      <LinearGradient colors={safeColors} style={styles.card}>
        <View style={styles.iconWrapper}>{icon}</View>

        <Text style={[styles.value, { color: ThemeColors.text }]}>
          {value}
        </Text>

        <Text style={[styles.label, { color: ThemeColors.textSecondary }]}>
          {label}
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "48%",
    borderRadius: 16,
    marginBottom: 12,
  },

  card: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    justifyContent: "space-between",
  },

  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  value: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 2,
  },

  label: {
    fontSize: 14,
    opacity: 0.9,
    fontWeight: "500",
  },
});

export default React.memo(StatCard);
