// ProfileInfoRow.js - Optimized for Modern Profile Design
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Platform
} from 'react-native';
import { ChevronRight, Eye, EyeOff } from 'lucide-react-native';

const alpha = (hex, opacity) => {
  if (!hex) return '#00000000';
  const o = Math.round(opacity * 255).toString(16).padStart(2, "0");
  return hex + o;
};

const ProfileInfoRow = ({
  icon,
  label,
  value,
  Colors,
  isEditing = false,
  onChangeText,
  placeholder,
  onPress,
  keyboardType = "default",
  autoCapitalize = "none",
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  maxLength,
  editable = true,
  caption = null,
  layout = 'horizontal', 
  iconSize = 20,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = secureTextEntry && isEditing;
  const isVertical = layout === 'vertical';

  const IconContainer = () => (
    <View style={[
      styles.infoIcon, 
      { 
        backgroundColor: alpha(Colors.primary, 0.1),
        marginBottom: isVertical ? 12 : 0,
      }
    ]}>
      {React.cloneElement(icon, { size: iconSize, color: Colors.primary })}
    </View>
  );

  // --- READ-ONLY MODE ---
  if (!isEditing) {
    return (
      <TouchableOpacity
        style={[
          styles.infoRow, 
          { 
            borderBottomColor: alpha(Colors.textSecondary, 0.1),
            flexDirection: isVertical ? 'column' : 'row',
            alignItems: isVertical ? 'flex-start' : 'center',
          }
        ]}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        <IconContainer />

        <View style={styles.contentContainer}>
          <Text style={[styles.infoLabel, { color: Colors.textSecondary }]}>
            {label}
          </Text>
          <Text 
            style={[
              styles.infoValue, 
              { color: Colors.text }, 
              isVertical && styles.verticalValue
            ]} 
            numberOfLines={isVertical ? 0 : 1}
            ellipsizeMode='tail' 
          >
            {value || placeholder || 'Not set'}
          </Text>
          {caption && (
            <Text style={[styles.infoCaption, { color: Colors.textSecondary }]}>
              {caption}
            </Text>
          )}
        </View>
        
        {onPress && !isVertical && (
          <ChevronRight size={18} color={Colors.textSecondary} />
        )}
      </TouchableOpacity>
    );
  }

  // --- EDITING MODE ---
  return (
    <View style={[
      styles.infoRow, 
      { 
        borderBottomColor: alpha(Colors.textSecondary, 0.1),
        flexDirection: isVertical ? 'column' : 'row',
        alignItems: isVertical ? 'flex-start' : 'center',
      }
    ]}>
      <IconContainer />

      <View style={styles.contentContainer}>
        <Text style={[styles.infoLabel, { color: Colors.textSecondary }]}>
          {label}
        </Text>
        <View style={[
          styles.inputWrapper,
          {
            backgroundColor: Colors.surfaceLight,
            borderColor: isEditing ? Colors.primary : 'transparent',
          }
        ]}>
          <TextInput
            style={[
              styles.inputField,
              multiline && styles.inputFieldMultiline,
              { color: Colors.text }
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={alpha(Colors.textSecondary, 0.5)}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={numberOfLines}
            textAlignVertical={multiline ? "top" : "center"}
            selectionColor={Colors.primary}
            secureTextEntry={isPasswordField && !showPassword}
            maxLength={maxLength}
            editable={editable}
          />
          {isPasswordField && (
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={18} color={Colors.textSecondary} />
              ) : (
                <Eye size={18} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  infoRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  verticalValue: {
    fontSize: 17,
    marginTop: 2,
    marginBottom: 4,
  },
  infoCaption: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
    lineHeight: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    minHeight: 44,
  },
  inputFieldMultiline: {
    minHeight: 80,
    paddingTop: 12,
  },
  passwordToggle: {
    paddingLeft: 10,
  },
});

export default ProfileInfoRow;