import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ExploreIcon } from '@/components/ui/ExploreIcon';

interface ExploreHeaderProps {
  viewMode: 'swipe' | 'map';
  setViewMode: (mode: 'swipe' | 'map') => void;
  unreadCount: number;
  t: (key: string) => string;
}

export default function ExploreHeader({
  viewMode,
  setViewMode,
  unreadCount,
  t,
}: ExploreHeaderProps) {
  const router = useRouter();

  return (
    <LinearGradient
      colors={['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0)']}
      locations={[0, 0.5, 1]}
      style={styles.headerContainer}
    >
      <SafeAreaView edges={['top']} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.mainTitle}>{t('tabs.explore')}</Text>
            <Text style={styles.subTitle} numberOfLines={1}>{t('explore.subtitle')}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.toggleBtn, styles.shortcutBtn]}
              onPress={() => router.push('/inbox')}
            >
              <ExploreIcon name="message-text" size={20} color="#49C788" />
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, styles.shortcutBtn]}
              onPress={() => router.push('/explore/filters')}
            >
              <ExploreIcon name="filter-variant" size={20} color="#49C788" />
            </TouchableOpacity>
            
            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleBtn, viewMode === 'swipe' && styles.toggleBtnActive]}
                onPress={() => setViewMode('swipe')}
              >
                <ExploreIcon name="cards-outline" size={20} color={viewMode === 'swipe' ? '#fff' : '#888'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
                onPress={() => setViewMode('map')}
              >
                <ExploreIcon name="map-outline" size={20} color={viewMode === 'map' ? '#fff' : '#888'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    zIndex: 10,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subTitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#333',
  },
  toggleBtn: {
    padding: 6,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#333',
  },
  shortcutBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    padding: 8,
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#49C788',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  unreadBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
