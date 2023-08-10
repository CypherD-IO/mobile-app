import React, { memo } from 'react';
import EmptyView from '../../components/EmptyView';
import AppImages from '../../../assets/images/appImages';
import PortfolioTokenItem from '../../components/v2/portfolioTokenItem';
import { useTranslation } from 'react-i18next';
import { FlatList } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Holding } from '../../core/Portfolio';

interface PortfolioAssetsProps {
  holdingsData: Holding[]
  isVerifyCoinChecked: boolean
  navigation: {
    goBack: () => void
    navigate: (screen: string, params?: {}) => void
    push: (screen: string, params?: {}) => void
    popToTop: () => void
  }
  onRefresh: (pullToRefresh?: boolean) => void
  isRefreshing: boolean
}

const PortfolioAssets = ({ holdingsData, isVerifyCoinChecked, navigation, onRefresh, isRefreshing }: PortfolioAssetsProps) => {
  const { t } = useTranslation();
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

  return (
      <FlatList
      className='w-full bg-white'
      nestedScrollEnabled
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
