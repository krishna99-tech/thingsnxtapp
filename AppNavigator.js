import React, { useMemo, useEffect, useState } from "react";
import {
  View,
  Platform,
  StyleSheet,
  Text,
  PermissionsAndroid,
  Linking,
  Animated,
  Dimensions,
  Pressable,
} from "react-native";
import { 
  NavigationContainer, 
  DefaultTheme, 
  DarkTheme, 
  useTheme 
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Context & Components
import { useAuth } from "./context/AuthContext";
import CustomAlert from "./components/CustomAlert";

// Screens
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import MainDashboardScreen from "./screens/MainDashboardScreen";
import DevicesScreen from "./screens/DevicesScreen";
import DeviceDetailScreen from "./screens/DeviceDetailScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import HomeScreen from "./screens/HomeScreen";
import DashboardScreen from "./screens/DashboardScreen";
import ProfileScreen from "./screens/ProfileScreen";
import WebViewScreen from './screens/WebViewScreen';
import ConnectedAppsScreen from "./screens/ConnectedAppsScreen";
import WebhooksScreen from "./screens/WebhooksScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const { width: screenWidth } = Dimensions.get("window");

// Helper function for alpha colors
const alpha = (hex, opacity) => {
  const o = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + o;
};

/**
 * Custom Tab Bar Component
 * Elegant floating tab bar with enhanced design
 */
function CustomTabBar({ state, descriptors, navigation, isDarkTheme }) {
  const insets = useSafeAreaInsets();
  
  const tabColors = {
    darkBackground: "#1C1F26",
    lightBackground: "#FFFFFF",
    darkBorder: "#30363D",
    lightBorder: "#E5E7EB",
  };

  const isLight = !isDarkTheme;
  const backgroundColor = isLight ? tabColors.lightBackground : tabColors.darkBackground;
  const borderColor = isLight ? tabColors.lightBorder : tabColors.darkBorder;
  const textColor = isLight ? "#111827" : "#E6EDF3";
  const accentColor = isLight ? "#3B82F6" : "#00D9FF";
  const inactiveColor = isLight ? "#9CA3AF" : "#6E7681";

  return (
    <View style={[
      styles.customTabBarContainer,
      { paddingBottom: Math.max(insets.bottom, 16) }
    ]}>
      <View style={[
        styles.customTabBar,
        {
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          borderTopColor: borderColor,
        }
      ]}>
        {/* Gradient Accent Line */}
        <LinearGradient
          colors={[accentColor, accentColor + '00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.tabBarAccentLine}
        />

        {/* Tab Items */}
        <View style={styles.tabItemsContainer}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                preventDefault: () => {},
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            // Get icon based on route
            const getIcon = (name, focused) => {
              const iconSize = 24;
              const iconColor = isFocused ? accentColor : inactiveColor;

              const iconMap = {
                Home: <Ionicons name={focused ? "home" : "home-outline"} size={iconSize} color={iconColor} />,
                Devices: <MaterialCommunityIcons name="developer-board" size={iconSize} color={iconColor} />,
                Dashboards: <MaterialCommunityIcons name={focused ? "view-dashboard" : "view-dashboard-outline"} size={iconSize} color={iconColor} />,
                Notifications: <Ionicons name={focused ? "notifications" : "notifications-outline"} size={iconSize} color={iconColor} />,
                Settings: <Ionicons name={focused ? "settings" : "settings-outline"} size={iconSize} color={iconColor} />,
              };

              return iconMap[name] || <Ionicons name="ellipse-outline" size={iconSize} color={iconColor} />;
            };

            return (
              <View key={route.key} style={styles.tabItem}>
                <Pressable
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={[
                    styles.tabItemButton,
                    isFocused && [
                      styles.tabItemButtonActive,
                      { backgroundColor: alpha(accentColor, 0.08) }
                    ]
                  ]}
                  android_ripple={{
                    color: accentColor,
                    radius: 20,
                  }}
                >
                  {/* Icon */}
                  <View style={styles.tabIconWrapper}>
                    {getIcon(route.name, isFocused)}
                    {isFocused && (
                      <View 
                        style={[
                          styles.tabIndicatorDot,
                          { backgroundColor: accentColor }
                        ]} 
                      />
                    )}
                  </View>

                  {/* Label */}
                  {isFocused && (
                    <Text 
                      style={[
                        styles.tabLabel,
                        { color: accentColor }
                      ]}
                      numberOfLines={1}
                    >
                      {route.name}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/**
 * Main Tab Navigation
 * Features enhanced floating bottom navigation
 */
function MainTabs() {
  const { colors, dark: isDarkTheme } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <CustomTabBar {...props} isDarkTheme={isDarkTheme} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="Dashboards" component={MainDashboardScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

/**
 * Root Navigator
 * Handles Auth Logic, Global Modals, and Permissions
 */
export default function RootNavigator() {
  const { userToken, isDarkTheme, alertVisible, alertConfig, showAlert } = useAuth();
  const [appState, setAppState] = useState('active');

  useEffect(() => {
    const requestPermission = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            showAlert({
              type: 'warning',
              title: 'Notifications Disabled',
              message: 'Please enable notifications in settings to receive updates.',
              buttons: [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            });
          }
        } catch (err) {
          console.warn('Failed to request notification permission:', err);
        }
      }
    };
    requestPermission();
  }, [showAlert]);

  // Enhanced custom theme with better color palette
  const customTheme = isDarkTheme 
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: '#00D9FF',
          background: '#0F1117',
          card: '#1C1F26',
          text: '#E6EDF3',
          border: '#30363D',
        }
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: '#3B82F6',
          background: '#F9FAFB',
          card: '#FFFFFF',
          text: '#111827',
          border: '#E5E7EB',
        }
      };

  return (
    <NavigationContainer theme={customTheme}>
      <StatusBar 
        style={isDarkTheme ? "light" : "dark"}
        translucent={false}
        backgroundColor={customTheme.colors.background}
      />
      
      <Stack.Navigator 
        screenOptions={{ 
          headerStyle: { 
            backgroundColor: isDarkTheme ? '#1C1F26' : '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: isDarkTheme ? '#30363D' : '#E5E7EB',
          },
          headerTintColor: isDarkTheme ? '#E6EDF3' : '#111827',
          headerTitleStyle: { 
            fontWeight: '700',
            letterSpacing: -0.3,
          },
          headerShadowVisible: false,
          cardStyle: {
            backgroundColor: isDarkTheme ? '#0F1117' : '#F9FAFB',
          },
        }}
      >
        {userToken ? (
          // ============================================
          // Authenticated App Flow
          // ============================================
          <Stack.Group>
            {/* Main Tab Navigation */}
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabs} 
              options={{ 
                headerShown: false,
                animationEnabled: true,
              }} 
            />
            
            {/* Full-Screen Detail Screen */}
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen} 
              options={{ 
                headerShown: false,
                animationEnabled: true,
              }} 
            />
            
            {/* Modal-style Screens with improved presentation */}
            <Stack.Screen 
              name="DeviceDetail" 
              component={DeviceDetailScreen} 
              options={{ 
                presentation: 'card',
                animationEnabled: true,
                headerStyle: {
                  backgroundColor: 'transparent',
                },
                headerTitle: 'Device Details',
              }} 
            />

            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen} 
              options={{ 
                presentation: 'card',
                animationEnabled: true,
                headerTitle: 'Profile Settings',
              }} 
            />

            <Stack.Screen 
              name="ConnectedApps" 
              component={ConnectedAppsScreen} 
              options={{ 
                presentation: 'card',
                animationEnabled: true,
                headerTitle: 'Connected Applications',
              }} 
            />

            <Stack.Screen 
              name="Webhooks" 
              component={WebhooksScreen} 
              options={{ 
                presentation: 'card',
                animationEnabled: true,
                headerTitle: 'Webhooks Configuration',
              }} 
            />

            <Stack.Screen 
              name="ForgotPassword" 
              component={ForgotPasswordScreen} 
              options={{ 
                presentation: 'card',
                animationEnabled: true,
                headerTitle: 'Reset Password',
              }} 
            />
            
            {/* Custom Transparent Bottom Sheet Screen */}
            <Stack.Screen 
              name="WebView" 
              component={WebViewScreen} 
              options={{ 
                headerShown: false, 
                presentation: "transparentModal", 
                animationEnabled: true,
                cardStyle: { 
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  opacity: 1,
                },
              }} 
            />
          </Stack.Group>
        ) : (
          // ============================================
          // Authentication Flow
          // ============================================
          <Stack.Group screenOptions={{ 
            headerShown: false, 
            presentation: 'transparentModal',
            animationEnabled: true,
            cardStyle: {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }
          }}>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{
                animationEnabled: false,
                cardStyle: {
                  backgroundColor: isDarkTheme ? '#0F1117' : '#F9FAFB',
                },
              }}
            />
            <Stack.Screen 
              name="Signup" 
              component={SignupScreen}
              options={{
                gestureEnabled: true,
              }}
            />
            <Stack.Screen 
              name="ForgotPassword" 
              component={ForgotPasswordScreen}
              options={{
                gestureEnabled: true,
              }}
            />
            <Stack.Screen 
              name="ResetPassword" 
              component={ResetPasswordScreen}
              options={{
                gestureEnabled: true,
              }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>

      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />
    </NavigationContainer>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  // Custom Tab Bar
  customTabBarContainer: {
    backgroundColor: 'transparent',
  },
  customTabBar: {
    flexDirection: 'row',
    height: 70,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  tabBarAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  tabItemsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabItemButtonActive: {
    borderRadius: 12,
  },
  tabIconWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIndicatorDot: {
    position: 'absolute',
    bottom: -8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  // Loader
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});