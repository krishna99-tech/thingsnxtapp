import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../services/api"; // Replace with your actual api import
import CustomAlert from "../components/CustomAlert";
import { AuthContext } from "../context/AuthContext";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const { isDarkTheme } = useContext(AuthContext);

  // Validate email format
  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setAlertConfig({
        type: 'warning',
        title: "Missing Email",
        message: "Please enter your registered email address.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
      return;
    }

    if (!validateEmail(email)) {
      setAlertConfig({
        type: 'warning',
        title: "Invalid Email",
        message: "Please enter a valid email address.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
      return;
    }

    setLoading(true);
    try {
      // Only pass email string
      await api.forgotPassword(email.toLowerCase().trim());

      setAlertConfig({
        type: 'success',
        title: "Email Sent",
        message: "If your email is registered, a password reset code has been sent. Please check your inbox (and spam folder).",
        buttons: [{
          text: "Continue",
          onPress: () => {
            setAlertVisible(false);
            navigation.navigate("ResetPassword", {
              email: email.toLowerCase().trim(),
            });
          }
        }],
      });
      setAlertVisible(true);
    } catch (error) {
      console.error("Forgot password error:", error);
      setAlertConfig({
        type: 'error',
        title: "Error",
        message: error.message || "Unable to send reset email. Try again later.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🔐</Text>
              </View>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter your registered email and we’ll send you a reset code to
                recover your account.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Send Reset Email */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              {/* Already Have Code */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() =>
                  navigation.navigate("ResetPassword", {
                    email: email.toLowerCase().trim(),
                  })
                }
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>
                  Already have a code?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>← Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f5" },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  content: { padding: 24, maxWidth: 400, width: "100%", alignSelf: "center" },
  header: { alignItems: "center", marginBottom: 40 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  icon: { fontSize: 40 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  form: { marginBottom: 24 },
  inputContainer: { marginBottom: 24 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { backgroundColor: "#999", shadowOpacity: 0 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: { marginTop: 16, padding: 16, alignItems: "center" },
  secondaryButtonText: { color: "#007AFF", fontSize: 14, fontWeight: "600" },
  backButton: { alignItems: "center", padding: 12 },
  backButtonText: { color: "#007AFF", fontSize: 16, fontWeight: "500" },
});
