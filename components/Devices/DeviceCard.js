import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import {
  Trash,
  Edit,
  Lightbulb,
  Thermometer,
  PowerPlug,
  DoorClosed,
  Cpu,
  Wifi,
  WifiOff,
  AlertTriangle,
  Zap,
} from 'lucide-react-native';

const getDeviceIcon = (type, size = 24, color = "#FFFFFF") => {
  const iconProps = { size, color };
  switch (type) {
    case "light":
      return <Lightbulb {...iconProps} />;
    case "thermostat":
      return <Thermometer {...iconProps} />;
    case "plug":
      return <PowerPlug {...iconProps} />;
    case "door":
      return <DoorClosed {...iconProps} />;
    default:
      return <Zap {...iconProps} />;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "online":
      return "#00FF88"; // Neon Mint
    case "offline":
      return "#FF3366"; // Cyber Pink
    case "warning":
      return "#FFB800"; // Tactical Amber
    default:
      return "#8B91A7";
  }
};

const DeviceCard = ({ device, onPress, isDarkTheme, onEdit, onDelete }) => {
  const Colors = {
    primary: "#3b82f6",
    bg: isDarkTheme ? "#020617" : "#F8FAFC",
    surface: isDarkTheme ? "rgba(30, 41, 59, 0.4)" : "#FFFFFF",
    border: isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "#E2E8F0",
    text: isDarkTheme ? "#F1F5F9" : "#1E293B",
    textMuted: isDarkTheme ? "rgba(148, 163, 184, 0.6)" : "#64748B",
    accent: "#3b82f6",
  };

  const statusColor = getStatusColor(device.status);

  const renderRightActions = (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: "clamp",
    });
    return (
      <TouchableOpacity onPress={onDelete} style={styles.actionContainer}>
        <Animated.View style={[styles.deleteButton, { transform: [{ translateX: trans }] }]}>
          <Trash size={22} color="#FFFFFF" strokeWidth={2.5} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderLeftActions = (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [-80, 0],
      extrapolate: "clamp",
    });
    return (
      <TouchableOpacity onPress={onEdit} style={styles.actionContainer}>
        <Animated.View style={[styles.editButton, { transform: [{ translateX: trans }] }]}>
          <Edit size={22} color="#FFFFFF" strokeWidth={2.5} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      friction={2}
      leftThreshold={30}
      rightThreshold={40}
    >
      <TouchableOpacity
        style={[
          styles.card,
          { 
            backgroundColor: Colors.surface, 
            borderColor: Colors.border,
          }
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: isDarkTheme ? "rgba(59, 130, 246, 0.1)" : "#EFF6FF" }]}>
            {getDeviceIcon(device.type, 26, Colors.primary)}
          </View>
          
          <View style={styles.body}>
            <Text style={[styles.name, { color: Colors.text }]}>{device.name}</Text>
            <View style={styles.metaRow}>
                <Text style={[styles.type, { color: Colors.textMuted }]}>{device.type.toUpperCase()}</Text>
                <View style={[styles.statusDot, { backgroundColor: statusColor, shadowColor: statusColor, shadowOpacity: 0.5, shadowRadius: 5, elevation: 5 }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{device.status.toUpperCase()}</Text>
            </View>
          </View>

          {device.value !== undefined && (
            <View style={[styles.valueBadge, { backgroundColor: isDarkTheme ? "rgba(59, 130, 246, 0.08)" : "#F1F5F9" }]}>
              <Text style={[styles.valueText, { color: Colors.primary }]}>
                {String(device.value)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  body: {
    flex: 1,
    marginLeft: 18,
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  type: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  valueBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.05)",
  },
  valueText: {
    fontSize: 15,
    fontWeight: "900",
    fontVariant: ['tabular-nums'],
  },
  actionContainer: {
    width: 80,
    height: '85%', // Align with card height approx
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#FF3366",
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    borderRadius: 20,
    marginRight: 10,
    height: '100%'
  },
  editButton: {
    flex: 1,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    borderRadius: 20,
    marginLeft: 10,
    height: '100%'
  },
});

export default DeviceCard;