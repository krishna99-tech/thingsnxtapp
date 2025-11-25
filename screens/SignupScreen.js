import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";

const ValidationItem = ({ isValid, text }) => (
  <View style={styles.validationItem}>
    <Ionicons
      name={isValid ? "checkmark-circle" : "close-circle-outline"}
      size={20}
      color={isValid ? "#28a745" : "#dc3545"}
      style={{ marginRight: 8 }}
    />
    <Text style={[styles.validationText, { color: isValid ? "#2c6e49" : "#c94c4c" }]}>
      {text}
    </Text>
  </View>
);

export default function SignupScreen({ navigation }) {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    full_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const [errors, setErrors] = useState({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateUsername = (username) => /^[a-zA-Z0-9_-]+$/.test(username);

  const updateFormData = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const handlePasswordChange = (password) => {
    updateFormData("password", password);

    const validations = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    setPasswordValidation(validations);
  };

  const validate = () => {
    const { email, username, password, confirmPassword } = formData;
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!username.trim()) {
      newErrors.username = "Username is required.";
    } else if (!validateUsername(username)) {
      newErrors.username =
        "Username can only contain letters, numbers, underscores, and hyphens.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    const { email, username, password, full_name } = formData;
    try {
      const payload = {
        email: email.toLowerCase().trim(),
        username: username.trim(),
        password,
        full_name: full_name.trim() || null,
      };
      const res = await api.signup(payload);

      if (res?.access_token) {
        Alert.alert(
          "Signup Successful!",
          "Your account has been created. Please log in with your new credentials."
        );
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        throw new Error(
          res?.detail ||
            "Unexpected server response: Signup succeeded but no token returned."
        );
      }
    } catch (error) {
      console.error("❌ Signup error caught:", error);
      const errorMessage = error.response?.data?.detail || error.message;
      if (
        errorMessage?.includes("already registered") ||
        errorMessage?.includes("409")
      ) {
        Alert.alert("Account Exists", "Username or email already registered.");
      } else if (
        errorMessage?.includes("Invalid JSON") ||
        errorMessage?.includes("500")
      ) {
        Alert.alert(
          "Server Error",
          "Backend issue—try again or contact support."
        );
      } else if (errorMessage?.includes("Network error")) {
        Alert.alert("Network Error", "Check your connection and try again.");
      } else {
        Alert.alert("Signup Failed", errorMessage || "Unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (key) => [
    styles.input,
    errors[key] && styles.inputError,
  ];

  const passwordContainerStyle = (key) => [
    styles.passwordContainer,
    errors[key] && styles.inputError,
  ];

  return (
    <LinearGradient colors={["#007AFF", "#004E92"]} style={styles.gradient}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Sign up to get started with ThingsNXT
              </Text>

              {/* Full Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name (Optional)</Text>
                <TextInput
                  style={inputStyle("full_name")}
                  placeholder="Enter your full name"
                  value={formData.full_name}
                  onChangeText={(text) => updateFormData("full_name", text)}
                  placeholderTextColor="#999"
                  editable={!loading}
                />
              </View>

              {/* Username */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username *</Text>
                <TextInput
                  style={inputStyle("username")}
                  placeholder="Choose a username"
                  value={formData.username}
                  onChangeText={(text) => updateFormData("username", text)}
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                  editable={!loading}
                />
                {errors.username && (
                  <Text style={styles.errorText}>{errors.username}</Text>
                )}
              </View>

              {/* Email */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={inputStyle("email")}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(text) => updateFormData("email", text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                  editable={!loading}
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password *</Text>
                <View style={passwordContainerStyle("password")}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Create a password"
                    value={formData.password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>

              {/* Password Strength Validation */}
              {formData.password.length > 0 && (
                <View style={styles.validationContainer}>
                  <ValidationItem
                    isValid={passwordValidation.minLength}
                    text="At least 8 characters"
                  />
                  <ValidationItem
                    isValid={passwordValidation.hasUppercase}
                    text="Contains an uppercase letter"
                  />
                  <ValidationItem
                    isValid={passwordValidation.hasLowercase}
                    text="Contains a lowercase letter"
                  />
                  <ValidationItem
                    isValid={passwordValidation.hasNumber}
                    text="Contains a number"
                  />
                  <ValidationItem
                    isValid={passwordValidation.hasSpecialChar}
                    text="Contains a special character"
                  />
                </View>
              )}

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput
                  style={inputStyle("confirmPassword")}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(text) =>
                    updateFormData("confirmPassword", text)
                  }
                  secureTextEntry
                  editable={!loading}
                  placeholderTextColor="#999"
                />
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>
                    {errors.confirmPassword}
                  </Text>
                )}
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.button, (loading || Object.values(passwordValidation).some(v => !v) || formData.password !== formData.confirmPassword) && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading || Object.values(passwordValidation).some(v => !v) || formData.password !== formData.confirmPassword}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Login")}
                  disabled={loading}
                >
                  <Text style={styles.linkText}>Login</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  title: { fontSize: 30, fontWeight: "bold", color: "#222", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 24 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 },
  input: {
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
  },
  inputError: {
    borderColor: "#D93025",
  },
  errorText: {
    color: "#D93025",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
  },
  passwordInput: { flex: 1, padding: 14, fontSize: 16, color: "#333" },
  eyeButton: { paddingHorizontal: 12 },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: { color: "#444" },
  linkText: { color: "#007AFF", fontWeight: "700" },
  validationContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  validationText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
