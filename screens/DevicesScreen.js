
import React, { useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../context/AuthContext";
import {
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import {
  Search,
  Filter,
  Plus,
} from "lucide-react-native";
import { showToast } from "../components/Toast";
import DeviceList from "./DeviceList";

const CARD_PADDING = 16;

export default function DevicesScreen({ navigation }) {
  const { devices, isDarkTheme, addDevice: addDeviceFromContext, updateDevice, deleteDevice, fetchDevices } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [refreshing, setRefreshing] = useState(false);
  const [addDeviceModalVisible, setAddDeviceModalVisible] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceType, setNewDeviceType] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [editDeviceModalVisible, setEditDeviceModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [editedDeviceName, setEditedDeviceName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const Colors = {
    background: isDarkTheme ? "#0A0E27" : "#F1F5F9",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#252B4A" : "#E2E8F0",
    border: isDarkTheme ? "#252B4A" : "#CBD5E1",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    white: "#FFFFFF",
    text: isDarkTheme ? "#FFFFFF" : "#1E293B",
    textSecondary: isDarkTheme ? "#8B91A7" : "#64748B",
    textMuted: isDarkTheme ? "#8B91A7" : "#64748B",
    danger: isDarkTheme ? "#FF3366" : "#DC2626",
  };
  
  const filteredDevices = useMemo(() => devices.filter((device) => {
    const name = device.name || "";
    const type = device.type || "";
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || device.status === selectedStatus;
    return matchesSearch && matchesStatus;
  }, [devices, searchQuery, selectedStatus]), [devices, searchQuery, selectedStatus]);

  const statusFilters = useMemo(() => [
    { label: "All", value: "all", count: devices.length },
    {
      label: "Online",
      value: "online",
      count: devices.filter((d) => d.status === "online").length,
    },
    {
      label: "Offline",
      value: "offline",
      count: devices.filter((d) => d.status === "offline").length,
    },
  ], [devices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDevices();
    } catch (error) {
      console.error("Failed to refresh devices:", error);
      showToast.error("Refresh Failed", "Could not update the device list.");
    }
    setRefreshing(false);
  }, [fetchDevices]);

  const handleAddDevice = async () => {
    if (!newDeviceName.trim()) {
      showToast.error("Error", "Please enter a device name.");
      return;
    }
    if (isAdding) return;

    setIsAdding(true);
    try {
      const deviceData = {
        name: newDeviceName.trim(),
        type: newDeviceType.trim().toLowerCase() || "default",
      };
      await addDeviceFromContext(deviceData);
      showToast.success("✅ Success", "Device added successfully!");
      setAddDeviceModalVisible(false);
      setNewDeviceName("");
      setNewDeviceType("");
    } catch (err) {
      console.error("Add Device Error:", err);
      showToast.error(
        "Error",
        err.message || "An unexpected error occurred while adding the device."
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenEditModal = (device) => {
    setEditingDevice(device);
    setEditedDeviceName(device.name);
    setEditDeviceModalVisible(true);
  };

  const handleCloseEditModal = () => {
    setEditDeviceModalVisible(false);
    setEditingDevice(null);
    setEditedDeviceName("");
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice || !editedDeviceName.trim()) {
      showToast.error("Error", "Device name cannot be empty.");
      return;
    }
    if (isEditing) return;

    setIsEditing(true);
    try {
      const deviceId = editingDevice.id || editingDevice._id;
      await updateDevice(deviceId, { name: editedDeviceName.trim() });
      showToast.success("✅ Success", "Device updated successfully!");
      handleCloseEditModal();
    } catch (err) {
      console.error("Update Device Error:", err);
      showToast.error(
        "Error",
        err.message || "An unexpected error occurred while updating the device."
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteDevice = (device) => {
    Alert.alert(
      "Delete Device",
      `Are you sure you want to delete "${device.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const deviceId = device.id || device._id;
              await deleteDevice(deviceId);
              showToast.success("✅ Success", "Device deleted successfully!");
            } catch (err) {
              console.error("Delete Device Error:", err);
              showToast.error("Error", err.message || "Failed to delete device.");
            }
          },
        },
      ]
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <LinearGradient
        colors={isDarkTheme ? ["#0A0E27", "#1A1F3A"] : ["#FFFFFF", "#F1F5F9"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: Colors.text }]}>Devices</Text>
          <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>
            {devices.length} devices connected
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Search size={20} color={Colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: Colors.text }]}
              placeholder="Search devices..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={[styles.filterButton, { backgroundColor: Colors.surfaceLight }]}>
            <Filter size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterScroll}
        >
          {statusFilters.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                { backgroundColor: Colors.surface, borderColor: Colors.border },
                selectedStatus === filter.value && [styles.filterChipActive, { backgroundColor: Colors.primary, borderColor: Colors.primary }],
              ]}
              onPress={() => setSelectedStatus(filter.value)}
            >
              <Text
                style={[
                  styles.filterChipText, { color: Colors.textSecondary },
                  selectedStatus === filter.value && [styles.filterChipTextActive, { color: Colors.white }],
                ]}
              >
                {filter.label}
              </Text>
              <View
                style={[
                  styles.filterChipBadge, { backgroundColor: Colors.surfaceLight },
                  selectedStatus === filter.value && [styles.filterChipBadgeActive, { backgroundColor: Colors.white + "30" }],
                ]}
              >
                <Text
                  style={[
                    styles.filterChipBadgeText, { color: Colors.textMuted },
                    selectedStatus === filter.value && [styles.filterChipBadgeTextActive, { color: Colors.white }],
                  ]}
                >
                  {filter.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <DeviceList
        devices={filteredDevices}
        isDarkTheme={isDarkTheme}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteDevice}
        onPress={(device) => navigation.navigate("DeviceDetail", { deviceId: device.id || device._id })}
        refreshing={refreshing}
        onRefresh={onRefresh}
        Colors={Colors}
      />

      {/* Add Device FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: Colors.primary }]}
        onPress={() => setAddDeviceModalVisible(true)}
        activeOpacity={0.8}
      >
        <Plus size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* Add Device Modal */}
      <Modal
        visible={addDeviceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddDeviceModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Add New Device</Text>

            <TextInput
              placeholder="e.g., Living Room Light"
              placeholderTextColor={Colors.textMuted}
              style={[styles.modalInput, { color: Colors.text, backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]}
              value={newDeviceName}
              onChangeText={setNewDeviceName}
            />

            <TextInput
              placeholder="Type (e.g., light, plug, thermostat)"
              placeholderTextColor={Colors.textMuted}
              style={[styles.modalInput, { color: Colors.text, backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]}
              value={newDeviceType}
              onChangeText={setNewDeviceType}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.surfaceLight }]}
                onPress={() => setAddDeviceModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: Colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: Colors.primary },
                  isAdding && { opacity: 0.7 },
                ]}
                onPress={handleAddDevice}
                disabled={isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={[styles.modalBtnText, { color: Colors.white }]}>Add Device</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Device Modal */}
      <Modal
        visible={editDeviceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseEditModal}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Edit Device Name</Text>

            <TextInput
              placeholder="Enter new device name"
              placeholderTextColor={Colors.textMuted}
              style={[styles.modalInput, { color: Colors.text, backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]}
              value={editedDeviceName}
              onChangeText={setEditedDeviceName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.surfaceLight }]}
                onPress={handleCloseEditModal}
              >
                <Text style={[styles.modalBtnText, { color: Colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: Colors.primary },
                  isEditing && { opacity: 0.7 },
                ]}
                onPress={handleUpdateDevice}
                disabled={isEditing}
              >
                {isEditing ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={[styles.modalBtnText, { color: Colors.white }]}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterScroll: {
    marginHorizontal: -20,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 12,
    gap: 8,
    borderWidth: 1,
  },
  filterChipActive: {},
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  filterChipTextActive: {},
  filterChipBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  filterChipBadgeActive: {},
  filterChipBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipBadgeTextActive: {},
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    right: 25,
    bottom: 90, // Adjust to be above the tab bar
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 5,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
  },
});
