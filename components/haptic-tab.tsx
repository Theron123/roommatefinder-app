import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import React, { useRef, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

// Botón de tab con feedback háptico en iOS que además mide y registra su posición para el tutorial guiado
export function HapticTab(props: BottomTabBarButtonProps) {
  const pressableRef = useRef<any>(null);

  // Identify which tab this is
  let tabKey = 'tab_0';
  const href = props.href || '';
  const label = (props.accessibilityLabel || '').toLowerCase();

  if (href.includes('explore') || label.includes('explore')) {
    tabKey = 'tab_1';
  } else if (href.includes('inbox') || label.includes('message') || label.includes('inbox') || label.includes('chat')) {
    tabKey = 'tab_2';
  } else if (href.includes('myprofile') || label.includes('profile')) {
    tabKey = 'tab_3';
  }

  // Mide la posición/tamaño del tab en pantalla y la emite para que TutorialModal la use como spotlight
  const measureAndRegister = () => {
    if (pressableRef.current && typeof pressableRef.current.measureInWindow === 'function') {
      pressableRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        if (width > 0 && height > 0) {
          DeviceEventEmitter.emit('register_tutorial_coords', {
            key: tabKey,
            coords: { x, y, w: width, h: height, borderRadius: 10 }
          });
        }
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(measureAndRegister, 150);
    const measureSub = DeviceEventEmitter.addListener('request_tutorial_measure', () => {
      measureAndRegister();
    });
    return () => {
      clearTimeout(timer);
      measureSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKey]);

  return (
    <PlatformPressable
      ref={pressableRef}
      {...props}
      onLayout={(e) => {
        measureAndRegister();
        setTimeout(measureAndRegister, 50);
        props.onLayout?.(e);
      }}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
