import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import DeviceCard from "./DeviceCard";

// Component shown when list is empty
const EmptyListComponent = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>No Devices Found</Text>
    <Text style={styles.emptySubText}>
      You can add a new device from the settings screen.
    </Text>
  </View>
);

export const DeviceList = ({
  devices,
  onRefresh,
  refreshing,   // <-- this is correct
  onPress,
  onEdit,
  onDelete,
  isDarkTheme,
  Colors
}) => {
  return (
    <FlatList
      contentContainerStyle={styles.listContainer}
      data={devices}
      renderItem={({ item }) => (
        <DeviceCard
          isDarkTheme={isDarkTheme}
          device={item}
          onPress={() => onPress(item)}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item)}
        />
      )}
      keyExtractor={(item) => String(item.id || item._id)}
      ListEmptyComponent={EmptyListComponent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  emptySubText: { color: "#8E8E93", fontSize: 14, marginTop: 8 },
});
