// StatCard.js - Static version
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const StatCard = ({ icon, value, label, colors, isDarkTheme, loading, style }) => {
  // Fallback colors to prevent gradient errors
  const gradientColors = colors && colors.length >= 2 ? colors : ['#FFFFFF', '#FFFFFF'];
  
  return (
    <View style={[
      styles.container, 
      { 
        shadowColor: isDarkTheme ? "#000" : "#64748B",
        backgroundColor: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
        borderColor: isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
      },
      style // Support for flexBasis or margins passed from parent
    ]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={[
          styles.iconWrapper, 
          { backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
        ]}>
          {icon}
        </View>
        
        <View style={styles.textContainer}>
          {loading ? (
            <ActivityIndicator 
              size="small" 
              color={isDarkTheme ? "#00D9FF" : "#3B82F6"} 
              style={styles.loader} 
            />
          ) : (
            <Text 
              style={[styles.value, { color: isDarkTheme ? "#FFFFFF" : "#1E293B" }]} 
              numberOfLines={1}
            >
              {value}
            </Text>
          )}
          <Text 
            style={[styles.label, { color: isDarkTheme ? "#8B91A7" : "#64748B" }]} 
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '48%', // Default width for grid layout
    borderRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
  },
  gradient: {
    padding: 16,
    borderRadius: 20,
    height: 120, // Slightly more compact
    justifyContent: 'space-between',
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginTop: 8,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  loader: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    marginTop: 4,
  }
});

export default StatCard;