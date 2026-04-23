import { useMemo, useState } from 'react';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

import { janetAvatarAsset } from '../assets/janet';
import { colors, spacing, typography } from '../theme';

type JanetAvatarSize = 'sm' | 'md' | 'lg';

type JanetAvatarProps = {
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  size?: JanetAvatarSize | number;
};

function resolveSize(size: JanetAvatarProps['size']) {
  if (typeof size === 'number') {
    return size;
  }

  switch (size) {
    case 'sm':
      return 40;
    case 'lg':
      return 88;
    case 'md':
    default:
      return 56;
  }
}

export function JanetAvatar({
  containerStyle,
  imageStyle,
  size = 'md',
}: JanetAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const dimension = resolveSize(size);
  const imageDimension = Math.round(dimension * 0.9);
  const shellStyle = useMemo(
    () => ({
      borderRadius: dimension / 2,
      height: dimension,
      width: dimension,
    }),
    [dimension],
  );

  return (
    <View style={[styles.shell, shellStyle, containerStyle]}>
      {hasError ? (
        <Text style={[styles.fallbackText, { fontSize: Math.max(12, dimension * 0.22) }]}>
          Janet
        </Text>
      ) : (
        <Image
          onError={() => setHasError(true)}
          resizeMode="contain"
          source={janetAvatarAsset}
          style={[
            styles.image,
            {
              borderRadius: imageDimension / 2,
              height: imageDimension,
              width: imageDimension,
            },
            imageStyle,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackText: {
    ...typography.label,
    color: colors.primaryDeep,
    fontWeight: '700',
  },
  image: {
    backgroundColor: 'transparent',
  },
  shell: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.divider,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: spacing.xxs,
  },
});
