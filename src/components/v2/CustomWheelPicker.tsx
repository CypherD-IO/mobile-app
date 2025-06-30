import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewStyle,
} from 'react-native';
import { CyDView, CyDText } from '../../styles/tailwindComponents';

interface CustomWheelPickerItem {
  id: string | number;
  component: React.ReactElement;
  value?: any;
}

interface CustomWheelPickerProps {
  data: CustomWheelPickerItem[];
  selectedIndex: number;
  onChange: (index: number, item: CustomWheelPickerItem) => void;
  itemHeight?: number;
  visibleRest?: number;
  containerStyle?: ViewStyle;
  selectedIndicatorStyle?: ViewStyle;
  decelerationRate?: 'normal' | 'fast' | number;
  rotationFunction?: (x: number) => number;
  scaleFunction?: (x: number) => number;
  opacityFunction?: (x: number) => number;
}

const CustomWheelPicker: React.FC<CustomWheelPickerProps> = ({
  data,
  selectedIndex,
  onChange,
  itemHeight = 50,
  visibleRest = 2,
  containerStyle,
  selectedIndicatorStyle,
  decelerationRate = 'fast',
  rotationFunction = (x: number) => 1 - Math.pow(1 / 2, x),
  scaleFunction = (x: number) => Math.max(0.8, 1 - Math.abs(x) * 0.1),
  opacityFunction = (x: number) => Math.max(0.3, 1 - Math.abs(x) * 0.2),
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const totalVisibleItems = visibleRest * 2 + 1;
  const containerHeight = totalVisibleItems * itemHeight;

  // Add padding items for smooth scrolling
  const paddedData = [
    ...Array(visibleRest)
      .fill(null)
      .map((_, index) => ({
        id: `padding-top-${index}`,
        component: <CyDView style={{ height: itemHeight }} />,
        isPadding: true,
      })),
    ...data,
    ...Array(visibleRest)
      .fill(null)
      .map((_, index) => ({
        id: `padding-bottom-${index}`,
        component: <CyDView style={{ height: itemHeight }} />,
        isPadding: true,
      })),
  ];

  const snapOffsets = paddedData.map((_, i) => i * itemHeight);

  // Calculate item position relative to center based on scroll position
  const getItemOffset = (index: number): number => {
    const scrollOffset = scrollY / itemHeight;
    const centerIndex = visibleRest + scrollOffset;
    return index - centerIndex;
  };

  // Get item transform based on distance from center
  const getItemTransform = (index: number) => {
    const offset = getItemOffset(index);
    const rotation = rotationFunction(offset);
    const scale = scaleFunction(offset);
    const opacity = opacityFunction(offset);

    return {
      transform: [{ rotateX: `${rotation * 15}deg` }, { scale }],
      opacity,
    };
  };

  const renderItem = (item: CustomWheelPickerItem, index: number) => {
    if ((item as any).isPadding) {
      return (
        <CyDView key={`${item.id}-${index}`} style={{ height: itemHeight }}>
          {item.component}
        </CyDView>
      );
    }

    const itemTransform = getItemTransform(index);
    const actualIndex = index - visibleRest;
    const isSelected =
      Math.round(scrollY / itemHeight) - visibleRest === actualIndex;

    return (
      <CyDView
        key={`${item.id}-${index}`}
        style={[
          {
            height: itemHeight,
            justifyContent: 'center',
            alignItems: 'center',
          },
          itemTransform,
        ]}>
        {React.cloneElement(item.component, {
          isSelected,
          index: actualIndex,
          ...item.component.props,
        })}
      </CyDView>
    );
  };

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      setScrollY(y);
    },
    [],
  );

  const onScrollBeginDrag = useCallback(() => {
    setIsScrolling(true);
  }, []);

  const onScrollEndDrag = useCallback(() => {
    setIsScrolling(false);
  }, []);

  const onMomentumScrollEnd = useCallback(
    e => {
      const y = e.nativeEvent.contentOffset.y;
      const nearest = snapOffsets.reduce((prev, curr) =>
        Math.abs(curr - y) < Math.abs(prev - y) ? curr : prev,
      );
      // snap the view programmatically in case the offset is off by <0.5dp
      if (Math.abs(nearest - y) > 0.1 && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: nearest, animated: false });
      }
      const index = nearest / itemHeight - visibleRest;
      if (index !== selectedIndex && data[index]) {
        onChange(index, data[index]);
      }
    },
    [snapOffsets, itemHeight, visibleRest, selectedIndex, onChange],
  );

  // Scroll to selected index when it changes externally
  useEffect(() => {
    if (!isScrolling && scrollViewRef.current) {
      const targetOffset = (selectedIndex + visibleRest) * itemHeight;
      scrollViewRef.current.scrollTo({
        y: targetOffset,
        animated: true,
      });
    }
  }, [selectedIndex, itemHeight, isScrolling, visibleRest]);

  return (
    <CyDView
      style={[
        {
          height: containerHeight,
          position: 'relative',
        },
        containerStyle,
      ]}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        decelerationRate={decelerationRate}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        style={{
          flex: 1,
        }}>
        {paddedData.map((item, index) => renderItem(item, index))}
      </ScrollView>

      {/* Selected indicator overlay - positioned after FlatList so it doesn't block touches */}
      <CyDView
        pointerEvents='none'
        style={[
          {
            position: 'absolute',
            top: visibleRest * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
            backgroundColor: 'rgba(247,198,69,0.1)',
            borderRadius: 8,
          },
          selectedIndicatorStyle,
        ]}
      />
    </CyDView>
  );
};

export default CustomWheelPicker;
