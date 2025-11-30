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
      return <Cpu {...iconProps} />;
  }
};

const getStatusIcon = (status, size = 16) => {
  switch (status) {
    case "online":
      return <Wifi size={size} color="#00FF88" />;
    case "offline":
      return <WifiOff size={size} color="#FF3366" />;
    case "warning":
      return <AlertTriangle size={size} color="#FFB800" />;
    default:
      return null;
  }
};

const DeviceCard = ({ device, onPress, isDarkTheme, onEdit, onDelete }) => {
  const Colors = {
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#252B4A" : "#F1F5F9",
    border: isDarkTheme ? "#252B4A" : "#E2E8F0",
    white: "#FFFFFF",
    text: isDarkTheme ? "#FFFFFF" : "#1E293B",
    textMuted: isDarkTheme ? "#8B91A7" : "#64748B",
    success: "#00FF88",
  };

  const renderRightActions = (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: "clamp",
    });
    return (
      <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
        <Animated.View style={[styles.deleteButtonView, { transform: [{ translateX: trans }] }]}>
          <Trash size={24} color="#FFFFFF" />
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
      <TouchableOpacity onPress={onEdit} style={styles.editButton}>
        <Animated.View style={[styles.editButtonView, { transform: [{ translateX: trans }] }]}>
          <Edit size={24} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
    >
      <TouchableOpacity
        style={[styles.deviceCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.deviceCardContent}>
          <View
            style={[
              styles.deviceIcon,
              {
                backgroundColor:
                  device.status === "online"
                    ? Colors.primary + "20"
                    : Colors.surfaceLight,
              },
            ]}
          >
            {getDeviceIcon(device.type, 28, Colors.primary)}
          </View>

          <View style={styles.deviceInfo}>
            <Text style={[styles.deviceName, { color: Colors.text }]} numberOfLines={1}>
              {device.name}
            </Text>
            <Text style={[styles.deviceRoom, { color: Colors.textMuted }]}>{device.type}</Text>
          </View>

          <View style={styles.deviceRight}>
            {getStatusIcon(device.status, 16)}

            {device.value !== undefined && (
              <View style={[styles.deviceValue, { backgroundColor: Colors.primary + "20" }]}>
                <Text style={[styles.deviceValueText, { color: Colors.primary }]}>
                  {String(device.value)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  deviceCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  deviceCardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 16,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  deviceRoom: {
    fontSize: 14,
  },
  deviceRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  deviceValue: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deviceValueText: {
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButton: { width: 80, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  deleteButtonView: { flex: 1, backgroundColor: "#FF3B30", justifyContent: "center", alignItems: "center", width: 80, borderRadius: 16 },
  editButton: { width: 80, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  editButtonView: { flex: 1, backgroundColor: "#3498db", justifyContent: "center", alignItems: "center", width: 80, borderRadius: 16 },
});

export default DeviceCard;