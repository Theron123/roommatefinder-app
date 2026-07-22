import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import TutorialModal from '@/components/TutorialModal';

export default function TabLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      setChecking(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          router.replace('/(auth)/login');
          return;
        }

        // Si el usuario eligió ver la app como buscador/seeker, no lo redirigimos
        const viewMode = await AsyncStorage.getItem('viewMode');
        if (viewMode === 'seeker') {
          setChecking(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'admin' || profile?.role === 'landlord') {
          router.replace('/(admin)');
        } else if (profile?.role === 'company') {
          router.replace('/(company)');
        }
      } catch (err) {
        router.replace('/(auth)/login');
      } finally {
        setChecking(false);
      }
    };
    checkAdmin();
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#49C788" />
      </View>
    );
  }

  return (
    <>
      <TutorialModal />
      <Tabs
        screenOptions={{
        tabBarActiveTintColor: '#49C788',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#1a1a1a',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="lightbulb.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bubble.left.and.bubble.right.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="myprofile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle.fill" color={color} />,
        }}
      />
    </Tabs>
    </>
  );
}
