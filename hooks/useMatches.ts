import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';

export function useMatches() {
  const [matches, setMatches] = useState<Profile[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [errorMatches, setErrorMatches] = useState<string | null>(null);

  const fetchMatches = useCallback(async (currentUserId: string | undefined = undefined) => {
    setLoadingMatches(true);
    setErrorMatches(null);

    try {
      let myId = currentUserId;
      if (!myId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoadingMatches(false);
          return [];
        }
        myId = session.user.id;
      }

      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`user1.eq.${myId},user2.eq.${myId}`);

      if (matchesError) throw matchesError;

      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        setLoadingMatches(false);
        return [];
      }

      const userIds = matchesData
        .map(m => m.user1 === myId ? m.user2 : m.user1)
        .filter(Boolean) as string[];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, age, photoUrl, role, latOffset, lngOffset, latitude, longitude, likes, preferences, dealbreakers')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const loadedProfiles = (profilesData || []) as unknown as Profile[];
      setMatches(loadedProfiles);
      return loadedProfiles;
    } catch (e: any) {
      console.error('Error fetching matches:', e);
      setErrorMatches(e.message);
      return [];
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  return { matches, loadingMatches, errorMatches, fetchMatches };
}
