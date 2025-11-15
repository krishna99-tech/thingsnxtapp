import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../screens/config";

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
      console.log(
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
        let message = `HTTP ${response.status}`;
        if (data?.detail) {
          if (Array.isArray(data.detail)) {
            message =
              data.detail
                .map(
                  (d) => `${d.loc?.join(".") || "Field"}: ${d.msg}`
                )
                .join("; ") || data.detail.join(", ");
          } else {
            message = data.detail;
          }
        } else if (data?.error || data?.message) {
          message = data.error || data.message;
        }
        throw new Error(message);
      }

      console.log("✅ API Success:", data);
      return data;
    } catch (err) {
      console.error("⚠️ Network/API error:", err.message);
      console.error("Full error:", JSON.stringify(err, null, 2));
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
        console.log("🔚 Signup API success: Tokens received for auto-login");
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
    console.log("📡 Login form body:", body.toString());

    const data = await this.request("/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (data?.access_token) {
      console.log("🔐 Login API success: Tokens received");
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
      console.log("♻️ Token refreshed");
    }
    return data;
  }

  // LOGOUT
  async logout() {
    await this.request("/logout", { method: "POST" });
    await AsyncStorage.multiRemove(["userToken", "refreshToken", "username"]);
    console.log("👋 Logged out");
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
