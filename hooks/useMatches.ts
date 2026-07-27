import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { getCurrentUserId } from './useProfileQueries';

// Consulta los matches del usuario autenticado junto con los perfiles asociados
export function useMatches(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['matches'],
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<Profile[]> => {
      const myId = await getCurrentUserId();
      if (!myId) return [];

      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`user1.eq.${myId},user2.eq.${myId}`);

      if (matchesError) throw matchesError;
      if (!matchesData || matchesData.length === 0) return [];

      const userIds = matchesData
        .map((m) => (m.user1 === myId ? m.user2 : m.user1))
        .filter(Boolean) as string[];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, age, photoUrl, role, latOffset, lngOffset, latitude, longitude, likes, preferences, dealbreakers')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      return (profilesData || []) as unknown as Profile[];
    },
  });
}
