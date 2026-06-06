import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Dimensions, DeviceEventEmitter, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');

const TUTORIAL_VERSION = 'v1.0.0';

export default function TutorialModal() {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const steps = [
    {
      id: 'step1',
      titleKey: 'tour.step1_title',
      descKey: 'tour.step1_desc',
      route: '/(tabs)',
      getCoords: (wWidth: number, wHeight: number, topInset: number, bottomInset: number) => {
        const w = 70;
        const h = 54;
        const tabWidth = wWidth / 4;
        return {
          x: tabWidth * 0 + (tabWidth - w) / 2,
          y: wHeight - h - bottomInset - 4,
          w,
          h,
          borderRadius: 16,
        };
      },
      tooltipPosition: 'above' as const,
    },
    {
      id: 'step2',
      titleKey: 'tour.step2_title',
      descKey: 'tour.step2_desc',
      route: '/explore',
      getCoords: (wWidth: number, wHeight: number, topInset: number, bottomInset: number) => {
        const w = 70;
        const h = 54;
        const tabWidth = wWidth / 4;
        return {
          x: tabWidth * 1 + (tabWidth - w) / 2,
          y: wHeight - h - bottomInset - 4,
          w,
          h,
          borderRadius: 16,
        };
      },
      tooltipPosition: 'above' as const,
    },
    {
      id: 'step3',
      titleKey: 'tour.step3_title',
      descKey: 'tour.step3_desc',
      route: '/inbox',
      getCoords: (wWidth: number, wHeight: number, topInset: number, bottomInset: number) => {
        const w = 70;
        const h = 54;
        const tabWidth = wWidth / 4;
        return {
          x: tabWidth * 2 + (tabWidth - w) / 2,
          y: wHeight - h - bottomInset - 4,
          w,
          h,
          borderRadius: 16,
        };
      },
      tooltipPosition: 'above' as const,
    },
    {
      id: 'step4',
      titleKey: 'tour.step4_title',
      descKey: 'tour.step4_desc',
      route: '/myprofile',
      getCoords: (wWidth: number, wHeight: number, topInset: number, bottomInset: number) => {
        const w = 70;
        const h = 54;
        const tabWidth = wWidth / 4;
        return {
          x: tabWidth * 3 + (tabWidth - w) / 2,
          y: wHeight - h - bottomInset - 4,
          w,
          h,
          borderRadius: 16,
        };
      },
      tooltipPosition: 'above' as const,
    },
    {
      id: 'step5',
      titleKey: 'tour.step5_title',
      descKey: 'tour.step5_desc',
      route: '/(tabs)',
      getCoords: (wWidth: number, wHeight: number, topInset: number, bottomInset: number) => {
        const w = 54;
        const h = 54;
        return {
          x: wWidth - w - 16,
          y: topInset + 15,
          w,
          h,
          borderRadius: 27,
        };
      },
      tooltipPosition: 'below' as const,
    },
  ];

  useEffect(() => {
    checkTutorial();

    const sub = DeviceEventEmitter.addListener('show_tutorial', () => {
      setVisible(true);
      setCurrentIndex(0);
      router.push('/(tabs)');
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === 'Add' || e.code === 'NumpadAdd') {
        setVisible(true);
        setCurrentIndex(0);
        router.push('/(tabs)');
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      sub.remove();
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      pulseAnim.setValue(0);
      Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, currentIndex]);

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

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextStep = steps[nextIndex];
      
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        router.push(nextStep.route as any);
        setCurrentIndex(nextIndex);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    try {
      const storageKey = await getStorageKey();
      await AsyncStorage.setItem(storageKey, TUTORIAL_VERSION);
      router.push('/(tabs)');
      setVisible(false);
    } catch (e) {
      setVisible(false);
    }
  };

  if (!visible) return null;

  const currentStep = steps[currentIndex];
  const coords = currentStep.getCoords(width, height, insets.top, insets.bottom);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  return (
    <Modal visible={visible} animationType="none" transparent={true}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Cutout Mask Overlays */}
        {/* Top */}
        <View style={[styles.maskSegment, { top: 0, left: 0, width: width, height: coords.y }]} />
        {/* Bottom */}
        <View style={[styles.maskSegment, { top: coords.y + coords.h, left: 0, width: width, height: height - (coords.y + coords.h) }]} />
        {/* Left */}
        <View style={[styles.maskSegment, { top: coords.y, left: 0, width: coords.x, height: coords.h }]} />
        {/* Right */}
        <View style={[styles.maskSegment, { top: coords.y, left: coords.x + coords.w, width: width - (coords.x + coords.w), height: coords.h }]} />

        {/* Spotlight Highlight Box */}
        <View style={[styles.spotlight, { top: coords.y, left: coords.x, width: coords.w, height: coords.h, borderRadius: coords.borderRadius }]} />

        {/* Pulsing Glow Ring */}
        <Animated.View 
          style={[
            styles.pulseRing, 
            { 
              top: coords.y - 4, 
              left: coords.x - 4, 
              width: coords.w + 8, 
              height: coords.h + 8, 
              borderRadius: coords.borderRadius + 4,
              transform: [{ scale }],
              opacity,
            }
          ]} 
        />

        {/* Tooltip Card */}
        <View 
          style={[
            styles.tooltipContainer,
            currentStep.tooltipPosition === 'above' 
              ? { bottom: height - coords.y + 16 } 
              : { top: coords.y + coords.h + 16 }
          ]}
        >
          {currentStep.tooltipPosition === 'below' && <View style={styles.arrowUp} />}

          <LinearGradient
            colors={['rgba(20, 20, 25, 0.96)', 'rgba(10, 10, 12, 0.98)']}
            style={styles.tooltipCard}
          >
            <Text style={styles.progressText}>
              {t('tour.step_progress').replace('{current}', String(currentIndex + 1)).replace('{total}', String(steps.length))}
            </Text>
            <Text style={styles.tooltipTitle}>{t(currentStep.titleKey)}</Text>
            <Text style={styles.tooltipDesc}>{t(currentStep.descKey)}</Text>

            <View style={styles.buttonRow}>
              <Pressable style={styles.skipButton} onPress={handleFinish}>
                <Text style={styles.skipText}>{t('tour.skip')}</Text>
              </Pressable>

              <Pressable style={styles.nextButton} onPress={handleNext}>
                <LinearGradient
                  colors={['#49C788', '#483D8B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextText}>
                    {currentIndex === steps.length - 1 ? t('tour.finish') : t('tour.next')}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </LinearGradient>

          {currentStep.tooltipPosition === 'above' && <View style={styles.arrowDown} />}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  maskSegment: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  spotlight: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#49C788',
    backgroundColor: 'transparent',
    shadowColor: '#49C788',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#49C788',
    backgroundColor: 'transparent',
    shadowColor: '#49C788',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  tooltipContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  tooltipCard: {
    width: '100%',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 15,
  },
  progressText: {
    color: '#49C788',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  tooltipTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
  },
  tooltipDesc: {
    color: '#bbb',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    color: '#777',
    fontSize: 14,
    fontWeight: '700',
  },
  nextButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#49C788',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  arrowUp: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(20, 20, 25, 0.96)',
    transform: [{ translateY: 1 }],
    zIndex: 2,
  },
  arrowDown: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(20, 20, 25, 0.96)',
    transform: [{ translateY: -1 }],
    zIndex: 2,
  },
});
