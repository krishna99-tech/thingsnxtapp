import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import CustomAlert from '../components/CustomAlert';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const PasswordRequirement = ({ met, text }) => (
    <View style={styles.requirementContainer}>
      <Text style={met ? styles.requirementMet : styles.requirementNotMet}>
        {met ? '✓' : '✗'}
      </Text>
      <Text style={styles.requirementText}>{text}</Text>
    </View>
  );

export default function ResetPasswordScreen({ navigation, route }) {
  const [token, setToken] = useState(route?.params?.token || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const { isDarkTheme } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  const isPasswordValid = useMemo(
    () => Object.values(passwordValidation).every(Boolean),
    [passwordValidation]
  );

  const handlePasswordChange = (pwd) => {
    setPassword(pwd);
    setPasswordValidation({
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    });
  };

  const handleResetPassword = async () => {
    if (!token.trim()) {
      setAlertConfig({ type: 'error', title: 'Error', message: 'Please enter the reset code sent to your email.', buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }] });
      setAlertVisible(true);
      return;
    }
    if (!password) {
      setAlertConfig({ type: 'error', title: 'Error', message: 'Please enter your new password.', buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }] });
      setAlertVisible(true);
      return;
    }
    if (!isPasswordValid) {
      setAlertConfig({ type: 'error', title: 'Error', message: 'Password does not meet all the requirements.', buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }] });
      setAlertVisible(true);
      return;
    }
    if (password !== confirmPassword) {
      setAlertConfig({ type: 'error', title: 'Error', message: 'Passwords do not match.', buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }] });
      setAlertVisible(true);
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token.trim().toUpperCase(), password);
      setAlertConfig({
        type: 'success',
        title: 'Success 🎉',
        message: 'Your password has been successfully reset. You can now login with your new password.',
        buttons: [
            {
                text: 'Go to Login',
                onPress: () => {
                    setAlertVisible(false);
                    navigation.navigate('Login');
                },
            },
        ],
      });
      setAlertVisible(true);

    } catch (error) {
      setAlertConfig({
        type: 'error',
        title: 'Reset Failed',
        message: error.message || 'Invalid or expired code. Please try again.',
        buttons: [
            {
                text: 'OK',
                onPress: () => setAlertVisible(false),
            },
        ],
      });
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = loading || !isPasswordValid || password !== confirmPassword;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                <Text style={styles.icon}>🔑</Text>
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter the code sent to your email and create a new password
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Reset Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 8-character code"
                  value={token}
                  onChangeText={(text) => setToken(text.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                  editable={!loading}
                  placeholderTextColor="#999"
                />
                <Text style={styles.hint}>
                  Check your inbox for the reset code
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Create new password"
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeText}>
                      {showPassword ? '🙈' : '👁️'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.requirementsGrid}>
                  <PasswordRequirement
                    met={passwordValidation.length}
                    text="8+ characters"
                  />
                  <PasswordRequirement
                    met={passwordValidation.uppercase}
                    text="1 uppercase"
                  />
                  <PasswordRequirement
                    met={passwordValidation.lowercase}
                    text="1 lowercase"
                  />
                  <PasswordRequirement
                    met={passwordValidation.number}
                    text="1 number"
                  />
                  <PasswordRequirement
                    met={passwordValidation.specialChar}
                    text="1 special"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  placeholderTextColor="#999"
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <Text style={styles.errorText}>Passwords do not match.</Text>
                ) }
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  isButtonDisabled && styles.buttonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={isButtonDisabled}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>
                  Didn't get a code? Resend
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  content: {
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 16,
  },
  eyeText: {
    fontSize: 20,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#999',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  requirementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  requirementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
    width: '45%', // To fit two items per row
  },
  requirementMet: {
    color: '#2e7d32',
    marginRight: 6,
  },
  requirementNotMet: {
    color: '#d32f2f',
    marginRight: 6,
  },
  requirementText: {
    fontSize: 12,
    color: '#666',
  },
   errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
  },
});
