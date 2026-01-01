import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Animated,
  StatusBar
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import {
  User,
  Mail,
  Edit,
  Save,
  X,
  Shield,
  Trash2,
  Calendar,
  Cpu,
  Wifi,
  LayoutDashboard,
  Hash,
  CheckCircle,
  ChevronRight,
  LogOut
} from 'lucide-react-native';

import CustomAlert from '../components/CustomAlert';
import StatCard from '../components/profile/StatCard';
import ProfileInfoRow from '../components/profile/ProfileInfoRow';
import api from '../services/api';

// Utility for hex opacity
const alpha = (hex, opacity) => {
  const o = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + o;
};

// Helper to ensure dates are treated as UTC if missing timezone info
const parseDate = (date) => {
  if (!date) return null;
  if (typeof date === 'string' && !date.endsWith('Z') && !date.includes('+')) {
    return new Date(date + 'Z');
  }
  return new Date(date);
};

// Logic for real-time device status calculation
const getDeviceStatus = (device) => {
  if (!device) return "offline";
  
  if (device.last_active) {
    const lastActive = parseDate(device.last_active);
    const now = new Date();
    const secondsSinceActive = (now - lastActive) / 1000;
    
    if (secondsSinceActive <= 60) {
      return "online";
    } else if (device.status === "online") {
      return "offline"; 
    }
  }
  return device.status || "offline";
};

export default function ProfileScreen({ navigation }) {
  const {
    user,
    username,
    email,
    devices,
    isDarkTheme,
    updateUser,
    deleteAccount,
    logout
  } = useContext(AuthContext);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState(username || "");
  const [editedEmail, setEditedEmail] = useState(email || "");
  const [editedFullName, setEditedFullName] = useState(user?.full_name || "");
  
  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [dashboardCount, setDashboardCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  // Theme Constants
  const Colors = {
    background: isDarkTheme ? "#0A0E27" : "#F1F5F9",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#252B4A" : "#E2E8F0",
    border: isDarkTheme ? "#252B4A" : "#E2E8F0",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    success: isDarkTheme ? "#00FF88" : "#16A34A",
    warning: isDarkTheme ? "#FFB800" : "#F59E0B",
    danger: isDarkTheme ? "#FF3366" : "#DC2626",
    white: "#FFFFFF",
    text: isDarkTheme ? "#FFFFFF" : "#1E293B",
    textSecondary: isDarkTheme ? "#8B91A7" : "#64748B",
    gradientStart: isDarkTheme ? "#00D9FF" : "#3B82F6",
    gradientEnd: isDarkTheme ? "#0066FF" : "#2563EB",
  };

  // Sticky Header Animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [100, 160],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Sync state with Context
  useEffect(() => {
    if (!isEditing) {
      setEditedUsername(username || "");
      setEditedEmail(email || "");
      setEditedFullName(user?.full_name || "");
      setHasChanges(false);
    }
  }, [username, email, user?.full_name, isEditing]);

  // Load Dashboards
  const loadDashboards = async (showLoading = true) => {
    try {
      if (showLoading) setLoadingStats(true);
      const dashboards = await api.getDashboards();
      setDashboardCount(dashboards?.length || 0);
    } catch (err) {
      console.log("Dashboard load error:", err);
    } finally {
      if (showLoading) setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadDashboards();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboards(false);
    setRefreshing(false);
  };

  // Track if any field changed
  useEffect(() => {
    setHasChanges(
      editedUsername !== username || 
      editedEmail !== email || 
      editedFullName !== (user?.full_name || "")
    );
  }, [editedUsername, editedEmail, editedFullName, username, email, user?.full_name]);

  const isEmailValid = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSave = async () => {
    if (isSaving || !hasChanges) return;

    if (!editedUsername.trim()) {
      showAlert("warning", "Invalid Input", "Username cannot be empty.");
      return;
    }
    if (!isEmailValid(editedEmail)) {
      showAlert("warning", "Invalid Input", "Please enter a valid email address.");
      return;
    }

    setIsSaving(true);
    try {
      const updates = {};
      if (editedUsername !== username) updates.username = editedUsername;
      if (editedEmail !== email) updates.email = editedEmail;
      if (editedFullName !== (user?.full_name || "")) updates.full_name = editedFullName;

      if (Object.keys(updates).length > 0) {
        await updateUser(updates);
      }
      
      setIsEditing(false);
      showAlert("success", "Profile Updated", "Your changes have been saved successfully.");
    } catch (err) {
      showAlert("error", "Update Failed", err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const showAlert = (type, title, message) => {
    setAlertConfig({
      type,
      title,
      message,
      buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }]
    });
    setAlertVisible(true);
  };

  const handleCancel = () => {
    setEditedUsername(username || "");
    setEditedEmail(email || "");
    setEditedFullName(user?.full_name || "");
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleLogout = () => {
    setAlertConfig({
      type: "confirm",
      title: "Logout",
      message: "Are you sure you want to sign out?",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        { text: "Logout", style: "destructive", onPress: async () => { setAlertVisible(false); logout(); } }
      ]
    });
    setAlertVisible(true);
  };

  const handleDeleteAccount = () => {
    setAlertConfig({
      type: "confirm",
      title: "Delete Account",
      message: "Are you sure? All your devices and data will be permanently deleted. This cannot be undone.",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setAlertVisible(false);
            await deleteAccount();
          }
        }
      ]
    });
    setAlertVisible(true);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: Colors.background }]}
    >
      <StatusBar barStyle="light-content" />

      {/* Sticky Header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.stickyHeaderContent}>
          <Text style={styles.stickyHeaderName} numberOfLines={1}>
            {user?.full_name || username || "Profile"}
          </Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Profile Hero Header */}
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={[styles.avatarContainer, { borderColor: 'rgba(255,255,255,0.2)' }]}>
              <View style={[styles.avatar, { backgroundColor: Colors.surface }]}>
                <User size={40} color={Colors.primary} />
              </View>
              {isEditing && (
                <View style={[styles.editBadge, { backgroundColor: Colors.warning }]}>
                  <Edit size={12} color="#FFF" />
                </View>
              )}
            </View>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName}>
                {isEditing ? (editedFullName || "New Profile") : (user?.full_name || username || "User")}
              </Text>
              <Text style={styles.headerUsername}>
                {username ? `@${username}` : "Administrator"}
              </Text>
              <View style={styles.roleChip}>
                <Shield size={12} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.roleText}>Admin Access</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Grid - Fixed and Static */}
        <View style={styles.statsGridModern}>
          <StatCard
            style={styles.statCardModern}
            icon={<Calendar size={20} color={Colors.primary} />}
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}
            label="Member Since"
            colors={[Colors.surface, Colors.surface]}
            isDarkTheme={isDarkTheme}
          />

          <StatCard
            style={styles.statCardModern}
            icon={<Cpu size={20} color={Colors.success} />}
            value={devices?.length || 0}
            label="Devices"
            colors={[Colors.surface, Colors.surface]}
            isDarkTheme={isDarkTheme}
          />

          <StatCard
            style={styles.statCardModern}
            icon={<Wifi size={20} color={Colors.warning} />}
            value={devices?.filter(d => getDeviceStatus(d) === "online").length || 0}
            label="Online Now"
            colors={[Colors.surface, Colors.surface]}
            isDarkTheme={isDarkTheme}
          />

          <StatCard
            style={styles.statCardModern}
            icon={<LayoutDashboard size={20} color={Colors.danger} />}
            value={dashboardCount}
            loading={loadingStats}
            label="Dashboards"
            colors={[Colors.surface, Colors.surface]}
            isDarkTheme={isDarkTheme}
          />
        </View>

        {/* Information Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeaderText, { color: Colors.textSecondary }]}>Account Information</Text>
          {!isEditing && (
            <TouchableOpacity style={styles.inlineEditBtn} onPress={() => setIsEditing(true)}>
              <Edit size={16} color={Colors.primary} />
              <Text style={[styles.inlineEditText, { color: Colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: Colors.surface }]}>
          <ProfileInfoRow
            icon={<User size={20} color={Colors.primary} />}
            label="Full Name"
            value={editedFullName}
            Colors={Colors}
            isEditing={isEditing}
            onChangeText={setEditedFullName}
            placeholder="Full name"
          />

          <ProfileInfoRow
            icon={<User size={20} color={Colors.primary} />}
            label="Username"
            value={editedUsername}
            Colors={Colors}
            isEditing={isEditing}
            onChangeText={setEditedUsername}
            placeholder="Username"
          />

          <ProfileInfoRow
            icon={<Mail size={20} color={Colors.primary} />}
            label="Email Address"
            value={editedEmail}
            Colors={Colors}
            isEditing={isEditing}
            onChangeText={setEditedEmail}
            keyboardType="email-address"
            placeholder="Email"
          />

          {!isEditing && (
            <>
              <ProfileInfoRow
                icon={<Hash size={20} color={Colors.textSecondary} />}
                label="User ID"
                value={user?.id || '...'}
                Colors={Colors}
                isEditing={false}
              />
              <ProfileInfoRow
                icon={<CheckCircle size={20} color={Colors.success} />}
                label="Status"
                value="Verified Account"
                Colors={Colors}
                isEditing={false}
              />
            </>
          )}

          {isEditing && (
            <View style={styles.inlineActionsRow}>
              <TouchableOpacity style={[styles.inlineActionButton, { backgroundColor: Colors.surfaceLight }]} onPress={handleCancel}>
                <X size={16} color={Colors.text} />
                <Text style={[styles.inlineActionText, { color: Colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.inlineActionButton, { backgroundColor: Colors.primary }, (!hasChanges || isSaving) && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <>
                    <Save size={16} color="#FFF" />
                    <Text style={styles.inlineActionText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Settings & Security */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>Security & Settings</Text>
          <View style={[styles.card, { backgroundColor: Colors.surface }]}>
            <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('ForgotPassword')}>
              <View style={[styles.menuIcon, { backgroundColor: alpha(Colors.primary, 0.1) }]}>
                <Shield size={20} color={Colors.primary} />
              </View>
              <Text style={[styles.menuText, { color: Colors.text }]}>Change Password</Text>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={handleLogout}>
              <View style={[styles.menuIcon, { backgroundColor: alpha(Colors.warning, 0.1) }]}>
                <LogOut size={20} color={Colors.warning} />
              </View>
              <Text style={[styles.menuText, { color: Colors.text }]}>Sign Out</Text>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { marginBottom: 60 }]}>
          <Text style={[styles.sectionTitle, { color: Colors.danger }]}>Danger Zone</Text>
          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: alpha(Colors.danger, 0.3), borderWidth: 1 }]}>
            <TouchableOpacity style={styles.menuRow} onPress={handleDeleteAccount}>
              <View style={[styles.menuIcon, { backgroundColor: alpha(Colors.danger, 0.1) }]}>
                <Trash2 size={20} color={Colors.danger} />
              </View>
              <Text style={[styles.menuText, { color: Colors.danger }]}>Delete Account Permanently</Text>
            </TouchableOpacity>
          </View>
        </View>

        <CustomAlert visible={alertVisible} isDarkTheme={isDarkTheme} {...alertConfig} />
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  
  // Header Styles
  stickyHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: Platform.OS === 'ios' ? 90 : 70,
    justifyContent: 'flex-end',
    paddingBottom: 15,
    zIndex: 100,
  },
  stickyHeaderContent: { alignItems: 'center' },
  stickyHeaderName: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 70,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatarContainer: {
    position: 'relative',
    borderWidth: 2,
    borderRadius: 50,
    padding: 2,
    marginRight: 16,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  editBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 28, height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center'
  },
  headerTextContainer: { 
    flex: 1,
    alignItems: 'flex-start',
  },
  headerName: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  headerUsername: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  // Stats Grid
  statsGridModern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -50,
  },
  statCardModern: {
    width: '48%',
    marginBottom: 15,
  },

  // Section Styles
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginTop: 25,
    marginBottom: 10,
  },
  sectionHeaderText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  inlineEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  inlineEditText: { fontSize: 14, fontWeight: '600' },
  
  section: { paddingHorizontal: 20, marginTop: 30 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 5 },

  // Card Styles
  card: {
    marginHorizontal: 20,
    borderRadius: 24,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
  },
  
  // Menu Row Styles
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  menuText: { flex: 1, fontSize: 16, fontWeight: '600' },

  // Action Buttons
  inlineActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inlineActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 15,
    gap: 8,
  },
  inlineActionText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  buttonDisabled: { opacity: 0.5 },
});