import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { User, Mail, Edit, Save, X, AlertTriangle } from 'lucide-react-native';
import CustomAlert from '../components/CustomAlert';

const ProfileInfoRow = ({ icon, label, value, Colors, isEditing, onChangeText, placeholder }) => (
  <View style={[styles.infoRow, { borderBottomColor: Colors.border }]}>
    <View style={styles.infoIcon}>{icon}</View>
    <View>
      <Text style={[styles.infoLabel, { color: Colors.textSecondary }]}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={[styles.infoValue, styles.input, { color: Colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
        />
      ) : (
        <Text style={[styles.infoValue, { color: Colors.text }]}>{value}</Text>
      )}
    </View>
  </View>
);

export default function ProfileScreen({ navigation }) {
  const { username, email, isDarkTheme, updateUser } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState(username || "");
  const [editedEmail, setEditedEmail] = useState(email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  useEffect(() => {
    // Reset fields if user context changes
    setEditedUsername(username || "");
    setEditedEmail(email || "");
  }, [username, email]);

  const Colors = {
    background: isDarkTheme ? "#0A0E27" : "#F1F5F9",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    border: isDarkTheme ? "#252B4A" : "#E2E8F0",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    text: isDarkTheme ? "#FFFFFF" : "#1E293B",
    textSecondary: isDarkTheme ? "#8B91A7" : "#64748B",
    textMuted: isDarkTheme ? "#8B91A7" : "#64748B",
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const userData = {};
      if (editedUsername !== username) userData.username = editedUsername;
      if (editedEmail !== email) userData.email = editedEmail;

      if (Object.keys(userData).length > 0) {
        await updateUser(userData);
        setAlertConfig({
          type: 'success',
          title: "Profile Updated",
          message: "Your changes have been saved.",
          buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
        });
        setAlertVisible(true);
      }
      setIsEditing(false);
    } catch (error) {
      setAlertConfig({
        type: 'error',
        title: "Update Failed",
        message: error.message,
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset fields to original values
    setEditedUsername(username || "");
    setEditedEmail(email || "");
    setIsEditing(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: Colors.primary + '30' }]}>
          <User size={64} color={Colors.primary} />
        </View>
        <Text style={[styles.profileName, { color: Colors.text }]}>{username || 'User'}</Text>
        <Text style={[styles.profileRole, { color: Colors.textSecondary }]}>Administrator</Text>
      </View>

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

      {isEditing ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: Colors.surfaceLight }]} onPress={handleCancel}>
            <X size={18} color={Colors.text} />
            <Text style={[styles.actionButtonText, { color: Colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: Colors.primary }]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Save size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.editButton, { backgroundColor: Colors.primary }]} onPress={() => setIsEditing(true)}>
          <Edit size={18} color="#FFFFFF" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '700',
  },
  profileRole: {
    fontSize: 16,
    marginTop: 4,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    padding: 0, // Remove default padding for seamless look
    height: 24, // Match text line height
    marginTop: -4, // Adjust alignment
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});