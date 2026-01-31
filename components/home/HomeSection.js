import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const HomeSection = ({ 
  title, 
  icon,
  linkText, 
  onLinkPress, 
  children, 
  titleColor, 
  linkColor 
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          {icon && <View style={styles.titleIcon}>{icon}</View>}
          <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
        </View>
        {linkText && onLinkPress && (
          <TouchableOpacity 
            onPress={onLinkPress}
            activeOpacity={0.7}
            style={styles.linkButton}
          >
            <Text style={[styles.sectionLink, { color: linkColor }]}>{linkText}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    marginRight: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  linkButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0,181,212,0.1)',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default HomeSection;