import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Eye, EyeOff, Lock } from 'lucide-react-native';

const ProfileInfoRow = ({
  icon,
  label,
  value,
  Colors,
  isEditing,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  editable = true
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const shouldSecureText = secureTextEntry && !isPasswordVisible;

  return (
    <View style={[
      styles.container, 
      { 
        borderBottomColor: Colors.borderLight || Colors.border,
        backgroundColor: isFocused ? (Colors.isDarkTheme ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)') : 'transparent'
      },
      { alignItems: multiline ? 'flex-start' : 'center' }
    ]}>
      <View style={[
        styles.iconContainer, 
        multiline && styles.iconContainerMultiline,
        { backgroundColor: isEditing && editable ? (Colors.isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'transparent' }
      ]}>
        {icon}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: Colors.textSecondary }]}>{label}</Text>
          {isEditing && !editable && (
            <View style={styles.lockedBadge}>
              <Lock size={10} color={Colors.textSecondary} />
              <Text style={[styles.lockedText, { color: Colors.textSecondary }]}>LOCKED</Text>
            </View>
          )}
        </View>
        
        {isEditing && editable ? (
          <View style={[
            styles.inputWrapper,
            isFocused && { borderBottomColor: Colors.primary, borderBottomWidth: 1 }
          ]}>
            <TextInput
              style={[
                styles.input,
                { color: Colors.text },
                multiline && styles.multilineInput
              ]}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={Colors.textSecondary + '60'}
              keyboardType={keyboardType}
              secureTextEntry={shouldSecureText}
              multiline={multiline}
              numberOfLines={numberOfLines}
              maxLength={maxLength}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              textAlignVertical={multiline ? 'top' : 'center'}
              editable={editable}
            />
            
            {secureTextEntry && (
              <TouchableOpacity
                onPress={togglePasswordVisibility}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isPasswordVisible ? (
                  <EyeOff size={18} color={Colors.textSecondary} />
                ) : (
                  <Eye size={18} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text 
            style={[
              styles.value, 
              { color: isEditing && !editable ? Colors.textSecondary : Colors.text },
              multiline && { lineHeight: 22 }
            ]}
            numberOfLines={multiline ? undefined : 1}
          >
            {value || placeholder || 'Not set'}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  iconContainer: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerMultiline: {
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockedText: {
    fontSize: 9,
    fontWeight: '800',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
    margin: 0,
    letterSpacing: 0.2,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default ProfileInfoRow;