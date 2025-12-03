import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Thermometer, Droplets, Wind, Lightbulb, Flame, Zap, Activity } from 'lucide-react-native';

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

const Colors = {
  white: "#FFFFFF",
  track: "rgba(255,255,255,0.2)",
};

const CircularGaugeCard = ({ title, value, telemetry, icon, unit, isDarkTheme }) => {
  const displayValue = telemetry !== undefined ? String(telemetry) : String(value);
  const numericValue = typeof displayValue === "number" 
    ? displayValue 
    : parseFloat(displayValue) || 0;
  const percent = Math.min(Math.max(numericValue, 0), 100);

  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const cardColors = {
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    primaryDark: isDarkTheme ? "#00B5D4" : "#2563EB",
  };

  const size = 100;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <LinearGradient
      colors={[cardColors.primary, cardColors.primaryDark]}
      style={styles.container}
    >
      {/* ---- HEADER: Title and Icon ---- */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {getIcon(icon, 20, Colors.white)}
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* ---- CARD BODY: Circular Gauge ---- */}
      <View style={styles.gaugeWrapper}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.track}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.white}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>

        {/* Value + Unit inside circle */}
        <Text style={styles.valueText} numberOfLines={1}>
          {Math.round(numericValue)} {unit || ""}
        </Text>
      </View>
    </LinearGradient>
  );
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default React.memo(CircularGaugeCard);

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 160,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    fontWeight: '600',
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  valueText: {
    position: "absolute",
    fontSize: 28,
    fontWeight: '700',
    color: "#FFFFFF",
    transform: [{ translateY: 2 }],
  },
});
