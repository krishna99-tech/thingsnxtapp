import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

const MenuItem = ({
  icon,
  title,
  subtitle,
  onPress,
  rightComponent,
  Colors,
}) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  const renderRightComponent = () => {
    if (rightComponent?.type === 'switch') {
      return (
        <Switch
          value={rightComponent.value}
          onValueChange={rightComponent.onValueChange}
          trackColor={{ false: Colors.surfaceLight, true: rightComponent.trackColor || Colors.primary }}
          thumbColor={Colors.white}
        />
      );
    }
    if (rightComponent?.type === 'chevron') {
      return <ChevronRight size={20} color={Colors.textMuted} />;
    }
    return null;
  };

  return (
    <Wrapper
      style={[styles.menuItem, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
      {...wrapperProps}
    >
      <View style={styles.menuItemLeft}>
        {icon && (
          <View style={[styles.menuIcon, { backgroundColor: icon.bgColor }]}>
            {icon.component}
          </View>
        )}
        <View style={styles.menuItemTextContainer}>
          <Text style={[styles.menuItemTitle, { color: Colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.menuItemSubtitle, { color: Colors.textMuted }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {renderRightComponent()}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
  },
});

export default MenuItem;