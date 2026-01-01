import React, { useContext, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { ChevronLeft, Command, Slack, Chrome, Radio } from 'lucide-react-native';
import { showToast } from '../components/Toast';
import CustomAlert from '../components/CustomAlert';

export default function ConnectedAppsScreen({ navigation }) {
  const { isDarkTheme } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [loadingId, setLoadingId] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  const Colors = useMemo(() => ({
    background: isDarkTheme ? "#0A0E27" : "#F1F5F9",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#252B4A" : "#E2E8F0",
    text: isDarkTheme ? "#FFFFFF" : "#1E293B",
    textSecondary: isDarkTheme ? "#8B91A7" : "#64748B",
    border: isDarkTheme ? "#252B4A" : "#E2E8F0",
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    success: isDarkTheme ? "#00FF88" : "#16A34A",
    danger: isDarkTheme ? "#FF3366" : "#DC2626",
  }), [isDarkTheme]);

  const [apps, setApps] = useState([
    {
      id: 'google',
      name: 'Google Home',
      description: 'Control devices with Google Assistant.',
      connected: true,
      icon: Chrome,
      color: '#DB4437'
    },
    {
      id: 'alexa',
      name: 'Amazon Alexa',
      description: 'Voice control via Alexa ecosystem.',
      connected: false,
      icon: Radio,
      color: '#00CAFF'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Get notifications in your workspace.',
      connected: false,
      icon: Slack,
      color: '#4A154B'
    },
    {
      id: 'ifttt',
      name: 'IFTTT',
      description: 'Trigger complex automation recipes.',
      connected: true,
      icon: Command,
      color: '#000000'
    }
  ]);

  const handleToggle = (app) => {
    if (app.connected) {
      setAlertConfig({
        type: 'confirm',
        title: `Disconnect ${app.name}?`,
        message: `This will stop all integrations with ${app.name}. Are you sure?`,
        buttons: [
          { text: 'Cancel', style: 'cancel', onPress: () => setAlertVisible(false) },
          { 
            text: 'Disconnect', 
            style: 'destructive', 
            onPress: () => {
              setAlertVisible(false);
              toggleConnection(app.id, false);
              showToast.success('Disconnected', `${app.name} has been disconnected.`);
            } 
          }
        ]
      });
      setAlertVisible(true);
    } else {
      setLoadingId(app.id);
      // Simulate API call
      setTimeout(() => {
        setLoadingId(null);
        toggleConnection(app.id, true);
        showToast.success('Connected', `Successfully linked ${app.name}.`);
      }, 1500);
    }
  };

  const toggleConnection = (id, status) => {
    setApps(prev => prev.map(app => 
      app.id === id ? { ...app, connected: status } : app
    ));
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <LinearGradient
        colors={isDarkTheme ? [Colors.surface, Colors.background] : ["#FFFFFF", "#F1F5F9"]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backButton, { backgroundColor: Colors.surfaceLight }]}
          >
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: Colors.text }]}>Connected Apps</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>Available Integrations</Text>
        
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <View 
              key={app.id} 
              style={[
                styles.appCard, 
                { backgroundColor: Colors.surface, borderColor: Colors.border }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: app.color + '20' }]}>
                  <Icon size={28} color={app.color} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.appName, { color: Colors.text }]}>{app.name}</Text>
                  <Text style={[styles.appDesc, { color: Colors.textSecondary }]}>{app.description}</Text>
                </View>
                <View style={styles.actionContainer}>
                  {loadingId === app.id ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Switch
                      value={app.connected}
                      onValueChange={() => handleToggle(app)}
                      trackColor={{ false: Colors.surfaceLight, true: Colors.primary + '50' }}
                      thumbColor={app.connected ? Colors.primary : '#f4f3f4'}
                    />
                  )}
                </View>
              </View>
              
              {app.connected && (
                <View style={[styles.statusFooter, { borderTopColor: Colors.border }]}>
                  <View style={styles.statusBadge}>
                    <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
                    <Text style={[styles.statusText, { color: Colors.success }]}>Active</Text>
                  </View>
                  <TouchableOpacity>
                    <Text style={[styles.settingsLink, { color: Colors.primary }]}>Configure</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        isDarkTheme={isDarkTheme}
        {...alertConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, zIndex: 10 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginLeft: 4 },
  appCard: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', padding: 16, alignItems: 'center', gap: 16 },
  iconContainer: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  textContainer: { flex: 1 },
  appName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  appDesc: { fontSize: 13, lineHeight: 18 },
  actionContainer: { justifyContent: 'center', paddingLeft: 8 },
  statusFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  settingsLink: { fontSize: 12, fontWeight: '600' },
});