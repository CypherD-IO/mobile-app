import React, { ReactNode, useCallback, useMemo, useRef } from 'react';
import { findNodeHandle, ScrollView, View } from 'react-native';
import { NavigationState, SceneRendererProps } from 'react-native-tab-view';
import { CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import clsx from 'clsx';
import { TabRoute } from './TabView';

export interface TabBarProps extends SceneRendererProps {
  navigationState: NavigationState<TabRoute>;
  setIndex: (index: number) => void;
}

export const TabBar = ({ navigationState, setIndex }: TabBarProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const tabs = useMemo(() => {
    return navigationState.routes.map((route: any, index: number) => {
      return (
        <TabBarButton
          key={index}
          index={index}
          onPress={setIndex}
          title={route.title}
          active={navigationState.index === index}
          scrollViewRef={scrollRef.current}
        />
      );
    });
  }, [navigationState.index, navigationState.routes, setIndex]);

  return (
    <CyDView className='w-full bg-white'>
      <CyDView className='flex flex-row mx-[20px] py-[8px] pt-[12px]'>
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
          (offsetX) => {
            xPosition.current = offsetX;
          },
          () => {}
        );
      }
    },
    [scrollViewRef]
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
        className={clsx('px-[14px] py-[5px] rounded-[8px]', {
          'bg-privacyMessageBackgroundColor': active,
        })}
        ref={handleRef}
      >
        <CyDText>{title}</CyDText>
      </CyDView>
    </CyDTouchView>
  );
};
