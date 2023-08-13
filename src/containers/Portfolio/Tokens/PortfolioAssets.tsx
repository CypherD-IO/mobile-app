import React, { memo } from 'react';
import EmptyView from '../../../components/EmptyView';
import AppImages from '../../../../assets/images/appImages';
import PortfolioTokenItem from '../../../components/v2/portfolioTokenItem';
import { useTranslation } from 'react-i18next';
import { Swipeable } from 'react-native-gesture-handler';
import { Holding } from '../../../core/Portfolio';
import Animated, { SharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { FlatList, Platform } from 'react-native';
import { H_BALANCE_BANNER, H_GUTTER, H_TAB_BAR } from '../constants';

interface PortfolioAssetsProps {
  holdingsData: Holding[]
  isVerifiedCoinCheckedState: [boolean, React.Dispatch<React.SetStateAction<boolean>>]
  navigation: {
    goBack: () => void
    navigate: (screen: string, params?: {}) => void
    push: (screen: string, params?: {}) => void
    popToTop: () => void
  }
  scrollY: SharedValue<number>
  trackRef: (key: string, ref: FlatList) => void
  syncScrollOffset: () => void
  onRefresh: (pullToRefresh?: boolean) => void
  isRefreshing: boolean
}

const PortfolioAssets = ({ holdingsData, isVerifiedCoinCheckedState, navigation, scrollY, trackRef, syncScrollOffset, onRefresh, isRefreshing }: PortfolioAssetsProps) => {
  const { t } = useTranslation();
  const [isVerifyCoinChecked, setIsVerifyCoinChecked] = isVerifiedCoinCheckedState;
  const swipeableRefs: Array<Swipeable | null> = [];
  let previousOpenedSwipeableRef: Swipeable | null;

  const onSwipe = (key: number) => {
    if (previousOpenedSwipeableRef && previousOpenedSwipeableRef !== swipeableRefs[key]) {
      previousOpenedSwipeableRef.close();
    }
    previousOpenedSwipeableRef = swipeableRefs[key];
  };

  const setSwipeableRefs = (index: number, ref: Swipeable | null) => {
    swipeableRefs[index] = ref;
    ref?.close();
  };

  const handleScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  return (
      <Animated.FlatList
        ref={(ref) => {
          trackRef('token', ref);
        }}
        contentInset={Platform.select({
          ios: {
            top: H_BALANCE_BANNER
          }
        })}
        contentOffset={Platform.select({
          ios: {
            x: 0,
            y: -H_BALANCE_BANNER
          }
        })}
        contentContainerStyle={Platform.select({
          ios: {
            flexGrow: 1,
            paddingBottom: H_GUTTER
          },
          android: {
            flexGrow: 1,
            paddingTop: H_BALANCE_BANNER,
            paddingBottom: H_GUTTER
          }
        })}
        onScroll={handleScroll}
        onMomentumScrollEnd={syncScrollOffset}
        onScrollEndDrag={syncScrollOffset}
        scrollEventThrottle={1}
        className={`w-full mb-[${H_TAB_BAR}]`}
        data={holdingsData}
        renderItem={({ item, index }) => <PortfolioTokenItem item={item} key={index} index={index} isVerifyCoinChecked={isVerifyCoinChecked} navigation={navigation} onSwipe={onSwipe} setSwipeableRefs={setSwipeableRefs} />}
        onRefresh={onRefresh}
        refreshing={isRefreshing}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<EmptyView text={t('NO_CURRENT_HOLDINGS')} image={AppImages.EMPTY} buyVisible={false} marginTop={30} />}
        showsVerticalScrollIndicator={false}
      />
  );
};

export default memo(PortfolioAssets);
