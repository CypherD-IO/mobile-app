import React, { useCallback, useContext, useMemo } from 'react';
import {
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  FlatList,
  ScrollView,
  StyleSheet,
  ViewToken,
} from 'react-native';
import { AnimatedTabView } from '../animatedComponents';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import { HdWalletContext, PortfolioContext } from '../../../core/util';
import {
  WalletHoldings,
  fetchTokenData,
  getCurrentChainHoldings,
} from '../../../core/Portfolio';
import EmptyView from '../../../components/EmptyView';
import AppImages from '../../../../assets/images/appImages';
import { Swipeable } from 'react-native-gesture-handler';
import PortfolioTokenItem from '../../../components/v2/portfolioTokenItem';
import { PORTFOLIO_EMPTY } from '../../../reducers/portfolio_reducer';
import Button from '../../../components/v2/button';
import { screenTitle } from '../../../constants';
import { Chain } from '../../../constants/server';
import { H_BALANCE_BANNER } from '../constants';
import { TokenMeta } from '../../../models/tokenMetaData.model';

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

interface TokenSceneProps {
  routeKey: string;
  scrollY: SharedValue<number>;
  trackRef: (key: string, ref: FlatList<any> | ScrollView) => void;
  onMomentumScrollBegin: (e: ScrollEvent) => void;
  onMomentumScrollEnd: (e: ScrollEvent) => void;
  onScrollEndDrag: (e: ScrollEvent) => void;
  navigation: any;
  isVerifyCoinChecked: boolean;
  getAllChainBalance: (portfolioState: {
    statePortfolio: {
      selectedChain: Chain;
      tokenPortfolio: WalletHoldings;
    };
  }) => number;
  refreshState: [
    {
      isRefreshing: boolean;
      shouldRefreshAssets: boolean;
    },
    React.Dispatch<
      React.SetStateAction<{
        isRefreshing: boolean;
        shouldRefreshAssets: boolean;
      }>
    >
  ];
}

export const TokenScene = ({
  // This is not yet complete.
  routeKey,
  scrollY,
  trackRef,
  onMomentumScrollBegin,
  onMomentumScrollEnd,
  onScrollEndDrag,
  navigation,
  isVerifyCoinChecked,
  getAllChainBalance,
  refreshState,
}: TokenSceneProps) => {
  const { t } = useTranslation();
  const hdWallet = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const [refreshData, setRefreshData] = refreshState;

  const onRefresh = useCallback(async (pullToRefresh = true) => {
    setRefreshData({ isRefreshing: true, shouldRefreshAssets: pullToRefresh });
    await fetchTokenData(hdWallet, portfolioState);
    setRefreshData({ isRefreshing: false, shouldRefreshAssets: false });
  }, []);

  const holdingsData = useMemo(() => {
    const data = getCurrentChainHoldings(
      portfolioState.statePortfolio.tokenPortfolio,
      portfolioState.statePortfolio.selectedChain
    );
    if (data) {
      return 'holdings' in data ? data.holdings : data;
    } else {
      return [];
    }
  }, [
    portfolioState.statePortfolio.tokenPortfolio,
    portfolioState.statePortfolio.selectedChain,
  ]);

  const swipeableRefs: Array<Swipeable | null> = [];
  let previousOpenedSwipeableRef: Swipeable | null;

  const onSwipe = (key: number) => {
    if (
      previousOpenedSwipeableRef &&
      previousOpenedSwipeableRef !== swipeableRefs[key]
    ) {
      previousOpenedSwipeableRef.close();
    }
    previousOpenedSwipeableRef = swipeableRefs[key];
  };

  const setSwipeableRefs = (index: number, ref: Swipeable | null) => {
    swipeableRefs[index] = ref;
    ref?.close();
  };

  return (
    <CyDView className='mx-[10px] border-r border-l border-sepratorColor'>
      {getAllChainBalance(portfolioState) > 0 ? (
        <CyDView className='flex-1 h-full'>
          <AnimatedTabView
            data={holdingsData}
            initialNumToRender={15}
            refreshControl={
              <RefreshControl
                refreshing={refreshData.shouldRefreshAssets}
                onRefresh={() => {
                  void onRefresh();
                }}
                progressViewOffset={H_BALANCE_BANNER}
              />
            }
            renderItem={({ item, index, viewableItems }) => {
              return (
                <AnimatedPortfolioToken
                  item={item}
                  index={index}
                  viewableItems={viewableItems}
                >
                  <PortfolioTokenItem
                    item={item}
                    key={index}
                    index={index}
                    isVerifyCoinChecked={isVerifyCoinChecked}
                    navigation={navigation}
                    onSwipe={onSwipe}
                    setSwipeableRefs={setSwipeableRefs}
                  />
                </AnimatedPortfolioToken>
              );
            }}
            onRef={(ref: any) => {
              trackRef(routeKey, ref);
            }}
            scrollY={scrollY}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollBegin={onMomentumScrollBegin}
            onMomentumScrollEnd={onMomentumScrollEnd}
            ListEmptyComponent={
              <CyDView className='flex flex-col justify-center items-center'>
                <EmptyView
                  text={t('NO_CURRENT_HOLDINGS')}
                  image={AppImages.EMPTY}
                  buyVisible={false}
                  marginTop={30}
                />
              </CyDView>
            }
          />
        </CyDView>
      ) : (
        portfolioState.statePortfolio.portfolioState === PORTFOLIO_EMPTY && (
          <CyDView
            className={'flex h-full justify-center items-center mt-[5px]'}
          >
            <LottieView
              source={AppImages.PORTFOLIO_EMPTY}
              autoPlay
              loop
              style={styles.lottieView}
            />
            <Button
              title={t('FUND_WALLET')}
              onPress={() => {
                navigation.navigate(screenTitle.QRCODE);
              }}
              style='mt-[-40px] px-[20px] h-[40px] py-[0px]'
              titleStyle='text-[14px]'
              image={AppImages.RECEIVE}
              imageStyle='h-[12px] w-[12px] mr-[15px]'
            />
            <CyDTouchView
              className='mt-[20px]'
              onPress={() => {
                void onRefresh();
              }}
            >
              <CyDText className='text-center text-blue-500 underline'>
                {t<string>('CLICK_TO_REFRESH')}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        )
      )}
    </CyDView>
  );
};

export const AnimatedPortfolioToken = (props: {
  viewableItems: { value: ViewToken[] };
  item: TokenMeta;
  index: number;
  children: JSX.Element;
}) => {
  const { viewableItems, item, index } = props;
  const rStyle = useAnimatedStyle(() => {
    let isVisible = true;
    if (viewableItems?.value.length) {
      isVisible = !!viewableItems?.value
        .filter((item) => item.isViewable)
        .find((viewableItems) => viewableItems.item.id === item?.id);
    }
    if (!isVisible) {
      const latViewableIndex = Number(
        viewableItems.value[viewableItems.value.length - 1].index
      );
      isVisible = latViewableIndex < 5 && latViewableIndex + 1 === index;
    }
    return {
      opacity: withTiming(isVisible ? 1 : 0),
      transform: [
        {
          scale: withTiming(isVisible ? 1 : 0.9),
        },
      ],
    };
  }, []);
  return <Animated.View style={rStyle}>{props.children}</Animated.View>;
};

const styles = StyleSheet.create({
  lottieView: {
    width: '60%',
  },
});
