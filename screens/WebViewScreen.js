import React, { useState, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Text,
  Linking,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { Share2, X, ChevronLeft, ChevronRight, RotateCw, Globe } from "lucide-react-native";

export default function WebViewScreen({ route, navigation }) {
  const { url, title } = route.params;
  const { isDarkTheme } = useAuth();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);

  const [progress, setProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);

  const Colors = useMemo(() => ({
    background: isDarkTheme ? "#0A0E27" : "#F1F5F9",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    border: isDarkTheme ? "#252B4A" : "#E2E8F0",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    text: isDarkTheme ? "#FFFFFF" : "#1E293B",
    textSecondary: isDarkTheme ? "#8B91A7" : "#64748B",
    progressBar: isDarkTheme ? "#00D9FF" : "#3B82F6",
  }), [isDarkTheme]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: Platform.OS === 'ios' ? title : `${title} - ${currentUrl}`,
        url: currentUrl,
        title: title,
      });
    } catch (error) {
      console.error('Error sharing:', error.message);
    }
  };

  const handleOpenBrowser = () => {
    Linking.openURL(currentUrl).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* Custom Header for Modal */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: Colors.surface, 
          paddingTop: insets.top + 10,
          borderBottomColor: Colors.border 
        }
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: Colors.text }]} numberOfLines={1}>
            {title || "Browser"}
          </Text>
          <Text style={[styles.headerUrl, { color: Colors.textSecondary }]} numberOfLines={1}>
            {currentUrl}
          </Text>
        </View>

        <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
          <Share2 size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      {progress < 1 && (
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${progress * 100}%`, 
                backgroundColor: Colors.progressBar 
              }
            ]} 
          />
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={{ backgroundColor: Colors.background }}
        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          setCanGoForward(navState.canGoForward);
          setCurrentUrl(navState.url);
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.loadingContainer, { backgroundColor: Colors.background }]}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      />

      {/* Bottom Toolbar */}
      <View style={[
        styles.toolbar, 
        { 
          backgroundColor: Colors.surface, 
          paddingBottom: insets.bottom + 10,
          borderTopColor: Colors.border
        }
      ]}>
        <TouchableOpacity 
          onPress={() => webViewRef.current?.goBack()} 
          disabled={!canGoBack}
          style={[styles.toolbarButton, !canGoBack && styles.disabledButton]}
        >
          <ChevronLeft size={28} color={canGoBack ? Colors.text : Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => webViewRef.current?.goForward()} 
          disabled={!canGoForward}
          style={[styles.toolbarButton, !canGoForward && styles.disabledButton]}
        >
          <ChevronRight size={28} color={canGoForward ? Colors.text : Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => webViewRef.current?.reload()} style={styles.toolbarButton}>
          <RotateCw size={24} color={Colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleOpenBrowser} style={styles.toolbarButton}>
          <Globe size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 10,
  },
  headerButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerUrl: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBarContainer: {
    height: 3,
    width: '100%',
    backgroundColor: 'transparent',
    zIndex: 9,
  },
  progressBar: {
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toolbarButton: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
  },
  disabledButton: {
    opacity: 0.3,
  },
});
