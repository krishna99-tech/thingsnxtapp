import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WidgetRenderer from '../widgets/WidgetRenderer';

const MemoizedDashboardWidget = memo(({
  item,
  editMode,
  isDarkTheme,
  onLongPress,
  onDeleteWidget,
  onResizeWidth,
  onResizeHeight
}) => {
  if (!item) return null;

  const isLarge = item.width === 2;

  return (
    <View style={[styles.widgetWrapper, isLarge && styles.widgetWrapperLarge]}>
      <View style={{ flex: 1 }}>
        <WidgetRenderer
          item={item}
          isDarkTheme={isDarkTheme}
          onLongPress={onLongPress}
          onDelete={onDeleteWidget}
        />
      </View>

      {editMode && (
        <View style={styles.editOverlay}>
          {/* Resize Width */}
          <TouchableOpacity
            style={styles.resizeHandleWidth}
            onPress={() => onResizeWidth(item._id, item.width)}
          >
            <Ionicons
              name="resize-outline"
              size={18}
              color="#fff"
              style={{ transform: [{ rotate: '90deg' }] }}
            />
          </TouchableOpacity>

          {/* Resize Height */}
          <TouchableOpacity
            style={styles.resizeHandleHeight}
            onPress={() => onResizeHeight(item._id, item.height)}
          >
            <Ionicons
              name="resize-outline"
              size={18}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            style={styles.deleteHandle}
            onPress={() => onDeleteWidget(item._id)}
            onPressIn={(e) => e.stopPropagation()}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.item._id === nextProps.item._id &&
    prevProps.item.value === nextProps.item.value &&
    prevProps.item.width === nextProps.item.width &&
    prevProps.item.height === nextProps.item.height &&
    prevProps.item.next_schedule === nextProps.item.next_schedule &&
    prevProps.item.lastUpdated === nextProps.item.lastUpdated &&
    prevProps.editMode === nextProps.editMode &&
    prevProps.isDarkTheme === nextProps.isDarkTheme
  );
});

const styles = StyleSheet.create({
    widgetWrapper: { height: 150, padding: 6 },
    widgetWrapperLarge: { width: '100%'},
    editOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resizeHandleWidth: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0, 122, 255, 0.8)',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resizeHandleHeight: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(0, 122, 255, 0.8)',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteHandle: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255, 59, 48, 0.8)',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default MemoizedDashboardWidget;
