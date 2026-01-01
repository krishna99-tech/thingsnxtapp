import React, { useContext, useState, useMemo } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../context/AuthContext";
import {
  User,
  Shield,
  Smartphone,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
  Bell,
  Database, // For Data Export
  Trash2,   // For Clear Cache
  Palette,  // For Appearance
  Check,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Download,
  Upload,
  Cpu,
  LayoutDashboard,
  Settings,
  Zap,
  FileText,
  Link,
  Sun,
  Moon,
  X,
} from "lucide-react-native";
import CustomAlert from "../components/CustomAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MenuItem from "../components/settings/MenuItem";
import { showToast } from "../components/Toast";
import api from "../services/api";

export default function SettingsScreen() {
  const {
    logout,
    username,
    email,
    user,
    devices,
    isDarkTheme,
    showAlert,
    themePreference,
    setThemePreference,
    updateUser,
  } = useContext(AuthContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const [isExportModalVisible, setExportModalVisible] = useState(false);
  const [isThemeModalVisible, setThemeModalVisible] = useState(false);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [isNotificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [selectedRange, setSelectedRange] = useState("7d");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notification_settings?.enabled ?? true);
  const [emailNotifications, setEmailNotifications] = useState(user?.notification_settings?.email ?? true);
  const [pushNotifications, setPushNotifications] = useState(user?.notification_settings?.push ?? true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [dashboardCount, setDashboardCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Theme Constants
  const Colors = useMemo(() => ({
    background: isDarkTheme ? "#0A0E27" : "#F1F5F9",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#252B4A" : "#E2E8F0",
    border: isDarkTheme ? "#252B4A" : "#E2E8F0",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    secondary: isDarkTheme ? "#7B61FF" : "#6D28D9",
    success: isDarkTheme ? "#00FF88" : "#16A34A",
    warning: isDarkTheme ? "#FFB800" : "#F59E0B",
    danger: isDarkTheme ? "#FF3366" : "#DC2626",
    white: "#FFFFFF",
    text: isDarkTheme ? "#FFFFFF" : "#1E293B",
    textSecondary: isDarkTheme ? "#8B91A7" : "#64748B",
    textMuted: isDarkTheme ? "#8B91A7" : "#64748B",
  }), [isDarkTheme]);

  // Load dashboard count
  React.useEffect(() => {
    const loadDashboards = async () => {
      if (!user) {
        setDashboardCount(0);
        return;
      }
      try {
        setLoadingStats(true);
        const dashboards = await api.getDashboards();
        setDashboardCount(dashboards?.length || 0);
      } catch (err) {
        console.log("Dashboard load error:", err);
      } finally {
        setLoadingStats(false);
      }
    };
    loadDashboards();
  }, [user]);

  // Update local state when user context updates
  React.useEffect(() => {
    setNotificationsEnabled(user?.notification_settings?.enabled ?? true);
    setEmailNotifications(user?.notification_settings?.email ?? true);
    setPushNotifications(user?.notification_settings?.push ?? true);
  }, [user]);

  const handleLogout = () => {
    setAlertConfig({
      type: 'confirm',
      title: "Confirm Logout",
      message: "Are you sure you want to log out?",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        { text: "Logout", style: "destructive", onPress: () => { setAlertVisible(false); logout(); } },
      ],
    });
    setAlertVisible(true);
  };

  const openWebView = (url, title) => {
    navigation.navigate('WebView', { url, title });
  };

  const handleClearCache = () => {
    setAlertConfig({
      type: 'confirm',
      title: "Clear Cache",
      message: "Are you sure you want to clear temporary app data? This action cannot be undone.",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => { setAlertVisible(false); showToast.success("Cache Cleared", "Temporary data has been removed."); }
        },
      ],
    });
    setAlertVisible(true);
  };

  const handleDataExport = () => {
    setExportModalVisible(true);
  };

  const handleExportConfirm = () => {
    setIsExporting(true);
    // Simulate API call
    setTimeout(() => {
      setIsExporting(false);
      setExportModalVisible(false);
      showToast.success(
        "Export Started",
        "Your data export has begun. You will receive an email with the download link shortly."
      );
    }, 2000);
  };


  const handleProfilePress = () => {
    navigation.navigate("Profile");
  };

  const handleDashboardsPress = () => {
    navigation.navigate("Dashboards");
  };

  const handleThemeSelect = (mode) => {
    setThemePreference(mode);
    setThemeModalVisible(false);
    showToast.success("Theme Updated", `Switched to ${mode === 'system' ? 'System Default' : mode === 'dark' ? 'Dark Mode' : 'Light Mode'}`);
  };

  const handleLanguageSelect = (lang) => {
    setSelectedLanguage(lang);
    setLanguageModalVisible(false);
    showToast.success("Language Updated", "App language preference saved");
  };

  const handleNotificationsSave = async () => {
    setIsSavingNotifications(true);
    try {
      await updateUser({
        notification_settings: {
          enabled: notificationsEnabled,
          email: emailNotifications,
          push: pushNotifications
        }
      });
      setNotificationsModalVisible(false);
      showToast.success("Settings Saved", "Notification preferences updated");
    } catch (err) {
      showToast.error("Error", "Failed to save notification settings");
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handlePrivacySave = () => {
    setPrivacyModalVisible(false);
    showToast.success("Settings Saved", "Privacy preferences updated");
  };

  // Quick Stats Cards Component
  const QuickStatCard = ({ icon, value, label, color, onPress }) => (
    <TouchableOpacity
      style={[styles.quickStatCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickStatIcon, { backgroundColor: color + "20" }]}>
        {icon}
      </View>
      <Text style={[styles.quickStatValue, { color: Colors.text }]}>{value}</Text>
      <Text style={[styles.quickStatLabel, { color: Colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );

  // ⭐ Refactored Menu Structure
  const menuSections = useMemo(() => [
    {
      title: "Account",
      items: [
        {
          icon: { component: <User size={20} color={Colors.primary} />, bgColor: Colors.primary + "20" },
          title: "Profile",
          subtitle: user?.full_name || username || "Edit your personal information",
          onPress: handleProfilePress,
          rightComponent: { type: 'chevron' },
        },
        {
          icon: { component: <Shield size={20} color={Colors.success} />, bgColor: Colors.success + "20" },
          title: "Security",
          subtitle: "Change your password",
          onPress: () => navigation.navigate('ForgotPassword'),
          rightComponent: { type: 'chevron' },
        },
      ],
    },
    {
      title: "General",
      items: [
        {
          icon: { component: <Smartphone size={20} color={Colors.secondary} />, bgColor: Colors.secondary + "20" },
          title: "Manage Devices",
          subtitle: `${devices?.length || 0} device${devices?.length !== 1 ? 's' : ''} connected`,
          onPress: () => navigation.navigate("Devices"),
          rightComponent: { type: 'chevron' },
        },
        {
          icon: { component: <LayoutDashboard size={20} color={Colors.warning} />, bgColor: Colors.warning + "20" },
          title: "Manage Dashboards",
          subtitle: `${dashboardCount} dashboard${dashboardCount !== 1 ? 's' : ''} available`,
          onPress: handleDashboardsPress,
          rightComponent: { type: 'chevron' },
        },
        {
          icon: { component: <Bell size={20} color={Colors.danger} />, bgColor: Colors.danger + "20" },
          title: "Notifications",
          subtitle: "View alerts and system messages",
          onPress: () => navigation.navigate("Notifications"),
          rightComponent: { type: 'chevron' },
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: { component: <Palette size={20} color={Colors.warning} />, bgColor: Colors.warning + "20" },
          title: "Appearance",
          subtitle: themePreference === 'system' ? "System Default" : (isDarkTheme ? "Dark Mode" : "Light Mode"),
          onPress: () => setThemeModalVisible(true),
          rightComponent: { type: 'chevron' },
        },
        {
          icon: { component: <Globe size={20} color={Colors.primary} />, bgColor: Colors.primary + "20" },
          title: "Language",
          subtitle: selectedLanguage === 'en' ? "English" : selectedLanguage === 'es' ? "Spanish" : "French",
          onPress: () => setLanguageModalVisible(true),
          rightComponent: { type: 'chevron' },
        },
        {
          icon: { component: <Bell size={20} color={Colors.danger} />, bgColor: Colors.danger + "20" },
          title: "Notification Settings",
          subtitle: notificationsEnabled ? "Enabled" : "Disabled",
          onPress: () => setNotificationsModalVisible(true),
          rightComponent: { type: 'chevron' },
        },
      ],
    },
    {
      title: "Privacy & Security",
      items: [
        {
          icon: { component: <Lock size={20} color={Colors.success} />, bgColor: Colors.success + "20" },
          title: "Privacy Settings",
          subtitle: "Control data sharing and analytics",
          onPress: () => setPrivacyModalVisible(true),
          rightComponent: { type: 'chevron' },
        },
      ],
    },
    {
      title: "Integrations",
      items: [
        {
          icon: { component: <Link size={20} color={Colors.secondary} />, bgColor: Colors.secondary + "20" },
          title: "Connected Apps",
          subtitle: "Manage third-party services",
          onPress: () => navigation.navigate("ConnectedApps"),
          rightComponent: { type: 'chevron' },
        },
      ],
    },
    {
      title: "Data Management",
      items: [
        { 
          icon: { component: <Database size={20} color={Colors.primary} />, bgColor: Colors.primary + "20" }, 
          title: "Data Export", 
          subtitle: "Download sensor data logs", 
          onPress: handleDataExport, 
          rightComponent: { type: 'chevron' } 
        },
        { 
          icon: { component: <Trash2 size={20} color={Colors.danger} />, bgColor: Colors.danger + "20" }, 
          title: "Clear Cache", 
          subtitle: "Clear temporary app data", 
          onPress: handleClearCache 
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: { component: <HelpCircle size={20} color={Colors.primary} />, bgColor: Colors.primary + "20" },
          title: "Help Center",
          subtitle: "FAQs and support articles",
          onPress: () => openWebView("https://thingsnxt.vercel.app/support", "Help Center"),
          rightComponent: { type: 'chevron' }
        },
        {
          icon: { component: <Info size={20} color={Colors.success} />, bgColor: Colors.success + "20" },
          title: "About",
          subtitle: "App version and information",
          onPress: () => openWebView("https://thingsnxt.vercel.app/", "About ThingsNXT"),
          rightComponent: { type: 'chevron' }
        },
      ],
    },
  ], [Colors, user, username, devices, dashboardCount, themePreference, selectedLanguage, notificationsEnabled]);


  // Reusable Section Component
  const SettingsSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <LinearGradient
        colors={isDarkTheme ? [Colors.surface, Colors.background] : ["#FFFFFF", "#F1F5F9"]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={[styles.headerTitle, { color: Colors.text }]}>Settings</Text>
            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: Colors.danger + "15" }]} 
              onPress={handleLogout}
            >
              <LogOut size={20} color={Colors.danger} />
            </TouchableOpacity>
          </View>
          
          {/* Profile Card */}
          <TouchableOpacity 
            onPress={handleProfilePress} 
            activeOpacity={0.8}
            style={[styles.profileCard, { backgroundColor: Colors.surface }]}
          >
            <View style={[styles.avatar, { backgroundColor: Colors.primary + '20' }]}>
              <User size={28} color={Colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: Colors.text }]}>
                {user?.full_name || username || 'User'}
              </Text>
              <Text style={[styles.profileEmail, { color: Colors.textSecondary }]} numberOfLines={1}>
                {email || 'user@example.com'}
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Quick Stats */}
          <View style={styles.quickStatsContainer}>
            <QuickStatCard
              icon={<Cpu size={18} color={Colors.primary} />}
              value={devices?.length || 0}
              label="Devices"
              color={Colors.primary}
              onPress={() => navigation.navigate("Devices")}
            />
            <QuickStatCard
              icon={<LayoutDashboard size={18} color={Colors.warning} />}
              value={loadingStats ? "--" : dashboardCount}
              label="Dashboards"
              color={Colors.warning}
              onPress={handleDashboardsPress}
            />
            <QuickStatCard
              icon={<Bell size={18} color={Colors.danger} />}
              value={devices?.filter(d => d.status === "online").length || 0}
              label="Online"
              color={Colors.success}
              onPress={() => navigation.navigate("Notifications")}
            />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Render menu sections dynamically */}
        {menuSections.map((section) => (
          <SettingsSection key={section.title} title={section.title}>
            {section.items.map((item) => (
              <MenuItem
                key={item.title}
                {...item}
                Colors={Colors}
              />
            ))}
          </SettingsSection>
        ))}

        <Text style={[styles.version, { color: Colors.textMuted }]}>Version 1.0.0</Text>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />

      {/* Data Export Modal */}
      <Modal
        visible={isExportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setExportModalVisible(false)}
            >
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Export Sensor Data</Text>
            <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
              Select a time range for the data you want to export.
            </Text>

            <View style={styles.rangeContainer}>
              {[
                { key: "7d", label: "Last 7 Days" },
                { key: "30d", label: "Last 30 Days" },
                { key: "all", label: "All Time" },
              ].map((range) => (
                <Pressable
                  key={range.key}
                  style={[
                    styles.rangeOption,
                    { backgroundColor: Colors.surfaceLight, borderColor: Colors.border },
                    selectedRange === range.key && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                  ]}
                  onPress={() => setSelectedRange(range.key)}
                >
                  <Text style={[styles.rangeText, { color: Colors.text }, selectedRange === range.key && { color: Colors.white }]}>
                    {range.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.primary }, isExporting && { opacity: 0.7 }]}
                onPress={handleExportConfirm}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={[styles.modalBtnText, { color: Colors.white }]}>Export</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={isThemeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setThemeModalVisible(false)}
            >
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Appearance</Text>
            
            <View style={styles.themeGrid}>
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Smartphone },
              ].map((option) => {
                const Icon = option.icon;
                const isActive = themePreference === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.themeCard,
                      { 
                        backgroundColor: Colors.surfaceLight,
                        borderColor: isActive ? Colors.primary : Colors.border 
                      },
                      isActive && { backgroundColor: Colors.primary + '10' }
                    ]}
                    onPress={() => handleThemeSelect(option.id)}
                  >
                    <View style={[styles.themeIconContainer, isActive && { backgroundColor: Colors.primary + '20' }]}>
                      <Icon size={28} color={isActive ? Colors.primary : Colors.textSecondary} />
                    </View>
                    <Text style={[styles.themeLabel, { color: isActive ? Colors.primary : Colors.text }]}>
                      {option.label}
                    </Text>
                    {isActive && (
                      <View style={[styles.activeBadge, { backgroundColor: Colors.primary }]}>
                        <Check size={10} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={isLanguageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setLanguageModalVisible(false)}
            >
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Language</Text>
            
            <View style={{ gap: 8, marginBottom: 20 }}>
              {[
                { id: 'en', label: 'English' },
                { id: 'es', label: 'Español' },
                { id: 'fr', label: 'Français' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.rangeOption, 
                    { flexDirection: 'row', justifyContent: 'space-between', borderColor: Colors.border, backgroundColor: Colors.surfaceLight },
                    selectedLanguage === option.id && { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' }
                  ]}
                  onPress={() => handleLanguageSelect(option.id)}
                >
                  <Text style={[styles.rangeText, { color: Colors.text }, selectedLanguage === option.id && { color: Colors.primary }]}>
                    {option.label}
                  </Text>
                  {selectedLanguage === option.id && <Check size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications Settings Modal */}
      <Modal
        visible={isNotificationsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setNotificationsModalVisible(false)}
            >
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Notification Settings</Text>
            
            <View style={{ gap: 16, marginBottom: 20 }}>
              <View style={[styles.settingRow, { borderBottomColor: Colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: Colors.text }]}>Enable Notifications</Text>
                  <Text style={[styles.settingDescription, { color: Colors.textSecondary }]}>
                    Receive push notifications for important updates
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.primary + '40' }}
                  thumbColor={notificationsEnabled ? Colors.primary : Colors.textSecondary}
                />
              </View>

              <View style={[styles.settingRow, { borderBottomColor: Colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: Colors.text }]}>Email Notifications</Text>
                  <Text style={[styles.settingDescription, { color: Colors.textSecondary }]}>
                    Receive notifications via email
                  </Text>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                  disabled={!notificationsEnabled}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.primary + '40' }}
                  thumbColor={emailNotifications ? Colors.primary : Colors.textSecondary}
                />
              </View>

              <View style={[styles.settingRow]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: Colors.text }]}>Push Notifications</Text>
                  <Text style={[styles.settingDescription, { color: Colors.textSecondary }]}>
                    Receive push notifications on your device
                  </Text>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  disabled={!notificationsEnabled}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.primary + '40' }}
                  thumbColor={pushNotifications ? Colors.primary : Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.primary }]}
                onPress={handleNotificationsSave}
                disabled={isSavingNotifications}
              >
                {isSavingNotifications ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={[styles.modalBtnText, { color: Colors.white }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Settings Modal */}
      <Modal
        visible={isPrivacyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setPrivacyModalVisible(false)}
            >
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Privacy Settings</Text>
            
            <View style={{ gap: 16, marginBottom: 20 }}>
              <View style={[styles.settingRow, { borderBottomColor: Colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: Colors.text }]}>Analytics</Text>
                  <Text style={[styles.settingDescription, { color: Colors.textSecondary }]}>
                    Help improve the app by sharing usage analytics
                  </Text>
                </View>
                <Switch
                  value={analyticsEnabled}
                  onValueChange={setAnalyticsEnabled}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.primary + '40' }}
                  thumbColor={analyticsEnabled ? Colors.primary : Colors.textSecondary}
                />
              </View>

              <View style={[styles.settingRow]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: Colors.text }]}>Data Sharing</Text>
                  <Text style={[styles.settingDescription, { color: Colors.textSecondary }]}>
                    Allow sharing anonymized data for research
                  </Text>
                </View>
                <Switch
                  value={dataSharing}
                  onValueChange={setDataSharing}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.primary + '40' }}
                  thumbColor={dataSharing ? Colors.primary : Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.primary }]}
                onPress={handlePrivacySave}
              >
                <Text style={[styles.modalBtnText, { color: Colors.white }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  quickStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  version: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  rangeContainer: {
    gap: 12,
    marginBottom: 24,
  },
  rangeOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  rangeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.85,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    marginTop: 8,
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
  },
  themeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 5,
    padding: 4,
  },
});
