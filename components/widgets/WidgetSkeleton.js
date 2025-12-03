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
    outputRange: [-180, 180], // Approximate width of the widget
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

const WidgetSkeleton = ({ isDarkTheme }) => {
  const Colors = {
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#252B4A" : "#E2E8F0",
  };

  return (
    <Shimmer style={[styles.container, { backgroundColor: Colors.surface }]} isDarkTheme={isDarkTheme}>
        <View style={{ padding: 16, gap: 12, opacity: 0.5 }}>
            <View style={{ width: 40, height: 40, backgroundColor: Colors.surfaceLight, borderRadius: 12 }} />
            <View style={{ height: 16, width: '70%', backgroundColor: Colors.surfaceLight, borderRadius: 8 }} />
            <View style={{ height: 28, width: '50%', backgroundColor: Colors.surfaceLight, borderRadius: 8 }} />
        </View>
    </Shimmer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 12, },
});

export default React.memo(WidgetSkeleton);