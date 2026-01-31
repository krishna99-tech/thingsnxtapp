import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 14;

const StatCard = ({ colors, icon, value, title, isLarge = false }) => {
  return (
    <View style={[
      styles.statCard, 
      isLarge ? styles.statCardLarge : styles.statCardSmall
    ]}>
      <LinearGradient 
        colors={colors} 
        style={styles.statGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative Circle */}
        <View style={styles.decorCircle} />
        
        <View style={styles.contentContainer}>
          <View style={styles.iconWrapper}>
            {React.cloneElement(icon, { size: isLarge ? 26 : 24, strokeWidth: 2.5 })}
          </View>
          
          <View style={styles.textWrapper}>
            <Text style={[styles.statValue, isLarge && styles.statValueLarge]}>
              {value}
            </Text>
            <Text style={[styles.statTitle, isLarge && styles.statTitleLarge]}>
              {title}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  statCard: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  statCardLarge: {
    width: '100%',
    minHeight: 130,
  },
  statCardSmall: {
    width: (width - CARD_PADDING * 2 - CARD_GAP) / 2,
    minHeight: 130,
  },
  statGradient: {
    flex: 1,
    padding: 18,
    position: 'relative',
  },
  decorCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -20,
    right: -20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statValueLarge: {
    fontSize: 32,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statTitleLarge: {
    fontSize: 14,
    letterSpacing: 0.8,
  },
});

export default StatCard;