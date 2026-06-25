import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Swiper from 'react-native-deck-swiper';
import { Profile } from '@/lib/types';

interface ExploreSwipeControlsProps {
  swiperRef: React.RefObject<Swiper<Profile> | null>;
  btnBigSize: number;
  btnSmallSize: number;
}

export default function ExploreSwipeControls({
  swiperRef,
  btnBigSize,
  btnSmallSize,
}: ExploreSwipeControlsProps) {
  return (
    <View style={styles.floatingActionButtons} pointerEvents="box-none">
      <Pressable 
        style={({ pressed }) => [
          styles.actionButton, 
          styles.buttonSkip,
          { width: btnSmallSize, height: btnSmallSize, borderRadius: btnSmallSize / 2 },
          { transform: [{ scale: pressed ? 0.92 : 1 }] }
        ]} 
        onPress={() => swiperRef.current?.swipeBottom()}
      >
        <MaterialCommunityIcons name="arrow-down-thick" size={btnSmallSize * 0.55} color="#ff9800" />
      </Pressable>

      <Pressable 
        style={({ pressed }) => [
          styles.actionButton, 
          styles.buttonNope,
          { width: btnBigSize, height: btnBigSize, borderRadius: btnBigSize / 2 },
          { transform: [{ scale: pressed ? 0.92 : 1 }] }
        ]} 
        onPress={() => swiperRef.current?.swipeLeft()}
      >
        <MaterialCommunityIcons name="close" size={btnBigSize * 0.65} color="#FF4B4B" />
      </Pressable>

      <Pressable 
        style={({ pressed }) => [
          styles.actionButton, 
          styles.buttonLike,
          { width: btnBigSize, height: btnBigSize, borderRadius: btnBigSize / 2 },
          { transform: [{ scale: pressed ? 0.92 : 1 }] }
        ]} 
        onPress={() => swiperRef.current?.swipeRight()}
      >
        <MaterialCommunityIcons name="heart" size={btnBigSize * 0.55} color="#4caf50" />
      </Pressable>

      <Pressable 
        style={({ pressed }) => [
          styles.actionButton, 
          styles.buttonMessage,
          { width: btnSmallSize, height: btnSmallSize, borderRadius: btnSmallSize / 2 },
          { transform: [{ scale: pressed ? 0.92 : 1 }] }
        ]} 
        onPress={() => swiperRef.current?.swipeTop()}
      >
        <IconSymbol name="bubble.left.and.bubble.right.fill" size={btnSmallSize * 0.55} color="#49C788" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingActionButtons: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    zIndex: 100,
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
  },
  buttonSkip: {
    borderColor: 'rgba(255, 152, 0, 0.2)',
  },
  buttonNope: {
    borderColor: 'rgba(255, 75, 75, 0.2)',
  },
  buttonLike: {
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  buttonMessage: {
    borderColor: 'rgba(73, 199, 136, 0.2)',
  },
});
