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
      actionLabel="Use Janet instead"
      avatarSize="sm"
      onPress={onPress}
      statusLabel="Ready"
      style={style}
      subtitle="Continue this step with guided voice."
      title="Janet Assistant"
    />
  );
}
