import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from './ui/icon-symbol';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

const TUTORIAL_VERSION = 'v1.0.0';

const TUTORIAL_SLIDES = [
  {
    id: '1',
    title: 'Welcome to Roommate Finder!',
    description: 'Find your perfect roommate based on shared hobbies, lifestyles, and absolute dealbreakers.',
    icon: 'house.fill',
    color: '#49C788',
  },
  {
    id: '2',
    title: 'Explore & Match',
    description: 'Browse the Home and Explore tabs to see people near you. The match percentage shows how compatible you are!',
    icon: 'magnifyingglass',
    color: '#00C9A7',
  },
  {
    id: '3',
    title: 'Connect Instantly',
    description: 'Message potential roommates directly through the app to see if you vibe together.',
    icon: 'paperplane.fill',
    color: '#49C788',
  },
  {
    id: '4',
    title: 'Your Profile matters',
    description: 'Keep your profile updated with a nice photo and accurate preferences to get better matches.',
    icon: 'person.fill',
    color: '#49C788',
  }
];

export default function TutorialModal() {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    checkTutorial();
  }, []);

  const getStorageKey = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      return userId ? `@tutorial_version:${userId}` : '@tutorial_version';
    } catch {
      return '@tutorial_version';
    }
  };

  const checkTutorial = async () => {
    try {
      const storageKey = await getStorageKey();
      const savedVersion = await AsyncStorage.getItem(storageKey);
      if (savedVersion !== TUTORIAL_VERSION) {
        setVisible(true);
      }
    } catch (e) {
      // Error reading value
    }
  };

  const handleFinish = async () => {
    try {
      const storageKey = await getStorageKey();
      await AsyncStorage.setItem(storageKey, TUTORIAL_VERSION);
      setVisible(false);
    } catch (e) {
      // Error saving
      setVisible(false);
    }
  };

  const currentSlide = TUTORIAL_SLIDES[currentIndex];

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.slide}>
            <View style={[styles.iconContainer, { shadowColor: currentSlide.color }]}>
              <LinearGradient
                colors={[currentSlide.color, currentSlide.color + '88']}
                style={styles.iconCircle}
              >
                <IconSymbol name={currentSlide.icon as any} size={60} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>{currentSlide.title}</Text>
            <Text style={styles.description}>{currentSlide.description}</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {TUTORIAL_SLIDES.map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.dot, currentIndex === index && styles.dotActive]} 
                />
              ))}
            </View>

            <Pressable 
              style={styles.button} 
              onPress={() => {
                 if (currentIndex === TUTORIAL_SLIDES.length - 1) {
                    handleFinish();
                 } else {
                    setCurrentIndex(prev => prev + 1);
                 }
              }}
            >
              <LinearGradient
                colors={['#49C788', '#483D8B']}
                start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {currentIndex === TUTORIAL_SLIDES.length - 1 ? "Let's Go!" : "Next"}
                </Text>
              </LinearGradient>
            </Pressable>

            {currentIndex < TUTORIAL_SLIDES.length - 1 && (
              <Pressable onPress={handleFinish} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip Tutorial</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    height: 500,
    backgroundColor: '#111',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  slide: {
    width: width * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  iconContainer: {
    marginBottom: 40,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#49C788',
    width: 24,
  },
  button: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    marginTop: 16,
    padding: 8,
  },
  skipText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
});
