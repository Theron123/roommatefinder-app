import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

// ── Configure how notifications appear when app is in foreground ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests permission and returns the Expo push token.
 * Saves the token to the user's profile in Supabase.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[Notifications] Push notifications are not configured for web in dev mode.');
    // Prompt for standard HTML5 Web Notifications on browsers
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          console.log('[Notifications] Web notification permission:', permission);
        });
      }
    }
    return null;
  }

  if (!Device.isDevice) {
    console.log('[Notifications] Push tokens are only available on physical devices.');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted.');
    return null;
  }

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#49C788',
    });
  }

  // Get Expo push token safely
  let token = null;
  try {
    const projectId = 
      process.env.EXPO_PUBLIC_PROJECT_ID || 
      Constants.expoConfig?.extra?.eas?.projectId || 
      (Constants.easConfig as any)?.projectId;

    if (projectId) {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = tokenData.data;
    } else {
      console.warn('[Notifications] No projectId found in env or expoConfig, skipping push token registration.');
    }
  } catch (error) {
    console.warn('[Notifications] Failed to get Expo push token:', error);
  }

  // Save to Supabase profile
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', session.user.id);
    }
  } catch (e) {
    console.error('[Notifications] Error saving token to Supabase:', e);
  }

  return token;
}

/**
 * Schedules a local notification immediately.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const notif = new Notification(title, {
          body,
          tag: data?.type || 'notification',
        });
        notif.onclick = () => {
          window.focus();
        };
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            const notif = new Notification(title, {
              body,
              tag: data?.type || 'notification',
            });
            notif.onclick = () => {
              window.focus();
            };
          }
        });
      }
    }
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: null, // Fire immediately
  });
}

/**
 * Helper to notify user of a new message locally (real-time feel).
 */
export async function notifyNewMessage(senderName: string, messagePreview: string, senderId: string) {
  await sendLocalNotification(
    `💬 ${senderName}`,
    messagePreview.slice(0, 80),
    { type: 'new_message', senderId }
  );
}

/**
 * Helper to notify user of a new match.
 */
export async function notifyNewMatch(matchedUserName: string, matchedUserId: string) {
  await sendLocalNotification(
    `🎉 New Match!`,
    `${matchedUserName} is also interested in connecting with you.`,
    { type: 'new_match', matchedUserId }
  );
}

/**
 * Helper to notify about contract update.
 */
export async function notifyContractUpdate(contractId: string, message: string) {
  await sendLocalNotification(
    `📄 Contract Update`,
    message,
    { type: 'contract_update', contractId }
  );
}

/**
 * Helper to notify about a major warning or security alert.
 */
export async function notifyMajorWarning(title: string, message: string, data?: Record<string, any>) {
  await sendLocalNotification(
    `⚠️ ${title}`,
    message,
    { type: 'major_warning', ...data }
  );
}

// Shared active chat state to prevent notifying when already chatting with the sender
let _activeChatUserId: string | null = null;
export function setActiveChatUserId(id: string | null) {
  _activeChatUserId = id;
}
export function getActiveChatUserId(): string | null {
  return _activeChatUserId;
}
