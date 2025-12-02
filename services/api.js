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
        console.error("❌ API Error:", response.status, data);
        // Create an error object that includes the status code
        const error = new Error();
        error.status = response.status;

        if (data?.detail) {
          if (Array.isArray(data.detail)) {
            message =
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
    const data = await this.request("/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (data?.access_token) {
      debugLog("♻️ Token refreshed");
    }
    return data;
  }

  // LOGOUT
  async logout() {
    await this.request("/logout", { method: "POST" });
    await AsyncStorage.multiRemove(["userToken", "refreshToken", "username"]);
    debugLog("👋 Logged out");
  }

  // PROFILE
  async getProfile() {
    return this.request("/me", { method: "GET" });
  }

  // DEVICES
  async getDevices() {
    return this.request("/devices", { method: "GET" });
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

  async deleteWidget(widgetId) {
    return this.request(`/widgets/${widgetId}`, { method: "DELETE" });
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

  // USER PROFILE
  async updateUser(userData) {
    return this.request("/me", {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

// Add this in your API class
async forgotPassword(email) {
  if (!email?.trim()) throw new Error("Enter your email.");
  const res = await this.request("/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
    headers: { "Content-Type": "application/json" },
  });
  return res;
}



// Add this to your API class in api.js

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
async getTelemetry(deviceToken) {
  // Use query param, not path param:
  return this.request(`/telemetry/latest?device_token=${deviceToken}`, { method: "GET" });
}

  // This function would fetch historical data for a chart.
  // The backend would need a new endpoint like:
  // GET /api/telemetry/history?device_id=<...>&key=<...>&period=24h
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
