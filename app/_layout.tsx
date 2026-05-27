import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications, notifyNewMessage, getActiveChatUserId } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: 'onboarding',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

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

    // Realtime global messages subscriber for notifications
    let globalMsgChannel: any = null;
    
    const setupGlobalMsgListener = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const myId = session.user.id;

      globalMsgChannel = supabase
        .channel('global:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
          const newMsg = payload.new;
          if (newMsg.receiver_id === myId) {
            // Check if we are currently chatting with this sender
            if (newMsg.sender_id === getActiveChatUserId()) {
              return;
            }

            // Get sender profile details
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', newMsg.sender_id)
              .single();

            const senderName = senderProfile?.name || 'Roommate';

            // Trigger local notification
            await notifyNewMessage(senderName, newMsg.content, newMsg.sender_id);
          }
        })
        .subscribe();
    };

    setupGlobalMsgListener();

    // Re-subscribe if user logs in/out
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (globalMsgChannel) {
        supabase.removeChannel(globalMsgChannel);
        globalMsgChannel = null;
      }
      if (session?.user?.id) {
        setupGlobalMsgListener();
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      if (globalMsgChannel) {
        supabase.removeChannel(globalMsgChannel);
      }
      authSubscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
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
