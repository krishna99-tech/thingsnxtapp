import React from "react";
import {
  View,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  PermissionsAndroid,
  Linking,
} from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme, useTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "./context/AuthContext";
import { StatusBar } from "expo-status-bar";

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
import WebViewScreen from './screens/WebViewScreen'; // 👈 Import the new screen
import ConnectedAppsScreen from "./screens/ConnectedAppsScreen";


import CustomAlert from "./components/CustomAlert";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { colors, dark: isDarkTheme } = useTheme(); // Get theme colors and dark mode status

  // Create a theme-aware color palette for the tab bar
  const TabBarColors = React.useMemo(() => ({
    active: colors.primary,
    inactive: colors.text, // Using theme's text color for inactive tabs
    background: colors.card,
  }), [colors.primary, colors.text, colors.card]);

  // Create a memoized, theme-aware style for the tab bar
  const tabBarStyle = React.useMemo(() => ({
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,
    elevation: 5,
    backgroundColor: TabBarColors.background,
    borderRadius: 15,
    height: 70,
    paddingBottom: 8,
    // Theme-aware shadow
    shadowColor: isDarkTheme ? colors.primary : '#171717',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkTheme ? 0.3 : 0.1,
    shadowRadius: 4,
  }), [TabBarColors.background, colors.primary, isDarkTheme]);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,

        // 🔥 FIXED ICONS — ALL VALID
        tabBarIcon: ({ color, size, focused }) => {
          switch (route.name) {
            case "Home":
              return (
                <Ionicons
                  name={focused ? "home" : "home-outline"}
                  size={size}
                  color={color}
                />
              );

            case "Devices":
              return (
                <MaterialCommunityIcons
                  name="developer-board"
                  size={size}
                  color={color}
                />
              );

            case "Dashboards":
              return (
                <MaterialCommunityIcons
                  name={focused ? "view-dashboard" : "view-dashboard-outline"}
                  size={size}
                  color={color}
                />
              );

            case "Notifications":
              return (
                <Ionicons
                  name={
                    focused ? "notifications" : "notifications-outline"
                  }
                  size={size}
                  color={color}
                />
              );

            case "Settings":
              return (
                <Ionicons
                  name={focused ? "settings" : "settings-outline"}
                  size={size}
                  color={color}
                />
              );

            default:
              return (
                <Ionicons
                  name="ellipse-outline"
                  size={size}
                  color={color}
                />
              );
          }
        },

        // LABEL STYLE
        tabBarLabel: ({ focused, color }) => {
          // Only show the label for the active tab to save space
          if (!focused) return null;
          
          return <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{route.name}</Text>;
        },

        tabBarActiveTintColor: TabBarColors.active,
        tabBarInactiveTintColor: TabBarColors.inactive,

        // TAB BAR STYLE
        tabBarStyle: tabBarStyle,
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


function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { userToken, isDarkTheme, alertVisible, alertConfig, showAlert } = useAuth();

  // Request Notification Permission for Android 13+
  React.useEffect(() => {
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

  return (
    <NavigationContainer theme={isDarkTheme ? DarkTheme : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#F1F5F9' }}}>
      <>
        <StatusBar style={isDarkTheme ? "light" : "dark"} />
        <Stack.Navigator screenOptions={{ 
          headerStyle: {
            backgroundColor: isDarkTheme ? '#1A1F3A' : '#FFFFFF',
          },
          headerTintColor: isDarkTheme ? '#FFFFFF' : '#1E293B',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShadowVisible: false, // Hides the shadow/border under the header
         }} >
          {userToken ? (
            <>
              <Stack.Screen name="App" component={AppStack} options={{ headerShown: false }}/>
              {/* Modal and Detail Screens - Moved to the root stack for global access */}
              <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{ headerShown: true, presentation: 'modal'}} />
              <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, presentation: 'modal' }} />
               <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{headerShown:false}} /> 
              <Stack.Screen name="ConnectedApps" component={ConnectedAppsScreen} options={{ headerShown: true, presentation: 'modal' }} />
              <Stack.Screen 
                name="WebView" 
                component={WebViewScreen} 
                options={{ 
                  headerShown: false,
                  headerBackTitleVisible: false,
                  presentation: "transparentModal", // enables custom bottom‑sheet style
                  animation: "slide_from_bottom",   // nicer bottom‑up animation
                }} 
              />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{headerShown:false,headerBackTitleVisible:false,presentation: 'transparentModal', animation: 'slide_from_bottom',}}  />
              <Stack.Screen name="Signup" component={SignupScreen} options={{headerShown:false,headerBackTitleVisible:false,presentation: 'transparentModal', animation: 'slide_from_bottom',}} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{headerShown:false,headerBackTitleVisible:false,presentation: 'transparentModal', animation: 'slide_from_bottom',}} />
              <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{headerShown:false,headerBackTitleVisible:false,presentation: 'transparentModal', animation: 'slide_from_bottom',}} />
            </>
          )}
        </Stack.Navigator>
        <CustomAlert
          visible={alertVisible}
          isDarkTheme={isDarkTheme}
          {...alertConfig}
        />
      </>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  tabBar: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    elevation: 3,
    backgroundColor: "#fff",
    borderRadius: 15,
    height: 60,
  },
  iconName: {
    fontSize: 24,
    color: "#333",
  },

});