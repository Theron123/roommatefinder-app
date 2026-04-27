import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🏠',
    title: 'Find Your\nPerfect Roommate',
    subtitle:
      'Roommate Finder helps you connect with compatible people in your area. Say goodbye to awkward living situations.',
    accent: '#6C63FF',
    bg: '#0d0b1e',
  },
  {
    id: '2',
    emoji: '✨',
    title: 'Set Your\nPreferences',
    subtitle:
      'Tell us what you love, how you live, and what you can\'t tolerate. We\'ll do the matching for you.',
    accent: '#00C9A7',
    bg: '#071916',
  },
  {
    id: '3',
    emoji: '📍',
    title: 'See Who\'s\nNearby',
    subtitle:
      'Using your location, we surface potential roommates close to you — ranked by similarity and distance.',
    accent: '#FF6B6B',
    bg: '#1a0a0a',
  },
  {
    id: '4',
    emoji: '💬',
    title: 'Connect &\nMove In',
    subtitle:
      'View detailed profiles, check your compatibility score, and start a conversation directly in the app.',
    accent: '#F7C59F',
    bg: '#1a1100',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/login');
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: currentSlide.bg }]}>
      {/* Skip button */}
      {currentIndex < SLIDES.length - 1 && (
        <SafeAreaView style={styles.skipContainer}>
          <Pressable onPress={handleSkip}>
            <Text style={[styles.skipText, { color: currentSlide.accent }]}>Skip</Text>
          </Pressable>
        </SafeAreaView>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { backgroundColor: item.bg }]}>
            {/* Giant Emoji */}
            <View style={[styles.emojiContainer, { borderColor: item.accent + '33', backgroundColor: item.accent + '15' }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>

            {/* Text */}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={[styles.subtitle, { color: '#aaa' }]}>{item.subtitle}</Text>

            {/* Accent line */}
            <View style={[styles.accentLine, { backgroundColor: item.accent }]} />
          </View>
        )}
      />

      {/* Bottom controls */}
      <SafeAreaView style={styles.bottomBar}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex ? currentSlide.accent : '#444',
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Next / Get Started button */}
        <Pressable
          onPress={handleNext}
          style={[styles.nextButton, { backgroundColor: currentSlide.accent }]}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started 🚀' : 'Next →'}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    top: 0,
    right: 20,
    zIndex: 10,
    paddingTop: 56,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 180,
  },
  emojiContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 44,
  },
  emoji: {
    fontSize: 72,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 48,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
  },
  accentLine: {
    width: 48,
    height: 4,
    borderRadius: 2,
    marginTop: 32,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 28,
    paddingBottom: 40,
    gap: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
