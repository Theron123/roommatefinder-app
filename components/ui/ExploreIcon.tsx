import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ExploreIconProps {
  name: 'close' | 'skip-next' | 'message-text' | 'heart' | 'filter-variant' | 'cards-outline' | 'map-outline';
  size: number;
  color: string;
}

export function ExploreIcon({ name, size, color }: ExploreIconProps) {
  switch (name) {
    case 'close': {
      const lineLength = size * 0.46;
      const lineWidth = 3;
      return (
        <View style={[styles.centerContainer, { width: size, height: size }]}>
          <View style={{
            position: 'absolute',
            width: lineLength,
            height: lineWidth,
            borderRadius: lineWidth / 2,
            backgroundColor: color,
            transform: [{ rotate: '45deg' }]
          }} />
          <View style={{
            position: 'absolute',
            width: lineLength,
            height: lineWidth,
            borderRadius: lineWidth / 2,
            backgroundColor: color,
            transform: [{ rotate: '-45deg' }]
          }} />
        </View>
      );
    }

    case 'skip-next': {
      const arrowLength = size * 0.52;
      const stroke = 3;
      const headSize = size * 0.22;
      return (
        <View style={[styles.centerContainer, { width: size, height: size }]}>
          {/* Arrow Shaft (horizontal line representing Next/Skip) */}
          <View style={{
            width: arrowLength,
            height: stroke,
            borderRadius: stroke / 2,
            backgroundColor: color,
            position: 'absolute'
          }} />
          {/* Arrow Head (chevron rotated 45deg) */}
          <View style={{
            width: headSize,
            height: headSize,
            borderTopWidth: stroke,
            borderRightWidth: stroke,
            borderColor: color,
            borderRadius: stroke / 2,
            transform: [{ rotate: '45deg' }],
            position: 'absolute',
            right: size * 0.2
          }} />
        </View>
      );
    }

    case 'message-text': {
      const w = size * 0.6;
      const h = size * 0.46;
      const stroke = 2.8;
      return (
        <View style={[styles.centerContainer, { width: size, height: size }]}>
          {/* Chat Bubble Body (Hollow, modern, sleek) */}
          <View style={{
            width: w,
            height: h,
            borderRadius: 5,
            borderWidth: stroke,
            borderColor: color,
            backgroundColor: 'transparent'
          }} />
          {/* Triangle tail */}
          <View style={{
            position: 'absolute',
            bottom: size * 0.22,
            left: size * 0.24,
            width: size * 0.18,
            height: size * 0.18,
            borderLeftWidth: stroke,
            borderBottomWidth: stroke,
            borderColor: color,
            backgroundColor: '#111', // matches floating button background to mask
            transform: [{ rotate: '45deg' }]
          }} />
        </View>
      );
    }

    case 'heart': {
      // Geometric heart shape built with standard View capsules (perfect balance and smooth curves)
      const scale = size / 24;
      const heartSize = 10.5 * scale;
      return (
        <View style={[styles.centerContainer, { width: size, height: size }]}>
          <View style={{ flexDirection: 'row', position: 'absolute', top: size * 0.28 }}>
            <View style={{
              width: heartSize,
              height: heartSize * 1.5,
              borderTopLeftRadius: heartSize / 2,
              borderTopRightRadius: heartSize / 2,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
              position: 'absolute',
              left: -heartSize * 0.72
            }} />
            <View style={{
              width: heartSize,
              height: heartSize * 1.5,
              borderTopLeftRadius: heartSize / 2,
              borderTopRightRadius: heartSize / 2,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
              position: 'absolute',
              left: -heartSize * 0.18
            }} />
          </View>
        </View>
      );
    }

    case 'filter-variant': {
      const stroke = 2.2;
      return (
        <View style={[styles.centerContainer, { width: size, height: size, gap: 3.5 }]}>
          <View style={{ width: size * 0.75, height: stroke, borderRadius: stroke / 2, backgroundColor: color }} />
          <View style={{ width: size * 0.48, height: stroke, borderRadius: stroke / 2, backgroundColor: color }} />
          <View style={{ width: size * 0.22, height: stroke, borderRadius: stroke / 2, backgroundColor: color }} />
        </View>
      );
    }

    case 'cards-outline': {
      const stroke = 2;
      const w = size * 0.52;
      const h = size * 0.68;
      return (
        <View style={[styles.centerContainer, { width: size, height: size }]}>
          {/* Background Card */}
          <View style={{
            position: 'absolute',
            width: w,
            height: h,
            borderRadius: 4,
            borderWidth: stroke,
            borderColor: color,
            opacity: 0.45,
            top: size * 0.12,
            left: size * 0.12,
          }} />
          {/* Foreground Card */}
          <View style={{
            position: 'absolute',
            width: w,
            height: h,
            borderRadius: 4,
            borderWidth: stroke,
            borderColor: color,
            backgroundColor: '#0a0a0a', // opaque overlay
            top: size * 0.2,
            left: size * 0.28,
          }} />
        </View>
      );
    }

    case 'map-outline': {
      const stroke = 1.8;
      const h = size * 0.58;
      const w = size * 0.22;
      return (
        <View style={[styles.centerContainer, { width: size, height: size, flexDirection: 'row' }]}>
          {/* Left fold */}
          <View style={{
            width: w,
            height: h,
            borderWidth: stroke,
            borderColor: color,
            borderRightWidth: 0,
            transform: [{ skewY: '11deg' }]
          }} />
          {/* Middle fold */}
          <View style={{
            width: w,
            height: h,
            borderWidth: stroke,
            borderColor: color,
            borderLeftWidth: stroke / 2,
            borderRightWidth: stroke / 2,
            transform: [{ skewY: '-11deg' }],
            marginTop: -size * 0.04
          }} />
          {/* Right fold */}
          <View style={{
            width: w,
            height: h,
            borderWidth: stroke,
            borderColor: color,
            borderLeftWidth: 0,
            transform: [{ skewY: '11deg' }]
          }} />
        </View>
      );
    }

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  }
});
