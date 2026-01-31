import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  XCircle, 
  ChevronLeft,
  X,
  Save,
  Copy
} from 'lucide-react-native';
import { showToast } from '../components/Toast';
import CustomAlert from '../components/CustomAlert';
import * as Clipboard from 'expo-clipboard';
import { getThemeColors, alpha } from '../utils/theme';

export default function WebhooksScreen({ navigation }) {
  const { isDarkTheme } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [events, setEvents] = useState('telemetry_update'); // Default event
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  const Colors = getThemeColors(isDarkTheme);

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await api.getWebhooks();
      setWebhooks(response.webhooks || []);
    } catch (error) {
      console.error("Failed to fetch webhooks:", error);
      showToast.error("Error", "Failed to load webhooks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWebhooks();
  };

  const handleOpenModal = (webhook = null) => {
    if (webhook) {
      setEditingWebhook(webhook);
      setUrl(webhook.url);
      setSecret(webhook.secret === '***' ? '' : webhook.secret || ''); // Don't show masked secret
      setEvents(Array.isArray(webhook.events) ? webhook.events.join(', ') : webhook.events || 'telemetry_update');
      setIsActive(webhook.active !== false);
    } else {
      setEditingWebhook(null);
      setUrl('');
      setSecret('');
      setEvents('telemetry_update');
      setIsActive(true);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!url.trim()) {
      showToast.error("Validation", "URL is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const eventList = events.split(',').map(e => e.trim()).filter(Boolean);
      const payload = {
        url: url.trim(),
        events: eventList.length > 0 ? eventList : ['telemetry_update'],
        active: isActive,
      };
      
      if (secret.trim()) {
        payload.secret = secret.trim();
      }

      if (editingWebhook) {
        await api.updateWebhook(editingWebhook._id || editingWebhook.id, payload);
        showToast.success("Success", "Webhook updated");
      } else {
        await api.createWebhook(payload);
        showToast.success("Success", "Webhook created");
      }
      
      setModalVisible(false);
      fetchWebhooks();
    } catch (error) {
      console.error("Save webhook error:", error);
      showToast.error("Error", error.message || "Failed to save webhook");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (webhook) => {
    setAlertConfig({
      type: 'confirm',
      title: 'Delete Webhook',
      message: 'Are you sure you want to delete this webhook?',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setAlertVisible(false) },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            setAlertVisible(false);
            try {
              await api.deleteWebhook(webhook._id || webhook.id);
              showToast.success("Deleted", "Webhook removed successfully");
              fetchWebhooks();
            } catch (error) {
              showToast.error("Error", "Failed to delete webhook");
            }
          } 
        }
      ]
    });
    setAlertVisible(true);
  };

  const copyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    showToast.success("Copied", "Copied to clipboard");
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.urlContainer}>
          <View style={[styles.methodBadge, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={[styles.methodText, { color: Colors.primary }]}>POST</Text>
          </View>
          <Text style={[styles.urlText, { color: Colors.text }]} numberOfLines={1} ellipsizeMode="middle">
            {item.url}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.active ? Colors.success + '20' : Colors.textSecondary + '20' }]}>
          {item.active ? (
            <CheckCircle size={12} color={Colors.success} />
          ) : (
            <XCircle size={12} color={Colors.textSecondary} />
          )}
          <Text style={[styles.statusText, { color: item.active ? Colors.success : Colors.textSecondary }]}>
            {item.active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: Colors.textSecondary }]}>Events:</Text>
          <View style={styles.eventsContainer}>
            {item.events && item.events.map((event, index) => (
              <View key={index} style={[styles.eventChip, { backgroundColor: Colors.surfaceLight }]}>
                <Text style={[styles.eventText, { color: Colors.text }]}>{event}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <Text style={[styles.statsText, { color: Colors.textSecondary }]}>
            Triggered: <Text style={{ color: Colors.text }}>{item.trigger_count || 0}</Text>
          </Text>
          <Text style={[styles.statsText, { color: Colors.textSecondary }]}>
            Errors: <Text style={{ color: Colors.danger }}>{item.error_count || 0}</Text>
          </Text>
        </View>
      </View>

      <View style={[styles.cardFooter, { borderTopColor: Colors.border }]}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => copyToClipboard(item.url)}
        >
          <Copy size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.rightActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { marginRight: 8 }]} 
            onPress={() => handleOpenModal(item)}
          >
            <Edit2 size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <StatusBar 
        barStyle={isDarkTheme ? "light-content" : "dark-content"} 
        backgroundColor="transparent"
        translucent
      />
      
      {/* Immersive Decorative Header */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerDecoration}>
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </View>

        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
          >
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Webhooks</Text>
            <Text style={styles.headerSubtitle}>Manage real-time events</Text>
          </View>
          <TouchableOpacity 
            onPress={() => handleOpenModal()} 
            style={[styles.addButton, { backgroundColor: Colors.white }]}
          >
            <Plus size={24} color={Colors.primary} strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={webhooks}
          renderItem={renderItem}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Webhook size={64} color={Colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: Colors.text }]}>No Webhooks</Text>
              <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>
                Create a webhook to receive real-time events from your devices.
              </Text>
              <TouchableOpacity 
                style={[styles.createButton, { backgroundColor: Colors.primary }]}
                onPress={() => handleOpenModal()}
              >
                <Text style={styles.createButtonText}>Create Webhook</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors.text }]}>
                {editingWebhook ? 'Edit Webhook' : 'New Webhook'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: Colors.text }]}>Payload URL</Text>
                <TextInput
                  style={[styles.input, { color: Colors.text, backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]}
                  placeholder="https://api.example.com/webhook"
                  placeholderTextColor={Colors.textSecondary}
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: Colors.text }]}>Secret (Optional)</Text>
                <TextInput
                  style={[styles.input, { color: Colors.text, backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]}
                  placeholder="Signing secret"
                  placeholderTextColor={Colors.textSecondary}
                  value={secret}
                  onChangeText={setSecret}
                  secureTextEntry
                />
                <Text style={[styles.helperText, { color: Colors.textSecondary }]}>
                  Used to sign the webhook payload for security.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: Colors.text }]}>Events</Text>
                <TextInput
                  style={[styles.input, { color: Colors.text, backgroundColor: Colors.surfaceLight, borderColor: Colors.border }]}
                  placeholder="telemetry_update, device_status"
                  placeholderTextColor={Colors.textSecondary}
                  value={events}
                  onChangeText={setEvents}
                  autoCapitalize="none"
                />
                <Text style={[styles.helperText, { color: Colors.textSecondary }]}>
                  Comma-separated list of events (e.g., telemetry_update).
                </Text>
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.inputLabel, { color: Colors.text, marginBottom: 0 }]}>Active</Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.primary + '50' }}
                  thumbColor={isActive ? Colors.primary : '#f4f3f4'}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: Colors.border }]}>
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: Colors.border }]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: Colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: Colors.primary }]} 
                onPress={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
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
    width: 250,
    height: 250,
    top: -100,
    right: -50,
  },
  decorCircle2: {
    width: 150,
    height: 150,
    bottom: -50,
    left: -30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontWeight: '500',
  },
  createButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  urlContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  urlText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardBody: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  infoRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  eventsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  eventText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  statsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1.5,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 12,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  modalBody: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingTop: 20,
    borderTopWidth: 1.5,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '800',
    fontSize: 16,
  },
  saveButton: {
    flex: 2,
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
  },
});