import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ChatHeaderProps {
  otherUser: { name: string; photoUrl?: string | null; is_identity_verified?: boolean | null } | null;
  onBack: () => void;
  onPressUser: () => void;
  onPressSettings: () => void;
}

export default function ChatHeader({ otherUser, onBack, onPressUser, onPressSettings }: ChatHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <MaterialCommunityIcons name="chevron-left" size={28} color="#49C788" />
      </Pressable>
      
      <Pressable style={styles.headerUserContainer} onPress={onPressUser}>
        {otherUser?.photoUrl ? (
          <Image source={{ uri: otherUser.photoUrl }} style={styles.headerAvatar} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.headerAvatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: '#fff', fontSize: 16 }}>{otherUser?.name?.[0] || '?'}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginRight: 8 }}>
          <Text style={styles.headerName} numberOfLines={1}>{otherUser ? otherUser.name : 'Loading...'}</Text>
          {otherUser?.is_identity_verified && (
            <MaterialCommunityIcons name="check-decagram" size={18} color="#49C788" style={{ flexShrink: 0 }} />
          )}
        </View>
      </Pressable>

      <Pressable onPress={onPressSettings} style={styles.paletteBtn}>
        <MaterialCommunityIcons name="palette-outline" size={22} color="#49C788" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0d1117',
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerUserContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  paletteBtn: { padding: 8 },
});
