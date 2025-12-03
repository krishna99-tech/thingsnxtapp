import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Power, Activity, AlertCircle } from 'lucide-react-native'; // Lucide icons
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons'; // Fallback for custom icon names

// Fallback color object if @/constants/colors is missing
const Colors = {
  white: '#FFFFFF',
};

const IndicatorWidget = ({ title, value, telemetry, icon }) => {
  // --- Logic from Input 2: Animation ---
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // --- Logic from Input 2: Data Handling ---
  // Prioritize telemetry (real-time data) over static value
  const displayValue = telemetry !== undefined ? telemetry : value;

  // Normalize data to determine state (handles "on", "1", 1, true)
  const isActive =
    String(displayValue).toLowerCase() === 'on' ||
    String(displayValue) === '1' ||
    displayValue === true;

  // Trigger animation when data changes
  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [displayValue]);

  // --- Visual Logic ---
  const getGradientColors = () => {
    if (isActive) return ['#10b981', '#059669']; // Emerald Green (ON)
    return ['#ef4444', '#b91c1c']; // Red (OFF)
  };

  const renderIcon = () => {
    // If a specific icon string is passed (e.g., from a database), try to render Ionicon
    if (typeof icon === 'string') {
      return <Ionicons name={icon} size={24} color={Colors.white} />;
    }
    // Default Lucide icons based on state
    return isActive ? (
      <Power size={24} color={Colors.white} />
    ) : (
      <Power size={24} color={Colors.white} style={{ opacity: 0.8 }} />
    );
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: pulseAnim }] }]}>
      <LinearGradient
        colors={getGradientColors()}
        style={styles.container}
      >
        {/* Header with Icon */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            {renderIcon()}
          </View>
        </View>

        {/* Content */}
        <View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          
          <Text style={styles.value} numberOfLines={1}>
            {isActive ? "ON" : "OFF"}
          </Text>

          <Text style={styles.statusSubtext}>
            {isActive ? "System Active" : "System Inactive"}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Wrap in React.memo to prevent unnecessary re-renders
export default React.memo(IndicatorWidget);

const styles = StyleSheet.create({
  wrapper: {
    margin: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  container: {
    width: 160,
    height: 140,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Glassmorphism effect
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
  },
  statusSubtext: {
    fontSize: 11,
    color: Colors.white,
    opacity: 0.8,
    fontWeight: '500',
    marginTop: 2,
  },
});