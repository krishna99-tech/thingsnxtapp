import React, { useMemo, useEffect } from "react";
import {
  View,
  Platform,
  StyleSheet,
  Text,
  PermissionsAndroid,
  Linking,
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

/**
 * Main Tab Navigation
 * Features a floating, theme-aware bottom bar
 */
function MainTabs() {
  const { colors, dark: isDarkTheme } = useTheme();

  const tabBarColors = useMemo(() => ({
    active: colors.primary,
    inactive: colors.text,
    background: colors.card,
  }), [colors]);

  const tabBarStyle = useMemo(() => ({
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,
    elevation: 5,
    backgroundColor: tabBarColors.background,
    borderRadius: 15,
    height: 70,
    paddingBottom: 8,
    borderTopWidth: 0,
    shadowColor: isDarkTheme ? colors.primary : '#171717',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkTheme ? 0.3 : 0.1,
    shadowRadius: 4,
  }), [tabBarColors, colors.primary, isDarkTheme]);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true, 
        tabBarActiveTintColor: tabBarColors.active,
        tabBarInactiveTintColor: tabBarColors.inactive,
        tabBarStyle: tabBarStyle,
        tabBarIcon: ({ color, size, focused }) => {
          switch (route.name) {
            case "Home":
              return <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />;
            case "Devices":
              return <MaterialCommunityIcons name="developer-board" size={size} color={color} />;
            case "Dashboards":
              return <MaterialCommunityIcons name={focused ? "view-dashboard" : "view-dashboard-outline"} size={size} color={color} />;
            case "Notifications":
              return <Ionicons name={focused ? "notifications" : "notifications-outline"} size={size} color={color} />;
            case "Settings":
              return <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />;
            default:
              return <Ionicons name="ellipse-outline" size={size} color={color} />;
          }
        },
        tabBarLabel: ({ focused, color }) => {
          if (!focused) return null;
          return <Text style={{ color, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>{route.name}</Text>;
        },
      })}
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
  }, []);

  const customTheme = isDarkTheme ? DarkTheme : { 
    ...DefaultTheme, 
    colors: { ...DefaultTheme.colors, background: '#F1F5F9' }
  };

  return (
    <NavigationContainer theme={customTheme}>
      <StatusBar style={isDarkTheme ? "light" : "dark"} />
      
      <Stack.Navigator 
        screenOptions={{ 
          headerStyle: { backgroundColor: isDarkTheme ? '#1A1F3A' : '#FFFFFF' },
          headerTintColor: isDarkTheme ? '#FFFFFF' : '#1E293B',
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false,
        }}
      >
        {userToken ? (
          // Authenticated App Flow
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            
            {/* Standard Detail Screens */}
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
            
            {/* Modal-style Screens */}
            <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{ presentation: 'modal'}} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="ConnectedApps" component={ConnectedAppsScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Webhooks" component={WebhooksScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ presentation: 'modal'}} />
            
            {/* Custom Transparent Bottom Sheet Screen */}
            <Stack.Screen 
              name="WebView" 
              component={WebViewScreen} 
              options={{ 
                headerShown: false, 
                presentation: "transparentModal", 
                animation: "slide_from_bottom" 
              }} 
            />
          </Stack.Group>
        ) : (
          // Auth Flow
          <Stack.Group screenOptions={{ 
            headerShown: false, 
            presentation: 'transparentModal', 
            animation: 'slide_from_bottom' 
          }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
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

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});