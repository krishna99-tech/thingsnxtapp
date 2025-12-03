import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const StatCard = ({ colors, icon, value, title, isLarge = false }) => {
  return (
    <View style={styles.statCard}>
      <LinearGradient colors={colors} style={styles.statGradient}>
        <View style={styles.statIcon}>{icon}</View>
        <Text style={isLarge ? styles.statValueLg : styles.statValueSm}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    fixedWidth: 150,
    fixedHeight: 10,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statValueLg: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statValueSm: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  
});

export default StatCard;