import React from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface ProfileHeaderProps {
  profile: any;
  insets: { top: number };
  uploading: boolean;
  name: string;
  age: string;
  status: string;
  STATUS_OPTIONS: { id: string; label: string; color: string; icon: string }[];
  onPickImage: (slotIndex?: number) => void;
  onEditPress: () => void;
  onSettingsPress: () => void;
  onUpdateStatus: (status: string) => void;
  t: any;
}

export default function ProfileHeader({
  profile,
  insets,
  uploading,
  name,
  age,
  status,
  STATUS_OPTIONS,
  onPickImage,
  onEditPress,
  onSettingsPress,
  onUpdateStatus,
  t,
}: ProfileHeaderProps) {
  return (
    <LinearGradient colors={['#1a1a24', '#000']} style={[styles.heroSection, { paddingTop: insets.top + 20 }]}>
      <View style={styles.avatarWrapper}>
        <Pressable onPress={() => onPickImage(0)} disabled={uploading}>
          {uploading ? (
            <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#333' }]}>
              <ActivityIndicator color="#49C788" />
            </View>
          ) : profile?.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#333' }]}>
              <IconSymbol name="person.crop.circle.fill" size={60} color="#666" />
            </View>
          )}
          <View style={styles.onlineDot} />
        </Pressable>
      </View>

      <View style={[styles.nameRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}>
        <Pressable onPress={onEditPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.profileName}>{name}{profile?.age ? `, ${profile.age}` : ''}</Text>
          {(profile?.trust_score ?? 0) >= 80 ? (
            <MaterialCommunityIcons name="check-decagram" size={24} color="#0A84FF" />
          ) : (profile?.trust_score ?? 0) >= 40 ? (
            <MaterialCommunityIcons name="check-circle" size={20} color="#34C759" />
          ) : null}
          <IconSymbol name="pencil" size={18} color="#888" style={{ marginLeft: 4 }} />
        </Pressable>
        
        <Pressable 
          onPress={onSettingsPress}
          style={{ marginLeft: 6 }}
        >
          <MaterialCommunityIcons name="cog" size={24} color="#49C788" />
        </Pressable>
      </View>

      <View style={styles.statusChipsContainer}>
        {STATUS_OPTIONS.map(opt => (
          <Pressable
            key={opt.id}
            onPress={() => onUpdateStatus(opt.id)}
            style={[styles.statusChip, status === opt.id && { backgroundColor: opt.color + '22', borderColor: opt.color }]}
          >
            <MaterialCommunityIcons name={opt.icon as any} size={14} color={status === opt.id ? opt.color : '#666'} />
            <Text style={[styles.statusChipText, { color: status === opt.id ? opt.color : '#666' }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.profileSub}>{t('myprofile.visible_sub')}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#49C788',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#30D158',
    borderWidth: 2,
    borderColor: '#000',
  },
  nameRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statusChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  profileSub: {
    color: '#666',
    fontSize: 12,
  },
});
