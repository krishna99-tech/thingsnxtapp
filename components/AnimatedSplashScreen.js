import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { Cpu } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  runOnJS, 
  withSequence,
  withRepeat,
  withSpring,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

export default function AnimatedSplashScreen({ children }) {
  // Application readiness states
  const { loading: isAuthLoading } = useAuth();
  const [isAppReady, setAppReady] = useState(false);
  const [isSplashAnimationComplete, setSplashAnimationComplete] = useState(false);

  // Animation values
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load assets here
        // await Asset.fromModule(require('../assets/icon.png')).downloadAsync();
        
        // Start entrance animation
        logoOpacity.value = withTiming(1, { duration: 800 });
        logoScale.value = withSpring(1);

        // Force a minimum splash time of 2s to show branding
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  // Exit Animation Logic
  const onImageLoaded = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch (e) {
      // Create a smooth exit animation
    } finally {
      // Start exit animation
      opacity.value = withTiming(0, { 
        duration: 800,
        easing: Easing.out(Easing.exp)
      });
      scale.value = withTiming(1.5, { 
        duration: 800,
        easing: Easing.out(Easing.exp)
      }, () => {
        runOnJS(setSplashAnimationComplete)(true);
      });
    }
  }, []);

  // Trigger exit when both App and Auth are ready
  useEffect(() => {
    if (isAppReady && !isAuthLoading) {
      onImageLoaded();
    }
  }, [isAppReady, isAuthLoading, onImageLoaded]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View style={{ flex: 1 }}>
      {children}
      
      {!isSplashAnimationComplete && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.splashContainer, animatedContainerStyle]}
        >
          <LinearGradient
            colors={['#0f172a', '#1e293b', '#0f172a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          <Animated.View style={[styles.contentContainer, animatedLogoStyle]}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0)']}
                style={styles.glow}
              />
              <Cpu size={80} color="#60A5FA" strokeWidth={1.5} />
            </View>
            
            <View style={styles.textWrapper}>
              <Text style={styles.brandTitle}>
                Things<Text style={styles.brandAccent}>NXT</Text>
              </Text>
              <Text style={styles.brandSubtitle}>Initializing System...</Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  textWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -1,
  },
  brandAccent: {
    color: '#3B82F6',
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
