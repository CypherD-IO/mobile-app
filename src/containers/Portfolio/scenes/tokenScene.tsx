import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  Holding,
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
import { CHAIN_COLLECTION, Chain } from '../../../constants/server';
import { TokenMeta } from '../../../models/tokenMetaData.model';
import { get, isEmpty, isEqual, sortBy } from 'lodash';
import Loading from '../../../components/v2/loading';

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

interface TokenSceneProps {
  routeKey: string;
  scrollY: SharedValue<number>;
  trackRef: (key: string, ref: FlatList<any> | ScrollView) => void;
  onMomentumScrollBegin: (e: ScrollEvent) => void;
  onMomentumScrollEnd: (e: ScrollEvent) => void;
  onScrollEndDrag: (e: ScrollEvent) => void;
  navigation: any;
  bannerHeight: 160 | 260;
  isVerifyCoinChecked: boolean;
  getAllChainBalance: (portfolioState: {
    statePortfolio: {
      selectedChain: Chain;
      tokenPortfolio: WalletHoldings;
    };
  }) => number;
  setRefreshData: React.Dispatch<
    React.SetStateAction<{
      isRefreshing: boolean;
      shouldRefreshAssets: boolean;
    }>
  >;
}

const TokenScene = ({
  // This is not yet complete.
  routeKey,
  scrollY,
  trackRef,
  onMomentumScrollBegin,
  onMomentumScrollEnd,
  onScrollEndDrag,
  navigation,
  bannerHeight,
  isVerifyCoinChecked,
  getAllChainBalance,
  setRefreshData,
}: TokenSceneProps) => {
  const { t } = useTranslation();
  const hdWallet = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const [isPortfolioRefreshing, setIsPortfolioRefreshing] = useState({
    isRefreshing: false,
    shouldRefreshAssets: false,
  });
  const [holdingsByCoinGeckoId, setHoldingsByCoinGeckoId] = useState<string[]>(
    []
  );

  const flatListRef = useRef<FlatList<any>>(null);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: scrollY.value });
      trackRef(routeKey, flatListRef.current);
    }
  }, [flatListRef.current]);

  const onRefresh = async (pullToRefresh = true) => {
    setRefreshData({ isRefreshing: true, shouldRefreshAssets: pullToRefresh });
    setIsPortfolioRefreshing({
      isRefreshing: true,
      shouldRefreshAssets: pullToRefresh,
    });
    await fetchTokenData(hdWallet, portfolioState);
    setRefreshData({ isRefreshing: false, shouldRefreshAssets: false });
    setIsPortfolioRefreshing({
      isRefreshing: false,
      shouldRefreshAssets: false,
    });
  };

  const getIndexedData = (data: any) => {
    if (data) {
      let holdings = [];
      if ('holdings' in data) {
        holdings = data.holdings;
      } else {
        holdings = data;
      }
      let tempHoldingsData = {};
      holdings.forEach(
        (holding: Holding) =>
        (tempHoldingsData = {
          ...tempHoldingsData,
          [holding.coinGeckoId +
            ':' +
            String(holding.chainDetails?.chainIdNumber) +
            holding.chainDetails?.backendName +
            holding.name +
            holding.symbol]: holding,
        })
      );
      return tempHoldingsData;
    } else {
      return {};
    }
  };

  const holdingsData = useMemo(() => {
    const data = getCurrentChainHoldings(
      portfolioState.statePortfolio.tokenPortfolio,
      CHAIN_COLLECTION
    );
    return getIndexedData(data);
  }, [portfolioState.statePortfolio.tokenPortfolio]);

  useEffect(() => {
    const data = getCurrentChainHoldings(
      portfolioState.statePortfolio.tokenPortfolio,
      portfolioState.statePortfolio.selectedChain
    );
    const newHoldingsByCoingeckoId = Object.keys(getIndexedData(data));
    if (
      holdingsByCoinGeckoId.length !== newHoldingsByCoingeckoId.length ||
      !isEqual(sortBy(holdingsByCoinGeckoId), sortBy(newHoldingsByCoingeckoId))
    ) {
      setHoldingsByCoinGeckoId(newHoldingsByCoingeckoId);
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

  const renderItem = useCallback(
    ({ item, index, viewableItems }) => {
      if (item) {
        return (
          // To Do animation

          // <AnimatedPortfolioToken
          //   item={item}
          //   index={index}
          //   viewableItems={viewableItems}
          // >
          <PortfolioTokenItem
            item={item}
            key={index}
            index={index}
            isVerifyCoinChecked={isVerifyCoinChecked}
            navigation={navigation}
            onSwipe={onSwipe}
            setSwipeableRefs={setSwipeableRefs}
          />
          // </AnimatedPortfolioToken>
        );
      }
      return <></>;
    },
    [isVerifyCoinChecked]
  );

  return (
    <>
      {getAllChainBalance(portfolioState) > 0 ? (
        <CyDView className='flex-1 h-full mx-[10px]'>
          {!isEmpty(holdingsData) ? (
            <AnimatedTabView
              bannerHeight={bannerHeight}
              data={holdingsByCoinGeckoId}
              extraData={{ isVerifyCoinChecked, holdingsData }}
              keyExtractor={(item) => item}
              refreshControl={
                <RefreshControl
                  refreshing={isPortfolioRefreshing.shouldRefreshAssets}
                  onRefresh={() => {
                    void onRefresh();
                  }}
                  progressViewOffset={bannerHeight}
                />
              }
              renderItem={({ item, index, viewableItems }) =>
                renderItem({
                  item: get(holdingsData, item),
                  index,
                  viewableItems,
                })
              }
              onRef={flatListRef}
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
          ) : (
            <Loading />
          )}
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
    </>
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
    if (viewableItems?.value.length > 3) {
      isVisible = viewableItems.value.includes(item);
      if (!isVisible) {
        const latViewableIndex = Number(
          viewableItems.value[viewableItems.value.length - 1].index
        );
        isVisible = latViewableIndex < 5 && latViewableIndex + 1 === index;
      }
    }
    return {
      opacity: withTiming(isVisible ? 1 : 0.3),
      transform: [
        {
          scale: withTiming(isVisible ? 1 : 0.9),
        },
      ],
    };
  }, [viewableItems.value]);
  return <Animated.View style={rStyle}>{props.children}</Animated.View>;
};

const styles = StyleSheet.create({
  lottieView: {
    width: '60%',
  },
});

export default memo(TokenScene);
