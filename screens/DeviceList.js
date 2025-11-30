import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Activity } from 'lucide-react-native';
import DeviceCard from './DeviceCard';

const DeviceList = ({
  devices,
  isDarkTheme,
  onEdit,
  onDelete,
  onPress,
  refreshing,
  onRefresh,
  Colors,
}) => {
  if (devices.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Activity size={48} color={Colors.textMuted} />
        <Text style={[styles.emptyStateTitle, { color: Colors.text }]}>No devices found</Text>
        <Text style={[styles.emptyStateText, { color: Colors.textMuted }]}>
          Try adjusting your search or filters
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {devices.map((device) => (
          <DeviceCard
            key={device.id || device._id}
            device={device}
            isDarkTheme={isDarkTheme}
            onEdit={() => onEdit(device)}
            onDelete={() => onDelete(device)}
            onPress={() => onPress(device)}
          />
        ))}
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    flex: 1,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: "center",
  },
});

export default DeviceList;