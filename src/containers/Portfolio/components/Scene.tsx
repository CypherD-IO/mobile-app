import React, { FunctionComponent, ReactNode } from 'react';
import {
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  FlatList,
  ScrollView
} from 'react-native';
import { AnimatedTabView } from '../animatedComponents';
import { SharedValue } from 'react-native-reanimated';
import { ScrollableType } from '../../../constants/enum';
import { CyDText, CyDView } from '../../../styles/tailwindStyles';

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => ({
  title: `Title ${i}`,
  key: `key-${i}`
}));

interface SceneProps {
  isActive: boolean
  routeKey: string
  routeScrollableType: ScrollableType
  scrollY: SharedValue<number>
  trackRef: (key: string, ref: FlatList<any> | ScrollView) => void
  onMomentumScrollBegin: (e: ScrollEvent) => void
  onMomentumScrollEnd: (e: ScrollEvent) => void
  onScrollEndDrag: (e: ScrollEvent) => void
  children?: ReactNode
}

export const Scene: FunctionComponent<SceneProps> = ({
  isActive,
  routeKey,
  routeScrollableType,
  scrollY,
  trackRef,
  onMomentumScrollBegin,
  onMomentumScrollEnd,
  onScrollEndDrag,
  children
}) => (
  <CyDView className='flex-1'>
    {
      routeScrollableType === ScrollableType.FLATLIST
        ? <AnimatedTabView
          data={data}
          windowSize={3}
          initialNumToRender={15}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => null} />
          }
          renderItem={({ item }) => (
              <CyDView className='px-[40px] py-[20px]'>
                <CyDText>{item.title}</CyDText>
              </CyDView>
          )}
          onRef={(ref: any) => {
            trackRef(routeKey, ref);
          }}
          scrollY={scrollY}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollBegin={onMomentumScrollBegin}
          onMomentumScrollEnd={onMomentumScrollEnd}
          />
        : <AnimatedTabView
          onRef={(ref: any) => {
            trackRef(routeKey, ref);
          }}
          scrollY={scrollY}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollBegin={onMomentumScrollBegin}
          onMomentumScrollEnd={onMomentumScrollEnd}
          >
            {children}
      </AnimatedTabView>}
  </CyDView>
);
