import React, { useContext, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { AuthContext } from '../context/AuthContext';
import { 
  ChevronLeft, 
  Command, 
  Slack, 
  Chrome, 
  Radio, 
  X, 
  Save, 
  RefreshCw, 
  Settings2, 
  ShieldCheck, 
  Zap, 
  Copy,
  ArrowRight
} from 'lucide-react-native';
import { showToast } from '../components/Toast';
import CustomAlert from '../components/CustomAlert';
import { getThemeColors, alpha } from '../utils/theme';

export default function ConnectedAppsScreen({ navigation }) {
  const { isDarkTheme, user, updateUser } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [loadingId, setLoadingId] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [configSettings, setConfigSettings] = useState({
    sync: true,
    notifications: true,
    apiKey: ''
  });

  const Colors = useMemo(() => getThemeColors(isDarkTheme), [isDarkTheme]);

  const appsMetadata = useMemo(() => [
    {
      id: 'google',
      name: 'Google Home',
      description: 'Control devices with Google Assistant.',
      icon: Chrome,
      color: '#DB4437'
    },
    {
      id: 'alexa',
      name: 'Amazon Alexa',
      description: 'Voice control via Alexa ecosystem.',
      icon: Radio,
      color: '#00CAFF'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Get notifications in your workspace.',
      icon: Slack,
      color: '#4A154B'
    },
    {
      id: 'ifttt',
      name: 'IFTTT',
      description: 'Trigger complex automation recipes.',
      icon: Command,
      color: '#000000'
    }
  ], []);

  const apps = useMemo(() => {
    return appsMetadata.map(app => ({
      ...app,
      connected: !!user?.integrations?.[app.id]?.connected
    }));
  }, [appsMetadata, user?.integrations]);

  const handleToggle = (app) => {
    if (app.connected) {
      setAlertConfig({
        type: 'confirm',
        title: `Disconnect ${app.name}?`,
        message: `This will stop all integrations with ${app.name}. Are you sure?`,
        buttons: [
          { text: 'Cancel', style: 'cancel', onPress: () => setAlertVisible(false) },
          { 
            text: 'Disconnect', 
            style: 'destructive', 
            onPress: () => {
              setAlertVisible(false);
              toggleConnection(app, false);
            } 
          }
        ]
      });
      setAlertVisible(true);
    } else {
      toggleConnection(app, true);
    }
  };

  const toggleConnection = async (app, status) => {
    setLoadingId(app.id);
    try {
      const currentIntegrations = user?.integrations || {};
      const existingConfig = currentIntegrations[app.id] || {};
      
      await updateUser({
        integrations: {
          ...currentIntegrations,
          [app.id]: {
            ...existingConfig,
            connected: status
          }
        }
      });
      
      showToast.success(
        status ? 'Connected' : 'Disconnected', 
        status ? `Successfully linked ${app.name}.` : `${app.name} has been disconnected.`
      );
    } catch (err) {
      showToast.error("Action Failed", err.message || "Could not update connection status.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleConfigure = (app) => {
    setSelectedApp(app);
    const savedConfig = user?.integrations?.[app.id] || {};
    setConfigSettings({
      sync: savedConfig.sync ?? true,
      notifications: savedConfig.notifications ?? true,
      apiKey: savedConfig.apiKey || `${app.id.toUpperCase()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`
    });
    setConfigModalVisible(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedApp) return;
    setIsSaving(true);
    try {
      const currentIntegrations = user?.integrations || {};
      await updateUser({
        integrations: {
          ...currentIntegrations,
          [selectedApp.id]: {
            ...configSettings,
            connected: true
          }
        }
      });
      showToast.success("Settings Saved", `Configuration for ${selectedApp?.name} updated.`);
      setConfigModalVisible(false);
      setSelectedApp(null);
    } catch (err) {
      showToast.error("Save Failed", err.message || "Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <LinearGradient
        colors={isDarkTheme ? ["#1A1F3A", "#0A0E27"] : ["#FFFFFF", "#F8FAFC"]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerDecoration}>
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </View>

        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backButton, { backgroundColor: alpha(Colors.primary, 0.12) }]}
          >
            <ChevronLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: Colors.text }]}>Apps & Cloud</Text>
            <Text style={[styles.headerSubtitle, { color: Colors.textSecondary }]}>Manage External Integrations</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>Available Extensions</Text>
          <View style={[styles.badge, { backgroundColor: alpha(Colors.primary, 0.1) }]}>
            <Text style={[styles.badgeText, { color: Colors.primary }]}>{apps.length}</Text>
          </View>
        </View>
        
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <TouchableOpacity 
              key={app.id} 
              activeOpacity={0.9}
              onPress={() => app.connected && handleConfigure(app)}
              style={[
                styles.appCard, 
                { backgroundColor: Colors.surface, borderColor: Colors.border },
                app.connected && { borderColor: alpha(app.color, 0.3) }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: alpha(app.color, 0.12) }]}>
                  <Icon size={28} color={app.color} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.appName, { color: Colors.text }]}>{app.name}</Text>
                  <Text style={[styles.appDesc, { color: Colors.textSecondary }]}>{app.description}</Text>
                </View>
                <View style={styles.actionContainer}>
                  {loadingId === app.id ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Switch
                      value={app.connected}
                      onValueChange={() => handleToggle(app)}
                      trackColor={{ false: Colors.surfaceLight, true: alpha(Colors.primary, 0.4) }}
                      thumbColor={app.connected ? Colors.primary : '#f4f3f4'}
                    />
                  )}
                </View>
              </View>
              
              {app.connected && (
                <View style={[styles.statusFooter, { borderTopColor: Colors.border, backgroundColor: alpha(app.color, 0.04) }]}>
                  <View style={styles.statusBadge}>
                    <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
                    <Text style={[styles.statusText, { color: Colors.success }]}>Connected & Active</Text>
                  </View>
                  <View style={styles.configLinkContainer}>
                    <Text style={[styles.settingsLink, { color: Colors.primary }]}>Configure</Text>
                    <ArrowRight size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={[styles.infoBox, { backgroundColor: alpha(Colors.primary, 0.05), borderColor: alpha(Colors.primary, 0.1) }]}>
          <ShieldCheck size={20} color={Colors.primary} />
          <Text style={[styles.infoText, { color: Colors.textSecondary }]}>
            All integrations use industry-standard OAuth2 protocols for secure data exchange.
          </Text>
        </View>
      </ScrollView>

      {/* Configuration Modal - Fixed and Styled */}
      <Modal
        visible={configModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfigModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <View style={styles.modalIndictor} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIconTitle}>
                {selectedApp && (
                  <View style={[styles.modalAppIcon, { backgroundColor: alpha(selectedApp.color, 0.1) }]}>
                    <selectedApp.icon size={20} color={selectedApp.color} />
                  </View>
                )}
                <Text style={[styles.modalTitle, { color: Colors.text }]}>
                  {selectedApp?.name} Settings
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setConfigModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: Colors.surfaceLight }]}
              >
                <X size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false} style={styles.modalBody}>
              <View style={[styles.configSection, { backgroundColor: alpha(Colors.primary, 0.04) }]}>
                <Text style={[styles.configLabel, { color: Colors.textSecondary }]}>Integration API Key</Text>
                <TouchableOpacity 
                  style={[styles.apiKeyContainer, { borderColor: Colors.border, backgroundColor: Colors.surface }]}
                  onPress={async () => {
                    await Clipboard.setStringAsync(configSettings.apiKey);
                    showToast.success("Copied", "API Key copied to clipboard");
                  }}
                >
                  <Text style={[styles.apiKeyText, { color: Colors.text }]}>{configSettings.apiKey}</Text>
                  <Copy size={18} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.helperText, { color: Colors.textSecondary }]}>
                  Use this key to authorize third-party requests.
                </Text>
              </View>

              <View style={styles.settingsGroup}>
                <View style={styles.settingRow}>
                  <View>
                    <Text style={[styles.settingLabel, { color: Colors.text }]}>Auto-Sync</Text>
                    <Text style={[styles.settingDesc, { color: Colors.textSecondary }]}>Periodically sync device states</Text>
                  </View>
                  <Switch
                    value={configSettings.sync}
                    onValueChange={(v) => setConfigSettings(prev => ({ ...prev, sync: v }))}
                    trackColor={{ false: Colors.surfaceLight, true: alpha(Colors.primary, 0.4) }}
                    thumbColor={configSettings.sync ? Colors.primary : '#f4f3f4'}
                  />
                </View>

                <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                  <View>
                    <Text style={[styles.settingLabel, { color: Colors.text }]}>Push Notifications</Text>
                    <Text style={[styles.settingDesc, { color: Colors.textSecondary }]}>Receive alerts from this app</Text>
                  </View>
                  <Switch
                    value={configSettings.notifications}
                    onValueChange={(v) => setConfigSettings(prev => ({ ...prev, notifications: v }))}
                    trackColor={{ false: Colors.surfaceLight, true: alpha(Colors.primary, 0.4) }}
                    thumbColor={configSettings.notifications ? Colors.primary : '#f4f3f4'}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: Colors.border }]} 
                onPress={() => setConfigModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: Colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: Colors.primary }]} 
                onPress={handleSaveConfig}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Save size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
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
    paddingHorizontal: 20, 
    paddingBottom: 24, 
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    zIndex: 10 
  },
  headerDecoration: {
    ...StyleSheet.absoluteFillObject,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
  },
  decorCircle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -30,
  },
  decorCircle2: {
    width: 120,
    height: 120,
    bottom: -20,
    left: -20,
  },
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16,
    zIndex: 1,
  },
  backButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    letterSpacing: -0.5 
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
  },
  content: { padding: 20, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    marginLeft: 4,
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '800', 
    textTransform: 'uppercase', 
    letterSpacing: 1.2 
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  appCard: { 
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
    padding: 20, 
    alignItems: 'center', 
    gap: 16 
  },
  iconContainer: { 
    width: 60, 
    height: 60, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  textContainer: { flex: 1 },
  appName: { 
    fontSize: 18, 
    fontWeight: '800', 
    marginBottom: 4,
    letterSpacing: -0.3
  },
  appDesc: { 
    fontSize: 13, 
    lineHeight: 19,
    fontWeight: '500',
  },
  actionContainer: { 
    justifyContent: 'center', 
    paddingLeft: 8 
  },
  statusFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    borderTopWidth: 1.5,
  },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  statusDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4 
  },
  statusText: { 
    fontSize: 13, 
    fontWeight: '800',
    letterSpacing: 0.3
  },
  configLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  settingsLink: { 
    fontSize: 13, 
    fontWeight: '800' 
  },
  infoBox: {
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  modalContainer: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0,0,0,0.6)' 
  },
  modalContent: { 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    paddingTop: 12,
    maxHeight: '85%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  modalIndictor: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 28 
  },
  modalHeaderIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalAppIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '900',
    letterSpacing: -0.5
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: { marginBottom: 24 },
  configSection: { 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 24 
  },
  configLabel: { 
    fontSize: 12, 
    fontWeight: '800', 
    textTransform: 'uppercase', 
    marginBottom: 12,
    letterSpacing: 1,
  },
  apiKeyContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    marginBottom: 10 
  },
  apiKeyText: { 
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', 
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: { 
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic'
  },
  settingsGroup: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  settingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 18, 
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, 
    borderBottomColor: 'rgba(0,0,0,0.1)' 
  },
  settingLabel: { 
    fontSize: 16, 
    fontWeight: '800', 
    marginBottom: 4,
    letterSpacing: -0.2
  },
  settingDesc: { 
    fontSize: 13,
    fontWeight: '500',
  },
  modalFooter: { 
    flexDirection: 'row', 
    gap: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  cancelButton: { 
    flex: 1, 
    padding: 18, 
    borderRadius: 18, 
    borderWidth: 1.5, 
    alignItems: 'center' 
  },
  cancelButtonText: { 
    fontWeight: '800', 
    fontSize: 16 
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
    fontSize: 16 
  },
});