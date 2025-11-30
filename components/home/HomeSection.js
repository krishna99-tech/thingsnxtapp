import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const HomeSection = ({ title, linkText, onLinkPress, children, titleColor, linkColor }) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
        {linkText && onLinkPress && (
          <TouchableOpacity onPress={onLinkPress}>
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
    marginTop: 28,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeSection;