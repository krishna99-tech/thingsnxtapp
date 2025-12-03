import React, { useState, useMemo, useEffect, useContext, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { showToast } from '../Toast';

const AddLedWidgetModal = ({
  visible,
  onClose,
  dashboardId,
  onWidgetAdded,
  themeStyles,
}) => {
  const { devices, showAlert } = useContext(AuthContext);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [ledLabel, setLedLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const availableDevices = useMemo(
    () => (Array.isArray(devices) ? devices : []),
    [devices]
  );

  // Pre-select the first device when the modal opens
  useEffect(() => {
    if (visible && availableDevices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(availableDevices[0]._id);
    }
  }, [visible, availableDevices, selectedDeviceId]);

  const handleCreate = useCallback(async () => {
    if (!selectedDeviceId) {
      showAlert({
        type: 'warning',
        title: 'Select a device',
        message: 'Please choose a device for the LED widget.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    if (isCreating) return;

    try {
      setIsCreating(true);
      const newWidgetData = await api.addWidget({
        dashboard_id: dashboardId,
        device_id: selectedDeviceId,
        type: 'led',
        label: ledLabel?.trim() || 'LED Control',
        value: 0,
      });

      if (newWidgetData) {
        onWidgetAdded(); // Notify parent to refetch widgets
      }

      onClose(); // Close modal on success
      showToast.success('LED widget created successfully.');
    } catch (err) {
      console.error('❌ Create LED widget error:', err);
      const errorMessage = err.message || 'Failed to create LED widget';
      showToast.error('Error', errorMessage);
    } finally {
      setIsCreating(false);
      setLedLabel(''); // Reset label for next time
    }
  }, [selectedDeviceId, isCreating, dashboardId, ledLabel, onWidgetAdded, onClose, showAlert]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, themeStyles.modalCard]}>
          <Text style={[styles.modalTitle, themeStyles.modalTitle]}>Add LED Widget</Text>
          <Text style={[styles.modalSubtitle, themeStyles.modalSubtitle]}>
            Choose a device to control its LED.
          </Text>

          <Text style={[styles.modalLabel, themeStyles.modalLabel]}>Select Device</Text>
          <ScrollView style={styles.deviceList}>
            {availableDevices.map((device) => {
              const isSelected = selectedDeviceId === device._id;
              return (
                <TouchableOpacity
                  key={device._id}
                  style={[
                    styles.deviceRow,
                    themeStyles.deviceRow,
                    isSelected && styles.deviceRowSelected,
                  ]}
                  onPress={() => setSelectedDeviceId(device._id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deviceName, themeStyles.deviceName]}>
                      {device.name || 'Unnamed Device'}
                    </Text>
                    <Text style={[styles.deviceToken, themeStyles.deviceToken]}>
                      Token: {device.device_token}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.modalLabel, themeStyles.modalLabel]}>Widget Label</Text>
          <TextInput
            style={[styles.input, themeStyles.input]}
            placeholder="Living room LED"
            placeholderTextColor={themeStyles.input.color + '80'}
            value={ledLabel}
            onChangeText={setLedLabel}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalCancel]}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalConfirm]}
              onPress={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalConfirmText}>Add Widget</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalCard: { width: "92%", borderRadius: 20, padding: 20, maxHeight: "85%" },
  modalTitle: { fontSize: 22, fontWeight: "bold" },
  modalSubtitle: { fontSize: 14, marginVertical: 10 },
  modalLabel: { fontSize: 14, fontWeight: "600", marginTop: 14, marginBottom: 6 },
  deviceList: { maxHeight: 200 },
  deviceRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, marginBottom: 8 },
  deviceRowSelected: { borderWidth: 1, borderColor: "#3b82f6", backgroundColor: "#dbeafe" },
  deviceName: { fontWeight: "600" },
  deviceToken: { fontSize: 12, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14 },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 18 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  modalCancel: { backgroundColor: "#e2e8f0" },
  modalConfirm: { backgroundColor: "#2563eb" },
  modalCancelText: { color: "#1e293b", fontWeight: "600" },
  modalConfirmText: { color: "#fff", fontWeight: "700" },
});

export default React.memo(AddLedWidgetModal);
