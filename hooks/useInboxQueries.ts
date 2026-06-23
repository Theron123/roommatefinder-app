import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from './useProfileQueries';

export function useInboxData() {
  return useQuery({
    queryKey: ['inbox'],
    queryFn: async () => {
      const myId = await getCurrentUserId();
      if (!myId) return { conversations: [], matches: [] };

      // 1. Fetch messages
      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order('created_at', { ascending: false });

      if (msgsError) {
        console.error('Error fetching messages in useInboxData:', msgsError);
      }

      // 2. Fetch matches
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('user1, user2, created_at')
        .or(`user1.eq.${myId},user2.eq.${myId}`);

      if (matchError) {
        console.error('Error fetching matches in useInboxData:', matchError);
      }

      // 3. Load local storage (deleted msgs + viewed matches)
      const [deletedRaw, viewedRaw] = await Promise.all([
        AsyncStorage.getItem('@roommatefinder:deleted_msgs_for_me'),
        AsyncStorage.getItem('@roommatefinder:viewed_matches'),
      ]);

      const deletedMsgs = deletedRaw ? JSON.parse(deletedRaw) : [];
      const viewedMatches = viewedRaw ? JSON.parse(viewedRaw) : [];

      const validMsgs = (msgs || []).filter(m => !deletedMsgs.includes(m.id));
      const uniqueUserIdsWithMsgs = new Set<string>();
      const lastMsgs = new Map<string, any>();
      const unreadCounts = new Map<string, number>();

      validMsgs.forEach(msg => {
        const otherId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
        if (!uniqueUserIdsWithMsgs.has(otherId)) {
          uniqueUserIdsWithMsgs.add(otherId);
          lastMsgs.set(otherId, msg);
        }
        if (msg.receiver_id === myId && !msg.is_read) {
          unreadCounts.set(otherId, (unreadCounts.get(otherId) || 0) + 1);
        }
      });

      // Match logic
      const allMatchIds = matchData ? matchData.map(m => m.user1 === myId ? m.user2 : m.user1) : [];
      
      // Collect all user IDs we need profiles for (msgs + matches)
      const allUserIdsToFetch = new Set([...Array.from(uniqueUserIdsWithMsgs), ...allMatchIds]);

      let formattedConvos: any[] = [];
      let newMatchesList: any[] = [];

      if (allUserIdsToFetch.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, age, photoUrl')
          .in('id', Array.from(allUserIdsToFetch));

        if (profilesError) {
          console.error('Error fetching profiles in useInboxData:', profilesError);
        }

        if (profiles) {
          profiles.forEach(p => {
            const hasMessages = uniqueUserIdsWithMsgs.has(p.id);
            const isMatch = allMatchIds.includes(p.id);
            const isViewed = viewedMatches.includes(p.id);

            if (hasMessages) {
              // Has messages -> goes to conversations
              const lastMsg = lastMsgs.get(p.id);
              const date = new Date(lastMsg.created_at);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              formattedConvos.push({
                id: p.id,
                name: p.name || 'Roommate',
                age: p.age,
                photoUrl: p.photoUrl || '',
                lastMessage: lastMsg.content || lastMsg.media_type || 'Message',
                time: timeStr,
                unreadCount: unreadCounts.get(p.id) || 0,
                lastMsgSenderId: lastMsg.sender_id,
                lastMsgIsRead: lastMsg.is_read,
                timestamp: date.getTime(),
              });
            } else if (isMatch) {
              if (isViewed) {
                // Viewed but no messages -> goes to conversations
                const matchObj = matchData?.find(m => (m.user1 === p.id && m.user2 === myId) || (m.user2 === p.id && m.user1 === myId));
                const matchDate = matchObj ? new Date(matchObj.created_at) : new Date();
                const timeStr = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                formattedConvos.push({
                  id: p.id,
                  name: p.name || 'Roommate',
                  age: p.age,
                  photoUrl: p.photoUrl || '',
                  lastMessage: 'Tap to chat',
                  time: timeStr,
                  unreadCount: 0,
                  lastMsgSenderId: null,
                  lastMsgIsRead: true,
                  timestamp: matchDate.getTime()
                });
              } else {
                // Unviewed match without messages -> stays in New Matches
                newMatchesList.push(p);
              }
            }
          });

          // Sort formattedConvos
          formattedConvos.sort((a, b) => b.timestamp - a.timestamp);
        }
      }

      return {
        conversations: formattedConvos,
        matches: newMatchesList,
      };
    },
  });
}
