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
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Lightbulb, Calendar, Timer, Trash2, X } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons"; // Keeping Ionicons for Modals to ensure compatibility
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { API_BASE } from "../constants/config";

// Fallback colors if @/constants/colors is missing
const Colors = {
  white: "#FFFFFF",
  gray: "#9CA3AF",
  darkGray: "#1F2937",
};

const LEDControlWidget = ({
  title,
  widgetId,
  deviceId,
  deviceToken,
  virtualPin,
  nextSchedule,
  initialState = false,
  onLongPress,
  onDelete,
  onStateChange,
}) => {
  // --- LOGIC FROM INPUT 2 ---
  const isUpdatingFromWS = useRef(false);
  const [ledOn, setLedOn] = useState(() => (initialState ? 1 : 0));
  const [loading, setLoading] = useState(false);
  
  // Modal States
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  
  // Schedule Logic
  const [scheduleState, setScheduleState] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Timer Logic
  const [timerState, setTimerState] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState("60");
  const [timerLabel, setTimerLabel] = useState("");
  const [scheduleLabel, setScheduleLabel] = useState("");

  const prevWidgetIdRef = useRef(widgetId);
  const { userToken, logout, wsRef } = useContext(AuthContext);

  // Helper: Get IST Date
  const getISTDateTime = (offsetMinutes = 1) => {
    const now = new Date();
    const istString = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const [datePart, timePart] = istString.split(", ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);
    const istDate = new Date(year, month - 1, day, hours, minutes);
    istDate.setMinutes(istDate.getMinutes() + offsetMinutes);
    
    const formattedYear = istDate.getFullYear();
    const formattedMonth = String(istDate.getMonth() + 1).padStart(2, "0");
    const formattedDay = String(istDate.getDate()).padStart(2, "0");
    const formattedHours = String(istDate.getHours()).padStart(2, "0");
    const formattedMinutes = String(istDate.getMinutes()).padStart(2, "0");
    return `${formattedYear}-${formattedMonth}-${formattedDay}T${formattedHours}:${formattedMinutes}`;
  };

  const [scheduleDate, setScheduleDate] = useState(getISTDateTime(1));

  const pendingSchedules = useMemo(
    () => schedules.filter((s) => s.status === "pending"),
    [schedules]
  );

  const formatDateTime = (value) => {
    if (!value) return "--";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
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

  // --- USE EFFECTS ---

  useEffect(() => {
    if (prevWidgetIdRef.current !== widgetId) {
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
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      const list = Array.isArray(res.data?.schedules) ? res.data.schedules : [];
      setSchedules(list);
    } catch (err) {
      console.error("LED schedule fetch error:", err.message);
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

        if (msg.type === "widget_update" && msg.widget?._id === targetWidgetId) {
          const newValue = msg.widget?.value;
          if (newValue !== undefined && newValue !== null) {
            isUpdatingFromWS.current = true;
            setLedOn(newValue ? 1 : 0);
            setTimeout(() => { isUpdatingFromWS.current = false; }, 100);
          }
          fetchSchedules();
        } else if (
          (msg.type === "led_schedule_executed" || msg.type === "led_schedule_cancelled") &&
          msg.widget_id === targetWidgetId
        ) {
          fetchSchedules();
        } else if (msg.type === "telemetry_update" && targetVirtualPin) {
          const msgDeviceId = msg.device_id;
          const widgetDeviceId = deviceId;
          const deviceMatches = msgDeviceId === widgetDeviceId || String(msgDeviceId) === String(widgetDeviceId);
          
          if (deviceMatches && msg.data && msg.data[targetVirtualPin] !== undefined) {
            const newValue = msg.data[targetVirtualPin];
            if (newValue !== ledOn) {
              isUpdatingFromWS.current = true;
              setLedOn(newValue ? 1 : 0);
              setTimeout(() => { isUpdatingFromWS.current = false; }, 100);
            }
          }
        }
      } catch (err) {
        console.error("LED widget WS parse error:", err);
      }
    };

    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [wsRef, widgetId, deviceId, virtualPin, fetchSchedules, ledOn]);

  // --- ACTIONS ---

  const handleToggle = async () => {
    if (loading) return;

    // Haptics from Input 1
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!widgetId || !userToken) {
      Alert.alert("Error", "Missing data.");
      return;
    }

    setLoading(true);
    const currentState = ledOn;
    const newState = currentState ? 0 : 1;

    // Optimistic Update
    if (!isUpdatingFromWS.current) {
      setLedOn(newState);
    }

    try {
      const res = await axios.post(
        `${API_BASE}/widgets/${widgetId}/state`,
        { state: newState },
        { headers: { Authorization: `Bearer ${userToken}` }, timeout: 10000 }
      );

      if (res.status !== 200 && !isUpdatingFromWS.current) {
        setLedOn(currentState);
      }
    } catch (err) {
      if (!isUpdatingFromWS.current) setLedOn(currentState);
      console.error("LED toggle error:", err.message);
      if (err.response?.status === 401) logout?.();
    } finally {
      setLoading(false);
    }
  };

  const submitSchedule = async () => {
    if (!widgetId || !userToken) return;
    try {
      let dateObj;
      if (scheduleDate.includes("T")) {
        const [datePart, timePart] = scheduleDate.split("T");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hours, minutes] = timePart.split(":").map(Number);
        const istDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
        dateObj = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
      } else {
        dateObj = new Date(scheduleDate);
      }
      
      if (Number.isNaN(dateObj.getTime())) {
        Alert.alert("Invalid time", "Please enter a valid datetime in IST.");
        return;
      }
      
      setSubmitting(true);
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
      fetchSchedules();
      Alert.alert("Scheduled", "LED schedule created.");
    } catch (err) {
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
      fetchSchedules();
      Alert.alert("Timer set", "LED timer scheduled.");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.detail || "Failed to set timer.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelSchedule = async (scheduleId) => {
    try {
      await axios.delete(
        `${API_BASE}/widgets/${widgetId}/schedule/${scheduleId}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      fetchSchedules();
    } catch (err) {
      Alert.alert("Error", "Failed to cancel schedule.");
    }
  };

  // --- VISUAL LOGIC ---

  const gradientColors = ledOn
    ? ['#fbbf24', '#f59e0b'] // Amber Gradient (ON)
    : ['#374151', '#1f2937']; // Dark Gray Gradient (OFF)

  // Prioritize pending schedule from API over prop, but use prop as fallback
  const displaySchedule = pendingSchedules[0] || nextSchedule;

  return (
    <View>
      <TouchableOpacity
        onPress={handleToggle}
        onLongPress={onLongPress}
        activeOpacity={0.9}
        disabled={loading}
      >
        <LinearGradient colors={gradientColors} style={styles.container}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, ledOn && styles.iconContainerOn]}>
              <Lightbulb
                size={24}
                color={ledOn ? '#fbbf24' : Colors.white}
                fill={ledOn ? '#fbbf24' : 'transparent'}
              />
            </View>
            
            <View style={styles.headerRight}>
              <View style={[styles.statusDot, ledOn ? styles.statusOn : styles.statusOff]} />
              {onDelete && (
                <TouchableOpacity 
                  onPress={onDelete} 
                  style={styles.deleteButton}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                  <Trash2 size={16} color={Colors.white} style={{ opacity: 0.7 }} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.statusText}>
              {loading ? "..." : ledOn ? 'ON' : 'OFF'}
            </Text>
            {virtualPin && (
              <Text style={styles.virtualPin}>
                {virtualPin} {deviceId && `(#${deviceId.toString().slice(-4)})`}
              </Text>
            )}
          </View>

          {/* Footer: Next Schedule & Actions */}
          <View style={styles.footer}>
            {/* Action Buttons Row */}
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.miniButton} 
                onPress={() => setScheduleModalVisible(true)}
              >
                <Calendar size={14} color={Colors.white} />
                <Text style={styles.miniButtonText}>Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.miniButton} 
                onPress={() => setTimerModalVisible(true)}
              >
                <Timer size={14} color={Colors.white} />
                <Text style={styles.miniButtonText}>Timer</Text>
              </TouchableOpacity>
            </View>

            {/* Schedule Text */}
            {displaySchedule && (
              <Text style={styles.scheduleText} numberOfLines={1}>
                Next: {displaySchedule.action === 'on' || displaySchedule.state ? 'ON' : 'OFF'} @ 
                {displaySchedule.time ? displaySchedule.time : 
                 (displaySchedule.execute_at ? formatDateTime(displaySchedule.execute_at).split(',')[1] : '')}
              </Text>
            )}
          </View>

        </LinearGradient>
      </TouchableOpacity>

      {/* --- SCHEDULE MODAL (From Input 2) --- */}
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
                style={[styles.toggleChip, scheduleState && styles.toggleChipActive]}
                onPress={() => setScheduleState(true)}
              >
                <Text style={[styles.toggleChipText, scheduleState && styles.toggleChipTextActive]}>Turn ON</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleChip, !scheduleState && styles.toggleChipActive]}
                onPress={() => setScheduleState(false)}
              >
                <Text style={[styles.toggleChipText, !scheduleState && styles.toggleChipTextActive]}>Turn OFF</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Execute At (IST):</Text>
            <TextInput
              style={styles.input}
              value={scheduleDate}
              onChangeText={setScheduleDate}
              placeholder="YYYY-MM-DDTHH:mm"
              autoCapitalize="none"
            />
            
            <Text style={styles.modalLabel}>Label:</Text>
            <TextInput
              style={styles.input}
              value={scheduleLabel}
              onChangeText={setScheduleLabel}
              placeholder="Optional label"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setScheduleModalVisible(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={submitSchedule} disabled={submitting}>
                <Text style={styles.modalConfirmText}>{submitting ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>

            {/* Pending List inside Modal */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Pending</Text>
              <ScrollView style={styles.scheduleList}>
                {pendingSchedules.length === 0 ? (
                  <Text style={styles.emptyText}>No pending entries.</Text>
                ) : (
                  pendingSchedules.map((s) => (
                    <View key={s._id || s.id} style={styles.scheduleRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scheduleRowTitle}>{formatDateTime(s.execute_at)}</Text>
                        <Text style={styles.scheduleRowSubtitle}>{s.state ? "ON" : "OFF"} {s.label ? `• ${s.label}` : ""}</Text>
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

      {/* --- TIMER MODAL (From Input 2) --- */}
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
                style={[styles.toggleChip, timerState && styles.toggleChipActive]}
                onPress={() => setTimerState(true)}
              >
                <Text style={[styles.toggleChipText, timerState && styles.toggleChipTextActive]}>Turn ON</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleChip, !timerState && styles.toggleChipActive]}
                onPress={() => setTimerState(false)}
              >
                <Text style={[styles.toggleChipText, !timerState && styles.toggleChipTextActive]}>Turn OFF</Text>
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

            <View style={styles.quickRow}>
              {[60, 300, 600, 1800].map((sec) => (
                <TouchableOpacity key={sec} style={styles.quickChip} onPress={() => setTimerSeconds(String(sec))}>
                  <Text style={styles.quickChipText}>{sec >= 60 ? `${Math.round(sec / 60)}m` : `${sec}s`}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setTimerModalVisible(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={submitTimer} disabled={submitting}>
                <Text style={styles.modalConfirmText}>{submitting ? "Start" : "Start"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default React.memo(LEDControlWidget);

const styles = StyleSheet.create({
  // --- Main Widget Styles (Based on Input 1) ---
  container: {
    width: 170, // Slightly wider to fit buttons
    height: 190, // Taller to fit content
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    margin: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerOn: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusOn: { backgroundColor: '#22c55e' },
  statusOff: { backgroundColor: '#6b7280' },
  deleteButton: {
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  title: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
    marginBottom: 2,
    opacity: 0.9,
  },
  statusText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  virtualPin: {
    fontSize: 10,
    color: Colors.white,
    opacity: 0.6,
    fontWeight: '500',
    marginTop: 2,
  },
  footer: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  miniButtonText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  scheduleText: {
    fontSize: 10,
    color: Colors.white,
    opacity: 0.8,
    fontWeight: '500',
    textAlign: 'left',
  },

  // --- Modal Styles (From Input 2) ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "90%",
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
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
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#f8fafc",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  toggleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  toggleChipActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  toggleChipText: {
    color: "#64748b",
    fontWeight: "600",
  },
  toggleChipTextActive: {
    color: "#3b82f6",
    fontWeight: "700",
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  quickChip: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: "#f1f5f9",
  },
  modalConfirm: {
    backgroundColor: "#2563eb",
  },
  modalCancelText: {
    color: "#475569",
    fontWeight: "600",
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "700",
  },
  modalSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    flex: 1,
  },
  scheduleList: {
    maxHeight: 150,
  },
  emptyText: {
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  scheduleRowTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  scheduleRowSubtitle: {
    fontSize: 11,
    color: "#64748b",
  },
});