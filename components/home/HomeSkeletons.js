import React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 14;

const Shimmer = ({ children, style, isDarkTheme }) => {
  const shimmerAnimatedValue = React.useRef(new Animated.Value(-1)).current;

  React.useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnimatedValue, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      })
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, []);

  const translateX = shimmerAnimatedValue.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width, width],
  });

  const shimmerColor = isDarkTheme ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)";

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {children}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '100%',
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={["transparent", shimmerColor, "transparent"]}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>
    </View>
  );
};

export const StatCardSkeleton = React.memo(({ isLarge, Colors }) => (
  <Shimmer 
    style={[
      styles.statCardSkeleton, 
      isLarge ? styles.statCardLarge : styles.statCardSmall,
      { backgroundColor: Colors.surfaceLight }
    ]} 
    isDarkTheme={Colors.background === "#0A0E27"}
  >
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonIcon, { backgroundColor: Colors.surface }]} />
      <View style={[styles.skeletonValue, { backgroundColor: Colors.surface }]} />
      <View style={[styles.skeletonLabel, { backgroundColor: Colors.surface }]} />
    </View>
  </Shimmer>
));

export const DashboardCardSkeleton = React.memo(({ Colors }) => (
  <Shimmer 
    style={[styles.dashboardCardSkeleton, { backgroundColor: Colors.surfaceLight }]} 
    isDarkTheme={Colors.background === "#0A0E27"}
  >
    <View style={styles.skeletonContentFull}>
      <View style={styles.skeletonHeader}>
        <View style={[styles.dashboardIconSkeleton, { backgroundColor: Colors.surface }]} />
      </View>
      <View style={{ gap: 10, marginTop: 'auto' }}>
        <View style={[styles.skeletonText, { backgroundColor: Colors.surface, width: '65%', height: 18 }]} />
        <View style={[styles.skeletonText, { backgroundColor: Colors.surface, width: '45%', height: 36 }]} />
        <View style={[styles.skeletonText, { backgroundColor: Colors.surface, width: '55%', height: 14 }]} />
      </View>
    </View>
  </Shimmer>
));

export const DeviceCardSkeleton = React.memo(({ Colors }) => (
  <Shimmer 
    style={[styles.deviceCardSkeleton, { backgroundColor: Colors.surfaceLight }]} 
    isDarkTheme={Colors.background === "#0A0E27"}
  >
    <View style={styles.skeletonContentFull}>
      <View style={styles.skeletonHeader}>
        <View style={[styles.deviceIconSkeleton, { backgroundColor: Colors.surface }]} />
      </View>
      <View style={{ marginTop: 'auto', gap: 8 }}>
        <View style={[styles.skeletonText, { backgroundColor: Colors.surface, width: '75%', height: 16 }]} />
        <View style={[styles.skeletonText, { backgroundColor: Colors.surface, width: '45%', height: 13 }]} />
        <View style={[styles.skeletonText, { backgroundColor: Colors.surface, width: '35%', height: 26, marginTop: 4 }]} />
      </View>
    </View>
  </Shimmer>
));

const styles = StyleSheet.create({
  statCardSkeleton: {
    borderRadius: 22,
    marginBottom: CARD_GAP,
  },
  statCardLarge: {
    width: '100%',
    height: 130,
  },
  statCardSmall: {
    width: (width - CARD_PADDING * 2 - CARD_GAP) / 2,
    height: 130,
  },
  dashboardCardSkeleton: {
    width: 170,
    height: 180,
    marginRight: 16,
    borderRadius: 24,
  },
  deviceCardSkeleton: {
    width: (width - CARD_PADDING * 2 - CARD_GAP) / 2,
    borderRadius: 24,
    height: 175,
    marginBottom: CARD_GAP,
  },
  skeletonContent: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  skeletonContentFull: {
    flex: 1,
    padding: 18,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  dashboardIconSkeleton: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  deviceIconSkeleton: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  skeletonValue: {
    width: '60%',
    height: 24,
    borderRadius: 6,
    marginTop: 10,
  },
  skeletonLabel: {
    width: '40%',
    height: 12,
    borderRadius: 4,
  },
  skeletonText: {
    borderRadius: 4,
  },
});

export default Shimmer;
