/* eslint-disable @typescript-eslint/restrict-plus-operands */
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import FastImage from 'react-native-fast-image';
import { Swipeable } from 'react-native-gesture-handler';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import { ChainBackendNames, ChainNames, CosmosStakingTokens, FundWalletAddressType } from '../../constants/server';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { isBasicCosmosChain } from '../../core/util';
import { CyDFastImage, CyDImage, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import CyDTokenAmount from './tokenAmount';
import CyDTokenValue from './tokenValue';

const PortfolioTokenItem = ({ item, index, verifyCoinChecked, navigation, onSwipe, setSwipeableRefs }) => {
  const globalStateContext = useContext<GlobalContextDef>(GlobalContext);
  const randomColor = [
    AppImages.RED_COIN,
    AppImages.CYAN_COIN,
    AppImages.GREEN_COIN,
    AppImages.PINK_COIN,
    AppImages.BLUE_COIN,
    AppImages.PURPLE_COIN
  ];

  const { t } = useTranslation();

  const canShowIBC = (tokenData: any) => {
    return globalStateContext.globalState.ibc && (isBasicCosmosChain(tokenData.chainDetails.backendName) || (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && (tokenData.name === CosmosStakingTokens.EVMOS || tokenData.name.includes('IBC'))));
  };

  const RenderRightActions = (tokenData: any) => {
    const { isBridgeable, isSwapable } = tokenData;
    return (
      <CyDView className={'flex flex-row justify-evenly items-center bg-secondaryBackgroundColor'}>
        <CyDView>
          <CyDTouchView className={'flex items-center justify-center mx-[15px]'} onPress={() => {
            navigation.navigate(screenTitle.ENTER_AMOUNT, {
              tokenData
            });
          } }>
            <CyDImage source={AppImages.SEND_SHORTCUT} className={'w-[35px] h-[35px]'} />
          </CyDTouchView>
          <CyDText className={'text-center mt-[5px] text-[12px] font-bold'}>{t<string>('SEND')}</CyDText>
        </CyDView>

        {canShowIBC(tokenData) && <CyDView>
          <CyDTouchView className={' bg-appColor rounded-full flex items-center justify-center mx-[15px] p-[11px]'}
            onPress={() => {
              navigation.navigate(screenTitle.IBC_SCREEN, {
                tokenData
              });
            } }>
            <CyDImage source={AppImages.IBC} className={'w-[15px] h-[15px]'} />
          </CyDTouchView>
          <CyDText className={'text-center mt-[5px] text-[12px] font-bold'}>{t<string>('IBC')}</CyDText>
        </CyDView>}

        {/* {canShowFundCard(tokenData) && <CyDView>
            <CyDTouchView className={'flex items-center justify-center'}
              onPress={() => {
                props.navigation.navigate(screenTitle.DEBIT_CARD, {
                  screen: screenTitle.SOLID_FUND_CARD_SCREEN, params: { tokenData, navigation: props.navigation }, initial: false
                });
              }}
            >
                <CyDImage source={AppImages.FUND_CARD_SHORTCUT} className={'w-[35px] h-[35px]'} />
            </CyDTouchView>
            <CyDText className={'text-center mt-[5px] text-[12px] font-bold'}>{t<string>('FUND_CARD')}</CyDText>
        </CyDView>} */}

        {isBridgeable && <CyDView>
          <CyDTouchView className={'flex items-center justify-center mx-[15px]'}
                        onPress={() => {
                          navigation.navigate(screenTitle.BRIDGE_SCREEN, {
                            fromChainData: tokenData,
                            title: t('BRIDGE')
                          });
                        }}>
            <CyDImage source={AppImages.BRIDGE_SHORTCUT} className={'w-[35px] h-[35px]'}/>
          </CyDTouchView>
          <CyDText className={'text-center mt-[5px] text-[12px] font-bold'}>{t<string>('BRIDGE')}</CyDText>
        </CyDView>}

        {isSwapable && <CyDView>
          <CyDTouchView className={'flex items-center justify-center mx-[15px]'}
                        onPress={() => {
                          navigation.navigate(screenTitle.BRIDGE_SCREEN, {
                            fromChainData: tokenData,
                            title: t('SWAP_TITLE')
                          });
                        }}>
            <CyDImage source={AppImages.SWAP_SHORTCUT} className={'w-[35px] h-[35px]'}/>
          </CyDTouchView>
          <CyDText className={'text-center mt-[5px] text-[12px] font-bold'}>{t<string>('SWAP_TITLE')}</CyDText>
        </CyDView>}

        <CyDView>
          <CyDTouchView className={' flex items-center justify-center mx-[15px]'} onPress={() => {
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
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.SHARDEUM) {
              addressTypeQRCode = FundWalletAddressType.SHARDEUM;
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.SHARDEUM_SPHINX) {
              addressTypeQRCode = FundWalletAddressType.SHARDEUM_SPHINX;
            }
            navigation.navigate(screenTitle.QRCODE, { addressType: addressTypeQRCode });
          } }>
            <CyDImage source={AppImages.RECEIVE_SHORTCUT} className={'w-[35px] h-[35px]'} />
          </CyDTouchView>
          <CyDText className={'text-center mt-[5px]  text-[12px] font-bold'}>{t<string>('RECEIVE')}</CyDText>
        </CyDView>
      </CyDView>
    );
  };

  return (verifyCoinChecked && item.isVerified) || !verifyCoinChecked
    ? <CyDTouchView
            className='flex flex-row items-center border-b-[0.5px] border-sepratorColor'
            onPress={() => {
              navigation.navigate(screenTitle.TOKEN_OVERVIEW, {
                tokenData: item
              });
            }}
          >
              <CyDView className='flex flex-row h-full mb-[10px] items-center rounded-r-[20px] self-center pl-[13px] pr-[10px]'>
                <CyDFastImage
                  className={'h-[45px] w-[45px] rounded-[50px]'}
                  source={ item?.logoUrl
                    ? {
                        uri: item.logoUrl
                      }
                    : randomColor[Math.floor(Math.random() * randomColor.length)]}
                  resizeMode='contain'
                />
                <CyDView className='absolute top-[54%] right-[5px]'>
                  <CyDFastImage
                    className={'h-[20px] w-[20px] rounded-[50px] border-[1px] border-white bg-white'}
                    source={item?.chainDetails?.logo_url ?? 'https://raw.githubusercontent.com/cosmostation/cosmostation_token_resource/master/assets/images/common/unknown.png'}
                    resizeMode={FastImage.resizeMode.contain}
                  />
                </CyDView>

              </CyDView>
              <Swipeable
                key={index}
                friction={1}
                rightThreshold={0}
                renderRightActions={() => RenderRightActions(item)}
                onSwipeableWillOpen={() => { onSwipe(index); }}
                containerStyle={{ display: 'flex', width: '85%' }}
                ref={ref => { setSwipeableRefs(index, ref); }}
              >
                <CyDView className='flex flex-row w-full justify-between rounded-r-[20px] py-[17px] pr-[18px] bg-white'>
                  <CyDView className='ml-[10px] max-w-[75%]'>
                    <CyDView className={'flex flex-row items-center align-center'}>
                      <CyDText className={'font-extrabold text-[16px]'}>{item.name}</CyDText>
                      {item.isStakeable &&
                        <CyDView className={' bg-appColor px-[5px] ml-[10px] text-[12px] rounded-[4px]'}>
                          <CyDText className='font-bold'>
                          stake
                          </CyDText>
                        </CyDView>
                      }
                    </CyDView>
                    <CyDText className={'text-[12px]'}>{item.symbol}</CyDText>
                  </CyDView>
                  <CyDView className='flex self-center items-end pr-[8px]'>
                    <CyDTokenValue className='text-[18px] font-bold'>
                      {item.totalValue + item.actualStakedBalance + item.actualUnbondingBalance}
                    </CyDTokenValue>
                    <CyDTokenAmount className='text-[14px]'>
                      {item.actualBalance + item.stakedBalanceTotalValue + item.unbondingBalanceTotalValue}
                    </CyDTokenAmount>
                  </CyDView>
                </CyDView>
              </Swipeable>
          </CyDTouchView>
    : <CyDView></CyDView>
  ;
};

export default React.memo(PortfolioTokenItem);