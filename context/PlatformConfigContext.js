import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { AppState } from "react-native";
import { BASE_URL } from "../constants/config";

const PlatformConfigContext = createContext({
  config: null,
  error: null,
  loading: true,
  refresh: async () => {},
});

export function PlatformConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL.replace(/\/$/, "")}/app/config`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConfig(data);
      setError(null);
    } catch (e) {
      setError(e);
      setConfig((prev) => prev ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const value = useMemo(
    () => ({
      config,
      error,
      loading,
      refresh,
    }),
    [config, error, loading, refresh]
  );

  return (
    <PlatformConfigContext.Provider value={value}>
      {children}
    </PlatformConfigContext.Provider>
  );
}

export function usePlatformConfig() {
  return useContext(PlatformConfigContext);
}
