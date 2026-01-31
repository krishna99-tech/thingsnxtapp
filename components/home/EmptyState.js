import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const alpha = (hex, opacity) => {
  const o = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + o;
};

const EmptyState = React.memo(({ icon: Icon, title, message, buttonText, onButtonPress, Colors }) => (
  <View style={[styles.emptyContainer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
    <View style={[styles.emptyIconContainer, { backgroundColor: alpha(Colors.primary, 0.12) }]}>
      <Icon size={36} color={Colors.primary} strokeWidth={2} />
    </View>
    <Text style={[styles.emptyTitle, { color: Colors.text }]}>{title}</Text>
    <Text style={[styles.emptyMessage, { color: Colors.textSecondary }]}>{message}</Text>
    {onButtonPress && buttonText && (
      <TouchableOpacity 
        style={styles.emptyButton} 
        onPress={onButtonPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.emptyButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.emptyButtonText}>{buttonText}</Text>
        </LinearGradient>
      </TouchableOpacity>
    )}
  </View>
));

const styles = StyleSheet.create({
  emptyContainer: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 24,
  },
  emptyButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default EmptyState;
