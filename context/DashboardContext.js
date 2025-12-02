import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const DashboardContext = createContext(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children, dashboardId }) => {
  const { userToken, devices, subscribeToMessages } = useAuth();
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const fetchWidgets = useCallback(async () => {
    if (!userToken || !dashboardId) return;

    try {
      if (widgets.length === 0) setLoading(true);

      const deviceMap = devices.reduce((map, d) => {
        map[d._id] = d.device_token;
        return map;
      }, {});

      const fetched = await api.getWidgets(dashboardId);
      fetched.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const processed = fetched.map((w) => ({
        ...w,
        _id: w._id?.toString(),
        device_token: w.type === "led" && w.device_id ? deviceMap[w.device_id] || null : null,
        key: w._id?.toString(),
        width: w.width || 1,
        height: w.height || 1,
      })).filter(w => w.type !== "led" || w.device_token);

      if (mountedRef.current) {
        setWidgets(processed);
      }
    } catch (error) {
      console.error("DashboardContext: Failed to fetch widgets", error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [dashboardId, userToken, devices]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchWidgets();
    return () => { mountedRef.current = false; };
  }, [fetchWidgets]);

  // WebSocket listener for widget updates
  useEffect(() => {
    if (!dashboardId) return;

    const handleWSMessage = (msg) => {
      try {
        // Only process messages relevant to this dashboard
        if (String(msg.dashboard_id) !== String(dashboardId)) return;

        if (msg.type === "widget_update") {
          setWidgets(prev => prev.map(w => String(w._id) === String(msg.widget._id) ? { ...w, ...msg.widget } : w));
        } else if (msg.type === "widget_deleted") {
          setWidgets(prev => prev.filter(w => String(w._id) !== String(msg.widget_id)));
        } else if (msg.type === "telemetry_update" && msg.device_id) {
           setWidgets((prev) => {
            let hasChanges = false;
            const updated = prev.map((w) => {
              if (String(w.device_id) !== String(msg.device_id)) return w;

              if (w.config?.key && msg.data && w.config.key in msg.data) {
                const key = w.config.key;
                const newValue = msg.data[key];
                if (newValue !== w.value) {
                  hasChanges = true;
                  return { ...w, value: newValue };
                }
              }
              return w;
            });
            return hasChanges ? updated : prev;
          });
        }
      } catch (err) {
        console.error("DashboardContext: WS parse error:", err);
      }
    };

    return subscribeToMessages(handleWSMessage);
  }, [dashboardId, subscribeToMessages]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWidgets();
  }, [fetchWidgets]);

  const value = {
    widgets,
    setWidgets,
    loading,
    refreshing,
    onRefresh,
    fetchWidgets,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};