import { t } from 'i18next';
import React, { useContext } from 'react';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import { ChainBackendNames, ChainNames, CosmosStakingTokens, FundWalletAddressType } from '../../constants/server';
import { GlobalContext } from '../../core/globalContext';
import { isBasicCosmosChain, StakingContext, convertFromUnitAmount, convertToEvmosFromAevmos, isABasicCosmosStakingToken, isCosmosStakingToken, isCosmosChain } from '../../core/util';
import { TokenMeta } from '../../models/tokenMetaData.model';
import { CosmosStakingContext } from '../../reducers/cosmosStakingReducer';
import { CyDAnimatedView, CyDImage, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import { Layout, SlideInUp, SlideOutDown } from 'react-native-reanimated';

export default function TokenOverviewToolBar ({ tokenData, navigation }: { tokenData: TokenMeta, navigation: { navigate: (screen: string, {}: any) => void } }) {
  const globalStateContext = useContext<any>(GlobalContext);
  const cosmosStaking = useContext<any>(CosmosStakingContext);
  const stakingValidators = useContext<any>(StakingContext);
  const { isBridgeable, isSwapable } = tokenData;
  const canShowIBC = globalStateContext.globalState.ibc && (isBasicCosmosChain(tokenData.chainDetails.backendName) || (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && (tokenData.name === CosmosStakingTokens.EVMOS || tokenData.name.includes('IBC'))));

  const userBalance = () => {
    if (isABasicCosmosStakingToken(tokenData)) {
      return Number(tokenData.price) * Number(convertFromUnitAmount((Number(cosmosStaking.cosmosStakingState.balance) + Number(cosmosStaking.cosmosStakingState.stakedBalance)).toString(), tokenData.contractDecimals));
    } else if (isCosmosStakingToken('EVMOS', tokenData)) {
      return Number(tokenData.price) * convertToEvmosFromAevmos(Number(stakingValidators.stateStaking.totalStakedBalance) + Number(stakingValidators.stateStaking.unStakedBalance) + Number(stakingValidators.stateStaking.unBoundingTotal));
    } else {
      return tokenData.totalValue;
    }
  };

  const canShowFundCard = globalStateContext.globalState.cardProfile?.solid?.cards?.length > 0 && userBalance() >= 10;

  return (
    <CyDAnimatedView entering={SlideInUp} exiting={SlideOutDown} layout={Layout.duration(200)} className={'flex flex-row w-[100%] justify-evenly my-[10px]'}>
          <CyDView className='flex items-center'>
              <CyDTouchView className={'flex items-center justify-center'} onPress={() => {
                navigation.navigate(screenTitle.ENTER_AMOUNT, {
                  tokenData
                });
              }}>
                  <CyDImage source={AppImages.SEND_SHORTCUT} className={'w-[40px] h-[40px]'} />
              </CyDTouchView>
              <CyDText className={'text-center mt-[3px] text-[14px] font-bold'}>{t<string>('SEND')}</CyDText>
          </CyDView>

          {canShowIBC && <CyDView className='flex items-center'>
              <CyDTouchView className={'bg-appColor rounded-full w-[40px] h-[40px] flex items-center justify-center'}
                  onPress={() => {
                    navigation.navigate(screenTitle.IBC_SCREEN, {
                      tokenData
                    });
                  }}>
                  <CyDImage source={AppImages.IBC} className={'w-[20px] h-[16px]'} />
              </CyDTouchView>
              <CyDText className={'text-center mt-[3px] text-[14px] font-bold'}>{t<string>('IBC')}</CyDText>
          </CyDView>}

          {/* {canShowFundCard && <CyDView>
              <CyDTouchView className={'flex items-center justify-center'}
                onPress={() => {
                  navigation.navigate(screenTitle.DEBIT_CARD, {
                    screen: screenTitle.SOLID_FUND_CARD_SCREEN, params: { navigation }
                  });
                }}
               >
                  <CyDImage source={AppImages.FUND_CARD_SHORTCUT} className={'w-[40px] h-[40px]'} />
              </CyDTouchView>
              <CyDText className={'text-center mt-[3px] text-[14px] font-bold'}>{t<string>('FUND_CARD')}</CyDText>
          </CyDView>} */}

          {isBridgeable && <CyDView className='flex items-center'>
              <CyDTouchView className={'bg-appColor rounded-full w-[40px] h-[40px] flex items-center justify-center'}
                  onPress={() => {
                    navigation.navigate(screenTitle.BRIDGE_SCREEN, {
                      fromChainData: tokenData,
                      title: t<string>('BRIDGE')
                    });
                  }}>
                  <CyDImage source={AppImages.BRIDGE_SHORTCUT} className={'w-[40px] h-[40px]'} />
              </CyDTouchView>
              <CyDText className={'text-center mt-[3px] text-[14px] font-bold'}>{t<string>('BRIDGE')}</CyDText>
          </CyDView>}

          {isSwapable && <CyDView className='flex items-center'>
            <CyDTouchView className={'flex items-center justify-center'}
                          onPress={() => {
                            navigation.navigate(screenTitle.BRIDGE_SCREEN, {
                              fromChainData: tokenData,
                              title: t<string>('SWAP_TITLE')
                            });
                          }}>
              <CyDImage source={AppImages.SWAP_SHORTCUT} className={'w-[40px] h-[40px]'}/>
            </CyDTouchView>
            <CyDText className={'text-center mt-[3px] text-[14px] font-bold'}>{t<string>('SWAP_TITLE')}</CyDText>
          </CyDView>}

          <CyDView className='flex items-center'>
              <CyDTouchView className={' flex items-center justify-center'} onPress={() => {
                let addressTypeQRCode;
                if (tokenData.chainDetails.backendName === ChainBackendNames.COSMOS) {
                  addressTypeQRCode = FundWalletAddressType.COSMOS;
                } else if (tokenData.chainDetails.backendName === ChainBackendNames.OSMOSIS) {
                  addressTypeQRCode = FundWalletAddressType.OSMOSIS;
                } else if (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS) {
                  addressTypeQRCode = FundWalletAddressType.EVMOS;
                } else if (tokenData.chainDetails.backendName === ChainBackendNames.ETH) {
                  addressTypeQRCode = FundWalletAddressType.EVM;
                } else if (tokenData.chainDetails.backendName === ChainBackendNames.JUNO) {
                  addressTypeQRCode = FundWalletAddressType.JUNO;
                } else if (tokenData.chainDetails.backendName === ChainBackendNames.STARGAZE) {
                  addressTypeQRCode = FundWalletAddressType.STARGAZE;
                } else if (tokenData.chainDetails.backendName === ChainBackendNames.NOBLE) {
                  addressTypeQRCode = FundWalletAddressType.NOBLE;
                }
                navigation.navigate(screenTitle.QRCODE, { addressType: addressTypeQRCode });
              }}>
                  <CyDImage source={AppImages.RECEIVE_SHORTCUT} className={'w-[40px] h-[40px]'} />
              </CyDTouchView>
              <CyDText className={'text-center mt-[3px]  text-[14px] font-bold'}>{t<string>('RECEIVE')}</CyDText>
          </CyDView>
    </CyDAnimatedView>
  );
};
