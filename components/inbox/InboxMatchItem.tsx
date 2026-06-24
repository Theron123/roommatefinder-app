import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

interface InboxMatchItemProps {
  item: any;
  onPress: (id: string) => void;
}

const InboxMatchItemComponent = ({ item, onPress }: InboxMatchItemProps) => {
  return (
    <Pressable style={styles.matchItem} onPress={() => onPress(item.id)}>
      <View style={styles.matchAvatarContainer}>
        <Image source={{ uri: item.photoUrl }} style={styles.matchAvatar} contentFit="cover" cachePolicy="memory-disk" />
      </View>
      <Text style={styles.matchName} numberOfLines={1}>{item.name}</Text>
    </Pressable>
  );
};

export const InboxMatchItem = memo(InboxMatchItemComponent, (prevProps, nextProps) => {
  return prevProps.item.id === nextProps.item.id && prevProps.item.photoUrl === nextProps.item.photoUrl;
});

const styles = StyleSheet.create({
  matchItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 70,
  },
  matchAvatarContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#49C788',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(73, 199, 136, 0.05)',
  },
  matchAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  matchName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
