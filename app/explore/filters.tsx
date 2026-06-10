import { router } from 'expo-router';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../context/LanguageContext';

export type ExploreFilters = {
  role: 'all' | 'seeker' | 'host';
  minBudget: number;
  maxBudget: number;
  petsAllowed: boolean | null;
  smokingAllowed: boolean | null;
  onlyVerified: boolean;
  sleepSchedule: string | null;
  cleanliness: string | null;
};

const DEFAULT_FILTERS: ExploreFilters = {
  role: 'all',
  minBudget: 0,
  maxBudget: 20000,
  petsAllowed: null,
  smokingAllowed: null,
  onlyVerified: false,
  sleepSchedule: null,
  cleanliness: null,
};

// Exposed so Explore screen can import it
let _savedFilters: ExploreFilters = { ...DEFAULT_FILTERS };
export const getActiveFilters = () => _savedFilters;

const BUDGET_STEPS = [0, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000];

function BudgetSlider({
  value, max, min, onIncrease, onDecrease, label,
}: { value: number; max: number; min: number; onIncrease: () => void; onDecrease: () => void; label: string }) {
  const steps = BUDGET_STEPS;
  const pct = ((value - steps[0]) / (steps[steps.length - 1] - steps[0])) * 100;
  return (
    <View style={s.budgetRow}>
      <Text style={s.budgetLabel}>{label}</Text>
      <View style={s.budgetCtrl}>
        <Pressable onPress={onDecrease} style={s.budgetBtn}>
          <MaterialCommunityIcons name="minus" size={16} color="#fff" />
        </Pressable>
        <Text style={s.budgetValue}>${value.toLocaleString()} MXN</Text>
        <Pressable onPress={onIncrease} style={s.budgetBtn}>
          <MaterialCommunityIcons name="plus" size={16} color="#fff" />
        </Pressable>
      </View>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function OptionChip({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[s.chip, selected && s.chipActive]}
      onPress={onPress}
    >
      <Text style={[s.chipText, selected && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function ExploreFiltersScreen() {
  const { t, locale } = useTranslation();
  const [filters, setFilters] = useState<ExploreFilters>({ ..._savedFilters });

  const sleepOptions = [
    { label: locale === 'es' ? 'Madrugador 🌅' : 'Early Bird 🌅', value: 'early_bird' },
    { label: locale === 'es' ? 'Noctámbulo 🌙' : 'Night Owl 🌙', value: 'night_owl' },
    { label: locale === 'es' ? 'Flexible 🤷' : 'Flexible 🤷', value: 'flexible' },
  ];
  const cleanOptions = [
    { label: locale === 'es' ? 'Muy Limpio ✨' : 'Very Clean ✨', value: 'very_clean' },
    { label: locale === 'es' ? 'Promedio 👌' : 'Average 👌', value: 'average' },
    { label: locale === 'es' ? 'Relajado 🛋️' : 'Relaxed 🛋️', value: 'relaxed' },
  ];

  const stepIndex = (val: number) => BUDGET_STEPS.indexOf(val);

  const increaseMin = () => {
    const i = stepIndex(filters.minBudget);
    if (i < BUDGET_STEPS.length - 1 && BUDGET_STEPS[i + 1] < filters.maxBudget) {
      setFilters(f => ({ ...f, minBudget: BUDGET_STEPS[i + 1] }));
    }
  };
  const decreaseMin = () => {
    const i = stepIndex(filters.minBudget);
    if (i > 0) setFilters(f => ({ ...f, minBudget: BUDGET_STEPS[i - 1] }));
  };
  const increaseMax = () => {
    const i = stepIndex(filters.maxBudget);
    if (i < BUDGET_STEPS.length - 1) setFilters(f => ({ ...f, maxBudget: BUDGET_STEPS[i + 1] }));
  };
  const decreaseMax = () => {
    const i = stepIndex(filters.maxBudget);
    if (i > 0 && BUDGET_STEPS[i - 1] > filters.minBudget) {
      setFilters(f => ({ ...f, maxBudget: BUDGET_STEPS[i - 1] }));
    }
  };

  const applyFilters = () => {
    _savedFilters = { ...filters };
    router.back();
  };

  const resetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    _savedFilters = { ...DEFAULT_FILTERS };
  };

  const activeCount = [
    filters.role !== 'all',
    filters.minBudget > 0,
    filters.maxBudget < 20000,
    filters.petsAllowed !== null,
    filters.smokingAllowed !== null,
    filters.onlyVerified,
    filters.sleepSchedule !== null,
    filters.cleanliness !== null,
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#000']} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.closeBtn}>
          <MaterialCommunityIcons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>{t('explore.filters_title')}</Text>
        <Pressable onPress={resetFilters}>
          <Text style={s.resetText}>{t('explore.clear_all')}</Text>
        </Pressable>
      </LinearGradient>

      {activeCount > 0 && (
        <View style={s.activeBanner}>
          <MaterialCommunityIcons name="filter-check" size={14} color="#49C788" />
          <Text style={s.activeBannerText}>
            {activeCount} {activeCount === 1 ? t('explore.active_filters') : t('explore.active_filters_plural')}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Tipo de usuario ── */}
        <Text style={s.sectionTitle}>{t('explore.looking_for')}</Text>
        <View style={s.chipRow}>
          <OptionChip label={t('explore.all')} selected={filters.role === 'all'} onPress={() => setFilters(f => ({ ...f, role: 'all' }))} />
          <OptionChip label={t('explore.seeks_room')} selected={filters.role === 'seeker'} onPress={() => setFilters(f => ({ ...f, role: 'seeker' }))} />
          <OptionChip label={t('explore.has_room_filter')} selected={filters.role === 'host'} onPress={() => setFilters(f => ({ ...f, role: 'host' }))} />
        </View>

        {/* ── Presupuesto ── */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>{t('explore.monthly_budget')}</Text>
        <View style={s.card}>
          <BudgetSlider
            label={t('explore.min')}
            value={filters.minBudget}
            min={0}
            max={filters.maxBudget}
            onIncrease={increaseMin}
            onDecrease={decreaseMin}
          />
          <View style={s.divider} />
          <BudgetSlider
            label={t('explore.max')}
            value={filters.maxBudget}
            min={filters.minBudget}
            max={20000}
            onIncrease={increaseMax}
            onDecrease={decreaseMax}
          />
        </View>

        {/* ── Solo Verificados ── */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>{t('explore.safety_trust')}</Text>
        <View style={[s.card, s.row]}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>{t('explore.verified_only')}</Text>
            <Text style={s.rowSub}>{t('explore.verified_sub')}</Text>
          </View>
          <Switch
            value={filters.onlyVerified}
            onValueChange={v => setFilters(f => ({ ...f, onlyVerified: v }))}
            trackColor={{ false: '#222', true: '#49C788' }}
            thumbColor="#fff"
          />
        </View>

        {/* ── Mascotas ── */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>{t('explore.pets')}</Text>
        <View style={s.chipRow}>
          <OptionChip label={t('explore.no_pref')} selected={filters.petsAllowed === null} onPress={() => setFilters(f => ({ ...f, petsAllowed: null }))} />
          <OptionChip label={t('explore.pets_allowed')} selected={filters.petsAllowed === true} onPress={() => setFilters(f => ({ ...f, petsAllowed: true }))} />
          <OptionChip label={t('explore.no_pets')} selected={filters.petsAllowed === false} onPress={() => setFilters(f => ({ ...f, petsAllowed: false }))} />
        </View>

        {/* ── Fumadores ── */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>{t('explore.smoking')}</Text>
        <View style={s.chipRow}>
          <OptionChip label={t('explore.no_pref')} selected={filters.smokingAllowed === null} onPress={() => setFilters(f => ({ ...f, smokingAllowed: null }))} />
          <OptionChip label={t('explore.allowed')} selected={filters.smokingAllowed === true} onPress={() => setFilters(f => ({ ...f, smokingAllowed: true }))} />
          <OptionChip label={t('explore.not_allowed')} selected={filters.smokingAllowed === false} onPress={() => setFilters(f => ({ ...f, smokingAllowed: false }))} />
        </View>

        {/* ── Horario de sueño ── */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>{t('explore.schedule')}</Text>
        <View style={s.chipRow}>
          <OptionChip label={t('explore.any')} selected={filters.sleepSchedule === null} onPress={() => setFilters(f => ({ ...f, sleepSchedule: null }))} />
          {sleepOptions.map(o => (
            <OptionChip key={o.value} label={o.label} selected={filters.sleepSchedule === o.value} onPress={() => setFilters(f => ({ ...f, sleepSchedule: o.value }))} />
          ))}
        </View>

        {/* ── Limpieza ── */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>{t('explore.cleanliness')}</Text>
        <View style={s.chipRow}>
          <OptionChip label={t('explore.any')} selected={filters.cleanliness === null} onPress={() => setFilters(f => ({ ...f, cleanliness: null }))} />
          {cleanOptions.map(o => (
            <OptionChip key={o.value} label={o.label} selected={filters.cleanliness === o.value} onPress={() => setFilters(f => ({ ...f, cleanliness: o.value }))} />
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Apply Button */}
      <View style={s.footer}>
        <Pressable style={s.applyBtn} onPress={applyFilters}>
          <MaterialCommunityIcons name="filter-check-outline" size={20} color="#000" />
          <Text style={s.applyBtnText}>{t('explore.apply_filters')}{activeCount > 0 ? ` (${activeCount})` : ''}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#111', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  resetText: { color: '#49C788', fontSize: 14, fontWeight: '600' },

  activeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(73,199,136,0.08)', borderBottomWidth: 1, borderBottomColor: 'rgba(73,199,136,0.2)',
    paddingHorizontal: 20, paddingVertical: 8,
  },
  activeBannerText: { color: '#49C788', fontSize: 12, fontWeight: '600' },

  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  sectionTitle: {
    color: '#555', fontSize: 11, fontWeight: '800',
    letterSpacing: 1.2, marginBottom: 12,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#111', borderWidth: 1, borderColor: '#222',
  },
  chipActive: { backgroundColor: 'rgba(73,199,136,0.1)', borderColor: '#49C788' },
  chipText: { color: '#666', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#49C788', fontWeight: '700' },

  card: {
    backgroundColor: '#0d1117', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#1a1a2e',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rowSub: { color: '#555', fontSize: 12, marginTop: 2 },

  divider: { height: 1, backgroundColor: '#1a1a2e', marginVertical: 14 },

  budgetRow: { gap: 8 },
  budgetLabel: { color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  budgetCtrl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  budgetBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center',
  },
  budgetValue: { color: '#fff', fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  progressTrack: {
    height: 4, backgroundColor: '#1a1a2e', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#49C788', borderRadius: 2 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 36,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderTopWidth: 1, borderTopColor: '#111',
  },
  applyBtn: {
    backgroundColor: '#49C788', borderRadius: 30,
    paddingVertical: 16, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#49C788', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  applyBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
