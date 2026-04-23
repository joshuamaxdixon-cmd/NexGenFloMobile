import { useEffect, useMemo, type ReactNode } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '../theme';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SearchableCheckboxAccordionSectionProps = {
  title: string;
  options: readonly string[];
  searchValue: string;
  selectedValues: string[];
  isOpen: boolean;
  onChangeSearch: (value: string) => void;
  onToggleOpen: () => void;
  onToggleValue: (value: string) => void;
  onAddCustomValue?: (value: string) => void;
  renderOptionFooter?: (value: string) => ReactNode;
};

function normalizeSelectionValue(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildSummaryLabel(selectedCount: number) {
  if (selectedCount <= 0) {
    return 'Optional';
  }

  return `${selectedCount} selected`;
}

export function SearchableCheckboxAccordionSection({
  title,
  options,
  searchValue,
  selectedValues,
  isOpen,
  onChangeSearch,
  onToggleOpen,
  onToggleValue,
  onAddCustomValue,
  renderOptionFooter,
}: SearchableCheckboxAccordionSectionProps) {
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [isOpen, selectedValues.length]);

  const normalizedQuery = normalizeSelectionValue(searchValue);
  const orderedOptions = useMemo(() => {
    const selected = new Set(selectedValues);
    const baseOptions = [
      ...options,
      ...selectedValues.filter(
        (value) =>
          !options.some(
            (option) =>
              normalizeSelectionValue(option) === normalizeSelectionValue(value),
          ),
      ),
    ];
    const filtered = baseOptions.filter((option) =>
      normalizedQuery.length === 0
        ? true
        : normalizeSelectionValue(option).includes(normalizedQuery),
    );

    return [...filtered].sort((left, right) => {
      const leftSelected = selected.has(left);
      const rightSelected = selected.has(right);

      if (leftSelected === rightSelected) {
        return baseOptions.indexOf(left) - baseOptions.indexOf(right);
      }

      return leftSelected ? -1 : 1;
    });
  }, [normalizedQuery, options, selectedValues]);
  const customCandidate = searchValue.trim().replace(/\s+/g, ' ');
  const shouldShowCustomAdd =
    Boolean(onAddCustomValue) &&
    customCandidate.length > 0 &&
    ![...options, ...selectedValues].some(
      (option) =>
        normalizeSelectionValue(option) === normalizeSelectionValue(customCandidate),
    );

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        onPress={onToggleOpen}
        style={({ pressed }) => [
          styles.header,
          pressed ? styles.headerPressed : null,
        ]}
      >
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.summary}>{buildSummaryLabel(selectedValues.length)}</Text>
        </View>
        <Ionicons
          color={colors.primaryDeep}
          name={isOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={20}
        />
      </Pressable>

      {isOpen ? (
        <View style={styles.body}>
          <View style={styles.searchShell}>
            <Ionicons
              color={colors.textTertiary}
              name="search-outline"
              size={18}
            />
            <TextInput
              onChangeText={onChangeSearch}
              placeholder="Search"
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              value={searchValue}
            />
          </View>

          {orderedOptions.length > 0 ? (
            <View style={styles.optionsList}>
              {orderedOptions.map((option) => {
                const selected = selectedValues.includes(option);

                return (
                  <View key={option} style={styles.optionWrap}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => onToggleValue(option)}
                      style={({ pressed }) => [
                        styles.optionRow,
                        selected ? styles.optionRowSelected : null,
                        pressed ? styles.optionRowPressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          selected ? styles.optionLabelSelected : null,
                        ]}
                      >
                        {option}
                      </Text>
                      <Ionicons
                        color={
                          selected ? colors.primaryDeep : colors.textTertiary
                        }
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={22}
                      />
                    </Pressable>
                    {selected && renderOptionFooter ? (
                      <View style={styles.optionFooter}>
                        {renderOptionFooter(option)}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyState}>No matches found</Text>
          )}

          {shouldShowCustomAdd ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onAddCustomValue?.(customCandidate)}
              style={({ pressed }) => [
                styles.addRow,
                pressed ? styles.optionRowPressed : null,
              ]}
            >
              <Ionicons color={colors.primaryDeep} name="add-circle-outline" size={20} />
              <Text style={styles.addLabel}>{`Add "${customCandidate}"`}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  headerPressed: {
    opacity: 0.8,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xxs,
    paddingRight: spacing.sm,
  },
  title: {
    ...typography.sectionTitle,
  },
  summary: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  body: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  searchShell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    minHeight: 52,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionWrap: {
    gap: spacing.sm,
  },
  optionRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  optionRowSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionRowPressed: {
    transform: [{ scale: 0.995 }],
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    paddingRight: spacing.sm,
  },
  optionLabelSelected: {
    color: colors.primaryDeep,
    fontWeight: '600',
  },
  optionFooter: {
    paddingLeft: spacing.sm,
  },
  addLabel: {
    ...typography.body,
    color: colors.primaryDeep,
    flex: 1,
  },
  addRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyState: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
