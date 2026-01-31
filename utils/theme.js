/**
 * Centralized theme utilities for consistent color usage across the app
 * This helps avoid duplication and ensures consistent theming
 */

/**
 * Utility function for color opacity
 * @param {string} hex - Hex color code
 * @param {number} opacity - Opacity value (0-1)
 * @returns {string} Hex color with alpha
 */
export const alpha = (hex, opacity) => {
  if (!hex) return 'transparent';
  const o = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + o;
};

/**
 * Get theme colors based on dark/light mode
 * @param {boolean} isDarkTheme - Whether dark theme is active
 * @returns {Object} Theme colors object
 */
export function getThemeColors(isDarkTheme = false) {
  return {
    // Background colors
    background: isDarkTheme ? "#0A0E27" : "#F8FAFC",
    surface: isDarkTheme ? "#1A1F3A" : "#FFFFFF",
    surfaceLight: isDarkTheme ? "#252B4A" : "#F1F5F9",
    surfaceElevated: isDarkTheme ? "#242B4D" : "#FAFBFC",
    border: isDarkTheme ? "#2D3454" : "#E2E8F0",
    borderLight: isDarkTheme ? "#1F2541" : "#F1F5F9",
    
    // Primary colors
    primary: isDarkTheme ? "#00D9FF" : "#3B82F6",
    primaryLight: isDarkTheme ? "#1AE4FF" : "#60A5FA",
    primaryDark: isDarkTheme ? "#00B5D4" : "#2563EB",
    secondary: isDarkTheme ? "#A855F7" : "#8B5CF6",
    
    // Status colors
    success: isDarkTheme ? "#10B981" : "#16A34A",
    warning: isDarkTheme ? "#F59E0B" : "#F59E0B",
    danger: isDarkTheme ? "#EF4444" : "#DC2626",
    info: isDarkTheme ? "#3B82F6" : "#0EA5E9",
    
    // Status indicators
    statusOnline: isDarkTheme ? "#10B981" : "#16A34A",
    statusOffline: isDarkTheme ? "#EF4444" : "#DC2626",
    statusWarning: isDarkTheme ? "#F59E0B" : "#F59E0B",
    
    // Text colors
    text: isDarkTheme ? "#F8FAFC" : "#0F172A",
    textSecondary: isDarkTheme ? "#94A3B8" : "#64748B",
    textTertiary: isDarkTheme ? "#64748B" : "#94A3B8",
    textMuted: isDarkTheme ? "#475569" : "#94A3B8",
    
    // Gradient colors
    gradientStart: isDarkTheme ? "#6366F1" : "#3B82F6",
    gradientEnd: isDarkTheme ? "#8B5CF6" : "#6366F1",
    gradientAccent: isDarkTheme ? "#EC4899" : "#8B5CF6",
    
    // Utility colors
    white: "#FFFFFF",
    black: "#000000",
  };
}

/**
 * Get modal/overlay colors
 * @param {boolean} isDarkTheme - Whether dark theme is active
 * @returns {Object} Modal colors
 */
export function getModalColors(isDarkTheme = false) {
  const colors = getThemeColors(isDarkTheme);
  return {
    background: isDarkTheme ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)',
    card: colors.surface,
    title: colors.text,
    message: colors.textSecondary,
    buttonText: colors.white,
    surfaceLight: colors.surfaceLight,
  };
}

/**
 * Get toast colors
 * @param {boolean} isDarkTheme - Whether dark theme is active
 * @returns {Object} Toast colors
 */
export function getToastColors(isDarkTheme = false) {
  const colors = getThemeColors(isDarkTheme);
  return {
    card: colors.surface,
    text: colors.text,
    textSecondary: colors.textSecondary,
    success: colors.success,
    error: colors.danger,
    info: colors.info,
    successBg: isDarkTheme ? alpha(colors.success, 0.2) : alpha(colors.success, 0.1),
    errorBg: isDarkTheme ? alpha(colors.danger, 0.2) : alpha(colors.danger, 0.1),
    infoBg: isDarkTheme ? alpha(colors.info, 0.2) : alpha(colors.info, 0.1),
  };
}

