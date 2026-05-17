import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '@/lib/notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: 'onboarding',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Register for push notifications on mount
    registerForPushNotifications();

    // Listener: notification received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Push] Notification received:', notification.request.content.title);
    });

    // Listener: user taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.type === 'new_message' && data?.senderId) {
        router.push(`/chat/${data.senderId}`);
      } else if (data?.type === 'new_match' && data?.matchedUserId) {
        router.push(`/profile/${data.matchedUserId}`);
      } else if (data?.type === 'contract_update' && data?.contractId) {
        router.push(`/contracts/${data.contractId}`);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[id]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="role-select" options={{ headerShown: false }} />
        <Stack.Screen name="preferences" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="contracts/index" options={{ headerShown: false }} />
        <Stack.Screen name="contracts/new" options={{ headerShown: false }} />
        <Stack.Screen name="contracts/review" options={{ headerShown: false }} />
        <Stack.Screen name="contracts/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen name="trust/index" options={{ headerShown: false }} />
        <Stack.Screen name="trust/verify" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="trust/report" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="explore/filters" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
