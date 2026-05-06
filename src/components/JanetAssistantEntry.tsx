import type { StyleProp, ViewStyle } from 'react-native';

import { JanetHelperCard } from './JanetHelperCard';

type JanetAssistantEntryProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function JanetAssistantEntry({
  onPress,
  style,
}: JanetAssistantEntryProps) {
  return (
    <JanetHelperCard
      actionLabel="Use Janet"
      avatarSize="sm"
      onPress={onPress}
      statusLabel="Ready"
      style={style}
      subtitle="Janet can guide this step by voice."
      title="Janet Assistant"
    />
  );
}
