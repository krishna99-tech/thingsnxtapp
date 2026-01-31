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
  StatusBar,
  Dimensions
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
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
  ChevronRight,
  LogOut,
  Phone,
  FileText,
  Camera,
  Settings,
  Lock
} from 'lucide-react-native';

import { showToast } from '../components/Toast';
import CustomAlert from '../components/CustomAlert';
import StatCard from '../components/profile/StatCard';
import ProfileInfoRow from '../components/profile/ProfileInfoRow';
import api from '../services/api';
import { getDeviceStatus, parseDate } from '../utils/device';
import { getThemeColors, alpha } from '../utils/theme';

const { width } = Dimensions.get('window');

// Using central device utilities for status calculation

export default function ProfileScreen({ navigation }) {
  const {
    user,
    username,
    email,
    devices,
    isDarkTheme,
    updateUser,
    refreshUser,
    deleteAccount,
    logout
  } = useContext(AuthContext);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState(username || "");
  const [editedEmail, setEditedEmail] = useState(email || "");
  const [editedFullName, setEditedFullName] = useState(user?.full_name || "");
  const [editedPhone, setEditedPhone] = useState(user?.phone || "");
  const [editedBio, setEditedBio] = useState(user?.bio || "");
  
  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [dashboardCount, setDashboardCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  // Theme Constants
  const Colors = getThemeColors(isDarkTheme);

  const roleRole = user?.role || (user?.is_admin ? 'Admin' : 'User');
  
  // Custom Premium Palette for Authorities
  const palette = {
    Admin: isDarkTheme ? "#FACC15" : "#B45309",       // Gold / Deep Amber
    Technician: isDarkTheme ? "#A78BFA" : "#6D28D9",  // Electric Violet
    User: isDarkTheme ? "#38BDF8" : "#0369A1",        // Sky Blue
    Default: isDarkTheme ? "#94A3B8" : "#64748B",     // Slate
  };
  const roleColor = palette[roleRole] || palette.Default;

  // Status Palette for Access Rights
  const statusPalette = {
    Active: isDarkTheme ? "#34D399" : "#059669",      // Emerald
    Suspended: isDarkTheme ? "#F87171" : "#B91C1C",   // Rose
    Pending: isDarkTheme ? "#94A3B8" : "#64748B",     // Slate
  };
  
  const isActive = user?.is_active;
  const accessColor = isActive === true ? statusPalette.Active : (isActive === false ? statusPalette.Suspended : statusPalette.Pending);
  const accessValue = isActive === true ? "Authorized Access" : (isActive === false ? "Identity Suspended" : (user ? "Registry Pending" : "Acquiring Status..."));

  // Enhanced Scroll Animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [80, 140],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: 'clamp',
  });

  // Sync state with Context
  useEffect(() => {
    if (!isEditing) {
      setEditedUsername(username || "");
      setEditedEmail(email || "");
      setEditedFullName(user?.full_name || "");
      setEditedPhone(user?.phone || "");
      setEditedBio(user?.bio || "");
      setHasChanges(false);
      
      if (user?.dashboard_count !== undefined) {
         setDashboardCount(user.dashboard_count);
      }
    }
  }, [username, email, user, isEditing]);

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

  // Refresh User Profile on focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      if (isMounted) {
        refreshUser();
      }
      return () => { isMounted = false; };
    }, [refreshUser])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboards(false),
      refreshUser()
    ]);
    setRefreshing(false);
  };

  // Track if any field changed
  useEffect(() => {
    setHasChanges(
      editedUsername !== username || 
      editedEmail !== email || 
      editedFullName !== (user?.full_name || "") ||
      editedPhone !== (user?.phone || "") ||
      editedBio !== (user?.bio || "")
    );
  }, [editedUsername, editedEmail, editedFullName, editedPhone, editedBio, username, email, user?.full_name, user?.phone, user?.bio]);

  const isEmailValid = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSave = async () => {
    if (isSaving || !hasChanges) return;

    if (!editedUsername.trim()) {
      showToast.warning("Invalid Input", "Username cannot be empty.");
      return;
    }
    if (!isEmailValid(editedEmail)) {
      showToast.warning("Invalid Input", "Please enter a valid email address.");
      return;
    }

    setIsSaving(true);
    try {
      const updates = {};
      if (editedUsername !== username) updates.username = editedUsername;
      if (editedEmail !== email) updates.email = editedEmail;
      if (editedFullName !== (user?.full_name || "")) updates.full_name = editedFullName;
      if (editedPhone !== (user?.phone || "")) updates.phone = editedPhone;
      if (editedBio !== (user?.bio || "")) updates.bio = editedBio;

      if (Object.keys(updates).length > 0) {
        await updateUser(updates);
      }
      
      setIsEditing(false);
      showToast.success("Profile Updated", "Your changes have been saved successfully.");
    } catch (err) {
      showToast.error("Update Failed", err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedUsername(username || "");
    setEditedEmail(email || "");
    setEditedFullName(user?.full_name || "");
    setEditedPhone(user?.phone || "");
    setEditedBio(user?.bio || "");
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

  const onlineDevices = devices?.filter(d => getDeviceStatus(d) === "online").length || 0;
  const totalDevices = devices?.length || 0;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: Colors.background }]}
    >
      <StatusBar 
        barStyle={isDarkTheme ? "light-content" : "dark-content"} 
        backgroundColor="transparent"
        translucent
      />

      {/* Enhanced Sticky Header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd, Colors.gradientAccent]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.stickyHeaderContent}>
          <Text style={styles.stickyHeaderName} numberOfLines={1}>
            {user?.full_name || username || "Profile"}
          </Text>
          <Text style={styles.stickyHeaderRole}>{roleRole}</Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }], 
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressViewOffset={Platform.OS === 'ios' ? 0 : 100}
          />
        }
      >
        {/* Enhanced Profile Hero Header */}
        <Animated.View style={{ transform: [{ scale: headerScale }] }}>
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd, Colors.gradientAccent]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative Background Elements */}
            <View style={styles.headerDecoration}>
              <View style={[styles.decorCircle, styles.decorCircle1]} />
              <View style={[styles.decorCircle, styles.decorCircle2]} />
              <View style={[styles.decorCircle, styles.decorCircle3]} />
            </View>

            <View style={styles.headerContent}>
              <TouchableOpacity 
                style={styles.avatarContainer}
                activeOpacity={isEditing ? 0.7 : 1}
                onPress={() => isEditing && showToast.info("Coming Soon", "Profile picture upload will be available soon.")}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                  style={styles.avatarGlow}
                >
                  <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
                    <User size={44} color={Colors.primary} strokeWidth={2.5} />
                  </View>
                </LinearGradient>
                {isEditing && (
                  <View style={styles.editBadge}>
                    <LinearGradient
                      colors={[Colors.primary, Colors.primaryLight]}
                      style={styles.editBadgeGradient}
                    >
                      <Camera size={16} color="#FFF" />
                    </LinearGradient>
                  </View>
                )}
              </TouchableOpacity>
              
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerName}>
                  {isEditing ? (editedFullName || "New Profile") : (user?.full_name || username || "User")}
                </Text>
                {username && (
                  <Text style={styles.headerUsername}>@{username}</Text>
                )}
                <View style={styles.roleContainer}>
                  <LinearGradient
                    colors={[alpha(roleColor, 0.2), alpha(roleColor, 0.1)]}
                    style={styles.roleChip}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Shield size={14} color={roleColor} strokeWidth={2.5} />
                    <Text style={[styles.roleText, { color: roleColor }]}>
                      {roleRole} Authority
                    </Text>
                  </LinearGradient>
                  {user?.is_active && (
                    <View style={styles.statusBadge}>
                      <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
                      <Text style={styles.statusText}>Registry Active</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Enhanced Stats Grid */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: alpha(Colors.primary, 0.1) }]}>
                <Calendar size={22} color={Colors.primary} strokeWidth={2} />
              </View>
              <Text style={[styles.statValue, { color: Colors.text }]}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}
              </Text>
              <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Member Since</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: alpha(Colors.success, 0.1) }]}>
                <Cpu size={22} color={Colors.success} strokeWidth={2} />
              </View>
              <Text style={[styles.statValue, { color: Colors.text }]}>
                {totalDevices}
              </Text>
              <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Devices</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: alpha(roleColor, 0.1) }]}>
                <Wifi size={22} color={roleColor} strokeWidth={2} />
              </View>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: Colors.text }]}>{onlineDevices}</Text>
                <Text style={[styles.statValueSmall, { color: Colors.textTertiary }]}>/{totalDevices}</Text>
              </View>
              <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Online Now</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: alpha(Colors.secondary, 0.1) }]}>
                <LayoutDashboard size={22} color={Colors.secondary} strokeWidth={2} />
              </View>
              {loadingStats ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 4 }} />
              ) : (
                <Text style={[styles.statValue, { color: Colors.text }]}>{dashboardCount}</Text>
              )}
              <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>Dashboards</Text>
            </View>
          </View>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIconContainer, { backgroundColor: alpha(Colors.primary, 0.1) }]}>
                <User size={16} color={Colors.primary} />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Identity & Communications</Text>
                <Text style={[styles.sectionSubtitle, { color: Colors.textSecondary }]}>
                  Core registry data and communication channels.
                </Text>
              </View>
            </View>
            {!isEditing && (
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={() => setIsEditing(true)}
              >
                <Edit size={16} color={Colors.primary} />
                <Text style={[styles.editButtonText, { color: Colors.primary }]}>Modify</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <ProfileInfoRow
              icon={<User size={20} color={Colors.primary} />}
              label="Legal Identity"
              value={editedFullName}
              Colors={Colors}
              isEditing={isEditing}
              onChangeText={setEditedFullName}
              placeholder="Enter your full name"
            />

            <ProfileInfoRow
              icon={<User size={20} color={Colors.primary} />}
              label="Username"
              value={editedUsername}
              Colors={Colors}
              isEditing={isEditing}
              onChangeText={setEditedUsername}
              placeholder="Choose a username"
            />

            <ProfileInfoRow
              icon={<Mail size={20} color={Colors.primary} />}
              label="Communications"
              value={editedEmail}
              Colors={Colors}
              isEditing={isEditing}
              onChangeText={setEditedEmail}
              keyboardType="email-address"
              placeholder="your.email@example.com"
            />

            <ProfileInfoRow
              icon={<Phone size={20} color={Colors.primary} />}
              label="Phone Number"
              value={editedPhone}
              Colors={Colors}
              isEditing={isEditing}
              onChangeText={setEditedPhone}
              keyboardType="phone-pad"
              placeholder="+1 (555) 123-4567"
            />

            <ProfileInfoRow
              icon={<FileText size={20} color={Colors.primary} />}
              label="Bio"
              value={editedBio}
              Colors={Colors}
              isEditing={isEditing}
              onChangeText={setEditedBio}
              placeholder="Tell us about yourself..."
              multiline={true}
              numberOfLines={3}
            />

            {isEditing && (
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton, { backgroundColor: Colors.surfaceLight }]} 
                  onPress={handleCancel}
                >
                  <X size={18} color={Colors.text} />
                  <Text style={[styles.actionButtonText, { color: Colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton, 
                    styles.saveButton,
                    (!hasChanges || isSaving) && styles.actionButtonDisabled
                  ]}
                  onPress={handleSave}
                  disabled={!hasChanges || isSaving}
                >
                  <LinearGradient
                    colors={(!hasChanges || isSaving) ? [Colors.textSecondary, Colors.textSecondary] : [Colors.primary, Colors.primaryLight]}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Save size={18} color="#FFF" />
                        <Text style={styles.saveButtonText}>Commit Changes</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Account Registry Section */}
        {!isEditing && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIconContainer, { backgroundColor: alpha(Colors.secondary, 0.1) }]}>
                  <Shield size={16} color={Colors.secondary} />
                </View>
                <View>
                  <Text style={[styles.sectionTitle, { color: Colors.text }]}>Authority & Access Control</Text>
                  <Text style={[styles.sectionSubtitle, { color: Colors.textSecondary }]}>
                    Platform authority and security principals.
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <ProfileInfoRow
                icon={<Shield size={20} color={roleColor} />}
                label="Security Role"
                value={roleRole}
                Colors={Colors}
                isEditing={false}
              />
              <ProfileInfoRow
                icon={<Shield size={20} color={accessColor} />}
                label="Access Right"
                value={accessValue}
                Colors={Colors}
                isEditing={false}
              />
              <ProfileInfoRow
                icon={<Calendar size={20} color={Colors.textSecondary} />}
                label="Last Presence"
                value={user?.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                Colors={Colors}
                isEditing={false}
              />
              <ProfileInfoRow
                icon={<Hash size={20} color={Colors.textSecondary} />}
                label="Registry ID"
                value={user?.id || '...'}
                Colors={Colors}
                isEditing={false}
              />
            </View>
            <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                <Text style={{ fontSize: 10, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center', opacity: 0.6 }}>
                Managed by "Comprehensive Identity Registry & Access Control Layer"
                </Text>
            </View>
          </View>
        )}

        {/* Settings & Security */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIconContainer, { backgroundColor: alpha(Colors.warning, 0.1) }]}>
                <Settings size={16} color={Colors.warning} />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: Colors.text }]}>Security Credentials</Text>
                <Text style={[styles.sectionSubtitle, { color: Colors.textSecondary }]}>
                  Manage authentication and access methods.
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => navigation.navigate('ForgotPassword')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: alpha(Colors.primary, 0.1) }]}>
                <Lock size={20} color={Colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuText, { color: Colors.text }]}>Reset Access Token</Text>
                <Text style={[styles.menuSubtext, { color: Colors.textSecondary }]}>Initialize password reset flow</Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: Colors.borderLight }]} />

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: alpha(Colors.danger, 0.1) }]}>
                <LogOut size={20} color={Colors.danger} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuText, { color: Colors.text }]}>Terminate Session</Text>
                <Text style={[styles.menuSubtext, { color: Colors.textSecondary }]}>Securely sign out of the identity provider</Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIconContainer, { backgroundColor: alpha(Colors.danger, 0.1) }]}>
                <Trash2 size={16} color={Colors.danger} />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: Colors.danger }]}>Danger Zone</Text>
                <Text style={[styles.sectionSubtitle, { color: Colors.textSecondary }]}>
                  Irreversible registration removal
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, styles.dangerCard, { backgroundColor: Colors.surface, borderColor: alpha(Colors.danger, 0.3) }]}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: alpha(Colors.danger, 0.1) }]}>
                <Trash2 size={20} color={Colors.danger} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuText, { color: Colors.danger }]}>Revoke Registry Membership</Text>
                <Text style={[styles.menuSubtext, { color: Colors.textSecondary }]}>
                  Permanently delete your profile and all encrypted data
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Spacing */}
        <View style={{ height: 60 }} />
      </Animated.ScrollView>

      <CustomAlert visible={alertVisible} isDarkTheme={isDarkTheme} {...alertConfig} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  scroll: { 
    flex: 1 
  },
  scrollContent: { 
    paddingBottom: 20 
  },
  
  // Sticky Header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 100 : 80,
    justifyContent: 'flex-end',
    paddingBottom: 12,
    zIndex: 100,
    elevation: 10,
  },
  stickyHeaderContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stickyHeaderName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  stickyHeaderRole: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  // Header Gradient
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
    width: 300,
    height: 300,
    top: -150,
    right: -100,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    bottom: -80,
    left: -60,
  },
  decorCircle3: {
    width: 150,
    height: 150,
    top: 40,
    left: -40,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 18,
  },
  avatarGlow: {
    borderRadius: 56,
    padding: 4,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  editBadgeGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: 0.3,
  },

  // Stats Section
  statsSection: {
    marginTop: -20,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  statValueSmall: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Card
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  dangerCard: {
    borderWidth: 1.5,
  },

  // Menu Item
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  menuSubtext: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  menuDivider: {
    height: 1,
    marginLeft: 76,
  },

  // Edit Actions
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  saveButton: {
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
});