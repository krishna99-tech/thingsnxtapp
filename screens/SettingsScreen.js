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
  Dimensions,
  StatusBar,
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
  Database,
  Trash2,
  Palette,
  Check,
  Globe,
  Lock,
  Download,
  Cpu,
  LayoutDashboard,
  Settings,
  FileText,
  Link,
  Sun,
  Moon,
  X,
  Webhook,
  Mail,
  BellRing,
  Activity,
  Zap,
} from "lucide-react-native";
import CustomAlert from "../components/CustomAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MenuItem from "../components/settings/MenuItem";
import { showToast } from "../components/Toast";
import api from "../services/api";
import { getThemeColors, alpha } from "../utils/theme";

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const {
    logout,
    username,
    email,
    user,
    devices,
    isDarkTheme,
    themePreference,
    setThemePreference,
    updateUser,
  } = useContext(AuthContext);
  
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // State Management
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

  // Enhanced Theme Constants
  const Colors = useMemo(() => getThemeColors(isDarkTheme), [isDarkTheme]);

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

  // Event Handlers
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
          onPress: () => { 
            setAlertVisible(false); 
            showToast.success("Cache Cleared", "Temporary data has been removed."); 
          }
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
    const modeLabel = mode === 'system' ? 'System Default' : mode === 'dark' ? 'Dark Mode' : 'Light Mode';
    showToast.success("Theme Updated", `Switched to ${modeLabel}`);
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

  // Quick Stats Component
  const QuickStatCard = ({ icon, value, label, color, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIconContainer, { backgroundColor: alpha(color, 0.12) }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color: Colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );

  // Menu Structure
  const menuSections = useMemo(() => [
    {
      title: "Account",
      icon: User,
      items: [
        {
          icon: { component: <User size={20} color={Colors.primary} />, bgColor: alpha(Colors.primary, 0.12) },
          title: "Profile",
          subtitle: user?.full_name || username || "Edit your personal information",
          onPress: handleProfilePress,
          rightComponent: { type: 'chevron' },
        },
        {
          icon: { component: <Shield size={20} color={Colors.success} />, bgColor: alpha(Colors.success, 0.12) },
          title: "Security",
          subtitle: "Manage password and security settings",
          onPress: () => navigation.navigate('ForgotPassword'),
          rightComponent: { type: 'chevron' },
        },
      ],
    },
    {
      title: "Management",
      icon: Settings,
      items: [
        {
          icon: { component: <Smartphone size={20} color={Colors.secondary} />, bgColor: alpha(Colors.secondary, 0.12) },
          title: "Devices",
          subtitle: `${devices?.length || 0} device${devices?.length !== 1 ? 's' : ''} connected`,
          onPress: () => navigation.navigate("Devices"),
          rightComponent: { type: 'chevron' },
        },
        {
          icon: { component: <LayoutDashboard size={20} color={Colors.warning} />, bgColor: alpha(Colors.warning, 0.12) },
          title: "Dashboards",
          subtitle: `${dashboardCount} dashboard${dashboardCount !== 1 ? 's' : ''} available`,
          onPress: handleDashboardsPress,
          rightComponent: { type: 'chevron' },
        },
        {
          icon: { component: <Bell size={20} color={Colors.danger} />, bgColor: alpha(Colors.danger, 0.12) },
          title: "Notifications",
          subtitle: "View alerts and system messages",
          onPress: () => navigation.navigate("Notifications"),
          rightComponent: { type: 'chevron' },
        },
      ],
    },
    {
      title: "Preferences",
      icon: Palette,
      items: [
        {
          icon: { component: <Palette size={20} color={Colors.info} />, bgColor: alpha(Colors.info, 0.12) },
          title: "Appearance",
          subtitle: themePreference === 'system' ? "System Default" : (isDarkTheme ? "Dark Mode" : "Light Mode"),
          onPress: () => setThemeModalVisible(true),
          rightComponent: { type: 'chevron' },
        },
        {
          icon: { component: <Globe size={20} color={Colors.primary} />, bgColor: alpha(Colors.primary, 0.12) },
          title: "Language",
          subtitle: selectedLanguage === 'en' ? "English" : selectedLanguage === 'es' ? "Spanish" : "French",
          onPress: () => setLanguageModalVisible(true),
          rightComponent: { type: 'chevron' },
        },
        {
          icon: { component: <BellRing size={20} color={Colors.warning} />, bgColor: alpha(Colors.warning, 0.12) },
          title: "Notification Settings",
          subtitle: notificationsEnabled ? "Enabled" : "Disabled",
          onPress: () => setNotificationsModalVisible(true),
          rightComponent: { type: 'chevron' },
        },
      ],
    },
    {
      title: "Privacy & Security",
      icon: Lock,
      items: [
        {
          icon: { component: <Lock size={20} color={Colors.success} />, bgColor: alpha(Colors.success, 0.12) },
          title: "Privacy Settings",
          subtitle: "Control data sharing and analytics",
          onPress: () => setPrivacyModalVisible(true),
          rightComponent: { type: 'chevron' },
        },
      ],
    },
    {
      title: "Integrations",
      icon: Zap,
      items: [
        {
          icon: { component: <Link size={20} color={Colors.secondary} />, bgColor: alpha(Colors.secondary, 0.12) },
          title: "Connected Apps",
          subtitle: "Manage third-party services",
          onPress: () => navigation.navigate("ConnectedApps"),
          rightComponent: { type: 'chevron' },
        },
        {
          icon: { component: <Webhook size={20} color={Colors.primary} />, bgColor: alpha(Colors.primary, 0.12) },
          title: "Webhooks",
          subtitle: "Real-time event callbacks",
          onPress: () => navigation.navigate("Webhooks"),
          rightComponent: { type: 'chevron' },
        },
      ],
    },
    {
      title: "Data Management",
      icon: Database,
      items: [
        { 
          icon: { component: <Download size={20} color={Colors.info} />, bgColor: alpha(Colors.info, 0.12) }, 
          title: "Export Data", 
          subtitle: "Download sensor data logs", 
          onPress: handleDataExport, 
          rightComponent: { type: 'chevron' } 
        },
        { 
          icon: { component: <Trash2 size={20} color={Colors.danger} />, bgColor: alpha(Colors.danger, 0.12) }, 
          title: "Clear Cache", 
          subtitle: "Remove temporary app data", 
          onPress: handleClearCache,
          rightComponent: { type: 'chevron' }
        },
      ],
    },
    {
      title: "Support & Information",
      icon: HelpCircle,
      items: [
        {
          icon: { component: <HelpCircle size={20} color={Colors.primary} />, bgColor: alpha(Colors.primary, 0.12) },
          title: "Help Center",
          subtitle: "FAQs and support articles",
          onPress: () => openWebView("https://thingsnxt.vercel.app/support", "Help Center"),
          rightComponent: { type: 'chevron' }
        },
        {
          icon: { component: <Info size={20} color={Colors.success} />, bgColor: alpha(Colors.success, 0.12) },
          title: "About",
          subtitle: "App version and information",
          onPress: () => openWebView("https://thingsnxt.vercel.app/", "About ThingsNXT"),
          rightComponent: { type: 'chevron' }
        },
      ],
    },
  ], [Colors, user, username, devices, dashboardCount, themePreference, selectedLanguage, notificationsEnabled, isDarkTheme]);

  const onlineDevices = devices?.filter(d => d.status === "online").length || 0;
  const totalDevices = devices?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <StatusBar 
        barStyle={isDarkTheme ? "light-content" : "dark-content"} 
        backgroundColor="transparent"
        translucent
      />

      {/* Enhanced Header */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative Elements */}
        <View style={styles.headerDecoration}>
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Settings</Text>
              <Text style={styles.headerSubtitle}>Manage your preferences</Text>
            </View>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LogOut size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          {/* Profile Card */}
          <TouchableOpacity 
            onPress={handleProfilePress} 
            activeOpacity={0.8}
            style={styles.profileCard}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
              style={styles.avatarGradient}
            >
              <View style={styles.avatar}>
                <User size={28} color="#FFF" strokeWidth={2.5} />
              </View>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.full_name || username || 'User'}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {email || 'user@example.com'}
              </Text>
            </View>
            <View style={styles.profileChevron}>
              <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
            </View>
          </TouchableOpacity>

          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statsGrid}>
              <View style={styles.miniStatCard}>
                <View style={[styles.miniStatIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Cpu size={18} color="#FFF" strokeWidth={2} />
                </View>
                <View style={styles.miniStatContent}>
                  <Text style={styles.miniStatValue}>{totalDevices}</Text>
                  <Text style={styles.miniStatLabel}>Devices</Text>
                </View>
              </View>

              <View style={styles.miniStatCard}>
                <View style={[styles.miniStatIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Activity size={18} color="#FFF" strokeWidth={2} />
                </View>
                <View style={styles.miniStatContent}>
                  <Text style={styles.miniStatValue}>{onlineDevices}</Text>
                  <Text style={styles.miniStatLabel}>Online</Text>
                </View>
              </View>

              <View style={styles.miniStatCard}>
                <View style={[styles.miniStatIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <LayoutDashboard size={18} color="#FFF" strokeWidth={2} />
                </View>
                <View style={styles.miniStatContent}>
                  <Text style={styles.miniStatValue}>
                    {loadingStats ? "--" : dashboardCount}
                  </Text>
                  <Text style={styles.miniStatLabel}>Dashboards</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Render menu sections dynamically */}
        {menuSections.map((section, index) => (
          <View key={section.title} style={[styles.section, index === 0 && { marginTop: 24 }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: alpha(Colors.primary, 0.1) }]}>
                <section.icon size={14} color={Colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>
                {section.title}
              </Text>
            </View>
            
            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={item.title}>
                  <MenuItem {...item} Colors={Colors} />
                  {itemIndex < section.items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: Colors.borderLight }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* Version Footer */}
        <View style={styles.footer}>
          <Text style={[styles.version, { color: Colors.textMuted }]}>
            ThingsNXT v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: Colors.textMuted }]}>
            © 2024 All rights reserved
          </Text>
        </View>
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setExportModalVisible(false)}
            >
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={[styles.modalIconContainer, { backgroundColor: alpha(Colors.info, 0.12) }]}>
              <Download size={32} color={Colors.info} />
            </View>
            
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Export Sensor Data</Text>
            <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
              Select a time range for the data you want to export
            </Text>

            <View style={styles.rangeContainer}>
              {[
                { key: "7d", label: "Last 7 Days", desc: "Recent activity" },
                { key: "30d", label: "Last 30 Days", desc: "Monthly data" },
                { key: "all", label: "All Time", desc: "Complete history" },
              ].map((range) => (
                <Pressable
                  key={range.key}
                  style={[
                    styles.rangeOption,
                    { backgroundColor: Colors.surfaceLight, borderColor: Colors.border },
                    selectedRange === range.key && { 
                      backgroundColor: alpha(Colors.primary, 0.12), 
                      borderColor: Colors.primary 
                    },
                  ]}
                  onPress={() => setSelectedRange(range.key)}
                >
                  <View style={styles.rangeContent}>
                    <Text style={[
                      styles.rangeText, 
                      { color: Colors.text }, 
                      selectedRange === range.key && { color: Colors.primary, fontWeight: '700' }
                    ]}>
                      {range.label}
                    </Text>
                    <Text style={[styles.rangeDesc, { color: Colors.textSecondary }]}>
                      {range.desc}
                    </Text>
                  </View>
                  {selectedRange === range.key && (
                    <Check size={20} color={Colors.primary} strokeWidth={2.5} />
                  )}
                </Pressable>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalButton, isExporting && { opacity: 0.7 }]}
              onPress={handleExportConfirm}
              disabled={isExporting}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.modalButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isExporting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Download size={18} color="#FFF" />
                    <Text style={styles.modalButtonText}>Export Data</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setThemeModalVisible(false)}
            >
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={[styles.modalIconContainer, { backgroundColor: alpha(Colors.warning, 0.12) }]}>
              <Palette size={32} color={Colors.warning} />
            </View>
            
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Appearance</Text>
            <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
              Choose your preferred theme
            </Text>
            
            <View style={styles.themeGrid}>
              {[
                { id: 'light', label: 'Light', icon: Sun, desc: 'Bright theme' },
                { id: 'dark', label: 'Dark', icon: Moon, desc: 'Dark theme' },
                { id: 'system', label: 'Auto', icon: Smartphone, desc: 'Match system' },
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
                      isActive && { backgroundColor: alpha(Colors.primary, 0.12) }
                    ]}
                    onPress={() => handleThemeSelect(option.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.themeIconContainer, 
                      { backgroundColor: isActive ? alpha(Colors.primary, 0.15) : 'rgba(0,0,0,0.03)' }
                    ]}>
                      <Icon size={28} color={isActive ? Colors.primary : Colors.textSecondary} strokeWidth={2} />
                    </View>
                    <Text style={[
                      styles.themeLabel, 
                      { color: isActive ? Colors.primary : Colors.text }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.themeDesc, { color: Colors.textSecondary }]}>
                      {option.desc}
                    </Text>
                    {isActive && (
                      <View style={[styles.activeBadge, { backgroundColor: Colors.primary }]}>
                        <Check size={12} color="#FFF" strokeWidth={3} />
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setLanguageModalVisible(false)}
            >
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={[styles.modalIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
              <Globe size={32} color={Colors.primary} />
            </View>
            
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Language</Text>
            <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
              Select your preferred language
            </Text>
            
            <View style={styles.languageList}>
              {[
                { id: 'en', label: 'English', flag: '🇺🇸' },
                { id: 'es', label: 'Español', flag: '🇪🇸' },
                { id: 'fr', label: 'Français', flag: '🇫🇷' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.languageOption, 
                    { borderColor: Colors.border, backgroundColor: Colors.surfaceLight },
                    selectedLanguage === option.id && { 
                      borderColor: Colors.primary, 
                      backgroundColor: alpha(Colors.primary, 0.08) 
                    }
                  ]}
                  onPress={() => handleLanguageSelect(option.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageFlag}>{option.flag}</Text>
                  <Text style={[
                    styles.languageText, 
                    { color: Colors.text }, 
                    selectedLanguage === option.id && { color: Colors.primary, fontWeight: '700' }
                  ]}>
                    {option.label}
                  </Text>
                  {selectedLanguage === option.id && (
                    <Check size={20} color={Colors.primary} strokeWidth={2.5} />
                  )}
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setNotificationsModalVisible(false)}
            >
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={[styles.modalIconContainer, { backgroundColor: alpha(Colors.warning, 0.12) }]}>
              <BellRing size={32} color={Colors.warning} />
            </View>
            
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Notifications</Text>
            <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
              Manage how you receive notifications
            </Text>
            
            <View style={styles.settingsContainer}>
              <View style={[styles.settingRow, { borderBottomColor: Colors.borderLight }]}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: alpha(Colors.success, 0.12) }]}>
                    <Bell size={18} color={Colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, { color: Colors.text }]}>
                      Enable Notifications
                    </Text>
                    <Text style={[styles.settingDescription, { color: Colors.textSecondary }]}>
                      Receive push notifications for updates
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: Colors.surfaceLight, true: alpha(Colors.primary, 0.4) }}
                  thumbColor={notificationsEnabled ? Colors.primary : Colors.textSecondary}
                  ios_backgroundColor={Colors.surfaceLight}
                />
              </View>

              <View style={[styles.settingRow, { borderBottomColor: Colors.borderLight }]}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: alpha(Colors.info, 0.12) }]}>
                    <Mail size={18} color={Colors.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, { color: Colors.text }]}>
                      Email Notifications
                    </Text>
                    <Text style={[styles.settingDescription, { color: Colors.textSecondary }]}>
                      Receive notifications via email
                    </Text>
                  </View>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                  disabled={!notificationsEnabled}
                  trackColor={{ false: Colors.surfaceLight, true: alpha(Colors.primary, 0.4) }}
                  thumbColor={emailNotifications ? Colors.primary : Colors.textSecondary}
                  ios_backgroundColor={Colors.surfaceLight}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: alpha(Colors.warning, 0.12) }]}>
                    <Smartphone size={18} color={Colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, { color: Colors.text }]}>
                      Push Notifications
                    </Text>
                    <Text style={[styles.settingDescription, { color: Colors.textSecondary }]}>
                      Receive push notifications on device
                    </Text>
                  </View>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  disabled={!notificationsEnabled}
                  trackColor={{ false: Colors.surfaceLight, true: alpha(Colors.primary, 0.4) }}
                  thumbColor={pushNotifications ? Colors.primary : Colors.textSecondary}
                  ios_backgroundColor={Colors.surfaceLight}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalButton]}
              onPress={handleNotificationsSave}
              disabled={isSavingNotifications}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.modalButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isSavingNotifications ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Save Settings</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setPrivacyModalVisible(false)}
            >
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={[styles.modalIconContainer, { backgroundColor: alpha(Colors.success, 0.12) }]}>
              <Lock size={32} color={Colors.success} />
            </View>
            
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Privacy Settings</Text>
            <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
              Control your data and privacy preferences
            </Text>
            
            <View style={styles.settingsContainer}>
              <View style={[styles.settingRow, { borderBottomColor: Colors.borderLight }]}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: alpha(Colors.info, 0.12) }]}>
                    <Activity size={18} color={Colors.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, { color: Colors.text }]}>
                      Analytics
                    </Text>
                    <Text style={[styles.settingDescription, { color: Colors.textSecondary }]}>
                      Help improve the app with usage data
                    </Text>
                  </View>
                </View>
                <Switch
                  value={analyticsEnabled}
                  onValueChange={setAnalyticsEnabled}
                  trackColor={{ false: Colors.surfaceLight, true: alpha(Colors.primary, 0.4) }}
                  thumbColor={analyticsEnabled ? Colors.primary : Colors.textSecondary}
                  ios_backgroundColor={Colors.surfaceLight}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: alpha(Colors.secondary, 0.12) }]}>
                    <Database size={18} color={Colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, { color: Colors.text }]}>
                      Data Sharing
                    </Text>
                    <Text style={[styles.settingDescription, { color: Colors.textSecondary }]}>
                      Share anonymized data for research
                    </Text>
                  </View>
                </View>
                <Switch
                  value={dataSharing}
                  onValueChange={setDataSharing}
                  trackColor={{ false: Colors.surfaceLight, true: alpha(Colors.primary, 0.4) }}
                  thumbColor={dataSharing ? Colors.primary : Colors.textSecondary}
                  ios_backgroundColor={Colors.surfaceLight}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handlePrivacySave}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.modalButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.modalButtonText}>Save Settings</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  
  // Header Styles
  header: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle1: {
    width: 280,
    height: 280,
    top: -140,
    right: -80,
  },
  decorCircle2: {
    width: 180,
    height: 180,
    bottom: -60,
    left: -40,
  },
  headerContent: {
    gap: 16,
    zIndex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: '#FFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.2,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  
  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    gap: 12,
  },
  avatarGradient: {
    borderRadius: 28,
    padding: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: '#FFF',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  profileEmail: {
    fontSize: 13,
    fontWeight: "500",
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.1,
  },
  profileChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Stats Container
  statsContainer: {
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  miniStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  miniStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStatContent: {
    flex: 1,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: '#FFF',
    letterSpacing: 0.2,
  },
  miniStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Section
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  divider: {
    height: 1,
    marginLeft: 70,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    gap: 4,
  },
  version: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
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
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  
  // Range Options
  rangeContainer: {
    gap: 12,
    marginBottom: 28,
  },
  rangeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  rangeContent: {
    flex: 1,
  },
  rangeText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  rangeDesc: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Modal Button
  modalButton: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: '#FFF',
    letterSpacing: 0.3,
  },

  // Theme Grid
  themeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 2,
    gap: 12,
  },
  themeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  themeDesc: {
    fontSize: 11,
    fontWeight: '500',
  },
  activeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Language List
  languageList: {
    gap: 12,
    marginBottom: 28,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
  },
  languageFlag: {
    fontSize: 28,
  },
  languageText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },

  // Settings Rows
  settingsContainer: {
    gap: 0,
    marginBottom: 28,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Stats Card (if needed separately)
  statCard: {
    flex: 1,
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});