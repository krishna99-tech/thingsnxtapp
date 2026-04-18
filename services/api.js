import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../constants/config";

const SHOULD_LOG = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_API_LOGS === "true";
const debugLog = (...args) => {
  if (SHOULD_LOG) {
    console.log(...args);
  }
};

class API {
  constructor() {
    this.baseUrl = BASE_URL;
    this.isRefreshing = false;
    this.failedQueue = [];
    this.logoutCallback = null;
  }

  // Method to set the logout function from AuthContext
  setLogoutCallback(logout) {
    this.logoutCallback = logout;
  }

  // --- Core request handler ---
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    // Prepare headers (allow override for form-urlencoded)
    const headers = { ...options.headers };
    const token = await AsyncStorage.getItem("userToken");
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!headers["Content-Type"]) {
      // Default to JSON, unless specified otherwise
      headers["Content-Type"] = options.headers?.["Content-Type"] || "application/json";
    }

    try {
      debugLog(
        "📡 API Request:",
        url,
        options.method || "GET",
        options.body
          ? options.body.toString().substring(0, 100) + "..."
          : "no body"
      );
      const response = await fetch(url, { ...options, headers });

      // Parse response safely
      let data;
      try {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          data = await response.json();
        } else if (contentType.includes("text/")) {
          const text = await response.text();
          data = text ? JSON.parse(text) : {};
        } else {
          try {
            data = await response.json();
          } catch {
            data = await response.text();
          }
        }
      } catch (parseErr) {
        console.warn("⚠️ Response parse failed:", parseErr);
        data = { error: "Invalid response format" };
      }

      // Error handling
      if (!response.ok) {
        // If we get a 401, try to refresh the token
        if (
          response.status === 401 &&
          !options._isRetry &&
          !options.skipAuthRefresh
        ) {
          debugLog("🔑 Token expired. Attempting refresh...");
          try {
            const { access_token, refresh_token } = await this.refreshToken();
            await AsyncStorage.setItem("userToken", access_token);
            if (refresh_token) {
              await AsyncStorage.setItem("refreshToken", refresh_token);
            }
            debugLog("✅ Token refreshed. Retrying original request...");
            // Retry the original request with the new token
            return this.request(endpoint, { ...options, _isRetry: true });
          } catch (refreshError) {
            console.error("❌ Token refresh failed:", refreshError.message);
            // If refresh fails, logout the user
            if (this.logoutCallback) {
              this.logoutCallback();
            }
            // Propagate a meaningful error
            throw new Error("Session expired. Please log in again.");
          }
        } else {
          console.error("❌ API Error:", response.status, data);
          // Create an error object that includes the status code
          const error = new Error();
          error.status = response.status;

          if (data?.detail) {
            if (Array.isArray(data.detail)) {
              error.message =
                data.detail
                  .map(
                    (d) => `${d.loc?.join(".") || "Field"}: ${d.msg}`
                  )
                  .join("; ") || data.detail.join(", ");
            } else {
              error.message = data.detail;
            }
          } else if (data?.error || data?.message) {
            error.message = data.error || data.message;
          } else {
            error.message = `HTTP ${response.status}`;
          }
          throw error;
        }
      }

      debugLog("✅ API Success:", data);
      return data;
    } catch (err) {
      console.error("⚠️ Network/API error:", err.message);
      throw new Error(err.message || "Network error occurred");
    }
  }

  // AUTH ENDPOINTS

  // SIGNUP
  async signup(userData) {
    try {
      const res = await this.request("/signup", {
        method: "POST",
        body: JSON.stringify(userData),
      });
      if (res?.access_token) {
        debugLog("🔚 Signup API success: Tokens received for auto-login");
        return res;
      }
      if (res?.message || typeof res === "string") {
        return res;
      }
      throw new Error("Unexpected signup response (no tokens or message)");
    } catch (err) {
      console.error("❌ Signup error:", err);
      throw err;
    }
  }

  // LOGIN (username or email allowed)
  async login(identifier, password) {
    if (!identifier?.trim() || !password) {
      throw new Error("Username/email and password required");
    }
    const body = new URLSearchParams();
    body.append("username", identifier.trim());
    body.append("password", password);
    debugLog("📡 Login form body:", body.toString());

    const data = await this.request("/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (data?.access_token) {
      debugLog("🔐 Login API success: Tokens received");
    }
    return data;
  }

  // REFRESH TOKEN
  async refreshToken() {
    const refresh = await AsyncStorage.getItem("refreshToken");
    if (!refresh) throw new Error("No refresh token stored");
    // Backend expects refresh_token as query parameter
    const data = await this.request(`/refresh?refresh_token=${encodeURIComponent(refresh)}`, {
      method: "POST",
    });
    if (data?.access_token) {
      debugLog("♻️ Token refreshed");
    }
    return data; // Return the new tokens
  }

  // LOGOUT
  async logout() {
    await this.request("/logout", {
      method: "POST",
      skipAuthRefresh: true,
    });
    await AsyncStorage.multiRemove(["userToken", "refreshToken", "username"]);
    debugLog("👋 Logged out");
  }

  // PROFILE
  async getProfile() {
    return this.request("/me", { method: "GET" });
  }

  /** Kafka pipeline status (bus runs server-side; app uses HTTP/SSE, not raw Kafka). */
  async getKafkaIntegrationStatus() {
    return this.request("/integrations/kafka/status", { method: "GET" });
  }

  /**
   * Live enriched-telemetry events (SSE). Prefer polling status + WebSocket for RN;
   * pass AbortSignal to stop. Parses `data: {...}` frames.
   */
  async consumeKafkaLiveStream(onMessage, options = {}) {
    const { signal } = options;
    const token = await AsyncStorage.getItem("userToken");
    const url = `${this.baseUrl}/integrations/kafka/live`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      signal,
    });
    if (!res.ok) {
      const err = new Error(`Kafka live stream failed: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    if (!res.body?.getReader) {
      throw new Error("Streaming not supported in this environment");
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        for (const block of chunks) {
          const line = block.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const json = JSON.parse(line.slice(6).trim());
            onMessage(json);
          } catch (_) {
            /* ignore non-JSON keepalives */
          }
        }
      }
    } finally {
      reader.releaseLock?.();
    }
  }

  // DEVICES
  async getDevices() {
    // The context expects the response to be an object like { devices: [...] }
    const devicesArray = await this.request("/devices", { method: "GET" });
    return { devices: devicesArray || [] };
  }

  async addDevice(deviceData) {
    // Validate required fields
    if (!deviceData?.name?.trim()) {
      throw new Error("Device name is required");
    }
    
    return this.request("/devices", {
      method: "POST",
      body: JSON.stringify({
        name: deviceData.name.trim(),
        // Type is optional, only include if provided
        ...(deviceData.type && { type: deviceData.type.trim() }),
      }),
    });
  }

  async updateDevice(deviceId, deviceData) {
    return this.request(`/devices/${deviceId}`, {
      method: "PATCH", // Using PATCH for partial updates
      body: JSON.stringify(deviceData),
    });
  }

  async bulkUpdateDeviceStatus(deviceIds, status) {
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      throw new Error("Device IDs array is required");
    }
    if (!["online", "offline"].includes(status)) {
      throw new Error("Status must be 'online' or 'offline'");
    }
    return this.request("/devices/bulk/status", {
      method: "PATCH",
      body: JSON.stringify({ device_ids: deviceIds, status }),
    });
  }

  async deleteDevice(deviceId) {
    return this.request(`/devices/${deviceId}`, { method: "DELETE" });
  }

  // DASHBOARDS
  async getDashboards() {
    return this.request("/dashboards", { method: "GET" });
  }

  async addDashboard(dashboardData) {
    return this.request("/dashboards", {
      method: "POST",
      body: JSON.stringify(dashboardData),
    });
  }

  async deleteDashboard(dashboardId) {
    return this.request(`/dashboards/${dashboardId}`, { method: "DELETE" });
  }

  async updateDashboardLayout(dashboardId, layoutData) {
    return this.request(`/dashboards/${dashboardId}/layout`, {
      method: "PUT",
      body: JSON.stringify({ layout: layoutData }),
    });
  }

  // WIDGETS
  async getWidgets(dashboardId) {
    return this.request(`/widgets/${dashboardId}`, { method: "GET" });
  }

  async addWidget(widgetData) {
    return this.request("/widgets", {
      method: "POST",
      body: JSON.stringify(widgetData),
    });
  }

  async updateWidget(widgetId, widgetData) {
    return this.request(`/widgets/${widgetId}`, {
      method: "PATCH",
      body: JSON.stringify(widgetData),
    });
  }

  async deleteWidget(widgetId) {
    return this.request(`/widgets/${widgetId}`, { method: "DELETE" });
  }

  // WIDGET STATE & SCHEDULES
  async setWidgetState(widgetId, state) {
    return this.request(`/widgets/${widgetId}/state`, {
      method: "POST",
      body: JSON.stringify({ state }),
    });
  }

  async getWidgetSchedules(widgetId) {
    return this.request(`/widgets/${widgetId}/schedule`, { method: "GET" });
  }

  async createWidgetSchedule(widgetId, scheduleData) {
    return this.request(`/widgets/${widgetId}/schedule`, {
      method: "POST",
      body: JSON.stringify(scheduleData),
    });
  }

  async createWidgetTimer(widgetId, timerData) {
    return this.request(`/widgets/${widgetId}/timer`, {
      method: "POST",
      body: JSON.stringify(timerData),
    });
  }

  async cancelWidgetSchedule(widgetId, scheduleId) {
    return this.request(`/widgets/${widgetId}/schedule/${scheduleId}`, {
      method: "DELETE",
    });
  }


  // NOTIFICATIONS
  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/notifications?${query}`, { method: "GET" });
  }

  async markNotificationRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, { method: "PUT" });
  }

  async markAllNotificationsRead() {
    return this.request("/notifications/read-all", { method: "PUT" });
  }

  async deleteNotification(notificationId) {
    return this.request(`/notifications/${notificationId}`, { method: "DELETE" });
  }

  // WEBHOOKS
  async getWebhooks() {
    return this.request("/webhooks", { method: "GET" });
  }

  async getWebhook(webhookId) {
    return this.request(`/webhooks/${webhookId}`, { method: "GET" });
  }

  async createWebhook(webhookData) {
    return this.request("/webhooks", {
      method: "POST",
      body: JSON.stringify(webhookData),
    });
  }

  async updateWebhook(webhookId, webhookData) {
    return this.request(`/webhooks/${webhookId}`, {
      method: "PATCH",
      body: JSON.stringify(webhookData),
    });
  }

  async deleteWebhook(webhookId) {
    return this.request(`/webhooks/${webhookId}`, { method: "DELETE" });
  }

  // --- Private SSE Stream Handler ---
  async _stream(endpoint, onMessage, onError, onOpen) { // This should be a method of the class
    const controller = new AbortController();
    const token = await AsyncStorage.getItem("userToken");

    if (!token) {
      const error = new Error("No user token found for SSE stream.");
      if (onError) onError(error);
      return controller; // Return controller to prevent crashes
    }

    try {
      debugLog(`🔄 Connecting to SSE stream: ${endpoint}...`);
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed with status ${response.status}`);
      }

      if (onOpen) onOpen();
      debugLog(`✅ SSE stream connected: ${endpoint}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const readStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done || controller.signal.aborted) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data:")) {
              const dataStr = line.substring(5).trim();
              try {
                if (dataStr) onMessage(JSON.parse(dataStr));
              } catch (parseErr) {
                console.error("Error parsing SSE data:", parseErr);
                if (onError) onError(new Error("Error parsing SSE data"));
              }
            }
          }
        }
      };
      readStream().catch((err) => {
        if (onError) onError(err);
      });
    } catch (err) {
      if (onError) onError(err);
    }
    return controller;
  }

  // --- Public SSE Methods ---
  async streamNotifications(onMessage, onError, onOpen) {
    return this._stream("/notifications/stream", onMessage, onError, onOpen);
  }

  async streamEvents(onMessage, onError, onOpen) {
    return this._stream("/events/stream", onMessage, onError, onOpen);
  }

  // USER PROFILE
  async updateUser(userData) {
    return this.request("/me", {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  // DELETE ACCOUNT
  async deleteAccount() {
    return this.request("/me", { method: "DELETE" });
  }

  // FORGOT PASSWORD
  async forgotPassword(email) {
    if (!email?.trim()) throw new Error("Enter your email.");
    const res = await this.request("/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
      headers: { "Content-Type": "application/json" },
    });
    return res;
  }

  // VERIFY RESET TOKEN
  async verifyResetToken(token) {
    if (!token?.trim()) throw new Error("Reset token required.");
    const res = await this.request(`/verify-reset-token?token=${encodeURIComponent(token.trim().toUpperCase())}`, {
      method: "GET",
    });
    return res;
  }



  // RESET PASSWORD
  async resetPassword(token, new_password) {
    if (!token?.trim()) throw new Error("Reset code required.");
    if (!new_password?.trim() || new_password.length < 8) throw new Error("Password must be at least 8 characters.");
    const res = await this.request("/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: token.trim().toUpperCase(), new_password: new_password.trim() }),
      headers: { "Content-Type": "application/json" },
    });
    return res;
  }



  // TELEMETRY
  async sendTelemetryV2(deviceId, data, deviceToken = null) {
    // For ESP32 and other direct device -> API calls
    // data: object with telemetry, deviceToken: optional if needed by backend
    const body = { ...data };
    if (deviceToken) body.device_token = deviceToken;
    return this.request(`/devices/${deviceId}/telemetry`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async getTelemetry(deviceToken) {
    // Use query param, not path param:
    return this.request(`/telemetry/latest?device_token=${deviceToken}`, { method: "GET" });
  }

  async getTelemetryHistory(deviceId, key, period = "24h") {
    debugLog(`Fetching history for ${deviceId}, key: ${key}, period: ${period}`);
    return this.request(`/telemetry/history?device_id=${deviceId}&key=${key}&period=${period}`);
  }


  // SERVER CHECK
  async checkServer() {
    try {
      const res = await fetch(this.baseUrl);
      return res.ok;
    } catch {
      return false;
    }
  }
}

export default new API();
