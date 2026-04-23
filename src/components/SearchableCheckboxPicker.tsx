import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '../theme';

type SearchableCheckboxPickerProps = {
  options: readonly string[];
  searchValue: string;
  selectedValues: string[];
  onChangeSearch: (value: string) => void;
  onToggleValue: (value: string) => void;
  onAddCustomValue?: (value: string) => void;
};

function normalizeSelectionValue(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function SearchableCheckboxPicker({
  options,
  searchValue,
  selectedValues,
  onChangeSearch,
  onToggleValue,
  onAddCustomValue,
}: SearchableCheckboxPickerProps) {
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
    <View style={styles.container}>
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
              <Pressable
                key={option}
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
                  color={selected ? colors.primaryDeep : colors.textTertiary}
                  name={selected ? 'checkbox' : 'square-outline'}
                  size={22}
                />
              </Pressable>
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
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  searchShell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    minHeight: 42,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
  addLabel: {
    ...typography.body,
    color: colors.primaryDeep,
    flex: 1,
  },
  addRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  emptyState: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
