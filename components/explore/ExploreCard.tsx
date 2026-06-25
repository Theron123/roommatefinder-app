import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { calculateCompatibility } from '@/utils/compatibility';
import { Profile } from '@/lib/types';

interface ExploreCardProps {
  card: Profile | null;
  currentUser: Profile | null;
  cardPhotoIndices: Record<string, number>;
  setCardPhotoIndices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  STATUS_MAP: Record<string, { label: string; color: string; icon: string }>;
  t: (key: string) => string;
  translateHobbiesList: (likes: string) => string;
  translatePreferencesList: (prefs: string) => string;
  translateDealbreakersList: (breaks: string) => string;
}

export default function ExploreCard({
  card,
  currentUser,
  cardPhotoIndices,
  setCardPhotoIndices,
  STATUS_MAP,
  t,
  translateHobbiesList,
  translatePreferencesList,
  translateDealbreakersList,
}: ExploreCardProps) {
  const router = useRouter();

  if (!card) return null;
  
  const photosList = Array.isArray(card.photos) && card.photos.length > 0
    ? (card.photos.filter(Boolean) as string[])
    : ([card.photoUrl].filter(Boolean) as string[]);

  const activePhotoIdx = cardPhotoIndices[card.id] || 0;
  const imageSource = photosList[activePhotoIdx]
    ? { uri: photosList[activePhotoIdx] }
    : { uri: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=100&w=1200&auto=format&fit=crop' };

  const compatibility = calculateCompatibility(currentUser, card);
  const statusConfig = card.availability_status ? STATUS_MAP[card.availability_status] : null;

  return (
    <View style={styles.cardContainer}>
      <Image 
        source={imageSource} 
        style={[StyleSheet.absoluteFill, styles.cardImageRounded, { userSelect: 'none', WebkitUserDrag: 'none' } as any]}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        priority="high"
        //@ts-ignore
        draggable={false}
      />
      {/* Instagram-style progress indicators */}
      {photosList.length > 1 && (
        <View style={styles.indicatorContainer}>
          {photosList.map((_: any, idx: number) => (
            <View
              key={idx}
              style={[
                styles.indicatorBar,
                {
                  backgroundColor: idx === activePhotoIdx ? '#49C788' : 'rgba(255, 255, 255, 0.4)',
                  width: `${100 / photosList.length - 2}%`,
                }
              ]}
            />
          ))}
        </View>
      )}

      {/* Tap navigation overlays */}
      {photosList.length > 1 ? (
        <View style={styles.tapNavigationOverlay}>
          <Pressable
            style={styles.tapSide}
            onPress={() => {
              setCardPhotoIndices(prev => ({
                ...prev,
                [card.id]: Math.max(0, activePhotoIdx - 1)
              }));
            }}
          />
          <Pressable
            style={styles.tapMiddle}
            onPress={() => {
              router.push(`/profile/${card.id}`);
            }}
          />
          <Pressable
            style={styles.tapSide}
            onPress={() => {
              setCardPhotoIndices(prev => ({
                ...prev,
                [card.id]: Math.min(photosList.length - 1, activePhotoIdx + 1)
              }));
            }}
          />
        </View>
      ) : (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            router.push(`/profile/${card.id}`);
          }}
        />
      )}

      {/* Counter badge */}
      {photosList.length > 1 && (
        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>{activePhotoIdx + 1} / {photosList.length}</Text>
        </View>
      )}

      <View style={[styles.cardContentWrapper, { userSelect: 'none' } as any]} pointerEvents="box-none">
        <Pressable 
          style={styles.textOverlay}
          onPress={() => {
            router.push(`/profile/${card.id}`);
          }}
        >
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {compatibility !== null && (
              <View style={styles.compatibilityBadge}>
                <MaterialCommunityIcons name="star-four-points" size={14} color="#000" />
                <Text style={styles.compatibilityText}>{compatibility}% compatible</Text>
              </View>
            )}
            {statusConfig && (
              <View style={[styles.compatibilityBadge, { backgroundColor: statusConfig.color, marginBottom: 0 }]}>
                <MaterialCommunityIcons name={statusConfig.icon as any} size={14} color="#000" />
                <Text style={styles.compatibilityText}>{statusConfig.label}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTitle}>
            {card.name || 'Roommate'} {card.age ? `, ${card.age}` : ''}
          </Text>
          
          <View style={styles.rowContainer}>
            <View style={[styles.infoSection, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.subtitle}>{t('explore.likes_hobbies')}</Text>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="thumb-up-outline" size={16} color="#ccc" />
                <Text style={styles.infoText} numberOfLines={2}>{translateHobbiesList(card.likes || '') || t('explore.open_anything')}</Text>
              </View>
            </View>

            <View style={[styles.infoSection, { flex: 1 }]}>
              <Text style={styles.subtitle}>{t('explore.preferences')}</Text>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="home-search-outline" size={16} color="#ccc" />
                <Text style={styles.infoText} numberOfLines={2}>{translatePreferencesList(card.preferences || '') || t('explore.flexible')}</Text>
              </View>
            </View>
          </View>

          {card.dealbreakers ? (
            <View style={styles.infoSection}>
              <Text style={styles.subtitleDealbreaker}>{t('myprofile.dealbreakers')}</Text>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FF4B4B" />
                <Text style={styles.dealbreakerText} numberOfLines={2}>{translateDealbreakersList(card.dealbreakers || '')}</Text>
              </View>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
    height: '100%',
  },
  cardImageRounded: {
    borderRadius: 24,
  },
  indicatorContainer: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  indicatorBar: {
    height: 3,
    borderRadius: 1.5,
  },
  tapNavigationOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 5,
  },
  tapSide: {
    width: '35%',
    height: '100%',
  },
  tapMiddle: {
    width: '30%',
    height: '100%',
  },
  pageBadge: {
    position: 'absolute',
    top: 24,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  pageBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardContentWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    zIndex: 10,
  },
  textOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  compatibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#49C788',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  compatibilityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoSection: {
    marginTop: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitleDealbreaker: {
    fontSize: 11,
    color: '#FF4B4B',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#eee',
    flexShrink: 1,
  },
  dealbreakerText: {
    fontSize: 13,
    color: '#FF4B4B',
    flexShrink: 1,
  },
});
