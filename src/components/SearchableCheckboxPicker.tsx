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
};

export function SearchableCheckboxPicker({
  options,
  searchValue,
  selectedValues,
  onChangeSearch,
  onToggleValue,
}: SearchableCheckboxPickerProps) {
  const normalizedQuery = searchValue.trim().toLowerCase();
  const orderedOptions = useMemo(() => {
    const selected = new Set(selectedValues);
    const filtered = options.filter((option) =>
      normalizedQuery.length === 0
        ? true
        : option.toLowerCase().includes(normalizedQuery),
    );

    return [...filtered].sort((left, right) => {
      const leftSelected = selected.has(left);
      const rightSelected = selected.has(right);

      if (leftSelected === rightSelected) {
        return options.indexOf(left) - options.indexOf(right);
      }

      return leftSelected ? -1 : 1;
    });
  }, [normalizedQuery, options, selectedValues]);

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
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
  emptyState: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
