import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const Shimmer = ({ children, style, isDarkTheme }) => {
  const shimmerAnimatedValue = React.useRef(new Animated.Value(-1)).current;

  React.useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnimatedValue, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, []);

  const translateX = shimmerAnimatedValue.interpolate({
    inputRange: [-1, 1],
    outputRange: [-350, 350],
  });

  const shimmerColor = isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";

  return (
    <View style={style}>
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
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>
    </View>
  );
};

const DeviceDetailSkeleton = ({ isDarkTheme }) => {
  const Colors = {
    background: isDarkTheme ? "#0A0E27" : "#F1F5F9",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#252B4A" : "#E2E8F0",
  };

  const Placeholder = ({ width, height, style }) => (
    <View style={[{ width, height, backgroundColor: Colors.surfaceLight, borderRadius: 8 }, style]} />
  );

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Shimmer style={[styles.card, { backgroundColor: Colors.surface }]} isDarkTheme={isDarkTheme}>
        <View style={styles.header}>
          <Placeholder width={64} height={64} style={{ borderRadius: 16 }} />
          <View style={{ flex: 1, gap: 12 }}>
            <Placeholder width="50%" height={20} />
            <Placeholder width="30%" height={16} />
          </View>
        </View>
        <View style={styles.grid}>
          <View style={styles.infoItem}><Placeholder width="80%" height={14} /><Placeholder width="60%" height={16} /></View>
          <View style={styles.infoItem}><Placeholder width="80%" height={14} /><Placeholder width="60%" height={16} /></View>
          <View style={styles.infoItem}><Placeholder width="80%" height={14} /><Placeholder width="60%" height={16} /></View>
          <View style={styles.infoItem}><Placeholder width="80%" height={14} /><Placeholder width="60%" height={16} /></View>
        </View>
      </Shimmer>

      <Shimmer style={[styles.section, { backgroundColor: Colors.surface }]} isDarkTheme={isDarkTheme}>
        <Placeholder width="40%" height={20} />
        <Placeholder width="100%" height={50} />
      </Shimmer>

      <View style={styles.section}>
        <Placeholder width="30%" height={24} style={{ marginBottom: 16 }} />
        <View style={styles.grid}>
          <Shimmer style={[styles.sensorCard, { backgroundColor: Colors.surface }]} isDarkTheme={isDarkTheme}>
            <Placeholder width={48} height={48} style={{ borderRadius: 12 }} />
            <Placeholder width="80%" height={16} />
            <Placeholder width="50%" height={28} />
          </Shimmer>
          <Shimmer style={[styles.sensorCard, { backgroundColor: Colors.surface }]} isDarkTheme={isDarkTheme}>
            <Placeholder width={48} height={48} style={{ borderRadius: 12 }} />
            <Placeholder width="80%" height={16} />
            <Placeholder width="50%" height={28} />
          </Shimmer>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 0 },
  card: { borderRadius: 16, padding: 20, marginTop: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  infoItem: { width: '48%', gap: 8 },
  section: { padding: 20, borderRadius: 16, marginTop: 24, overflow: 'hidden' },
  sensorCard: { width: '48.5%', borderRadius: 12, padding: 16, gap: 12, overflow: 'hidden' },
});

export default React.memo(DeviceDetailSkeleton);

