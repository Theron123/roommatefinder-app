import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🏠',
    title: 'Elige tu Rol',
    subtitle: '¿Buscas una habitación o tienes una disponible? Define tu rol como Buscador (Seeker) o Anfitrión (Host) para comenzar tu búsqueda.',
    accent: '#49C788',
    bg: '#080c0a', // Deep dark green/black
    ambientGlow: 'rgba(73, 199, 136, 0.12)',
  },
  {
    id: '2',
    emoji: '⚡',
    title: 'Compatibilidad Real',
    subtitle: 'Comparamos tus hábitos de sueño, limpieza y dealbreakers para darte un porcentaje exacto de compatibilidad con tus futuros compañeros.',
    accent: '#0A84FF', // Deep Apple Blue
    bg: '#080a0e', // Deep dark blue/black
    ambientGlow: 'rgba(10, 132, 255, 0.12)',
  },
  {
    id: '3',
    emoji: '⏳',
    title: 'Desliza y Decide',
    subtitle: 'Desliza a la derecha para dar Like o a la izquierda para pasar. Si tienes dudas, desliza abajo para usar el Reloj de Arena y decidir después.',
    accent: '#ff9800', // Amber Orange
    bg: '#0c0a08', // Deep dark amber/black
    ambientGlow: 'rgba(255, 152, 0, 0.12)',
  },
  {
    id: '4',
    emoji: '💬',
    title: 'Match y Chat Directo',
    subtitle: 'Cuando el interés es mutuo, ¡ocurre la magia! Se creará un Match instantáneo y podrán chatear en la app para planear la mudanza.',
    accent: '#FF2D55', // Red/Pink accent
    bg: '#0c0809', // Deep dark crimson/black
    ambientGlow: 'rgba(255, 45, 85, 0.12)',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { force } = useLocalSearchParams<{ force?: string }>();

  useEffect(() => {
    const checkActiveSessionOnMount = async () => {
      if (force === 'true') return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (profile?.role) {
            router.replace('/(tabs)');
          }
        }
      } catch (err) {
        console.log('Error al comprobar sesión al iniciar onboarding:', err);
      }
    };
    checkActiveSessionOnMount();
  }, [force]);

  const navigateNextOrHome = async () => {
    if (force === 'true') {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        // Check if role select is done
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.role) {
          router.replace('/(tabs)');
        } else {
          router.replace('/role-select');
        }
      } else {
        router.replace('/(auth)/login');
      }
    } catch (err) {
      router.replace('/(auth)/login');
    }
  };

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await navigateNextOrHome();
    }
  };

  const handleSkip = async () => {
    await navigateNextOrHome();
  };

  const currentSlide = SLIDES[currentIndex];

  const renderSlideGraphic = (id: string) => {
    switch (id) {
      case '1':
        return (
          <View style={styles.graphicContainer}>
            {/* Mock Card 1: Seeker */}
            <View style={[styles.mockCard, styles.mockCardSeeker]}>
              <View style={[styles.roleBadge, { backgroundColor: '#49C788' }]}>
                <MaterialCommunityIcons name="account-search" size={20} color="#000" />
              </View>
              <Text style={styles.mockCardTitle}>Buscador</Text>
              <Text style={styles.mockCardSub}>Busco habitación</Text>
              <View style={styles.mockCardIndicator} />
            </View>
            
            {/* Mock Card 2: Host */}
            <View style={[styles.mockCard, styles.mockCardHost]}>
              <View style={[styles.roleBadge, { backgroundColor: '#0A84FF' }]}>
                <MaterialCommunityIcons name="home-account" size={20} color="#fff" />
              </View>
              <Text style={styles.mockCardTitle}>Anfitrión</Text>
              <Text style={styles.mockCardSub}>Ofrezco habitación</Text>
              <View style={styles.mockCardIndicator} />
            </View>

            {/* Connecting Badge */}
            <View style={styles.connectorBadge}>
              <MaterialCommunityIcons name="swap-horizontal" size={24} color="#49C788" />
            </View>
          </View>
        );
      case '2':
        return (
          <View style={styles.graphicContainer}>
            <View style={styles.profileMockCard}>
              <View style={styles.profileCardHeader}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>S</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileMockName}>Sofía, 24</Text>
                  <Text style={styles.profileMockRole}>Anfitriona de casa</Text>
                </View>
              </View>
              
              <View style={styles.tagsRow}>
                <View style={styles.tag}><Text style={styles.tagText}>✨ Ordenada</Text></View>
                <View style={styles.tag}><Text style={styles.tagText}>🐶 Ama Mascotas</Text></View>
                <View style={styles.tag}><Text style={styles.tagText}>🚭 No Fumadora</Text></View>
              </View>
            </View>

            {/* Compatibility Badge Glow */}
            <View style={styles.compatBadgeGlow}>
              <LinearGradient
                colors={['#0A84FF', '#00C9A7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.compatGradient}
              >
                <MaterialCommunityIcons name="star-four-points" size={16} color="#fff" />
                <Text style={styles.compatPercentText}>94% Compatible</Text>
              </LinearGradient>
            </View>
          </View>
        );
      case '3':
        return (
          <View style={styles.graphicContainer}>
            {/* Background card under swipe */}
            <View style={[styles.swipeMockCard, styles.swipeMockCardBg]} />
            
            {/* Foreground card simulating swiping rotation */}
            <View style={[styles.swipeMockCard, styles.swipeMockCardFg]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardAvatarMini} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={[styles.loaderBar, { width: '60%' }]} />
                  <View style={[styles.loaderBar, { width: '40%' }]} />
                </View>
              </View>
              <View style={styles.cardBodyLoader}>
                <View style={[styles.loaderBar, { width: '90%' }]} />
                <View style={[styles.loaderBar, { width: '80%' }]} />
              </View>
            </View>

            {/* Mini action buttons mockup */}
            <View style={styles.miniButtonsRow}>
              <View style={[styles.miniButton, styles.miniButtonNope]}>
                <MaterialCommunityIcons name="close" size={18} color="#FF4B4B" />
              </View>
              
              {/* Highlighted Skip (Hourglass) Button */}
              <View style={[styles.miniButton, styles.miniButtonSkip]}>
                <MaterialCommunityIcons name="timer-sand" size={18} color="#ff9800" />
                <View style={styles.pulseRing} />
              </View>
              
              <View style={[styles.miniButton, styles.miniButtonLike]}>
                <MaterialCommunityIcons name="heart" size={18} color="#4caf50" />
              </View>
            </View>
          </View>
        );
      case '4':
        return (
          <View style={styles.graphicContainer}>
            {/* Overlapping Avatars */}
            <View style={styles.avatarsOverlapRow}>
              <LinearGradient colors={['#FF2D55', '#FF375F']} style={styles.avatarCircleLeft}>
                <Text style={styles.avatarInitial}>Tú</Text>
              </LinearGradient>
              <LinearGradient colors={['#0A84FF', '#30B0C7']} style={styles.avatarCircleRight}>
                <Text style={styles.avatarInitial}>Ellos</Text>
              </LinearGradient>
              <View style={styles.matchHeartBadge}>
                <MaterialCommunityIcons name="heart" size={16} color="#fff" />
              </View>
            </View>

            {/* Match Banner */}
            <View style={styles.matchBanner}>
              <Text style={styles.matchBannerText}>¡Es un Match! 🎉</Text>
            </View>

            {/* Mini chat bubbles */}
            <View style={styles.chatBubblesContainer}>
              <View style={styles.bubbleLeft}>
                <Text style={styles.bubbleText}>¡Hola! Vi que somos 94% compatibles en hábitos.</Text>
              </View>
              <View style={styles.bubbleRight}>
                <Text style={styles.bubbleTextRight}>¡Hola! Sí, ¡me encanta que seas ordenada!</Text>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentSlide.bg }]}>
      {/* Background ambient glowing bubble */}
      <View style={[styles.glowBubble, { backgroundColor: currentSlide.accent }]} />

      {/* Header Skip button */}
      <SafeAreaView style={styles.headerContainer} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>RoommateFinder</Text>
          {currentIndex < SLIDES.length - 1 && (
            <Pressable 
              onPress={handleSkip}
              style={({ pressed }) => [
                styles.skipBtn,
                { opacity: pressed ? 0.6 : 1 }
              ]}
            >
              <Text style={[styles.skipText, { color: currentSlide.accent }]}>Saltar</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {/* Visual Content Block */}
      <View style={styles.contentBlock}>
        {/* Dynamic Graphic Container */}
        {renderSlideGraphic(currentSlide.id)}

        {/* Text descriptions */}
        <View style={styles.textContainer}>
          <View style={styles.emojiRow}>
            <Text style={styles.slideEmoji}>{currentSlide.emoji}</Text>
          </View>
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>
        </View>
      </View>

      {/* Bottom controls */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        {/* Progress Timeline Indicator */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? currentSlide.accent : 'rgba(255, 255, 255, 0.15)',
                  width: i === currentIndex ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Next / Get Started action button */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextButton,
            { 
              backgroundColor: currentSlide.accent,
              transform: [{ scale: pressed ? 0.96 : 1 }],
              shadowColor: currentSlide.accent,
            }
          ]}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === SLIDES.length - 1 ? 'Empezar ahora 🚀' : 'Siguiente'}
          </Text>
          {currentIndex < SLIDES.length - 1 && (
            <MaterialCommunityIcons name="arrow-right" size={20} color="#000" style={styles.arrowIcon} />
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  glowBubble: {
    position: 'absolute',
    top: height * 0.12,
    alignSelf: 'center',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    opacity: 0.15,
    ...Platform.select({
      ios: {
        shadowOpacity: 1,
        shadowRadius: 100,
        shadowOffset: { width: 0, height: 0 },
      },
      android: {
        elevation: 50,
      },
      web: {
        filter: 'blur(80px)',
      }
    })
  },
  headerContainer: {
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  contentBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 160,
  },
  graphicContainer: {
    width: width - 48,
    height: height * 0.35,
    minHeight: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  emojiRow: {
    marginBottom: 10,
  },
  slideEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.8,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    paddingHorizontal: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  nextButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },
  arrowIcon: {
    position: 'absolute',
    right: 24,
  },

  // Custom Graphic styles
  // Slide 1 (Roles)
  mockCard: {
    width: 140,
    height: 160,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    alignItems: 'center',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  mockCardSeeker: {
    left: width * 0.12,
    top: 30,
    transform: [{ rotate: '-6deg' }],
  },
  mockCardHost: {
    right: width * 0.12,
    top: 50,
    transform: [{ rotate: '6deg' }],
  },
  roleBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mockCardTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
  },
  mockCardSub: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
  },
  mockCardIndicator: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 16,
  },
  connectorBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1c1c1e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#49C788',
    position: 'absolute',
    top: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },

  // Slide 2 (Compatibility)
  profileMockCard: {
    width: width * 0.65,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    transform: [{ rotate: '-2deg' }],
  },
  profileCardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  profileMockName: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  profileMockRole: {
    color: '#777',
    fontSize: 12,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagText: {
    color: '#ccc',
    fontSize: 10,
    fontWeight: '600',
  },
  compatBadgeGlow: {
    position: 'absolute',
    right: width * 0.1,
    bottom: height * 0.05,
    borderRadius: 20,
    shadowColor: '#00C9A7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    transform: [{ rotate: '4deg' }],
  },
  compatGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compatPercentText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },

  // Slide 3 (Swiping & Skip)
  swipeMockCard: {
    width: 150,
    height: 200,
    borderRadius: 16,
    position: 'absolute',
  },
  swipeMockCardBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    top: 25,
    transform: [{ rotate: '-8deg' }],
  },
  swipeMockCardFg: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    top: 20,
    transform: [{ rotate: '5deg' }, { translateX: 10 }],
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  cardAvatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  loaderBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardBodyLoader: {
    gap: 6,
    marginTop: 8,
  },
  miniButtonsRow: {
    flexDirection: 'row',
    gap: 16,
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  miniButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  miniButtonNope: {
    borderColor: '#FF4B4B',
  },
  miniButtonLike: {
    borderColor: '#4caf50',
  },
  miniButtonSkip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: '#ff9800',
    borderWidth: 1.5,
    position: 'relative',
    zIndex: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    zIndex: 1,
  },

  // Slide 4 (Match & Chat)
  avatarsOverlapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
    height: 60,
  },
  avatarCircleLeft: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -12,
    borderWidth: 2,
    borderColor: '#0c0809',
  },
  avatarCircleRight: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0c0809',
  },
  avatarInitial: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  matchHeartBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: -4,
    borderWidth: 1.5,
    borderColor: '#0c0809',
  },
  matchBanner: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.3)',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  matchBannerText: {
    color: '#FF2D55',
    fontWeight: '900',
    fontSize: 12,
  },
  chatBubblesContainer: {
    width: width * 0.7,
    gap: 8,
    marginTop: 4,
  },
  bubbleLeft: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderBottomLeftRadius: 2,
    maxWidth: '85%',
  },
  bubbleRight: {
    backgroundColor: '#FF2D55',
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderBottomRightRadius: 2,
    maxWidth: '85%',
  },
  bubbleText: {
    color: '#eee',
    fontSize: 11,
    lineHeight: 15,
  },
  bubbleTextRight: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
});
