import React, { useContext, useState } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../context/AuthContext";
import {
  User,
  Moon,
  Sun,
  Shield,
  Smartphone,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
  Bell,
  Wifi,
  Database, // For Data Export
  Trash2,   // For Clear Cache
  Palette,  // For Appearance
} from "lucide-react-native";
import CustomAlert from "../components/CustomAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MenuItem from "../components/settings/MenuItem";
import { showToast } from "../components/Toast";

export default function SettingsScreen() {
  const {
    logout,
    username,
    email,
    isDarkTheme,
    showAlert,
    toggleTheme,
  } = useContext(AuthContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  const Colors = {
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
  };

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

  const openLink = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else {
      setAlertConfig({
        type: 'error',
        title: "Error",
        message: "Cannot open the link right now.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
    }
  };

  const handleComingSoon = (title) => {
    showToast.info("Coming Soon", `${title} feature is under development.`);
  };

  const handleProfilePress = () => {
    navigation.navigate("Profile");
  };

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
        colors={isDarkTheme ? [Colors.background, Colors.surface] : ["#FFFFFF", "#F1F5F9"]}
        style={[styles.header, { paddingTop: insets.top + 20 }]} // Adjust padding for safe area
      >
        <View style={styles.profileHeader}>
          {/* Profile Info (Left Side) */}
          <View style={styles.profileInfoContainer}>
            <View style={[styles.avatar, { backgroundColor: Colors.primary + '30' }]}>
              <User size={32} color={Colors.primary} />
            </View>
            <View>
              <Text style={[styles.profileName, { color: Colors.text }]}>
                {username || 'User'}
              </Text>
              <Text style={[styles.profileEmail, { color: Colors.textSecondary }]}>
                {email || 'user@example.com'}
              </Text>
            </View>
          </View>
          {/* Logout Button (Right Side) */}
          <TouchableOpacity style={styles.headerLogoutButton} onPress={handleLogout}>
            <LogOut size={24} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <SettingsSection title="Account">
          <MenuItem
            icon={{ component: <User size={20} color={Colors.primary} />, bgColor: Colors.primary + "20" }}
            title="Profile"
            subtitle={username || "Edit your personal information"}
            onPress={handleProfilePress}
            rightComponent={{ type: 'chevron' }}
            Colors={Colors}
          />
          <MenuItem
            icon={{ component: <Shield size={20} color={Colors.success} />, bgColor: Colors.success + "20" }}
            title="Security"
            subtitle="Change your password"
            onPress={() => navigation.navigate('ForgotPassword')}
            rightComponent={{ type: 'chevron' }}
            Colors={Colors}
          />
        </SettingsSection>

        {/* General Section */}
        <SettingsSection title="General">
          <MenuItem
            icon={{ component: <Smartphone size={20} color={Colors.secondary} />, bgColor: Colors.secondary + "20" }}
            title="Manage Devices"
            subtitle="View and organize your devices"
            onPress={() => navigation.navigate("Devices")}
            rightComponent={{ type: 'chevron' }}
            Colors={Colors}
          />
          <MenuItem
            icon={{ component: <Bell size={20} color={Colors.danger} />, bgColor: Colors.danger + "20" }}
            title="Notifications"
            subtitle="View alerts and system messages"
            onPress={() => navigation.navigate("Notifications")}
            rightComponent={{ type: 'chevron' }}
            Colors={Colors}
          />
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title="Preferences">
          <MenuItem
            icon={{ component: <Palette size={20} color={Colors.warning} />, bgColor: Colors.warning + "20" }}
            title="Appearance"
            subtitle={isDarkTheme ? "Dark Mode" : "Light Mode"}
            rightComponent={{ type: 'switch', value: isDarkTheme, onValueChange: toggleTheme, trackColor: Colors.primary }}
            Colors={Colors}
          />
        </SettingsSection>

        {/* Data & Privacy */}
        <SettingsSection title="Data & Privacy">
          <MenuItem
            icon={{ component: <Database size={20} color={Colors.primary} />, bgColor: Colors.primary + "20" }}
            title="Data Export"
            subtitle="Download sensor data logs"
            onPress={() => handleComingSoon("Data Export")}
            rightComponent={{ type: 'chevron' }}
            Colors={Colors}
          />
          <MenuItem
            icon={{ component: <Trash2 size={20} color={Colors.danger} />, bgColor: Colors.danger + "20" }}
            title="Clear Cache"
            subtitle="Clear temporary app data"
            onPress={() => handleComingSoon("Clear Cache")}
            Colors={Colors}
          />
        </SettingsSection>

        {/* Support */}
        <SettingsSection title="Support">
          <MenuItem
            icon={{ component: <HelpCircle size={20} color={Colors.primary} />, bgColor: Colors.primary + "20" }}
            title="Help Center"
            subtitle="FAQs and support articles"
            onPress={() => openLink("https://thingsnxt.vercel.app/support")}
            rightComponent={{ type: 'chevron' }}
            Colors={Colors}
          />
          <MenuItem
            icon={{ component: <Info size={20} color={Colors.success} />, bgColor: Colors.success + "20" }}
            title="About"
            subtitle="App version and information"
            onPress={() => openLink("https://thingsnxt.vercel.app/")}
            rightComponent={{ type: 'chevron' }}
            Colors={Colors}
          />
        </SettingsSection>

        <Text style={[styles.version, { color: Colors.textMuted }]}>Version 1.0.0</Text>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    // paddingTop will be set dynamically using insets.top
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Distribute space between profile info and logout button
    alignItems: 'center',
  },
  profileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  headerLogoutButton: {
    padding: 8, // Add some padding for easier tapping
    // No specific background, let it be transparent
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
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
});
