import React, { useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../context/AuthContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  Search,
  Filter,
  Plus,
  CheckCircle,
  Circle,
  Wifi,
  WifiOff,
  X,
  Check,
  Shield,
  Clock,
  ChevronRight,
  Cpu,
  Edit2,
  Trash2,
  Star,
  MapPin,
  Grid,
  List,
  SlidersHorizontal,
} from "lucide-react-native";
import { showToast } from "../components/Toast";
import CustomAlert from "../components/CustomAlert";
import { getDeviceStatus, parseDate } from "../utils/device";
import { getThemeColors, alpha } from "../utils/theme";

// View mode constants
const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
};

export default function DevicesScreen({ navigation }) {
  const { 
    devices, 
    isDarkTheme, 
    addDevice: addDeviceFromContext, 
    updateDevice, 
    deleteDevice, 
    fetchDevices, 
    isRefreshing: isContextRefreshing, 
    bulkUpdateDeviceStatus 
  } = useContext(AuthContext);

  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addDeviceModalVisible, setAddDeviceModalVisible] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceType, setNewDeviceType] = useState("");
  const [newDeviceLocation, setNewDeviceLocation] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editDeviceModalVisible, setEditDeviceModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [editedDeviceName, setEditedDeviceName] = useState("");
  const [editedDeviceLocation, setEditedDeviceLocation] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [tick, setTick] = useState(0);
  const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'status', 'type', 'recent'
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Force refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const Colors = useMemo(() => getThemeColors(isDarkTheme), [isDarkTheme]);
  
  const filteredDevices = useMemo(() => {
    let filtered = devices.map(d => ({
      ...d,
      status: getDeviceStatus(d)
    })).filter((device) => {
      const name = device.name || "";
      const type = device.type || "";
      const location = device.location || "";
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        selectedStatus === "all" || device.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });

    // Sort devices
    switch (sortBy) {
      case 'status':
        filtered.sort((a, b) => {
          if (a.status === b.status) return a.name.localeCompare(b.name);
          return a.status === 'online' ? -1 : 1;
        });
        break;
      case 'type':
        filtered.sort((a, b) => (a.type || '').localeCompare(b.type || ''));
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = parseDate(a.last_active)?.getTime() || 0;
          const dateB = parseDate(b.last_active)?.getTime() || 0;
          return dateB - dateA;
        });
        break;
      default: // 'name'
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [devices, searchQuery, selectedStatus, sortBy, tick]);

  const statusFilters = useMemo(() => [
    { label: "All", value: "all", count: devices.length },
    {
      label: "Online",
      value: "online",
      count: devices.filter((d) => getDeviceStatus(d) === "online").length,
    },
    {
      label: "Offline",
      value: "offline",
      count: devices.filter((d) => getDeviceStatus(d) === "offline").length,
    },
  ], [devices, tick]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchDevices();
    } catch (error) {
      console.error("Failed to refresh devices:", error);
      showToast.error("Refresh Failed", "Could not update the device list.");
    }
    setIsRefreshing(false);
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
        location: newDeviceLocation.trim() || undefined,
      };
      await addDeviceFromContext(deviceData);
      showToast.success("Success", "Device added successfully!");
      setAddDeviceModalVisible(false);
      setNewDeviceName("");
      setNewDeviceType("");
      setNewDeviceLocation("");
    } catch (err) {
      console.error("Add Device Error:", err);
      showToast.error("Error", err.message || "Failed to add device.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenEditModal = (device) => {
    setEditingDevice(device);
    setEditedDeviceName(device.name);
    setEditedDeviceLocation(device.location || "");
    setEditDeviceModalVisible(true);
  };

  const handleCloseEditModal = () => {
    setEditDeviceModalVisible(false);
    setEditingDevice(null);
    setEditedDeviceName("");
    setEditedDeviceLocation("");
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
      await updateDevice(deviceId, { 
        name: editedDeviceName.trim(),
        location: editedDeviceLocation.trim() || undefined,
      });
      showToast.success("Success", "Device updated successfully!");
      handleCloseEditModal();
    } catch (err) {
      console.error("Update Device Error:", err);
      showToast.error("Error", err.message || "Failed to update device.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteDevice = (device) => {
    setAlertConfig({
      type: 'confirm',
      title: "Delete Device",
      message: `Are you sure you want to delete "${device.name}"? This action cannot be undone.`,
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setAlertVisible(false);
            try {
              const deviceId = device.id || device._id;
              await deleteDevice(deviceId);
              showToast.success("Success", "Device deleted successfully!");
            } catch (err) {
              console.error("Delete Device Error:", err);
              showToast.error("Error", err.message || "Failed to delete device.");
            }
          },
        },
      ],
    });
    setAlertVisible(true);
  };

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedDeviceIds(new Set());
    } else {
      setIsSelectionMode(true);
    }
  };

  const toggleDeviceSelection = (id) => {
    const newSet = new Set(selectedDeviceIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDeviceIds(newSet);
  };

  const selectAllDevices = () => {
    const allIds = new Set(filteredDevices.map(d => String(d.id || d._id)));
    setSelectedDeviceIds(allIds);
  };

  const deselectAllDevices = () => {
    setSelectedDeviceIds(new Set());
  };

  const handleBulkAction = async (status) => {
    if (selectedDeviceIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      await bulkUpdateDeviceStatus(Array.from(selectedDeviceIds), status);
      showToast.success("Success", `Updated ${selectedDeviceIds.size} devices`);
      setIsSelectionMode(false);
      setSelectedDeviceIds(new Set());
    } catch (err) {
      showToast.error("Error", err.message);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedDeviceIds.size === 0) return;
    
    setAlertConfig({
      type: 'confirm',
      title: "Delete Devices",
      message: `Are you sure you want to delete ${selectedDeviceIds.size} device${selectedDeviceIds.size > 1 ? 's' : ''}? This action cannot be undone.`,
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setAlertVisible(false);
            setIsBulkUpdating(true);
            try {
              await Promise.all(
                Array.from(selectedDeviceIds).map(id => deleteDevice(id))
              );
              showToast.success("Success", `Deleted ${selectedDeviceIds.size} devices`);
              setIsSelectionMode(false);
              setSelectedDeviceIds(new Set());
            } catch (err) {
              showToast.error("Error", "Failed to delete some devices");
            } finally {
              setIsBulkUpdating(false);
            }
          },
        },
      ],
    });
    setAlertVisible(true);
  };

  const DeviceCard = ({ item, isSelected, isGridView }) => {
    const status = getDeviceStatus(item);
    const isOnline = status === 'online';
    
    if (isGridView) {
      return (
        <TouchableOpacity
          style={[
            styles.gridDeviceCard,
            { backgroundColor: Colors.surface, borderColor: isSelected ? Colors.primary : Colors.border },
            isSelected && { backgroundColor: alpha(Colors.primary, 0.08) }
          ]}
          onPress={() => {
            if (isSelectionMode) {
              toggleDeviceSelection(String(item.id || item._id));
            } else {
              navigation.navigate("DeviceDetail", { deviceId: item.id || item._id });
            }
          }}
          onLongPress={() => {
            if (!isSelectionMode) {
              setIsSelectionMode(true);
              toggleDeviceSelection(String(item.id || item._id));
            }
          }}
          activeOpacity={0.7}
        >
          {isOnline && (
            <LinearGradient
              colors={[alpha(Colors.primary, 0.08), 'transparent']}
              style={styles.cardGlow}
            />
          )}
          
          <View style={styles.gridCardHeader}>
            <View style={[
              styles.gridIconContainer,
              { backgroundColor: isOnline ? alpha(Colors.primary, 0.15) : Colors.surfaceLight }
            ]}>
              {isSelectionMode ? (
                isSelected ? <CheckCircle size={28} color={Colors.primary} strokeWidth={2.5} /> : <Circle size={28} color={Colors.textMuted} strokeWidth={2.5} />
              ) : (
                <Cpu size={28} color={isOnline ? Colors.primary : Colors.textMuted} strokeWidth={2.5} />
              )}
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: isOnline ? alpha(Colors.success, 0.15) : alpha(Colors.danger, 0.15) }]}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.success : Colors.danger }]} />
            </View>
          </View>

          <View style={styles.gridCardBody}>
            <Text style={[styles.gridDeviceName, { color: Colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.gridDeviceType, { color: Colors.textSecondary }]} numberOfLines={1}>
              {item.type || 'Device'}
            </Text>
            {item.location && (
              <View style={styles.gridLocationRow}>
                <MapPin size={12} color={Colors.textMuted} strokeWidth={2.5} />
                <Text style={[styles.gridLocation, { color: Colors.textMuted }]} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.listDeviceCard,
          { backgroundColor: Colors.surface, borderColor: isSelected ? Colors.primary : Colors.border },
          isSelected && { backgroundColor: alpha(Colors.primary, 0.08) }
        ]}
        onPress={() => {
          if (isSelectionMode) {
            toggleDeviceSelection(String(item.id || item._id));
          } else {
            navigation.navigate("DeviceDetail", { deviceId: item.id || item._id });
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            setIsSelectionMode(true);
            toggleDeviceSelection(String(item.id || item._id));
          }
        }}
        activeOpacity={0.7}
      >
        {isOnline && (
          <LinearGradient
            colors={[alpha(Colors.primary, 0.05), 'transparent']}
            style={styles.cardGlowList}
          />
        )}

        <View style={styles.listCardContent}>
          <View style={[
            styles.listIconContainer,
            { backgroundColor: isOnline ? alpha(Colors.primary, 0.15) : Colors.surfaceLight }
          ]}>
            {isSelectionMode ? (
              isSelected ? <CheckCircle size={24} color={Colors.primary} strokeWidth={2.5} /> : <Circle size={24} color={Colors.textMuted} strokeWidth={2.5} />
            ) : (
              <Cpu size={24} color={isOnline ? Colors.primary : Colors.textMuted} strokeWidth={2.5} />
            )}
          </View>

          <View style={styles.listCardInfo}>
            <Text style={[styles.listDeviceName, { color: Colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.listMetaRow}>
              <Text style={[styles.listDeviceType, { color: Colors.textSecondary }]}>
                {item.type || 'Device'}
              </Text>
              {item.location && (
                <>
                  <View style={[styles.metaDivider, { backgroundColor: Colors.border }]} />
                  <View style={styles.listLocationRow}>
                    <MapPin size={11} color={Colors.textMuted} strokeWidth={2.5} />
                    <Text style={[styles.listLocation, { color: Colors.textMuted }]} numberOfLines={1}>
                      {item.location}
                    </Text>
                  </View>
                </>
              )}
            </View>
            <View style={styles.listStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.success : Colors.danger }]} />
              <Text style={[styles.listStatusText, { color: isOnline ? Colors.success : Colors.textSecondary }]}>
                {status.toUpperCase()}
              </Text>
            </View>
          </View>

          {!isSelectionMode && (
            <View style={[styles.chevronContainer, { backgroundColor: alpha(Colors.textSecondary, 0.08) }]}>
              <ChevronRight size={18} color={Colors.textSecondary} strokeWidth={2.5} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        <StatusBar 
          barStyle={isDarkTheme ? "light-content" : "dark-content"} 
          backgroundColor="transparent"
          translucent
        />

        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerDecoration}>
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />
            <View style={[styles.decorCircle, styles.decorCircle3]} />
          </View>

          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>
                {isSelectionMode ? `${selectedDeviceIds.size} Selected` : "Devices"}
              </Text>
              {!isSelectionMode && (
                <Text style={styles.subtitle}>
                  {devices.length} Connected Device{devices.length !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <View style={styles.headerActions}>
              {isSelectionMode ? (
                <>
                  <TouchableOpacity 
                    style={styles.headerActionButton} 
                    onPress={selectedDeviceIds.size === filteredDevices.length ? deselectAllDevices : selectAllDevices}
                  >
                    {selectedDeviceIds.size === filteredDevices.length ? (
                      <X size={20} color="#FFF" strokeWidth={2.5} />
                    ) : (
                      <CheckCircle size={20} color="#FFF" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={toggleSelectionMode}
                  >
                    <X size={22} color="#FFF" strokeWidth={2.5} />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.addButton} 
                  onPress={() => setAddDeviceModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
                    style={styles.addButtonGradient}
                  >
                    <Plus size={24} color="#FFF" strokeWidth={2.5} />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search devices..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setFilterModalVisible(true)}
              activeOpacity={0.7}
            >
              <SlidersHorizontal size={20} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={styles.controlsRow}>
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
                    selectedStatus === filter.value && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedStatus(filter.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedStatus === filter.value && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                  <View
                    style={[
                      styles.filterChipBadge,
                      selectedStatus === filter.value && styles.filterChipBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipBadgeText,
                        selectedStatus === filter.value && styles.filterChipBadgeTextActive,
                      ]}
                    >
                      {filter.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.viewModeButton}
              onPress={() => setViewMode(viewMode === VIEW_MODES.LIST ? VIEW_MODES.GRID : VIEW_MODES.LIST)}
              activeOpacity={0.7}
            >
              {viewMode === VIEW_MODES.LIST ? (
                <Grid size={20} color="#FFF" strokeWidth={2.5} />
              ) : (
                <List size={20} color="#FFF" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <FlatList
          data={filteredDevices}
          keyExtractor={(item) => String(item.id || item._id)}
          contentContainerStyle={[
            viewMode === VIEW_MODES.GRID ? styles.gridContainer : styles.listContainer
          ]}
          numColumns={viewMode === VIEW_MODES.GRID ? 2 : 1}
          key={viewMode}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing || isContextRefreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const isSelected = selectedDeviceIds.has(String(item.id || item._id));
            return (
              <DeviceCard 
                item={item} 
                isSelected={isSelected} 
                isGridView={viewMode === VIEW_MODES.GRID}
              />
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
                <Cpu size={64} color={Colors.primary} strokeWidth={2} />
              </View>
              <Text style={[styles.emptyTitle, { color: Colors.text }]}>No Devices Found</Text>
              <Text style={[styles.emptyMessage, { color: Colors.textSecondary }]}>
                {searchQuery ? "Try adjusting your search" : "Get started by adding your first device"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setAddDeviceModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryLight]}
                    style={styles.emptyButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Plus size={18} color="#FFF" strokeWidth={2.5} />
                    <Text style={styles.emptyButtonText}>Add Device</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        />

        {/* Add Device Modal */}
        <Modal
          visible={addDeviceModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAddDeviceModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setAddDeviceModalVisible(false)}
              >
                <X size={24} color={Colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>

              <View style={[styles.modalIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
                <Plus size={32} color={Colors.primary} strokeWidth={2.5} />
              </View>

              <Text style={[styles.modalTitle, { color: Colors.text }]}>Add New Device</Text>
              <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
                Register a new IoT device to your network
              </Text>

              <View style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: Colors.text }]}>Device Name</Text>
                  <TextInput
                    placeholder="e.g., Living Room Light"
                    placeholderTextColor={Colors.textMuted}
                    style={[styles.modalInput, { color: Colors.text, backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]}
                    value={newDeviceName}
                    onChangeText={setNewDeviceName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: Colors.text }]}>Device Type</Text>
                  <TextInput
                    placeholder="e.g., light, plug, thermostat"
                    placeholderTextColor={Colors.textMuted}
                    style={[styles.modalInput, { color: Colors.text, backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]}
                    value={newDeviceType}
                    onChangeText={setNewDeviceType}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: Colors.text }]}>Location (Optional)</Text>
                  <TextInput
                    placeholder="e.g., Living Room, Kitchen"
                    placeholderTextColor={Colors.textMuted}
                    style={[styles.modalInput, { color: Colors.text, backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]}
                    value={newDeviceLocation}
                    onChangeText={setNewDeviceLocation}
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: Colors.surfaceLight }]}
                  onPress={() => setAddDeviceModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalBtnText, { color: Colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, isAdding && { opacity: 0.7 }]}
                  onPress={handleAddDevice}
                  disabled={isAdding}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryLight]}
                    style={styles.modalBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isAdding ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.modalBtnTextPrimary}>Add Device</Text>
                    )}
                  </LinearGradient>
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
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={handleCloseEditModal}
              >
                <X size={24} color={Colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>

              <View style={[styles.modalIconContainer, { backgroundColor: alpha(Colors.secondary, 0.12) }]}>
                <Edit2 size={32} color={Colors.secondary} strokeWidth={2.5} />
              </View>

              <Text style={[styles.modalTitle, { color: Colors.text }]}>Edit Device</Text>
              <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
                Update device information
              </Text>

              <View style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: Colors.text }]}>Device Name</Text>
                  <TextInput
                    placeholder="Enter device name"
                    placeholderTextColor={Colors.textMuted}
                    style={[styles.modalInput, { color: Colors.text, backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]}
                    value={editedDeviceName}
                    onChangeText={setEditedDeviceName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: Colors.text }]}>Location (Optional)</Text>
                  <TextInput
                    placeholder="Enter location"
                    placeholderTextColor={Colors.textMuted}
                    style={[styles.modalInput, { color: Colors.text, backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]}
                    value={editedDeviceLocation}
                    onChangeText={setEditedDeviceLocation}
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: Colors.surfaceLight }]}
                  onPress={handleCloseEditModal}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalBtnText, { color: Colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, isEditing && { opacity: 0.7 }]}
                  onPress={handleUpdateDevice}
                  disabled={isEditing}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryLight]}
                    style={styles.modalBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isEditing ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.modalBtnTextPrimary}>Save Changes</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Filter & Sort Modal */}
        <Modal
          visible={filterModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <X size={24} color={Colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>

              <View style={[styles.modalIconContainer, { backgroundColor: alpha(Colors.warning, 0.12) }]}>
                <SlidersHorizontal size={32} color={Colors.warning} strokeWidth={2.5} />
              </View>

              <Text style={[styles.modalTitle, { color: Colors.text }]}>Sort & Filter</Text>
              <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
                Organize your devices
              </Text>

              <View style={styles.sortOptions}>
                <Text style={[styles.sortLabel, { color: Colors.text }]}>Sort By</Text>
                {[
                  { value: 'name', label: 'Name (A-Z)' },
                  { value: 'status', label: 'Status (Online First)' },
                  { value: 'type', label: 'Device Type' },
                  { value: 'recent', label: 'Recently Active' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      { 
                        backgroundColor: Colors.surfaceLight,
                        borderColor: sortBy === option.value ? Colors.primary : Colors.border
                      }
                    ]}
                    onPress={() => {
                      setSortBy(option.value);
                      setFilterModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.sortOptionText,
                      { color: sortBy === option.value ? Colors.primary : Colors.text }
                    ]}>
                      {option.label}
                    </Text>
                    {sortBy === option.value && (
                      <Check size={18} color={Colors.primary} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* Bulk Action Bar */}
        {isSelectionMode && (
          <View style={[styles.bulkActionBar, { backgroundColor: Colors.surface, borderTopColor: Colors.border }]}>
            <Text style={[styles.bulkActionText, { color: Colors.text }]}>
              {selectedDeviceIds.size} selected
            </Text>
            <View style={styles.bulkActions}>
              <TouchableOpacity 
                style={[styles.bulkActionBtn, { backgroundColor: alpha(Colors.danger, 0.12) }]}
                onPress={handleBulkDelete}
                disabled={isBulkUpdating || selectedDeviceIds.size === 0}
                activeOpacity={0.7}
              >
                <Trash2 size={20} color={Colors.danger} strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.bulkActionBtn, { backgroundColor: alpha(Colors.warning, 0.12) }]}
                onPress={() => handleBulkAction('offline')}
                disabled={isBulkUpdating || selectedDeviceIds.size === 0}
                activeOpacity={0.7}
              >
                <WifiOff size={20} color={Colors.warning} strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.bulkActionBtn, { backgroundColor: alpha(Colors.success, 0.12) }]}
                onPress={() => handleBulkAction('online')}
                disabled={isBulkUpdating || selectedDeviceIds.size === 0}
                activeOpacity={0.7}
              >
                {isBulkUpdating ? (
                  <ActivityIndicator color={Colors.success} size="small" />
                ) : (
                  <Wifi size={20} color={Colors.success} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <CustomAlert
          visible={alertVisible}
          isDarkTheme={isDarkTheme}
          {...alertConfig}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerDecoration: {
    ...StyleSheet.absoluteFillObject,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle1: {
    width: 280,
    height: 280,
    top: -120,
    right: -80,
  },
  decorCircle2: {
    width: 180,
    height: 180,
    bottom: -40,
    left: -60,
  },
  decorCircle3: {
    width: 120,
    height: 120,
    top: 40,
    left: -30,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: '#FFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    zIndex: 1,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: "center",
    justifyContent: "center",
  },

  // Controls
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },
  filterScroll: {
    flex: 1,
    marginRight: -8,
  },
  filterScrollContent: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 12,
    gap: 8,
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.2,
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  filterChipBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  filterChipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterChipBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: -0.2,
  },
  filterChipBadgeTextActive: {
    color: '#FFF',
  },
  viewModeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List View
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  listDeviceCard: {
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardGlowList: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  listCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  listIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardInfo: {
    flex: 1,
    gap: 4,
  },
  listDeviceName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listDeviceType: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  listLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  listLocation: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  listStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Grid View
  gridContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  gridDeviceCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 16,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    minHeight: 180,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  gridCardHeader: {
    marginBottom: 14,
  },
  gridIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gridCardBody: {
    gap: 4,
  },
  gridDeviceName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  gridDeviceType: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gridLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridLocation: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  chevronContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 10,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 40,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  modalForm: {
    gap: 20,
    marginBottom: 28,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    paddingLeft: 4,
  },
  modalInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1.5,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  modalBtnTextPrimary: {
    fontSize: 16,
    fontWeight: "800",
    color: '#FFF',
    letterSpacing: 0.3,
  },

  // Sort Options
  sortOptions: {
    gap: 12,
  },
  sortLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    paddingLeft: 4,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  sortOptionText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Bulk Actions
  bulkActionBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 18,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  bulkActionText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 10,
  },
  bulkActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});