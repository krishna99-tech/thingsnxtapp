import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Activity, Thermometer, Droplets, Wind, Lightbulb, Flame, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const getIcon = (iconName, size, color) => {
  switch (iconName) {
    case "temperature":
      return <Thermometer size={size} color={color} />;
    case "humidity":
      return <Droplets size={size} color={color} />;
    case "light":
      return <Lightbulb size={size} color={color} />;
    case "pressure":
      return <Wind size={size} color={color} />;
    case "gas":
      return <Flame size={size} color={color} />;
    case "motion":
    case "door":
    case "smoke":
      return <Zap size={size} color={color} />;
    default:
      return <Activity size={size} color={color} />;
  }
};

const CardWidget = ({ title, value, telemetry, icon, isDarkTheme }) => {
  const Colors = {
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    primaryDark: isDarkTheme ? "#00B5D4" : "#2563EB",
    white: "#FFFFFF",
  };

  const displayValue = telemetry !== undefined ? String(telemetry) : String(value);

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.primaryDark]}
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        {getIcon(icon, 24, Colors.white)}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.value} numberOfLines={1}>
        {displayValue}
      </Text>
    </LinearGradient>
  );
};

// Wrap in React.memo to prevent unnecessary re-renders
export default React.memo(CardWidget);

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 140,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    fontWeight: '600',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: "#FFFFFF",
  },
});
