import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Match = { user_id: string; name: string };

interface ContractStepMatchesProps {
  matches: Match[];
  selectedUsers: Match[];
  loadingMatches: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleToggleUser: (user: Match) => void;
  t: any;
}

export default function ContractStepMatches({
  matches,
  selectedUsers,
  loadingMatches,
  searchQuery,
  setSearchQuery,
  handleToggleUser,
  t
}: ContractStepMatchesProps) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.sectionHint}>{t('contracts.who_signing')}</Text>

      {/* Buscador de Matches */}
      {matches.length > 0 && (
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('contracts.search_roommates')}
            placeholderTextColor="#666"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close" size={18} color="#666" />
            </Pressable>
          )}
        </View>
      )}

      {/* Píldoras de seleccionados */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedPillsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedPillsScroll}>
            {selectedUsers.map(user => (
              <Pressable key={user.user_id} style={styles.selectedPill} onPress={() => handleToggleUser(user)}>
                <Text style={styles.selectedPillText}>{user.name}</Text>
                <MaterialCommunityIcons name="close-circle" size={16} color="#fff" style={{ marginLeft: 6 }} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {loadingMatches ? (
        <ActivityIndicator color="#49C788" style={{ marginTop: 40 }} />
      ) : matches.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <MaterialCommunityIcons name="account-question-outline" size={40} color="#666" />
          </View>
          <Text style={styles.emptyStateText}>{t('contracts.need_match')}</Text>
        </View>
      ) : (
        (() => {
          const filtered = matches.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
          if (filtered.length === 0) {
            return (
              <View style={styles.emptyState}>
                <Text style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>{t('contracts.no_roommates_match')}</Text>
              </View>
            );
          }
          return filtered.map(m => {
            const isSelected = selectedUsers.some(u => u.user_id === m.user_id);
            return (
              <Pressable
                key={m.user_id}
                style={[styles.matchCard, isSelected && styles.matchCardActive]}
                onPress={() => handleToggleUser(m)}
              >
                <View style={[styles.matchAvatar, isSelected && { backgroundColor: '#49C788' }]}>
                  <Text style={[styles.matchInitial, isSelected && { color: '#000' }]}>{m.name[0]?.toUpperCase()}</Text>
                </View>
                <Text style={styles.matchName}>{m.name}</Text>
                <MaterialCommunityIcons 
                  name={isSelected ? "check-circle" : "circle-outline"} 
                  size={24} 
                  color={isSelected ? "#49C788" : "#333"} 
                />
              </Pressable>
            );
          });
        })()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepContent: { gap: 16 },
  sectionHint: { color: '#888', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderRadius: 20, borderWidth: 1, borderColor: '#1a1a2e', paddingHorizontal: 16, height: 50, marginBottom: 8 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  selectedPillsContainer: { height: 40, marginBottom: 8 },
  selectedPillsScroll: { gap: 8, alignItems: 'center' },
  selectedPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#49C788', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  selectedPillText: { color: '#000', fontWeight: '700', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 30, gap: 16 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  emptyStateText: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  matchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#1a1a2e', borderRadius: 24, padding: 16, gap: 12 },
  matchCardActive: { borderColor: '#49C788', backgroundColor: 'rgba(73,199,136,0.05)' },
  matchAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  matchInitial: { color: '#fff', fontWeight: '800', fontSize: 18 },
  matchName: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
});
