import React, { useCallback, useMemo, useRef } from 'react';
import { findNodeHandle, ScrollView, View } from 'react-native';
import { NavigationState, SceneRendererProps } from 'react-native-tab-view';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  CyDAnimatedView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { TabRoute } from './TabView';
import clsx from 'clsx';

export interface TabBarProps extends SceneRendererProps {
  navigationState: NavigationState<TabRoute>;
  setIndex: (index: number) => void;
}

export const TabBar = ({ navigationState, setIndex }: TabBarProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const translateValue = useSharedValue(0);
  const tabWidth = 70; // Set this to the width of your tabs

  useMemo(() => {
    translateValue.value = withTiming(navigationState.index * tabWidth, {
      duration: 300,
    });
  }, [navigationState.index]);

  const tabs = useMemo(() => {
    return navigationState.routes.map((route: any, index: number) => {
      return (
        <TabBarButton
          key={index}
          index={index}
          onPress={setIndex}
          title={route.title}
          active={navigationState.index === index}
          scrollViewRef={scrollRef?.current}
        />
      );
    });
  }, [navigationState.index, navigationState.routes]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateValue.value }],
    };
  });

  return (
    <CyDView className='w-full bg-n0'>
      <CyDView className='flex flex-row mx-[20px] pb-[8px] pt-[12px]'>
        <CyDAnimatedView
          className={'absolute top-[12px] bg-n40 h-full rounded-[8px]'}
          style={[animatedStyle, { width: tabWidth }]}
        />
        {tabs}
      </CyDView>
    </CyDView>
  );
};

interface TabBarButtonProps {
  active: boolean;
  index: number;
  onPress: (index: number) => void;
  title: string;
  scrollViewRef: ScrollView | null;
}

const TabBarButton = ({
  active,
  index,
  onPress,
  title,
  scrollViewRef,
}: TabBarButtonProps) => {
  const xPosition = useRef<number | null>(null);

  const handleRef = useCallback(
    (el: View | null) => {
      const scrollNode = findNodeHandle(scrollViewRef);
      if (el && scrollNode) {
        el.measureLayout(
          scrollNode,
          offsetX => {
            xPosition.current = offsetX;
          },
          () => {},
        );
      }
    },
    [scrollViewRef],
  );

  const wrappedOnPress = useCallback(() => {
    if (xPosition.current) {
      scrollViewRef?.scrollTo({
        x: index === 0 ? 0 : xPosition.current,
        y: 0,
        animated: true,
      });
    }
    return onPress(index);
  }, [index, onPress, scrollViewRef]);

  return (
    <CyDTouchView onPress={wrappedOnPress}>
      <CyDView
        className={'px-[5px] py-[5px] rounded-[8px] w-[70px]'}
        ref={handleRef}>
        <CyDText
          className={clsx('text-[14px] w-full text-center', {
            'font-bold': active,
          })}>
          {title}
        </CyDText>
      </CyDView>
    </CyDTouchView>
  );
};
