declare module '@quidone/react-native-wheel-picker' {
  import { ComponentType } from 'react';
  import { ViewStyle, StyleProp } from 'react-native';

  export interface PickerItem<T = any> {
    value: T;
    label: string;
  }

  export interface WheelPickerProps<T = any> {
    data: Array<PickerItem<T>>;
    /** Currently selected item */
    value?: PickerItem<T>;
    /** Height of a single item */
    itemHeight?: number;
    /** Total number of rows visible */
    visibleItemCount?: number;
    /** Render a row */
    renderItem?: (params: {
      item: PickerItem<T>;
      index: number;
      isSelected: boolean;
    }) => React.ReactElement | null;
    /** Callback when user stops scrolling */
    onValueChanged?: (params: { item: PickerItem<T>; index: number }) => void;
    keyExtractor?: (item: PickerItem<T>, index: number) => string;
    style?: StyleProp<ViewStyle>;
    /** Custom style for overlay element in the centre */
    overlayItemStyle?: StyleProp<ViewStyle>;
  }

  const WheelPicker: ComponentType<WheelPickerProps>;

  export default WheelPicker;
}
