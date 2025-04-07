import React, { useContext, useEffect, useState } from 'react';
import {
  defiProtocolData,
  PositionDetail,
  PositionTypeData,
} from '../../models/defi.interface';
import analytics from '@react-native-firebase/analytics';
import {
  CyDAnimatedView,
  CyDFastImage,
  CyDIcons,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { StyleSheet } from 'react-native';
import CyDModalLayout from '../../components/v2/modal';
import AppImages from '../../../assets/images/appImages';
import { getChainLogo, sortDefiPositionDesc } from '../../core/defi';
import { t } from 'i18next';
import CyDTokenValue from '../../components/v2/tokenValue';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import { screenTitle } from '../../constants';
import { HdWalletContext } from '../../core/util';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { MODAL_CLOSING_TIMEOUT } from '../../constants/timeOuts';
import { GlobalModalType } from '../../constants/enum';
import Animated, {
  Easing,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { CyDIconsPack } from '../../customFonts';
import { get } from 'lodash';

interface RouteParams {
  protocol: defiProtocolData;
}

const MAX_CHAIN_COUNT = 3;

const RenderDetail = ({
  detail,
  type,
}: {
  detail: PositionDetail[];
  type: string;
}) => {
  return (
    <CyDView>
      {detail.map((token, index) => {
        return (
          <CyDView
            className='flex flex-row justify-between my-[8px]'
            key={`${token.tokenAddress}-${index}`}>
            <CyDView className='flex-1 flex-row justify-start items-center max-w-[50%]'>
              <CyDFastImage
                source={{ uri: token.logo }}
                className='h-[32px] w-[32px] mr-[10px] rounded-full'
                resizeMode='contain'
              />
              <CyDView className=''>
                <CyDText className='text-[16px] font-semibold'>
                  {token.tokenName}
                </CyDText>
                <CyDText className='text-[12px] font-normal'>{type}</CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='flex-1 max-w-[50%] items-end'>
              <CyDTokenValue className={'font-bold text-[16px] '}>
                {token.balanceUSD}
              </CyDTokenValue>
              <CyDView className='flex-1 flex-row justify-end items-center'>
                <CyDTokenAmount className={'font-medium text-[14px] mr-[2px]'}>
                  {token.balanceDecimal}
                </CyDTokenAmount>
                <CyDText className={'font-medium text-[14px] '}>
                  {token.tokenSymbol}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        );
      })}
    </CyDView>
  );
};
const RenderType = ({ type }: { type: PositionTypeData }) => {
  const holdings = type.holdings;
  return (
    <CyDView className='w-full mb-[20px]'>
      <CyDView className='flex flex-row justify-start items-center gap-x-[4px] mb-[4px]'>
        <CyDFastImage
          source={type.typeLogo}
          className='h-[18px] w-[18px]'
          resizeMode='contain'
        />
        <CyDText className='font-bold text-[18px]'>{type.type}</CyDText>
      </CyDView>
      <CyDView className='w-full border border-n40 rounded-[10px] flex pb-[12px]'>
        {holdings.sort(sortDefiPositionDesc).map((holding, index) => {
          const pool: string[] = [];
          const details = [];
          holding.details.supply && details.push(holding.details.supply);
          holding.details.borrow && details.push(holding.details.borrow);
          holding.details.rewards && details.push(holding.details.rewards);
          details.forEach(holding => {
            holding?.forEach((token: PositionDetail) => {
              if (!pool.includes(token.tokenSymbol)) {
                pool.push(token.tokenSymbol);
              }
            });
          });
          return (
            <CyDView
              className='px-[8px] mt-[12px]'
              key={`${holding.type}-${holding.chain}-${index}`}>
              <CyDView className='flex flex-row justify-start items-center mb-[4px]'>
                <CyDFastImage
                  source={holding.chainLogo}
                  className='h-[14px] w-[14px] mr-[4px] rounded-full'
                  resizeMode='contain'
                />
                <CyDText className='font-bold text-[12px]'>
                  {holding.chain}
                </CyDText>
                {!holding.total.isActive && (
                  <CyDView className='ml-[6px] px-[4px] py-[2px] rounded-[6px] bg-redCyD'>
                    <CyDText className='font-semibold'>{t('Inactive')}</CyDText>
                  </CyDView>
                )}
              </CyDView>
              <CyDView className='p-[10px] rounded-[10px] border border-n40 bg-n0'>
                <CyDView className='flex flex-row justify-between items-start mb-[8px]'>
                  <CyDText className='font-bold text-[14px] max-w-[50%]'>
                    {pool.join(' + ')}
                  </CyDText>
                  <CyDTokenValue
                    className={'font-bold text-[16px] max-w-[50%]'}>
                    {holding.total.value}
                  </CyDTokenValue>
                </CyDView>
                {holding.details.supply &&
                  holding.details.supply.length > 0 && (
                    <RenderDetail
                      detail={holding.details.supply}
                      type={t('DEFI_DEPOSIT')}
                    />
                  )}
                {holding.details.borrow &&
                  holding.details.borrow.length > 0 && (
                    <>
                      <CyDView className='w-full my-[10px] h-[1px] border-t border-n40 rounded-[10px]' />
                      <RenderDetail
                        detail={holding.details.borrow}
                        type={t('DEFI_BORROW')}
                      />
                    </>
                  )}
                {holding.details.rewards &&
                  holding.details.rewards.length > 0 && (
                    <>
                      <CyDView className='w-full my-[10px] h-[1px] border-t border-n40 rounded-[10px]' />
                      <RenderDetail
                        detail={holding.details.rewards}
                        type={t('DEFI_REWARD')}
                      />
                    </>
                  )}
              </CyDView>
            </CyDView>
          );
        })}
      </CyDView>
    </CyDView>
  );
};
export function DEFIOverviewScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();

  const { protocol } = route.params;
  const [imageZoomIn, setImageZoomIn] = useState<boolean>(false);
  const scrollY = useSharedValue(0);
  const isVisible = useSharedValue(true);
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { isReadOnlyWallet } = hdWalletContext.state;
  const ethereumAddress = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    undefined,
  );
  const { showModal, hideModal } = useGlobalModalContext();
  const moreChainsCount = protocol.chains.length - MAX_CHAIN_COUNT;
  useEffect(() => {
    void analytics().logEvent('visited_defi_overview_screen');
    // navigation.setOptions({
    //   title: protocol.protocolName,
    // });
  }, [navigation, protocol.protocolName]);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: e => {
      if (scrollY.value > 0) {
        isVisible.value = scrollY.value > e.contentOffset.y;
      } else if (scrollY.value === 0) {
        isVisible.value = scrollY.value >= e.contentOffset.y;
      }
      scrollY.value = e.contentOffset.y;
    },
  });

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withTiming(isVisible.value ? 0 : 100, {
            duration: 300,
            easing: Easing.exp,
          }),
        },
      ],
    };
  });

  return (
    <CyDSafeAreaView className='h-full bg-n20'>
      <CyDModalLayout
        setModalVisible={setImageZoomIn}
        isModalVisible={imageZoomIn}
        style={styles.modalLayout}
        animationIn={'zoomIn'}
        animationInTiming={10}
        animationOut={'zoomOut'}
        animationOutTiming={10}>
        <CyDView className={'rounded-t-[20px] relative'}>
          <CyDTouchView
            onPress={() => setImageZoomIn(false)}
            className={'z-[50] bg-n0 self-end'}>
            <CyDMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
          <CyDTouchView onPress={() => setImageZoomIn(false)}>
            <CyDImage
              className={'w-[100%] h-[90%]'}
              source={protocol.protocolLogo}
            />
          </CyDTouchView>
        </CyDView>
      </CyDModalLayout>

      <CyDView className='flex-row justify-between'>
        <CyDTouchView
          className='px-[12px]'
          onPress={() => {
            navigation.goBack();
          }}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        <CyDText className='text-base400 text-[20px] font-extrabold mr-[44px]'>
          {protocol.protocolName}
        </CyDText>
        <CyDView className='' />
      </CyDView>

      <Animated.ScrollView
        bounces={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        className='w-full h-full px-[12px] mt-[12px]'>
        <CyDView className='flex flex-row w-full mb-[20px]'>
          <CyDView className='flex-1 flex-row gap-[4px] justify-start items-center'>
            <CyDFastImage
              source={protocol.protocolLogo}
              className='h-[40px] w-[40px] rounded-full'
              resizeMode='contain'
            />
            <CyDView className=''>
              <CyDTouchView
                className='flex-1 flex-row gap-[4px] justify-start items-center'
                onPress={() => {
                  if (!isReadOnlyWallet) {
                    navigation.navigate(screenTitle.BROWSER, {
                      url: protocol.protocolURL,
                    });
                  } else {
                    showModal(GlobalModalType.PROMPT_IMPORT_WALLET, {
                      type: t('MANAGE_POSITIONS').toLowerCase(),
                      address: ethereumAddress,
                      description: '',
                      onSuccess: () => {
                        hideModal();
                      },
                      onFailure: () => {
                        setTimeout(() => {
                          hideModal();
                        }, MODAL_CLOSING_TIMEOUT);
                        navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
                      },
                      onCancel: () => {
                        hideModal();
                      },
                    });
                  }
                }}>
                <CyDText className='font-bold text-[20px]'>
                  {protocol.protocolName}
                </CyDText>
              </CyDTouchView>
              <CyDView className='flex-1 flex-row justify-start items-center'>
                {protocol.chains
                  .slice(0, moreChainsCount === 1 ? 4 : 3)
                  .map((chain, index) => {
                    return (
                      <CyDFastImage
                        key={`${chain}-${index}`}
                        source={getChainLogo(chain)}
                        className='h-[16px] w-[16px] rounded-full'
                        resizeMode='contain'
                      />
                    );
                  })}
                {moreChainsCount > 1 && (
                  <CyDView className='h-[16px] w-[16px] rounded-full flex justify-center items-center'>
                    <CyDText className='text-[12px] '>
                      {t('PLUS')}
                      {moreChainsCount}
                    </CyDText>
                  </CyDView>
                )}
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className='flex-2 justify-start items-end'>
            <CyDTokenValue className={'text-center font-bold text-[20px]'}>
              {protocol.total.value}
            </CyDTokenValue>
            {protocol.total.debt > 0 && (
              <CyDTokenValue
                className={
                  'text-center font-semibold text-[16px] text-warningTextYellow'
                }>
                {protocol.total.debt}
              </CyDTokenValue>
            )}
          </CyDView>
        </CyDView>
        {Object.values(protocol.types).map((type, index) => {
          return <RenderType type={type} key={`${type.type}-${index}`} />;
        })}
      </Animated.ScrollView>
      <CyDAnimatedView
        className={'absolute w-full bottom-[10px] mb-4'}
        style={animatedStyles}>
        <CyDTouchView
          className='w-[70%] h-[55px] flex flex-row my-[10px] mx-[60px] bg-n0 justify-center items-center rounded-[8px] border border-n40 px-[20px] py-[10px]'
          onPress={() => {
            if (!isReadOnlyWallet) {
              navigation.navigate(screenTitle.OPTIONS, {
                screen: screenTitle.BROWSER_SCREEN,
                params: {
                  url: protocol.protocolURL,
                },
              });
            } else {
              showModal(GlobalModalType.PROMPT_IMPORT_WALLET, {
                type: t('MANAGE_POSITIONS').toLowerCase(),
                address: ethereumAddress,
                description: '',
                onSuccess: () => {
                  hideModal();
                },
                onFailure: () => {
                  setTimeout(() => {
                    hideModal();
                  }, MODAL_CLOSING_TIMEOUT);
                  navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
                },
                onCancel: () => {
                  hideModal();
                },
              });
            }
          }}>
          <CyDView className='flex flex-col justify-center items-center'>
            <CyDText className='font-bold text-[16px] pr-[4px] text-base400'>
              {t('MANAGE_POSITIONS')}
            </CyDText>
            <CyDView className='flex flex-row justify-center items-center'>
              <CyDText className='underline text-[12px] text-p50 pr-[4px]'>
                {protocol.protocolURL}
              </CyDText>
              <CyDMaterialDesignIcons
                name='open-in-new'
                size={14}
                className='text-base400'
              />
            </CyDView>
          </CyDView>
        </CyDTouchView>
      </CyDAnimatedView>
    </CyDSafeAreaView>
  );
}
const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
