import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Swiper from 'react-native-deck-swiper';
import { useTranslation } from '../../context/LanguageContext';
import { useExplore } from '@/hooks/useExplore';
import ExploreHeader from '@/components/explore/ExploreHeader';
import ExploreCard from '@/components/explore/ExploreCard';
import ExploreMapView from '@/components/explore/ExploreMapView';
import ExploreSwipeControls from '@/components/explore/ExploreSwipeControls';
import { Profile } from '@/lib/types';

export default function ExploreScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const btnBigSize = Math.min(Math.max(screenWidth * 0.15, 55), 65);
  const btnSmallSize = Math.min(Math.max(screenWidth * 0.12, 45), 52);

  const { t, translateHobbiesList, translatePreferencesList, translateDealbreakersList } = useTranslation();
  const router = useRouter();

  const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
    looking_urgent: { label: t('explore.looking_urgent'), color: '#34C759', icon: 'lightning-bolt' },
    exploring: { label: t('explore.exploring'), color: '#FFCC00', icon: 'compass' },
    have_room: { label: t('explore.role_host'), color: '#0A84FF', icon: 'home-account' }
  };

  const {
    profiles,
    currentUser,
    loading,
    allSwiped,
    cardPhotoIndices,
    setCardPhotoIndices,
    viewMode,
    setViewMode,
    matchedProfiles,
    userLocation,
    unreadCount,
    swiperRef,
    fetchProfiles,
    onSwiped,
    onSwipedLeft,
    onSwipedRight,
    onSwipedTop,
    onSwipedBottom,
    onSwipedAll,
  } = useExplore();

  const renderCard = (card: Profile | null) => (
    <ExploreCard
      card={card}
      currentUser={currentUser}
      cardPhotoIndices={cardPhotoIndices}
      setCardPhotoIndices={setCardPhotoIndices}
      STATUS_MAP={STATUS_MAP}
      t={t}
      translateHobbiesList={translateHobbiesList}
      translatePreferencesList={translatePreferencesList}
      translateDealbreakersList={translateDealbreakersList}
    />
  );

  return (
    <View style={styles.container}>
      <ExploreHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        unreadCount={unreadCount}
        t={t}
      />

      <View style={styles.swiperContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#49C788" size="large" />
            <Text style={styles.loadingText}>{t('explore.finding_people')}</Text>
          </View>
        ) : viewMode === 'map' ? (
          <ExploreMapView
            profiles={profiles}
            matchedProfiles={matchedProfiles}
            currentUser={currentUser}
            userLocation={userLocation}
            STATUS_MAP={STATUS_MAP}
            t={t}
          />
        ) : allSwiped || profiles.length === 0 ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="account-search-outline" size={60} color="#555" />
            <Text style={styles.emptyText}>{t('explore.no_more')}</Text>
            <TouchableOpacity style={styles.reloadButton} onPress={fetchProfiles}>
              <Text style={styles.reloadButtonText}>{t('explore.reload')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Swiper
              ref={swiperRef}
              cards={profiles}
              renderCard={renderCard}
              onSwiped={onSwiped}
              onSwipedLeft={onSwipedLeft}
              onSwipedRight={onSwipedRight}
              onSwipedTop={onSwipedTop}
              onSwipedBottom={onSwipedBottom}
              onSwipedAll={onSwipedAll}
              onTapCard={(cardIndex) => router.push(`/profile/${profiles[cardIndex].id}`)}
              cardIndex={0}
              backgroundColor="transparent"
              stackSize={3}
              stackSeparation={15}
              swipeBackCard
              useViewOverflow={false}
              animateOverlayLabelsOpacity
              overlayOpacityHorizontalThreshold={10}
              overlayOpacityVerticalThreshold={10}
              inputOverlayLabelsOpacityRangeX={[-150, -75, 0, 75, 150]}
              outputOverlayLabelsOpacityRangeX={[1, 0.5, 0, 0.5, 1]}
              inputOverlayLabelsOpacityRangeY={[-150, -75, 0, 75, 150]}
              outputOverlayLabelsOpacityRangeY={[1, 0.5, 0, 0.5, 1]}
              containerStyle={[styles.swiper, { touchAction: 'none' } as any]}
              cardStyle={styles.cardStyle}
              overlayLabels={{
                left: {
                  title: 'NOPE',
                  style: {
                    label: {
                      backgroundColor: 'transparent',
                      borderColor: '#FF4B4B',
                      color: '#FF4B4B',
                      borderWidth: 4,
                      fontSize: 32,
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'flex-start',
                      paddingTop: 40,
                      paddingRight: 40,
                      backgroundColor: 'rgba(255, 75, 75, 0.85)',
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      borderRadius: 20,
                      zIndex: 100,
                    }
                  }
                },
                right: {
                  title: 'LIKE',
                  style: {
                    label: {
                      backgroundColor: 'transparent',
                      borderColor: '#4caf50',
                      color: '#4caf50',
                      borderWidth: 4,
                      fontSize: 32,
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      paddingTop: 40,
                      paddingLeft: 40,
                      backgroundColor: 'rgba(76, 175, 80, 0.85)',
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      borderRadius: 20,
                      zIndex: 100,
                    }
                  }
                },
                top: {
                  title: 'MESSAGE',
                  style: {
                    label: {
                      backgroundColor: 'transparent',
                      borderColor: '#2196f3',
                      color: '#2196f3',
                      borderWidth: 4,
                      fontSize: 32,
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingBottom: 60,
                      backgroundColor: 'rgba(33, 150, 243, 0.85)',
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      borderRadius: 20,
                      zIndex: 100,
                    }
                  }
                },
                bottom: {
                  title: 'SKIP',
                  style: {
                    label: {
                      backgroundColor: 'transparent',
                      borderColor: '#ff9800',
                      color: '#ff9800',
                      borderWidth: 4,
                      fontSize: 32,
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      paddingTop: 60,
                      backgroundColor: 'rgba(255, 152, 0, 0.85)',
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      borderRadius: 20,
                      zIndex: 100,
                    }
                  }
                }
              }}
            />
            
            <ExploreSwipeControls
              swiperRef={swiperRef}
              btnBigSize={btnBigSize}
              btnSmallSize={btnSmallSize}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    touchAction: 'none',
    userSelect: 'none',
    // @ts-ignore
    WebkitUserSelect: 'none',
  },
  swiperContainer: {
    flex: 1,
    position: 'relative',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  loadingText: {
    color: '#ccc',
    marginTop: 12,
    fontSize: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  reloadButton: {
    marginTop: 20,
    backgroundColor: '#49C788',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  reloadButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  swiper: {
    flex: 1,
    height: '100%',
  },
  cardStyle: {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
});
