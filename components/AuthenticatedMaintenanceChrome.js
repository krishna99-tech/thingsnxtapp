import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlatformConfig } from "../context/PlatformConfigContext";
import { useAuth } from "../context/AuthContext";

const DEFAULT_MSG =
  "We are performing maintenance. You may experience limited functionality.";

/**
 * When the user is logged in, shows the same maintenance treatment as login:
 * - Banner: non-blocking amber bar on every screen (default).
 * - Blocking: full-screen modal if mobile_app.maintenance_blocking is true (set in admin Platform settings).
 */
export default function AuthenticatedMaintenanceChrome({ userToken, children }) {
  const { config } = usePlatformConfig();
  const { logout, isDarkTheme } = useAuth();
  const insets = useSafeAreaInsets();

  const ma = config?.mobile_app || {};
  const maintenanceOn = !!userToken && !!ma.maintenance_mode;
  const blocking = !!ma.maintenance_blocking;
  const msg = (ma.maintenance_message && String(ma.maintenance_message).trim()) || DEFAULT_MSG;

  if (!userToken) {
    return <View style={styles.flex}>{children}</View>;
  }

  if (!maintenanceOn) {
    return <View style={styles.flex}>{children}</View>;
  }

  if (blocking) {
    return (
      <View style={styles.flex}>
        <View style={styles.flex}>{children}</View>
        <Modal
          visible
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {}}
        >
          <View
            style={[
              styles.blockRoot,
              {
                paddingTop: insets.top + 12,
                paddingBottom: Math.max(insets.bottom, 20),
                backgroundColor: isDarkTheme ? "rgba(15,17,23,0.97)" : "rgba(17,24,39,0.96)",
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.blockScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.blockTitle}>Maintenance</Text>
              <Text style={[styles.blockBody, isDarkTheme && styles.blockBodyDark]}>{msg}</Text>
              <Text style={styles.blockHint}>
                The app is temporarily unavailable. Sign out if you need to use another account.
              </Text>
              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={() => logout()}
                activeOpacity={0.85}
              >
                <Text style={styles.signOutText}>Sign out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View
        style={[
          styles.banner,
          {
            paddingTop: Math.max(insets.top, 8),
            paddingBottom: 10,
          },
        ]}
      >
        <Text style={styles.bannerText}>{msg}</Text>
      </View>
      <View style={[styles.flex, styles.minZero]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  minZero: { minHeight: 0 },
  banner: {
    backgroundColor: "#d97706",
    paddingHorizontal: 14,
  },
  bannerText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  blockRoot: {
    flex: 1,
    justifyContent: "center",
  },
  blockScroll: {
    paddingHorizontal: 24,
    alignItems: "stretch",
  },
  blockTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f9fafb",
    marginBottom: 16,
    textAlign: "center",
  },
  blockBody: {
    fontSize: 16,
    lineHeight: 24,
    color: "#e5e7eb",
    textAlign: "center",
    marginBottom: 16,
  },
  blockBodyDark: {
    color: "#e5e7eb",
  },
  blockHint: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  signOutBtn: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "center",
    minWidth: 200,
  },
  signOutText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
});
