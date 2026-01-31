import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const StatCard = ({ icon, value, label, colors, isDarkTheme, loading, style }) => {
  // Use a softer internal palette if colors aren't provided
  const Colors = {
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    text: isDarkTheme ? "#F8FAFC" : "#0F172A",
    textSecondary: isDarkTheme ? "#94A3B8" : "#64748B",
    surface: isDarkTheme ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
  };

  const alpha = (hex, opacity) => {
    const o = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return hex + o;
  };

  return (
    <View style={[
      styles.statCard,
      { backgroundColor: Colors.surface },
      style
    ]}>
      <View style={[
        styles.statIconContainer, 
        { backgroundColor: alpha(colors?.[0] || Colors.primary, 0.1) }
      ]}>
        {React.cloneElement(icon, { 
          size: 22, 
          color: colors?.[0] || Colors.primary,
          strokeWidth: 2 
        })}
      </View>
      
      {loading ? (
        <ActivityIndicator size="small" color={colors?.[0] || Colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.statValueRow}>
          <Text style={[styles.statValue, { color: Colors.text }]}>
            {value}
          </Text>
        </View>
      )}
      
      <Text style={[styles.statLabel, { color: Colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statCard: {
    width: (width - 52) / 2, // 2-column grid with gap
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
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loader: {
    marginVertical: 4,
  }
});

export default StatCard;