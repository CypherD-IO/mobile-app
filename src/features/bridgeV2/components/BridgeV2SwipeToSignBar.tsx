import SwipeToConfirmBar from '../../../components/v2/SwipeToConfirmBar';

type Props = {
  visible: boolean;
  onSwipeComplete: () => void;
  label?: string;
};

/**
 * Bridge-specific wrapper — delegates to the shared SwipeToConfirmBar.
 */
export default function BridgeV2SwipeToSignBar({
  visible,
  onSwipeComplete,
  label = 'Swipe to sign',
}: Props) {
  return (
    <SwipeToConfirmBar
      visible={visible}
      onSwipeComplete={onSwipeComplete}
      label={label}
    />
  );
}
