import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import type { UploadDocumentAsset } from '../services/uploads';
import { colors, spacing, typography } from '../theme';
import { InfoCard } from './InfoCard';

type IconName = ComponentProps<typeof Ionicons>['name'];

type UploadPreviewCardProps = {
  asset: UploadDocumentAsset | null;
  fullWidth?: boolean;
  icon: IconName;
  onPress?: () => void;
  selected?: boolean;
  subtitle: string;
  title: string;
};

export function UploadPreviewCard({
  asset,
  fullWidth = false,
  icon,
  onPress,
  selected = false,
  subtitle,
  title,
}: UploadPreviewCardProps) {
  return (
    <Pressable onPress={onPress} style={[styles.pressable, fullWidth && styles.fullWidth]}>
      <InfoCard
        style={[styles.card, selected && styles.selectedCard]}
        subtitle={subtitle}
        title={title}
      >
        {asset ? (
          <>
            <Image
              contentFit="cover"
              source={{ uri: asset.uri }}
              style={styles.image}
            />
            <Text style={styles.fileName}>{asset.fileName}</Text>
            <Text style={styles.metaText}>
              {asset.source === 'camera'
                ? 'Captured with camera'
                : 'Imported from gallery'}
            </Text>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons color={colors.primaryDeep} name={icon} size={34} />
            <Text style={styles.emptyTitle}>No file selected</Text>
            <Text style={styles.emptyMessage}>
              The chosen image preview will appear here after capture or import.
            </Text>
          </View>
        )}
      </InfoCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '48%',
  },
  fullWidth: {
    width: '100%',
  },
  card: {
    minHeight: 212,
  },
  selectedCard: {
    borderColor: colors.primary,
  },
  image: {
    width: '100%',
    height: 132,
    borderRadius: 14,
    backgroundColor: colors.backgroundAlt,
    marginBottom: spacing.md,
  },
  fileName: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.primaryText,
  },
  emptyState: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.sectionTitle,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
});
