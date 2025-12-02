import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle, Info } from 'lucide-react-native';

const ICONS = {
  success: (color) => <CheckCircle size={48} color={color} />,
  error: (color) => <XCircle size={48} color={color} />,
  warning: (color) => <AlertTriangle size={48} color={color} />,
  confirm: (color) => <HelpCircle size={48} color={color} />,
  info: (color) => <Info size={48} color={color} />,
};

const COLORS = {
  success: '#28a745',
  error: '#dc3545',
  warning: '#ffc107',
  confirm: '#17a2b8',
  info: '#17a2b8',
};

const CustomAlert = ({
  visible,
  type = 'confirm', // 'success', 'error', 'warning', 'confirm'
  title,
  message,
  buttons = [],
  isDarkTheme,
}) => {
  const ThemeColors = {
    background: isDarkTheme ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
    card: isDarkTheme ? '#1A1F3A' : '#FFFFFF',
    title: isDarkTheme ? '#FFFFFF' : '#1E293B',
    message: isDarkTheme ? '#8B91A7' : '#64748B',
    buttonText: isDarkTheme ? '#FFFFFF' : '#1E293B',
    primaryButton: '#3B82F6',
    primaryButtonText: '#FFFFFF',
    destructiveButton: '#DC2626',
  };

  const BUTTON_STYLES = {
    primary: {
      backgroundColor: ThemeColors.primaryButton,
      color: ThemeColors.primaryButtonText,
    },
    destructive: {
      backgroundColor: ThemeColors.destructiveButton,
      color: ThemeColors.primaryButtonText,
    },
    cancel: {
      backgroundColor: isDarkTheme ? ThemeColors.surfaceLight : '#E2E8F0',
      color: ThemeColors.buttonText,
    },
    // Default style for any unrecognized button style
    default: {
      backgroundColor: isDarkTheme ? ThemeColors.surfaceLight : '#E2E8F0',
      color: ThemeColors.buttonText,
    },
  };

  const iconColor = COLORS[type] || COLORS.confirm;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Find a cancel button to trigger on back press
        const cancelButton = buttons.find(b => b.style === 'cancel');
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      }}
    >
      <View style={[styles.container, { backgroundColor: ThemeColors.background }]}>
        <View style={[styles.card, { backgroundColor: ThemeColors.card }]}>
          <View style={styles.iconContainer}>
            {ICONS[type](iconColor)}
          </View>

          <Text style={[styles.title, { color: ThemeColors.title }]}>{title}</Text>
          {message && <Text style={[styles.message, { color: ThemeColors.message }]}>{message}</Text>}

          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => {
              // Get the style config for the button, or use default
              const styleConfig = BUTTON_STYLES[button.style] || BUTTON_STYLES.default;

              const buttonStyle = [
                styles.button,
                { backgroundColor: styleConfig.backgroundColor },
              ];
              const textStyle = [
                styles.buttonText, { color: styleConfig.color }
              ];

              return (
                <TouchableOpacity
                  key={index}
                  style={buttonStyle}
                  onPress={button.onPress}
                >
                  <Text style={textStyle}>{button.text}</Text>
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '95%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomAlert;