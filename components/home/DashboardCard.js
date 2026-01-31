import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Zap, 
  Activity, 
  Shield, 
  Thermometer, 
  Lightbulb, 
  ChevronRight 
} from 'lucide-react-native';

const getDashboardIcon = (type, size = 24) => {
  const iconProps = { size, color: "#FFFFFF", strokeWidth: 2.5 };
  switch (type) {
    case 'energy': return <Zap {...iconProps} />;
    case 'security': return <Shield {...iconProps} />;
    case 'climate': return <Thermometer {...iconProps} />;
    case 'lighting': return <Lightbulb {...iconProps} />;
    default: return <Activity {...iconProps} />;
  }
};

const getDashboardGradient = (type, Colors) => {
  switch (type) {
    case 'energy': return [Colors.secondary, '#A855F7'];
    case 'security': return [Colors.danger, '#DC2626'];
    case 'climate': return [Colors.primary, Colors.primaryDark];
    case 'lighting': return ['#F59E0B', '#D97706'];
    default: return [Colors.primary, Colors.primaryDark];
  }
};

const DashboardCard = React.memo(({ dashboard, onPress, Colors }) => {
  const gradientColors = getDashboardGradient(dashboard.type, Colors);
  
  return (
    <TouchableOpacity
      style={styles.dashboardCard}
      onPress={() => onPress(dashboard)}
      activeOpacity={0.8}
    >
      <LinearGradient colors={gradientColors} style={styles.dashboardGradient}>
        <View style={styles.dashboardPattern}>
          <View style={styles.patternCircle1} />
          <View style={styles.patternCircle2} />
        </View>

        <View style={styles.dashboardHeader}>
          <View style={styles.dashboardIconContainer}>
            {getDashboardIcon(dashboard.type, 24)}
          </View>
          <View style={styles.dashboardChevron}>
            <ChevronRight size={20} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
          </View>
        </View>
        
        <View style={styles.dashboardContent}>
          <Text style={styles.dashboardName} numberOfLines={1}>
            {dashboard.name}
          </Text>
          <View style={styles.dashboardValueContainer}>
            <Text style={styles.dashboardValue}>
              {dashboard.primaryMetric?.value || '--'}
            </Text>
            {dashboard.primaryMetric?.unit && (
              <Text style={styles.dashboardUnit}>{dashboard.primaryMetric.unit}</Text>
            )}
          </View>
          <Text style={styles.dashboardLabel} numberOfLines={1}>
            {dashboard.primaryMetric?.label || 'Primary Metric'}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  dashboardCard: {
    width: 170,
    height: 180,
    marginRight: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  dashboardGradient: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
    position: 'relative',
  },
  dashboardPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -20,
    right: -20,
  },
  patternCircle2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: 10,
    left: -10,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardContent: {
    gap: 4,
  },
  dashboardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  dashboardValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  dashboardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  dashboardUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  dashboardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default DashboardCard;
