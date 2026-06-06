import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type Role = 'landlord' | 'host' | 'seeker';

export default function RoleSelectScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const saveRoleAndContinue = async (role: Role) => {
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You are not logged in.');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', session.user.id);

      if (error) {
        Alert.alert('Error', error.message);
        setSaving(false);
        return;
      }

      router.replace('/preferences?firstTime=true');
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  const handleHasPlace = () => {
    animateTransition(() => setStep(2));
  };

  const handleNoPlace = () => {
    saveRoleAndContinue('seeker');
  };

  const handleFindTenants = () => {
    saveRoleAndContinue('landlord');
  };

  const handleFindRoommate = () => {
    saveRoleAndContinue('host');
  };

  const handleGoBack = () => {
    animateTransition(() => setStep(1));
  };

  // Entrance animation
  const entranceFade = useRef(new Animated.Value(0)).current;
  const entranceSlide = useRef(new Animated.Value(40)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(entranceSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (saving) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color="#49C788" size="large" />
          <Text style={styles.savingText}>Setting up your profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: Animated.multiply(fadeAnim, entranceFade),
              transform: [
                {
                  translateY: Animated.add(slideAnim, entranceSlide),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.stepLabel}>
              Step {step} of 2
            </Text>
            <Text style={styles.mainTitle}>
              {step === 1 ? 'Tell us about\nyour situation' : 'What are you\nlooking for?'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? 'This helps us personalize your experience.'
                : 'We\'ll tailor the app to match your goals.'}
            </Text>
          </View>

          {/* Cards */}
          <View style={styles.cardsWrapper}>
            {step === 1 ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={handleHasPlace}
                >
                  <View style={styles.emojiCircle}>
                    <Text style={styles.emoji}>🏠</Text>
                  </View>
                  <View style={styles.cardTextBlock}>
                    <Text style={styles.cardTitle}>Yes, I have a place</Text>
                    <Text style={styles.cardDescription}>
                      I have an apartment or room available to share or rent out.
                    </Text>
                  </View>
                  <View style={styles.arrowCircle}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={handleNoPlace}
                >
                  <View style={styles.emojiCircle}>
                    <Text style={styles.emoji}>🔍</Text>
                  </View>
                  <View style={styles.cardTextBlock}>
                    <Text style={styles.cardTitle}>No, I&apos;m looking for one</Text>
                    <Text style={styles.cardDescription}>
                      I need a place to live or someone to find a new place with.
                    </Text>
                  </View>
                  <View style={styles.arrowCircle}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={handleFindTenants}
                >
                  <View style={styles.emojiCircle}>
                    <Text style={styles.emoji}>🏢</Text>
                  </View>
                  <View style={styles.cardTextBlock}>
                    <Text style={styles.cardTitle}>Find tenants</Text>
                    <Text style={styles.cardDescription}>
                      I own the property but I won&apos;t live there. I just want to find tenants.
                    </Text>
                  </View>
                  <View style={styles.arrowCircle}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={handleFindRoommate}
                >
                  <View style={styles.emojiCircle}>
                    <Text style={styles.emoji}>🤝</Text>
                  </View>
                  <View style={styles.cardTextBlock}>
                    <Text style={styles.cardTitle}>Find a roommate</Text>
                    <Text style={styles.cardDescription}>
                      I live there and I&apos;m looking for someone to share the space with me.
                    </Text>
                  </View>
                  <View style={styles.arrowCircle}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                </Pressable>

                {/* Back button */}
                <Pressable style={styles.backButton} onPress={handleGoBack}>
                  <Text style={styles.backText}>← Go back</Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
            <View style={[styles.dot, step === 1 && styles.dotActive]} />
            <View style={[styles.dot, step === 2 && styles.dotActive]} />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingText: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#49C788',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 44,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    lineHeight: 24,
  },
  cardsWrapper: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#222',
  },
  cardPressed: {
    borderColor: '#49C788',
    backgroundColor: '#0a1a12',
  },
  emojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a2e',
    borderWidth: 1.5,
    borderColor: '#49C78833',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emoji: {
    fontSize: 28,
  },
  cardTextBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#49C78820',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  arrowText: {
    color: '#49C788',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backText: {
    color: '#49C788',
    fontSize: 15,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 48,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#49C788',
  },
});
