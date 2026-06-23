import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, DeviceEventEmitter, Animated, useWindowDimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from '../context/LanguageContext';

const TUTORIAL_VERSION = 'v1.0.0';

export default function TutorialModal() {
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [registeredCoords, setRegisteredCoords] = useState<Record<string, { x: number; y: number; w: number; h: number; borderRadius?: number }>>({});
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
        const w = 72;
        const h = 52;
        const tabWidth = wWidth / 4;
        return {
          x: tabWidth * 0 + (tabWidth - w) / 2,
          y: wHeight - h - bottomInset - 2,
          w,
          h,
          borderRadius: 10,
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
        const w = 72;
        const h = 52;
        const tabWidth = wWidth / 4;
        return {
          x: tabWidth * 1 + (tabWidth - w) / 2,
          y: wHeight - h - bottomInset - 2,
          w,
          h,
          borderRadius: 10,
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
        const w = 72;
        const h = 52;
        const tabWidth = wWidth / 4;
        return {
          x: tabWidth * 2 + (tabWidth - w) / 2,
          y: wHeight - h - bottomInset - 2,
          w,
          h,
          borderRadius: 10,
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
        const w = 72;
        const h = 52;
        const tabWidth = wWidth / 4;
        return {
          x: tabWidth * 3 + (tabWidth - w) / 2,
          y: wHeight - h - bottomInset - 2,
          w,
          h,
          borderRadius: 10,
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
        const w = 52;
        const h = 52;
        return {
          x: wWidth - w - 16,
          y: topInset + 20,
          w,
          h,
          borderRadius: 26,
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

    const coordsSub = DeviceEventEmitter.addListener('register_tutorial_coords', ({ key, coords }) => {
      setRegisteredCoords(prev => ({ ...prev, [key]: coords }));
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === 'Add' || e.code === 'NumpadAdd') {
        setVisible(true);
        setCurrentIndex(0);
        router.push('/(tabs)');
      }
    };
    
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      sub.remove();
      coordsSub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Emit measure request immediately and after a short delay
      DeviceEventEmitter.emit('request_tutorial_measure');
      const timer = setTimeout(() => {
        DeviceEventEmitter.emit('request_tutorial_measure');
      }, 100);
      return () => clearTimeout(timer);
    } else {
      fadeAnim.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch {
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
        // Request measurement after route transition has finished
        setTimeout(() => {
          DeviceEventEmitter.emit('request_tutorial_measure');
        }, 150);
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
    } catch {
      setVisible(false);
    }
  };

  if (!visible) return null;

  const currentStep = steps[currentIndex];
  const targetKey = currentStep.id === 'step5' ? 'profile_avatar' : `tab_${currentIndex}`;
  const registered = registeredCoords[targetKey];
  const coords = registered || currentStep.getCoords(width, height, insets.top, insets.bottom);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  // Calculate dynamic centered tooltip card position
  const CARD_WIDTH = Math.min(width - 40, 320);
  const margin = 20;
  const targetCenterX = coords.x + coords.w / 2;
  const idealLeft = targetCenterX - CARD_WIDTH / 2;
  const maxLeft = width - CARD_WIDTH - margin;
  const cardLeft = Math.max(margin, Math.min(maxLeft, idealLeft));
  
  // Calculate arrow left position relative to the tooltip card
  const arrowLeftOffset = targetCenterX - cardLeft - 8; // 8 is half of the arrow width (16)

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
        <View style={[styles.spotlight, { top: coords.y, left: coords.x, width: coords.w, height: coords.h, borderRadius: coords.borderRadius ?? 10 }]} />

        {/* Pulsing Glow Ring */}
        <Animated.View 
          style={[
            styles.pulseRing, 
            { 
              top: coords.y - 4, 
              left: coords.x - 4, 
              width: coords.w + 8, 
              height: coords.h + 8, 
              borderRadius: (coords.borderRadius ?? 10) + 4,
              transform: [{ scale }],
              opacity,
            }
          ]} 
        />

        {/* Tooltip Card Container */}
        <View 
          style={[
            styles.tooltipContainer,
            { left: cardLeft, width: CARD_WIDTH },
            currentStep.tooltipPosition === 'above' 
              ? { bottom: height - coords.y + 12 } 
              : { top: coords.y + coords.h + 12 }
          ]}
        >
          {currentStep.tooltipPosition === 'below' && (
            <View style={[styles.arrowUp, { left: arrowLeftOffset }]} />
          )}

          <LinearGradient
            colors={['rgba(20, 20, 25, 0.98)', 'rgba(10, 10, 12, 0.99)']}
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

          {currentStep.tooltipPosition === 'above' && (
            <View style={[styles.arrowDown, { left: arrowLeftOffset }]} />
          )}
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
    borderWidth: 1.5,
    borderColor: '#49C788',
    backgroundColor: 'transparent',
    shadowColor: '#49C788',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#49C788',
    backgroundColor: 'transparent',
    shadowColor: '#49C788',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  tooltipContainer: {
    position: 'absolute',
    alignItems: 'stretch',
  },
  tooltipCard: {
    width: '100%',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  progressText: {
    color: '#49C788',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  tooltipTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  tooltipDesc: {
    color: '#bbb',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  skipText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '700',
  },
  nextButton: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#49C788',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  nextButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  arrowUp: {
    position: 'absolute',
    top: -7.5,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(20, 20, 25, 0.98)',
    zIndex: 2,
  },
  arrowDown: {
    position: 'absolute',
    bottom: -7.5,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(20, 20, 25, 0.98)',
    zIndex: 2,
  },
});
