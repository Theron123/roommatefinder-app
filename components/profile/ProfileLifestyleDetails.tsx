import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface ProfileLifestyleDetailsProps {
  likesArr: string[];
  prefsArr: string[];
  dealsArr: string[];
  lifestyleEntries: [string, any][];
  languagesArr: string[];
  LIFESTYLE_LABELS: Record<string, { label: string; emoji: string }>;
  translateHobby: (tag: string) => string;
  translateDealbreaker: (tag: string) => string;
  translateLifestyleKey: (key: string) => string;
  translateLifestyleVal: (val: string) => string;
  translateLanguage: (lang: string) => string;
  router: any;
  t: any;
}

export default function ProfileLifestyleDetails({
  likesArr,
  prefsArr,
  dealsArr,
  lifestyleEntries,
  languagesArr,
  LIFESTYLE_LABELS,
  translateHobby,
  translateDealbreaker,
  translateLifestyleKey,
  translateLifestyleVal,
  translateLanguage,
  router,
  t,
}: ProfileLifestyleDetailsProps) {
  return (
    <View style={styles.container}>
      {/* Hobbies */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{t('myprofile.interests')}</Text>
        <Pressable onPress={() => router.push('/preferences?focus=hobbies')}>
          <IconSymbol name="plus.circle.fill" size={24} color="#49C788" />
        </Pressable>
      </View>
      <View style={styles.chipWrap}>
        {likesArr.length > 0 ? likesArr.map((tag: string, idx: number) => (
          <View key={`${tag}-${idx}`} style={styles.chip}>
            <Text style={styles.chipText}>{translateHobby(tag)}</Text>
          </View>
        )) : (
          <Pressable onPress={() => router.push('/preferences?focus=hobbies')} style={styles.addChip}>
            <IconSymbol name="plus" size={16} color="#49C788" />
            <Text style={styles.addChipText}>{t('myprofile.add_hobbies')}</Text>
          </Pressable>
        )}
      </View>

      {/* Lifestyle */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{t('myprofile.lifestyle')}</Text>
        <Pressable onPress={() => router.push('/preferences?focus=lifestyle')}>
          <IconSymbol name="plus.circle.fill" size={24} color="#00C9A7" />
        </Pressable>
      </View>

      {lifestyleEntries.length > 0 || prefsArr.length > 0 || languagesArr.length > 0 ? (
        <View style={styles.lifestyleSection}>
          {/* Categorized lifestyle entries */}
          {lifestyleEntries.map(([key, val]: any) => {
            const meta = LIFESTYLE_LABELS[key] || { label: key, emoji: '📌' };
            return (
              <View key={key} style={styles.lifestyleCategoryRow}>
                <Text style={styles.lifestyleCategoryLabel}>{meta.emoji} {translateLifestyleKey(key)}</Text>
                <View style={[styles.chip, { backgroundColor: '#071916', borderColor: '#00C9A7' }]}>
                  <Text style={[styles.chipText, { color: '#00C9A7', fontWeight: 'bold' }]}>{translateLifestyleVal(val)}</Text>
                </View>
              </View>
            );
          })}

          {/* Languages */}
          {languagesArr.length > 0 && (
            <View style={styles.lifestyleCategoryRow}>
              <Text style={styles.lifestyleCategoryLabel}>{t('myprofile.languages')}</Text>
              <View style={styles.chipWrapInline}>
                {languagesArr.map((lang: string, idx: number) => (
                  <View key={`lang-${lang}-${idx}`} style={[styles.chip, { backgroundColor: '#071916', borderColor: '#00C9A7' }]}>
                    <Text style={[styles.chipText, { color: '#00C9A7' }]}>{translateLanguage(lang)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Legacy preferences array (if any) */}
          {prefsArr.length > 0 && (
            <View style={styles.lifestyleCategoryRow}>
              <Text style={styles.lifestyleCategoryLabel}>{t('myprofile.other')}</Text>
              <View style={styles.chipWrapInline}>
                {prefsArr.map((tag: string, idx: number) => (
                  <View key={`${tag}-${idx}`} style={[styles.chip, { backgroundColor: '#071916', borderColor: '#00C9A7' }]}>
                    <Text style={[styles.chipText, { color: '#00C9A7' }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.chipWrap}>
          <Pressable onPress={() => router.push('/preferences?focus=lifestyle')} style={[styles.addChip, { borderColor: '#00C9A7' }]}>
            <IconSymbol name="plus" size={16} color="#00C9A7" />
            <Text style={[styles.addChipText, { color: '#00C9A7' }]}>{t('myprofile.add_lifestyle')}</Text>
          </Pressable>
        </View>
      )}

      {/* Dealbreakers */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{t('myprofile.dealbreakers')}</Text>
        <Pressable onPress={() => router.push('/preferences?focus=dealbreakers')}>
          <IconSymbol name="plus.circle.fill" size={24} color="#FF4B4B" />
        </Pressable>
      </View>
      <View style={styles.chipWrap}>
        {dealsArr.length > 0 ? (
          dealsArr.map((tag: string, idx: number) => (
            <View key={`${tag}-${idx}`} style={[styles.chip, { backgroundColor: '#1a0a0a', borderColor: '#FF4B4B' }]}>
              <Text style={[styles.chipText, { color: '#FF4B4B' }]}>{translateDealbreaker(tag)}</Text>
            </View>
          ))
        ) : (
          <Pressable onPress={() => router.push('/preferences?focus=dealbreakers')} style={[styles.addChip, { borderColor: '#FF4B4B' }]}>
            <IconSymbol name="plus" size={16} color="#FF4B4B" />
            <Text style={[styles.addChipText, { color: '#FF4B4B' }]}>{t('myprofile.add_dealbreakers')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  chipWrapInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#49C788',
    backgroundColor: '#05140e',
  },
  chipText: {
    color: '#49C788',
    fontSize: 13,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#49C788',
  },
  addChipText: {
    color: '#49C788',
    fontSize: 13,
    fontWeight: '600',
  },
  lifestyleSection: {
    backgroundColor: '#0d1117',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1a1a2e',
    marginBottom: 16,
  },
  lifestyleCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  lifestyleCategoryLabel: {
    color: '#888',
    fontSize: 14,
  },
});
