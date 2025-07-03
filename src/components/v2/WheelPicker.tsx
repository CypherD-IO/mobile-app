import React, { useCallback, useMemo } from 'react';
import { ViewStyle } from 'react-native';
import WheelPickerOriginal, {
  WheelPickerProps as OriginalProps,
  PickerItem,
} from '@quidone/react-native-wheel-picker';

/**
 * Interface that matches the signature currently expected by RewardProgressWidget
 * so we can drop this in without touching feature code.
 */
export interface WheelPickerItem {
  /**
   * Unique id for React key extraction
   */
  id: string | number;
  /**
   * React element that will be rendered in the wheel row.  The wrapper injects
   * `isSelected` and `index` so existing <TaskWheelItem> keeps working.
   */
  component: React.ReactElement;
  /**
   * Optional raw value that the consumer might care about.
   */
  value?: any;
}

export interface WheelPickerProps {
  data: WheelPickerItem[];
  /**
   * Currently-selected index (0-based).  Must refer to an item inside `data`.
   */
  selectedIndex: number;
  /**
   * Fires when the user scrolls to a new item or when snapping finishes.
   */
  onChange: (index: number, item: WheelPickerItem) => void;
  /**
   * Height of each wheel item.
   */
  itemHeight?: number;
  /**
   * Number of *neighbour* rows shown above and below the centre one.  `1` means
   * 3 visible rows in total.
   */
  visibleRest?: number;
  containerStyle?: ViewStyle;
  /** Not used but kept for API compatibility */
  selectedIndicatorStyle?: ViewStyle;
}

const WheelPicker: React.FC<WheelPickerProps> = ({
  data,
  selectedIndex,
  onChange,
  itemHeight = 50,
  visibleRest = 2,
  containerStyle,
  selectedIndicatorStyle,
}) => {
  // Map to the structure the library expects.  We keep a stable reference so
  // React.memo in the library isn't broken every render.
  const pickerData: Array<PickerItem<WheelPickerItem>> = useMemo(
    () =>
      data.map(item => ({
        value: item, // we keep the full object so we can hand it straight back
        label: String(item.id), // label is unused because we render custom row
      })),
    [data],
  );

  // Calculate padding so that the first / last item can scroll into the centre slot.
  const contentContainerStyle = React.useMemo(
    () => ({ paddingVertical: itemHeight * visibleRest }),
    [itemHeight, visibleRest],
  );

  const handleValueChanged: OriginalProps<WheelPickerItem>['onValueChanged'] =
    useCallback(
      ({ index }: { index: number }) => {
        if (index !== selectedIndex && data[index]) {
          onChange(index, data[index]);
        }
      },
      [data, onChange, selectedIndex],
    );

  return (
    <WheelPickerOriginal
      data={pickerData}
      value={pickerData[selectedIndex]}
      itemHeight={itemHeight}
      visibleItemCount={visibleRest * 2 + 1}
      style={containerStyle}
      // @ts-expect-error 3rd-party picker typings miss this prop
      contentContainerStyle={contentContainerStyle}
      overlayItemStyle={selectedIndicatorStyle}
      keyExtractor={(_unusedItem: PickerItem<WheelPickerItem>, i: number) =>
        String(data[i]?.id ?? i)
      }
      renderItem={({
        item,
        isSelected,
        index,
      }: {
        item: PickerItem<WheelPickerItem>;
        isSelected: boolean;
        index: number;
      }) =>
        React.cloneElement(item.value.component, {
          isSelected,
          index,
          ...item.value.component.props,
        })
      }
      onValueChanged={handleValueChanged}
    />
  );
};

export default WheelPicker;
