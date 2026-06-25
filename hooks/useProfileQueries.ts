import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Helper to get authenticated user ID
export async function getCurrentUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export function useMyProfile() {
  return useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const myId = await getCurrentUserId();
      if (!myId) return null;

      // Fetch contract participants first
      const { data: partData } = await supabase
        .from('contract_participants')
        .select('contract_id')
        .eq('user_id', myId);

      const contractIds = partData?.map(p => p.contract_id).filter(Boolean) || [];

      let contractsQuery = supabase.from('contracts').select('id, status');
      if (contractIds.length > 0) {
        contractsQuery = contractsQuery.or(`initiator_id.eq.${myId},id.in.(${contractIds.join(',')})`);
      } else {
        contractsQuery = contractsQuery.eq('initiator_id', myId);
      }

      const [profileRes, listingRes, contractsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', myId).single(),
        supabase.from('listings').select('*').eq('user_id', myId).maybeSingle(),
        contractsQuery,
      ]);

      if (profileRes.error && profileRes.error.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileRes.error);
      }

      const profile = profileRes.data || null;
      const listing = listingRes.data || null;
      const contracts = contractsRes.data || [];
      const contractCount = contracts.length;
      const pendingCount = contracts.filter((c: any) => c.status === 'pending_authorization').length;

      return {
        profile,
        listing,
        contractCount,
        pendingCount,
      };
    },
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updateData: {
      name?: string;
      bio?: string;
      age?: number | null;
      availability_status?: string;
      photos?: string[];
      photoUrl?: string;
    }) => {
      const myId = await getCurrentUserId();
      if (!myId) throw new Error('No active session');

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', myId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
    },
  });
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profileRes, listingRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('listings').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      return {
        profile: profileRes.data || null,
        listing: listingRes.data || null,
      };
    },
  });
}
