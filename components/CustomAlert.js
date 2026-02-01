import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Check, X, AlertTriangle, AlertCircle, Info } from 'lucide-react-native';
import { getModalColors } from '../utils/theme';
import { LinearGradient } from 'expo-linear-gradient';

const ICONS = {
  success: {
    icon: Check,
    colors: ['#22C55E', '#16A34A'],
    bg: 'rgba(34, 197, 94, 0.1)',
  },
  error: {
    icon: X,
    colors: ['#EF4444', '#DC2626'],
    bg: 'rgba(239, 68, 68, 0.1)',
  },
  warning: {
    icon: AlertTriangle,
    colors: ['#F59E0B', '#D97706'],
    bg: 'rgba(245, 158, 11, 0.1)',
  },
  confirm: {
    icon: AlertCircle,
    colors: ['#3B82F6', '#2563EB'],
    bg: 'rgba(59, 130, 246, 0.1)',
  },
  info: {
    icon: Info,
    colors: ['#06B6D4', '#0891B2'],
    bg: 'rgba(6, 182, 212, 0.1)',
  },
};

const CustomAlert = ({
  visible,
  type = 'confirm', // 'success', 'error', 'warning', 'confirm', 'info'
  title,
  message,
  buttons = [],
  isDarkTheme,
}) => {
  const ThemeColors = getModalColors(isDarkTheme);
  const config = ICONS[type] || ICONS.confirm;
  const IconComponent = config.icon;

  const BUTTON_STYLES = {
    primary: {
      bg: ['#3B82F6', '#2563EB'],
      text: '#FFFFFF',
      border: 'transparent',
    },
    destructive: {
      bg: ['#EF4444', '#DC2626'],
      text: '#FFFFFF',
      border: 'transparent',
    },
    cancel: {
      bg: isDarkTheme ? ['transparent', 'transparent'] : ['#F1F5F9', '#E2E8F0'],
      text: isDarkTheme ? '#94A3B8' : '#64748B',
      border: isDarkTheme ? '#334155' : 'transparent',
    },
    default: {
      bg: isDarkTheme ? ['#334155', '#1E293B'] : ['#F1F5F9', '#E2E8F0'],
      text: isDarkTheme ? '#E2E8F0' : '#475569',
      border: 'transparent',
    },
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        const cancelButton = buttons.find(b => b.style === 'cancel');
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: ThemeColors.card }]}>
          {/* Decorative Icon Background */}
          <View style={[styles.iconWrapper, { backgroundColor: config.bg }]}>
            <LinearGradient
              colors={config.colors}
              style={styles.iconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <IconComponent size={32} color="#FFF" strokeWidth={2.5} />
            </LinearGradient>
          </View>

          <Text style={[styles.title, { color: ThemeColors.title }]}>{title}</Text>
          {message && <Text style={[styles.message, { color: ThemeColors.message }]}>{message}</Text>}

          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => {
              const styleKey = button.style || 'default';
              const styleConfig = BUTTON_STYLES[styleKey] || BUTTON_STYLES.default;
              
              // Special handling for cancel button which might be outlined
              const isOutlined = styleKey === 'cancel' && isDarkTheme;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isOutlined && { borderWidth: 1.5, borderColor: styleConfig.border }
                  ]}
                  onPress={button.onPress}
                  activeOpacity={0.8}
                >
                  {!isOutlined ? (
                    <LinearGradient
                      colors={styleConfig.bg}
                      style={styles.gradientButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.buttonText, { color: styleConfig.text }]}>
                        {button.text}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.gradientButton, { backgroundColor: 'transparent' }]}>
                      <Text style={[styles.buttonText, { color: styleConfig.text }]}>
                        {button.text}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    opacity: 0.9,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default CustomAlert;