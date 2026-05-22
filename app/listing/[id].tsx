import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<any>(null);
  const [host, setHost] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isLightboxVisible, setIsLightboxVisible] = useState(false);
  const [lightboxPhotoIdx, setLightboxPhotoIdx] = useState(0);

  const photosList = listing
    ? (Array.isArray(listing.images) && listing.images.length > 0
      ? listing.images
      : [])
    : [];

  useEffect(() => {
    fetchListingDetails();
  }, [id]);

  const fetchListingDetails = async () => {
    setLoading(true);
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setMyId(session.user.id);
    }

    // Fetch listing
    const { data: listingData, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();

    if (listingData) {
      setListing(listingData);

      // Fetch host profile
      const { data: hostData } = await supabase
        .from('profiles')
        .select('id, name, photoUrl, bio, role')
        .eq('id', listingData.user_id)
        .single();
      
      if (hostData) {
        setHost(hostData);
      }
    } else {
      Alert.alert('Error', 'Listing not found.');
      router.back();
    }

    setLoading(false);
  };

  const handleMessageHost = () => {
    if (!host) return;
    if (host.id === myId) {
      Alert.alert('Info', "You can't message yourself!");
      return;
    }
    router.push(`/chat/${host.id}`);
  };

  const handleRentNow = () => {
    Alert.alert(
      'Rent Request Sent!',
      'We have notified the host that you are interested in renting this property. They will reach out to you shortly.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#49C788" />
      </View>
    );
  }

  if (!listing) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        
        {/* Header Image Gallery */}
        <View style={styles.galleryContainer}>
          {photosList.length > 0 ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: photosList[activePhotoIdx] }} style={styles.heroImage} contentFit="cover" transition={200} />
              <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
                style={styles.heroGradient}
              />
            </View>
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <IconSymbol name="house.fill" size={60} color="#333" />
            </View>
          )}

          {/* Top Story-style progressive indicators */}
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

          {/* Left/Right press navigation overlays */}
          {photosList.length > 1 ? (
            <View style={styles.tapNavigationOverlay}>
              <Pressable
                style={styles.tapSide}
                onPress={() => setActivePhotoIdx((prev) => Math.max(0, prev - 1))}
              />
              <Pressable
                style={styles.tapMiddle}
                onPress={() => {
                  setLightboxPhotoIdx(activePhotoIdx);
                  setIsLightboxVisible(true);
                }}
              />
              <Pressable
                style={styles.tapSide}
                onPress={() => setActivePhotoIdx((prev) => Math.min(photosList.length - 1, prev + 1))}
              />
            </View>
          ) : (
            photosList.length > 0 && (
              <Pressable
                style={styles.tapNavigationOverlay}
                onPress={() => {
                  setLightboxPhotoIdx(activePhotoIdx);
                  setIsLightboxVisible(true);
                }}
              />
            )
          )}

          {/* Counter badge (bottom-right) */}
          {photosList.length > 1 && (
            <View style={styles.pageBadge}>
              <Text style={styles.pageBadgeText}>{activePhotoIdx + 1} / {photosList.length}</Text>
            </View>
          )}

          {/* Glassmorphic Expand button (bottom-left) */}
          {photosList.length > 0 && (
            <Pressable
              style={styles.expandBadge}
              onPress={() => {
                setLightboxPhotoIdx(activePhotoIdx);
                setIsLightboxVisible(true);
              }}
            >
              <MaterialCommunityIcons name="arrow-expand" size={14} color="#fff" />
              <Text style={styles.expandBadgeText}>Ampliar</Text>
            </Pressable>
          )}

          {/* Top Actions: Back Button */}
          <SafeAreaView style={styles.topBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color="#fff" />
            </Pressable>
          </SafeAreaView>
        </View>

        {/* Content Section */}
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{listing.title || 'Untitled Property'}</Text>
          
          <View style={styles.locationRow}>
            <IconSymbol name="mappin.and.ellipse" size={16} color="#888" />
            <Text style={styles.locationText}>{listing.address || 'Location not specified'}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>${listing.price}</Text>
            <Text style={styles.priceSuffix}>/month</Text>
          </View>

          <View style={styles.divider} />

          {/* Features */}
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <IconSymbol name={listing.utilities_included ? "bolt.fill" : "bolt.slash.fill"} size={20} color={listing.utilities_included ? "#49C788" : "#666"} />
              <Text style={styles.featureText}>
                {listing.utilities_included ? "Utilities Included" : "Utilities Extra"}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol name="calendar" size={20} color="#49C788" />
              <Text style={styles.featureText}>Available Now</Text>
            </View>
          </View>

          {/* Description */}
          {listing.description && (
            <>
              <Text style={styles.sectionTitle}>About this place</Text>
              <Text style={styles.descriptionText}>{listing.description}</Text>
            </>
          )}

          <View style={styles.divider} />

          {/* Host Info */}
          {host && (
            <View style={styles.hostSection}>
              <Text style={styles.sectionTitle}>Hosted by</Text>
              <Pressable style={styles.hostCard} onPress={() => router.push(`/profile/${host.id}`)}>
                {host.photoUrl ? (
                  <Image source={{ uri: host.photoUrl }} style={styles.hostAvatar} contentFit="cover" />
                ) : (
                  <View style={[styles.hostAvatar, styles.hostAvatarPlaceholder]}>
                    <Text style={styles.hostAvatarText}>{host.name?.[0] || '?'}</Text>
                  </View>
                )}
                <View style={styles.hostInfo}>
                  <Text style={styles.hostName}>{host.name}</Text>
                  <Text style={styles.hostRole}>{host.role === 'landlord' ? 'Property Manager' : 'Roommate Host'}</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color="#666" />
              </Pressable>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarPrice}>
          <Text style={styles.bottomPrice}>${listing.price}</Text>
          <Text style={styles.bottomSuffix}>/mo</Text>
        </View>
        <View style={styles.bottomActionRow}>
          <Pressable style={styles.messageBtn} onPress={handleMessageHost}>
            <IconSymbol name="message.fill" size={20} color="#000" />
          </Pressable>
          <Pressable style={styles.rentBtn} onPress={handleRentNow}>
            <Text style={styles.rentBtnText}>Rent Now</Text>
          </Pressable>
        </View>
      </View>

      {/* Fullscreen Lightbox Modal */}
      <Modal
        visible={isLightboxVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => {
          setActivePhotoIdx(lightboxPhotoIdx);
          setIsLightboxVisible(false);
        }}
      >
        <View style={styles.lightboxContainer}>
          {/* Top Story indicators */}
          {photosList.length > 1 && (
            <View style={styles.lightboxIndicatorContainer}>
              {photosList.map((_: any, idx: number) => (
                <View
                  key={idx}
                  style={[
                    styles.lightboxIndicatorBar,
                    {
                      backgroundColor: idx === lightboxPhotoIdx ? '#49C788' : 'rgba(255, 255, 255, 0.3)',
                      width: `${100 / photosList.length - 2}%`,
                    }
                  ]}
                />
              ))}
            </View>
          )}

          {/* Close button (top right) */}
          <Pressable
            style={styles.lightboxCloseBtn}
            onPress={() => {
              setActivePhotoIdx(lightboxPhotoIdx);
              setIsLightboxVisible(false);
            }}
          >
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </Pressable>

          {/* Zoomable Image Container */}
          <ScrollView
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.lightboxImageWrapper}
          >
            <Image
              source={{ uri: photosList[lightboxPhotoIdx] }}
              style={styles.lightboxImage}
              contentFit="contain"
              transition={200}
            />
          </ScrollView>

          {/* Left/Right press navigation overlays inside lightbox */}
          {photosList.length > 1 && (
            <View style={styles.lightboxTapOverlay}>
              <Pressable
                style={styles.lightboxTapSide}
                onPress={() => setLightboxPhotoIdx((prev) => Math.max(0, prev - 1))}
              />
              <View style={{ flex: 1 }} pointerEvents="none" />
              <Pressable
                style={styles.lightboxTapSide}
                onPress={() => setLightboxPhotoIdx((prev) => Math.min(photosList.length - 1, prev + 1))}
              />
            </View>
          )}

          {/* Bottom Counter badge */}
          {photosList.length > 1 && (
            <View style={styles.lightboxPageBadge}>
              <Text style={styles.lightboxPageBadgeText}>
                {lightboxPhotoIdx + 1} / {photosList.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 120, // space for bottom bar
  },
  galleryContainer: {
    position: 'relative',
    height: 400,
    width: SCREEN_WIDTH,
  },
  galleryScroll: {
    flex: 1,
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: 400,
    position: 'relative',
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: 400,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroPlaceholder: {
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCountBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsContainer: {
    padding: 24,
    backgroundColor: '#000',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  locationText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#49C788',
  },
  priceSuffix: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#1a1a24',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    gap: 8,
  },
  featureText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
  },
  hostSection: {
    marginBottom: 20,
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  hostAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  hostAvatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hostRole: {
    color: '#888',
    fontSize: 14,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32, // for safe area
  },
  bottomBarPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bottomPrice: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  bottomSuffix: {
    color: '#888',
    fontSize: 14,
    marginLeft: 2,
  },
  bottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageBtn: {
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rentBtn: {
    backgroundColor: '#49C788',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  rentBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  indicatorContainer: {
    position: 'absolute',
    top: 52,
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
    width: '30%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0)',
  },
  tapMiddle: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0)',
  },
  pageBadge: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 10,
  },
  pageBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  expandBadge: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  expandBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lightboxIndicatorContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  lightboxIndicatorBar: {
    height: 3,
    borderRadius: 1.5,
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 65,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  lightboxImageWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  lightboxTapOverlay: {
    position: 'absolute',
    top: 120,
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 5,
  },
  lightboxTapSide: {
    width: '40%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0)',
  },
  lightboxPageBadge: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
  },
  lightboxPageBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
