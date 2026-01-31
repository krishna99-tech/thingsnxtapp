import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getDeviceStatus, getDeviceIcon, getStatusIcon } from "../../utils/device";

const { width } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 14;

const alpha = (hex, opacity) => {
  const o = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + o;
};

const DeviceCard = React.memo(({ device, onPress, Colors }) => {
  const status = getDeviceStatus(device);
  const isOnline = status === 'online';

  return (
    <TouchableOpacity
      style={[
        styles.deviceCard, 
        { 
          backgroundColor: Colors.surface, 
          borderColor: isOnline ? alpha(Colors.primary, 0.3) : Colors.border,
        }
      ]}
      onPress={() => onPress(device)}
      activeOpacity={0.7}
    >
      {isOnline && (
        <LinearGradient
          colors={[alpha(Colors.primary, 0.05), 'transparent']}
          style={styles.deviceGlow}
        />
      )}

      <View style={styles.deviceCardHeader}>
        <View style={[
          styles.deviceIcon, 
          { backgroundColor: isOnline ? alpha(Colors.primary, 0.15) : Colors.surfaceLight }
        ]}>
          {getDeviceIcon(device.type, 24, isOnline ? Colors.primary : Colors.textMuted)}
        </View>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: isOnline ? alpha(Colors.success, 0.15) : alpha(Colors.danger, 0.15) }
        ]}>
          {getStatusIcon(status, 14)}
        </View>
      </View>
      
      <View style={styles.deviceInfo}>
        <Text style={[styles.deviceName, { color: Colors.text }]} numberOfLines={1}>
          {device.name}
        </Text>
        <Text style={[styles.deviceType, { color: Colors.textMuted }]} numberOfLines={1}>
          {device.type || 'Device'}
        </Text>
      </View>

      <View style={styles.deviceBottom}>
        {device.value !== undefined && device.value !== null ? (
          <View style={styles.deviceValueContainer}>
            <Text style={[styles.deviceValueText, { color: Colors.text }]}>
              {device.value}
            </Text>
            <Text style={[styles.deviceValueUnit, { color: Colors.textMuted }]}>
              {device.unit || ''}
            </Text>
          </View>
        ) : device.isOn !== undefined ? (
          <View style={[
            styles.deviceStatus, 
            { backgroundColor: device.isOn ? alpha(Colors.success, 0.15) : Colors.surfaceLight }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: device.isOn ? Colors.success : Colors.textMuted }
            ]} />
            <Text style={[
              styles.deviceStatusText, 
              { color: device.isOn ? Colors.success : Colors.textMuted }
            ]}>
              {device.isOn ? "ON" : "OFF"}
            </Text>
          </View>
        ) : (
          <Text style={[styles.deviceStatusText, { color: Colors.textMuted }]}>
            {status === 'online' ? 'Active' : 'Offline'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  deviceCard: {
    width: (width - CARD_PADDING * 2 - CARD_GAP) / 2,
    borderRadius: 24,
    padding: 16,
    marginBottom: CARD_GAP,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  deviceGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  deviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  deviceType: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  deviceBottom: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  deviceValueText: {
    fontSize: 20,
    fontWeight: '800',
  },
  deviceValueUnit: {
    fontSize: 12,
    fontWeight: '700',
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deviceStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default DeviceCard;
