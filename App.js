import React from "react";
import {
  View,
  ActivityIndicator,
  Platform,
  Dimensions,
  StyleSheet,
} from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Toast from "react-native-toast-message";

// Screens
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import MainDashboardScreen from "./components/MainDashboardScreen";
import DevicesScreen from "./components/DevicesScreen";
import DeviceDetailScreen from "./components/DeviceDetailScreen";
import NotificationsScreen from "./components/NotificationsScreen";
import SettingsScreen from "./components/SettingsScreen";
import HomeScreen from "./components/HomeScreen";
import DashboardScreen from "./components/DashboardScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function GradientTabBarBackground() {
  return (
    <LinearGradient
      colors={["#ffffff", "#f0f4f8"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get("window").width;

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Devices":
              iconName = focused ? "hardware-chip" : "hardware-chip-outline";
              break;
            case "Dashboards":
              iconName = focused ? "speedometer" : "speedometer-outline";
              break;
            case "Notifications":
              iconName = focused ? "notifications" : "notifications-outline";
              break;
            case "Settings":
              iconName = focused ? "settings" : "settings-outline";
              break;
            default:
              iconName = "ellipse-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? insets.bottom * 0.3 : 5,
        },
        tabBarActiveTintColor: "#007aff",
        tabBarInactiveTintColor: "gray",
        tabBarBackground: () => <GradientTabBarBackground />,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -3 },
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
          overflow: "hidden",
          height:
            Platform.OS === "ios"
              ? 70 + insets.bottom
              : 70 + insets.bottom * 0.5,
          width: screenWidth,
          alignSelf: "center",
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

function RootNavigator() {
  const { userToken, loading, isDarkTheme } = useAuth();

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={isDarkTheme ? DarkTheme : DefaultTheme}>
      <Stack.Navigator
        initialRouteName={userToken ? "MainTabs" : "Login"}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen
          name="DashboardDetail"
          component={MainDashboardScreen}
          options={{ title: "Dashboard Details" }}
        />
        <Stack.Screen
          name="DeviceDetail"
          component={DeviceDetailScreen}
          options={{ title: "Device Details" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <LinearGradient colors={["#fdfbfb", "#ebedee"]} style={{ flex: 1 }}>
      <AuthProvider>
        <RootNavigator />
        <Toast />
      </AuthProvider>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
