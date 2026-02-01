import React, { useContext, useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Toast from "react-native-toast-message";
import { Check, X, Info, AlertTriangle } from "lucide-react-native";
import { AuthContext } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getToastColors } from "../utils/theme";
import { LinearGradient } from "expo-linear-gradient";

const CustomToast = ({ text1, text2, type, props }) => {
  const { isDarkTheme } = props;
  const Colors = getToastColors(isDarkTheme);

  const STYLES = {
    success: {
      icon: Check,
      color: Colors.success,
      bg: Colors.successBg,
      iconBg: [Colors.success, Colors.success + '80'], // Gradient colors for icon bg
    },
    error: {
      icon: X,
      color: Colors.error,
      bg: Colors.errorBg,
      iconBg: [Colors.error, Colors.error + '80'],
    },
    info: {
      icon: Info,
      color: Colors.info,
      bg: Colors.infoBg,
      iconBg: [Colors.info, Colors.info + '80'],
    },
  };

  const styleConfig = STYLES[type] || STYLES.info;
  const IconComponent = styleConfig.icon;

  return (
    <View style={styles.shadowContainer}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDarkTheme ? '#1E293B' : '#FFFFFF',
            borderColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          },
        ]}
      >
        {/* Accent Line */}
        <View style={[styles.accentLine, { backgroundColor: styleConfig.color }]} />

        <LinearGradient
          colors={styleConfig.iconBg}
          style={styles.iconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <IconComponent size={20} color="#FFF" strokeWidth={3} />
        </LinearGradient>

        <View style={styles.textContainer}>
          <Text 
            style={[
              styles.text1, 
              { color: isDarkTheme ? '#F8FAFC' : '#1E293B' }
            ]}
            numberOfLines={1}
          >
            {text1}
          </Text>
          {text2 ? (
            <Text 
              style={[
                styles.text2, 
                { color: isDarkTheme ? '#94A3B8' : '#64748B' }
              ]}
              numberOfLines={2}
            >
              {text2}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const toastConfig = {
  success: ({ text1, text2, props }) => (
    <CustomToast text1={text1} text2={text2} type="success" props={props} />
  ),
  error: ({ text1, text2, props }) => (
    <CustomToast text1={text1} text2={text2} type="error" props={props} />
  ),
  info: ({ text1, text2, props }) => (
    <CustomToast text1={text1} text2={text2} type="info" props={props} />
  ),
};

// Store the current theme for toast calls that don't provide it
let currentTheme = false;

export function showToast({
  type = "success",
  text1 = "",
  text2 = "",
  position = "top",
  visibilityTime = 3000,
  isDarkTheme,
  ...rest
}) {
  // Use provided theme or fall back to stored theme
  const theme = isDarkTheme !== undefined ? isDarkTheme : currentTheme;
  Toast.show({
    type,
    props: { isDarkTheme: theme },
    text1,
    text2,
    position,
    visibilityTime,
    topOffset: 60,
    ...rest,
  });
}
showToast.success = (text1, text2, opts = {}) =>
  showToast({ type: "success", text1, text2, ...opts });
showToast.error = (text1, text2, opts = {}) =>
  showToast({ type: "error", text1, text2, ...opts });
showToast.info = (text1, text2, opts = {}) =>
  showToast({ type: "info", text1, text2, ...opts });

export default function ToastWrapper() {
  const { isDarkTheme } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  // Update the stored theme whenever it changes
  useEffect(() => {
    currentTheme = isDarkTheme;
  }, [isDarkTheme]);

  return (
    <Toast
      config={toastConfig}
      topOffset={insets.top + 10}
      props={{ isDarkTheme }} // Pass theme to all toasts
    />
  );
}

const styles = StyleSheet.create({
  shadowContainer: {
    width: "92%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  container: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginLeft: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  text1: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  text2: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});