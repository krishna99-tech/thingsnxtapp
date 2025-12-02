import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");

// Guideline base width from a standard design screen (e.g., iPhone 11 Pro)
const guidelineBaseWidth = 375;

/**
 * Scales a font size based on the screen width.
 * @param {number} size The base font size.
 * @param {number} [factor=0.5] The scaling factor. A smaller factor provides more moderate scaling.
 * @returns {number} The scaled font size.
 */
export const moderateScale = (size, factor = 0.5) =>
  size + (width / guidelineBaseWidth - 1) * size * factor;