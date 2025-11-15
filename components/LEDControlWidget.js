import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { API_BASE } from "../screens/config";

export default function LEDControlWidget({
  title,
  widgetId,
  deviceId,
  deviceToken,       // <-- You MUST pass a valid token from the parent!
  virtualPin,
  nextSchedule,
  initialState = false,
  onLongPress,
  onDelete,          // ✅ Delete handler
  onStateChange,
}) {
  // ✅ Use ref to track if we're updating from WebSocket to prevent flickering
  const isUpdatingFromWS = useRef(false);
  const [ledOn, setLedOn] = useState(() => initialState ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [scheduleState, setScheduleState] = useState(true);
  // Initialize with IST time (current time + 1 minute)
  const getISTDateTime = (offsetMinutes = 1) => {
    const now = new Date();
    // Get current time in IST using toLocaleString
    const istString = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    // Parse IST string: format is "DD/MM/YYYY, HH:mm"
    const [datePart, timePart] = istString.split(", ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);
    // Create date in local timezone (representing IST)
    const istDate = new Date(year, month - 1, day, hours, minutes);
    istDate.setMinutes(istDate.getMinutes() + offsetMinutes);
    // Format as YYYY-MM-DDTHH:mm
    const formattedYear = istDate.getFullYear();
    const formattedMonth = String(istDate.getMonth() + 1).padStart(2, "0");
    const formattedDay = String(istDate.getDate()).padStart(2, "0");
    const formattedHours = String(istDate.getHours()).padStart(2, "0");
    const formattedMinutes = String(istDate.getMinutes()).padStart(2, "0");
    return `${formattedYear}-${formattedMonth}-${formattedDay}T${formattedHours}:${formattedMinutes}`;
  };

  const [scheduleDate, setScheduleDate] = useState(getISTDateTime(1));
  const [scheduleLabel, setScheduleLabel] = useState("");
  const [timerState, setTimerState] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState("60");
  const [timerLabel, setTimerLabel] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const prevWidgetIdRef = useRef(widgetId);

  const { userToken, logout, wsRef } = useContext(AuthContext);

  const pendingSchedules = useMemo(
    () => schedules.filter((s) => s.status === "pending"),
    [schedules]
  );

  const nextPendingSchedule = useMemo(
    () => pendingSchedules[0] || null,
    [pendingSchedules]
  );

  const formatDateTime = (value) => {
    if (!value) return "--";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      // Format in Asia/Kolkata timezone (IST)
      return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch (err) {
      return value;
    }
  };

  useEffect(() => {
    console.log("LED Widget received deviceToken:", deviceToken);
  }, [deviceToken]);

  // Only update from initialState when widgetId changes (new widget loaded)
  // Don't override user actions or WebSocket updates
  useEffect(() => {
    if (prevWidgetIdRef.current !== widgetId) {
      // Widget changed, update state from initial state
      // Only update if not currently updating from WebSocket
      if (!isUpdatingFromWS.current) {
        setLedOn(initialState ? 1 : 0);
      }
      prevWidgetIdRef.current = widgetId;
    }
  }, [widgetId, initialState]);

  const fetchSchedules = useCallback(async () => {
    if (!widgetId || !userToken) return;
    try {
      setLoadingSchedules(true);
      const res = await axios.get(
        `${API_BASE}/widgets/${widgetId}/schedule`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      const list = Array.isArray(res.data?.schedules)
        ? res.data.schedules
        : [];
      setSchedules(list);
    } catch (err) {
      console.error("LED schedule fetch error:", err.response?.data || err.message);
      if (err.response?.status === 401) logout?.();
    } finally {
      setLoadingSchedules(false);
    }
  }, [widgetId, userToken, logout]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    if (!wsRef?.current || !widgetId) return;
    const targetWidgetId = widgetId.toString();
    const targetVirtualPin = virtualPin?.toLowerCase();

    const socket = wsRef.current;
    const handler = (event) => {
      try {
        if (!event.data) return;
        const msg = JSON.parse(event.data);
        if (!msg || typeof msg !== "object") return;
        
        // Handle widget-specific updates
        if (
          msg.type === "widget_update" &&
          msg.widget?._id === targetWidgetId
        ) {
          const newValue = msg.widget?.value;
          if (newValue !== undefined && newValue !== null) {
            isUpdatingFromWS.current = true;
            setLedOn(newValue ? 1 : 0);
            // Reset flag after state update
            setTimeout(() => {
              isUpdatingFromWS.current = false;
            }, 100);
          }
          fetchSchedules();
        } 
        // Handle schedule events
        else if (
          (msg.type === "led_schedule_executed" ||
            msg.type === "led_schedule_cancelled") &&
          msg.widget_id === targetWidgetId
        ) {
          fetchSchedules();
        }
        // Handle telemetry updates for this specific virtual pin
        else if (msg.type === "telemetry_update" && targetVirtualPin) {
          // Match device IDs (handle both string and ObjectId formats)
          const msgDeviceId = msg.device_id;
          const widgetDeviceId = deviceId;
          const deviceMatches = 
            msgDeviceId === widgetDeviceId || 
            String(msgDeviceId) === String(widgetDeviceId);
          
          if (deviceMatches) {
            // Only update if this is for our virtual pin - strict matching
            if (msg.data && msg.data[targetVirtualPin] !== undefined) {
              const newValue = msg.data[targetVirtualPin];
              const currentValue = ledOn;
              // Only update if value actually changed to prevent flickering
              if (newValue !== currentValue) {
                isUpdatingFromWS.current = true;
                setLedOn(newValue ? 1 : 0);
                console.log(`💡 LED ${targetVirtualPin} (widget ${targetWidgetId}) updated via WS:`, newValue ? "ON" : "OFF");
                // Reset flag after state update
                setTimeout(() => {
                  isUpdatingFromWS.current = false;
                }, 100);
              }
            }
          }
        }
      } catch (err) {
        console.error("LED widget WS parse error:", err);
      }
    };

    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [wsRef, widgetId, deviceId, virtualPin, fetchSchedules]);

  // Removed polling - using WebSocket only for real-time updates

  const toggleLED = async () => {
    if (!widgetId || !userToken) {
      Alert.alert("Missing data", "Widget ID or user token is not available.");
      return;
    }
    
    // Prevent multiple rapid clicks
    if (loading) {
      console.log("⚠️ LED toggle already in progress");
      return;
    }
    
    setLoading(true);
    const currentState = ledOn;
    const newState = currentState ? 0 : 1;
    
    // Optimistically update UI immediately (only if not updating from WS)
    if (!isUpdatingFromWS.current) {
      setLedOn(newState);
    }
    
    try {
      const res = await axios.post(
        `${API_BASE}/widgets/${widgetId}/state`,
        { state: newState },
        { 
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 10000, // 10 second timeout
        }
      );
      
      // State will be confirmed via WebSocket update, no need to refetch
      if (res.status !== 200) {
        // Revert on error
        if (!isUpdatingFromWS.current) {
          setLedOn(currentState);
        }
      }
    } catch (err) {
      console.error("LED toggle error:", err.response?.data || err.message);
      
      // Revert on error - restore previous state (only if not updating from WS)
      if (!isUpdatingFromWS.current) {
        setLedOn(currentState);
      }
      
      if (err.response?.status === 401) {
        logout?.();
        Alert.alert("Session Expired", "Please login again.");
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        Alert.alert("Timeout", "Request took too long. Please check your connection.");
      } else {
        Alert.alert("Error", err.response?.data?.detail || "Failed to change LED state.");
      }
    } finally {
      setLoading(false);
    }
  };

  const submitSchedule = async () => {
    if (!widgetId || !userToken) return;
    try {
      // Parse the datetime string (assumed to be in IST format YYYY-MM-DDTHH:mm)
      let dateObj;
      if (scheduleDate.includes("T")) {
        // Parse as IST time
        const [datePart, timePart] = scheduleDate.split("T");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hours, minutes] = timePart.split(":").map(Number);
        // Create a date object representing IST time
        // We'll create it as if it were UTC, then adjust
        const istDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
        // IST is UTC+5:30, so subtract that offset to get actual UTC
        dateObj = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
      } else {
        dateObj = new Date(scheduleDate);
      }
      
      if (Number.isNaN(dateObj.getTime())) {
        Alert.alert("Invalid time", "Please enter a valid datetime in IST.");
        return;
      }
      
      setSubmitting(true);
      // Send as ISO string - backend will handle IST conversion
      await axios.post(
        `${API_BASE}/widgets/${widgetId}/schedule`,
        {
          state: scheduleState,
          execute_at: dateObj.toISOString(),
          label: scheduleLabel || undefined,
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setScheduleModalVisible(false);
      setScheduleLabel("");
      // Don't call onStateChange - it causes forced refetch
      // Schedules will be updated via WebSocket
      fetchSchedules();
      Alert.alert("Scheduled", "LED schedule created.");
    } catch (err) {
      console.error("Schedule error:", err.response?.data || err.message);
      if (err.response?.status === 401) logout?.();
      Alert.alert("Error", err.response?.data?.detail || "Failed to create schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitTimer = async () => {
    if (!widgetId || !userToken) return;
    const seconds = parseInt(timerSeconds, 10);
    if (!seconds || seconds <= 0) {
      Alert.alert("Invalid duration", "Please enter timer duration in seconds.");
      return;
    }
    try {
      setSubmitting(true);
      await axios.post(
        `${API_BASE}/widgets/${widgetId}/timer`,
        {
          state: timerState,
          duration_seconds: seconds,
          label: timerLabel || undefined,
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setTimerModalVisible(false);
      setTimerLabel("");
      // Don't call onStateChange - it causes forced refetch
      // Schedules will be updated via WebSocket
      fetchSchedules();
      Alert.alert("Timer set", "LED timer scheduled.");
    } catch (err) {
      console.error("Timer error:", err.response?.data || err.message);
      if (err.response?.status === 401) logout?.();
      Alert.alert("Error", err.response?.data?.detail || "Failed to set timer.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelSchedule = async (scheduleId) => {
    if (!widgetId || !userToken) return;
    try {
      await axios.delete(
        `${API_BASE}/widgets/${widgetId}/schedule/${scheduleId}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      fetchSchedules();
      Alert.alert("Cancelled", "LED schedule cancelled.");
    } catch (err) {
      console.error("Cancel schedule error:", err.response?.data || err.message);
      if (err.response?.status === 401) logout?.();
      Alert.alert("Error", "Failed to cancel schedule.");
    }
  };

  const renderUpcomingInfo = () => {
    if (loadingSchedules) {
      return <ActivityIndicator size="small" color={ledOn ? "#fff" : "#007AFF"} />;
    }
    if (pendingSchedules.length === 0) {
      return (
        <Text style={[styles.scheduleText, { color: ledOn ? "#e0f7ff" : "#4a5568" }]}>
          No pending schedules
        </Text>
      );
    }

    return (
      <View>
        {pendingSchedules.slice(0, 2).map((s) => (
          <Text
            key={s._id || s.id}
            style={[styles.scheduleText, { color: ledOn ? "#e0f7ff" : "#4a5568" }]}
          >
            {`${formatDateTime(s.execute_at)} → ${s.state ? "ON" : "OFF"}`}
          </Text>
        ))}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: ledOn ? "#4cd964" : "#fff" }]}
      activeOpacity={0.8}
      onPress={toggleLED}
      onLongPress={onLongPress}
      delayLongPress={600}
      disabled={loading}
    >
      {onDelete && (
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={20} color="#ff3b30" />
        </TouchableOpacity>
      )}

      <View style={styles.headerRow}>
        {virtualPin && (
          <Text
            style={[
              styles.pinTag,
              { color: ledOn ? "#e0f7ff" : "#007AFF", borderColor: ledOn ? "#e0f7ff" : "#007AFF" },
            ]}
          >
            {virtualPin.toUpperCase()}
          </Text>
        )}
        {deviceId && (
          <Text
            numberOfLines={1}
            style={[
              styles.deviceTag,
              { color: ledOn ? "#e0f7ff" : "#4a5568" },
            ]}
          >
            #{deviceId.toString().slice(-4)}
          </Text>
        )}
      </View>

      <Ionicons
        name={ledOn ? "bulb" : "bulb-outline"}
        size={30}
        color={ledOn ? "#fff" : "#007AFF"}
        style={styles.icon}
      />
      <Text style={[styles.title, { color: ledOn ? "#fff" : "#333" }]}>{title}</Text>
      <Text style={[styles.status, { color: ledOn ? "#fff" : "#007AFF" }]}>
        {loading ? "..." : ledOn ? "ON" : "OFF"}
      </Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { borderColor: ledOn ? "#fff" : "#007AFF" },
          ]}
          onPress={() => setScheduleModalVisible(true)}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={ledOn ? "#fff" : "#007AFF"}
          />
          <Text
            style={[
              styles.actionText,
              { color: ledOn ? "#fff" : "#007AFF" },
            ]}
          >
            Schedule
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            { borderColor: ledOn ? "#fff" : "#007AFF" },
          ]}
          onPress={() => setTimerModalVisible(true)}
        >
          <Ionicons
            name="timer-outline"
            size={18}
            color={ledOn ? "#fff" : "#007AFF"}
          />
          <Text
            style={[
              styles.actionText,
              { color: ledOn ? "#fff" : "#007AFF" },
            ]}
          >
            Timer
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.schedulePreview}>
        {nextSchedule && (
          <Text
            style={[
              styles.scheduleText,
              styles.nextScheduleText,
              { color: ledOn ? "#e0f7ff" : "#1a202c" },
            ]}
          >
            Next: {formatDateTime(nextSchedule)}
          </Text>
        )}
        {renderUpcomingInfo()}
      </View>

      <Modal
        visible={scheduleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar-outline" size={24} color="#007AFF" />
              <Text style={styles.modalTitle}>Schedule LED</Text>
            </View>

            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleChip,
                  scheduleState && styles.toggleChipActive,
                ]}
                onPress={() => setScheduleState(true)}
              >
                <Text
                  style={[
                    styles.toggleChipText,
                    scheduleState && styles.toggleChipTextActive,
                  ]}
                >
                  Turn ON
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleChip,
                  !scheduleState && styles.toggleChipActive,
                ]}
                onPress={() => setScheduleState(false)}
              >
                <Text
                  style={[
                    styles.toggleChipText,
                    !scheduleState && styles.toggleChipTextActive,
                  ]}
                >
                  Turn OFF
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Execute At (IST - YYYY-MM-DDTHH:mm):</Text>
            <TextInput
              style={styles.input}
              value={scheduleDate}
              onChangeText={setScheduleDate}
              placeholder="2025-01-01T12:00"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.modalHint}>
              Current IST: {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </Text>

            <Text style={styles.modalLabel}>Label (optional):</Text>
            <TextInput
              style={styles.input}
              value={scheduleLabel}
              onChangeText={setScheduleLabel}
              placeholder="Morning schedule"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setScheduleModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={submitSchedule}
                disabled={submitting}
              >
                <Text style={styles.modalConfirmText}>
                  {submitting ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Pending Schedules</Text>
              <ScrollView style={styles.scheduleList}>
                {pendingSchedules.length === 0 ? (
                  <Text style={styles.emptyText}>No pending entries.</Text>
                ) : (
                  pendingSchedules.map((s) => (
                    <View key={s._id || s.id} style={styles.scheduleRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scheduleRowTitle}>
                          {formatDateTime(s.execute_at)}
                        </Text>
                        <Text style={styles.scheduleRowSubtitle}>
                          {s.state ? "ON" : "OFF"} {s.label ? `• ${s.label}` : ""}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => cancelSchedule(s._id || s.id)}>
                        <Ionicons name="close-circle" size={20} color="#ff3b30" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={timerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTimerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="timer-outline" size={24} color="#007AFF" />
              <Text style={styles.modalTitle}>LED Timer</Text>
            </View>

            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleChip,
                  timerState && styles.toggleChipActive,
                ]}
                onPress={() => setTimerState(true)}
              >
                <Text
                  style={[
                    styles.toggleChipText,
                    timerState && styles.toggleChipTextActive,
                  ]}
                >
                  Turn ON
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleChip,
                  !timerState && styles.toggleChipActive,
                ]}
                onPress={() => setTimerState(false)}
              >
                <Text
                  style={[
                    styles.toggleChipText,
                    !timerState && styles.toggleChipTextActive,
                  ]}
                >
                  Turn OFF
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Duration (seconds)</Text>
            <TextInput
              style={styles.input}
              value={timerSeconds}
              onChangeText={setTimerSeconds}
              keyboardType="numeric"
              placeholder="60"
            />

            <Text style={styles.modalLabel}>Label (optional)</Text>
            <TextInput
              style={styles.input}
              value={timerLabel}
              onChangeText={setTimerLabel}
              placeholder="Short timer"
            />

            <View style={styles.quickRow}>
              {[60, 300, 600, 1800].map((sec) => (
                <TouchableOpacity
                  key={sec}
                  style={styles.quickChip}
                  onPress={() => setTimerSeconds(String(sec))}
                >
                  <Text style={styles.quickChipText}>
                    {sec >= 60 ? `${Math.round(sec / 60)}m` : `${sec}s`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setTimerModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={submitTimer}
                disabled={submitting}
              >
                <Text style={styles.modalConfirmText}>
                  {submitting ? "Saving..." : "Start"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    height: 200,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    margin: 8,
  },
  deleteBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 10,
    padding: 4,
    backgroundColor: "#ffffffaa",
    borderRadius: 12,
  },
  headerRow: {
    position: "absolute",
    top: 8,
    left: 10,
    right: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pinTag: {
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  deviceTag: {
    fontSize: 12,
    opacity: 0.8,
  },
  icon: { marginBottom: 8 },
  title: { fontSize: 14, fontWeight: "600" },
  status: { fontSize: 16, fontWeight: "bold", marginTop: 6 },
  actionsRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
  },
  schedulePreview: {
    marginTop: 6,
    alignItems: "center",
  },
  scheduleText: {
    fontSize: 10,
    textAlign: "center",
  },
  nextScheduleText: {
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "90%",
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 12,
    marginBottom: 6,
  },
  modalHint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: "#111827",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancel: {
    backgroundColor: "#e2e8f0",
  },
  modalConfirm: {
    backgroundColor: "#007AFF",
  },
  modalCancelText: {
    color: "#1e293b",
    fontWeight: "600",
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "700",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  toggleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleChipActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  toggleChipText: {
    fontWeight: "600",
    color: "#1f2937",
  },
  toggleChipTextActive: {
    color: "#fff",
  },
  modalSection: {
    marginTop: 16,
  },
  scheduleList: {
    maxHeight: 180,
    marginTop: 8,
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 13,
    textAlign: "center",
    marginVertical: 8,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  scheduleRowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  scheduleRowSubtitle: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#e0f2fe",
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0369a1",
  },
});
