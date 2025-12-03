import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator
} from 'react-native';

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
  LayoutDashboard
} from 'lucide-react-native';

import CustomAlert from '../components/CustomAlert';
import StatCard from '../components/profile/StatCard';
import api from '../services/api';


// ⭐ Create proper safe alpha color helper (LinearGradient SAFE)
const alpha = (hex, opacity) => {
  const o = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + o;
};


const ProfileInfoRow = ({
  icon,
  label,
  value,
  Colors,
  isEditing,
  onChangeText,
  placeholder
}) => (
  <View style={[styles.infoRow, { borderBottomColor: Colors.border }]}>
    <View style={styles.infoIcon}>{icon}</View>

    <View>
      <Text style={[styles.infoLabel, { color: Colors.textMuted }]}>
        {label}
      </Text>

      {isEditing ? (
        <TextInput
          style={[styles.infoValue, styles.input, { color: Colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
        />
      ) : (
        <Text style={[styles.infoValue, { color: Colors.text }]}>
          {value}
        </Text>
      )}
    </View>
  </View>
);


export default function ProfileScreen({ navigation }) {
  const {
    user,
    username,
    email,
    devices,
    isDarkTheme,
    updateUser,
    deleteAccount
  } = useContext(AuthContext);

  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState(username || "");
  const [editedEmail, setEditedEmail] = useState(email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [dashboardCount, setDashboardCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});


  // ⭐ Theme colors
  const Colors = {
    background: isDarkTheme ? "#0A0E27" : "#F1F5F9",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#2A315A" : "#F8FAFC",

    border: isDarkTheme ? "#252B4A" : "#E2E8F0",

    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    success: isDarkTheme ? "#22C55E" : "#16A34A",
    warning: isDarkTheme ? "#FACC15" : "#EAB308",
    danger: isDarkTheme ? "#FF3366" : "#DC2626",

    text: isDarkTheme ? "#FFFFFF" : "#1E293B",
    textSecondary: isDarkTheme ? "#8B91A7" : "#64748B",
    textMuted: isDarkTheme ? "#8B91A7" : "#64748B"
  };


  useEffect(() => {
    setEditedUsername(username || "");
    setEditedEmail(email || "");
  }, [username, email]);


  useEffect(() => {
    const loadDashboards = async () => {
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
  }, []);


  // ⭐ Save
  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);

    try {
      const updates = {};
      if (editedUsername !== username) updates.username = editedUsername;
      if (editedEmail !== email) updates.email = editedEmail;

      if (Object.keys(updates).length > 0) {
        await updateUser(updates);
      }

      setAlertConfig({
        type: "success",
        title: "Profile Updated",
        message: "Your changes have been saved.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }]
      });

      setAlertVisible(true);
      setIsEditing(false);

    } catch (err) {
      setAlertConfig({
        type: "error",
        title: "Update Failed",
        message: err.message,
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }]
      });

      setAlertVisible(true);
    }

    setIsSaving(false);
  };


  // ⭐ Cancel Editing
  const handleCancel = () => {
    setEditedUsername(username || "");
    setEditedEmail(email || "");
    setIsEditing(false);
  };


  // ⭐ Delete account confirm
  const handleDeleteAccount = () => {
    setAlertConfig({
      type: "confirm",
      title: "Delete Account",
      message:
        "Are you sure you want to permanently delete your account? This action cannot be undone.",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setAlertVisible(false) },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteAccount();
          }
        }
      ]
    });

    setAlertVisible(true);
  };


  // ========== UI RETURN ==========
  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: alpha(Colors.primary, 0.25) }]}>
          <User size={64} color={Colors.primary} />
        </View>

        <Text style={[styles.profileName, { color: Colors.text }]}>
          {username || "User"}
        </Text>

        <Text style={[styles.profileRole, { color: Colors.textSecondary }]}>
          Administrator
        </Text>
      </View>


      {/* Stats Grid */}
      <View style={styles.statsSection}>

        <StatCard
          icon={<Calendar size={20} color={Colors.primary} />}
          value={
            user?.created_at
              ? new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short'
              })
              : 'N/A'
          }
          label="Member Since"
          colors={[alpha(Colors.primary, 0.35), alpha(Colors.primary, 0.10)]}
          isDarkTheme={isDarkTheme}
        />

        <StatCard
          icon={<Cpu size={20} color={Colors.success} />}
          value={devices?.length || 0}
          label="Total Devices"
          colors={[alpha(Colors.success, 0.35), alpha(Colors.success, 0.10)]}
          isDarkTheme={isDarkTheme}
        />

        <StatCard
          icon={<Wifi size={20} color={Colors.warning} />}
          value={devices?.filter(d => d.status === "online").length || 0}
          label="Online Devices"
          colors={[alpha(Colors.warning, 0.35), alpha(Colors.warning, 0.10)]}
          isDarkTheme={isDarkTheme}
        />

        <StatCard
          icon={<LayoutDashboard size={20} color={Colors.danger} />}
          value={loadingStats ? "..." : dashboardCount}
          label="Dashboards"
          colors={[alpha(Colors.danger, 0.35), alpha(Colors.danger, 0.10)]}
          isDarkTheme={isDarkTheme}
        />

      </View>


      {/* Editable Section */}
      <View style={[styles.card, { backgroundColor: Colors.surface }]}>

        <ProfileInfoRow
          icon={<User size={20} color={Colors.primary} />}
          label="Username"
          value={editedUsername}
          Colors={Colors}
          isEditing={isEditing}
          onChangeText={setEditedUsername}
          placeholder="Enter username"
        />

        <ProfileInfoRow
          icon={<Mail size={20} color={Colors.primary} />}
          label="Email Address"
          value={editedEmail}
          Colors={Colors}
          isEditing={isEditing}
          onChangeText={setEditedEmail}
          placeholder="Enter email"
        />

      </View>


      {/* Action Buttons */}
      {isEditing ? (
        <View style={styles.buttonContainer}>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.surfaceLight }]}
            onPress={handleCancel}
          >
            <X size={18} color={Colors.text} />
            <Text style={[styles.actionButtonText, { color: Colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.primary }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Save size={18} color="#FFF" />
                <Text style={styles.actionButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      ) : (
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: Colors.primary }]}
          onPress={() => setIsEditing(true)}
        >
          <Edit size={18} color="#FFF" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}


      {/* Security Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>
          Security
        </Text>

        <View style={[styles.card, { backgroundColor: Colors.surface }]}>
          <TouchableOpacity
            style={styles.securityRow}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Shield size={20} color={Colors.textSecondary} />
            <Text style={[styles.securityRowText, { color: Colors.text }]}>
              Change Password
            </Text>
          </TouchableOpacity>
        </View>
      </View>


      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>
          Danger Zone
        </Text>

        <View style={[styles.card, { backgroundColor: Colors.surface }]}>
          <TouchableOpacity style={styles.securityRow} onPress={handleDeleteAccount}>
            <Trash2 size={20} color={Colors.danger} />
            <Text style={[styles.securityRowText, { color: Colors.danger }]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>


      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />

    </ScrollView>
  );
}



// ============================= STYLES =============================
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },

  profileName: { fontSize: 28, fontWeight: "700" },

  profileRole: { fontSize: 15, marginTop: 4 },

  statsSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
  },

  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
  },

  infoRow: {
    flexDirection: "row",
    padding: 20,
    borderBottomWidth: 1,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  infoLabel: { fontSize: 13 },

  infoValue: { fontSize: 16, fontWeight: "600" },

  input: {
    padding: 0,
    height: 24,
    marginTop: -4
  },

  editButton: {
    flexDirection: "row",
    justifyContent: "center",
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },

  editButtonText: {
    fontWeight: "700",
    color: "#FFF",
    fontSize: 16,
  },

  buttonContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 20,
    gap: 12
  },

  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },

  actionButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },

  section: {
    marginHorizontal: 20,
    marginTop: 32
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },

  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },

  securityRowText: {
    fontSize: 16,
    fontWeight: "600"
  
  }
});

