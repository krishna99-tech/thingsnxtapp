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
import { SafeAreaView } from "react-native-safe-area-context"; // Correct import
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons"; 
import { LinearGradient } from "expo-linear-gradient";
import CustomAlert from "../components/CustomAlert";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isDarkTheme, showAlert } = useAuth();
  const navigation = useNavigation();

  // Handle Login
  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      setAlertConfig({
        type: 'warning',
        title: "Missing Fields",
        message: "Please enter your email/username and password.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
      return;
    }
    setLoading(true);
    try {
      const loginResult = await login(identifier.trim(), password);
      if (loginResult) {
        // Show success alert AFTER navigation to ensure it appears on the home screen
        // Use the global showAlert from AuthContext
        navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
        setTimeout(() => {
          showAlert({
            type: 'success',
            title: "Login Success",
            message: `Welcome back, ${loginResult.user?.username || ""}!`,
            buttons: [{ text: "Continue" }],
          });
        }, 500); // Small delay to ensure screen transition is complete
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#f9fbff", "#eef3f7"]} style={{ flex: 1 }}>
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
                <Text style={styles.title}>Welcome Back 👋</Text>
                <Text style={styles.subtitle}>Login to your ThingsNXT dashboard</Text>
              </View>

              {/* Email / Username */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email or Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email or username"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#555"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => navigation.navigate("ForgotPassword")}
                disabled={loading}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </TouchableOpacity>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Don’t have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Signup")}
                  disabled={loading}
                >
                  <Text style={styles.linkText}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f5" },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  content: { padding: 24, maxWidth: 400, width: "100%", alignSelf: "center" },
  header: { marginBottom: 40, alignItems: "center" },
  title: { fontSize: 30, fontWeight: "bold", color: "#222", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666" },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "#333",
  },
  eyeButton: { padding: 12 },
  forgotButton: { alignSelf: "flex-end", marginBottom: 24 },
  forgotText: { color: "#007AFF", fontSize: 14, fontWeight: "600" },
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
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { color: "#666", fontSize: 14 },
  linkText: { color: "#007AFF", fontSize: 14, fontWeight: "600" },
});
