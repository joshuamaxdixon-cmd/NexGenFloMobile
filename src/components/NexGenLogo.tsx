import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

import { nexgenLogoAsset } from '../assets/brand';
import { colors, spacing, typography } from '../theme';

type NexGenLogoProps = {
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  showWordmark?: boolean;
  size?: number;
};

export function NexGenLogo({
  containerStyle,
  imageStyle,
  showWordmark = true,
  size = 34,
}: NexGenLogoProps) {
  return (
    <View style={[styles.row, containerStyle]}>
      <Image
        resizeMode="contain"
        source={nexgenLogoAsset}
        style={[styles.logo, { height: size, width: size }, imageStyle]}
      />
      {showWordmark ? <Text style={styles.wordmark}>NexGEN</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    borderRadius: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wordmark: {
    ...typography.title,
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
