import { t } from 'i18next';
import React, { useContext } from 'react';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import {
  ChainBackendNames,
  FundWalletAddressType,
} from '../../constants/server';
import { GlobalContext } from '../../core/globalContext';
import { isBasicCosmosChain } from '../../core/util';
import { TokenMeta } from '../../models/tokenMetaData.model';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { isIOS } from '../../misc/checkers';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

export default function TokenOverviewToolBar({
  tokenData,
  navigation,
}: {
  tokenData: TokenMeta;
  navigation: NavigationProp<ParamListBase>;
}) {
  const globalStateContext = useContext<any>(GlobalContext);
  const { isBridgeable, isSwapable } = tokenData;
  const canShowIBC =
    globalStateContext.globalState.ibc &&
    isBasicCosmosChain(tokenData.chainDetails.backendName);

  return (
    <CyDView
      className={`flex flex-row w-[100%] justify-evenly items-center mt-[7px] pb-[${isIOS() ? 15 : 0}px]`}>
      <CyDView className='flex items-center'>
        <CyDTouchView
          className={'flex items-center justify-center'}
          onPress={() => {
            navigation.navigate(screenTitle.ENTER_AMOUNT, {
              navigation,
              tokenData,
            });
          }}>
          <CyDImage
            source={AppImages.SEND_SHORTCUT}
            className={'w-[35px] h-[35px]'}
          />
        </CyDTouchView>
        <CyDText className={'text-center mt-[3px] text-[12px] font-semibold'}>
          {t<string>('SEND')}
        </CyDText>
      </CyDView>

      {canShowIBC && (
        <CyDView className='flex items-center'>
          <CyDTouchView
            className={
              'bg-p40 rounded-full w-[35px] h-[35px] flex items-center justify-center'
            }
            onPress={() => {
              navigation.navigate(screenTitle.IBC_SCREEN, {
                tokenData,
              });
            }}>
            <CyDImage source={AppImages.IBC} className={'w-[20px] h-[16px]'} />
          </CyDTouchView>
          <CyDText className={'text-center mt-[3px] text-[12px] font-semibold'}>
            {t<string>('IBC')}
          </CyDText>
        </CyDView>
      )}

      {(isSwapable || isBridgeable) && (
        <CyDView>
          <CyDTouchView
            className={'flex items-center justify-center mx-[15px]'}
            onPress={() => {
              navigation.navigate(screenTitle.SWAP, {
                screen: screenTitle.SWAP_SCREEN,
                params: {
                  tokenData,
                  backVisible: true,
                },
              });
            }}>
            <CyDImage
              source={AppImages.SWAP_SHORTCUT}
              className={'w-[30px] h-[30px]'}
            />
          </CyDTouchView>
          <CyDText className={'text-center mt-[5px] text-[12px] font-bold'}>
            {t<string>('SWAP_TITLE')}
          </CyDText>
        </CyDView>
      )}

      <CyDView className='flex items-center'>
        <CyDTouchView
          className={' flex items-center justify-center'}
          onPress={() => {
            let addressTypeQRCode;
            switch (tokenData.chainDetails.backendName) {
              case ChainBackendNames.COSMOS:
                addressTypeQRCode = FundWalletAddressType.COSMOS;
                break;
              case ChainBackendNames.OSMOSIS:
                addressTypeQRCode = FundWalletAddressType.OSMOSIS;
                break;
              case ChainBackendNames.JUNO:
                addressTypeQRCode = FundWalletAddressType.JUNO;
                break;
              case ChainBackendNames.STARGAZE:
                addressTypeQRCode = FundWalletAddressType.STARGAZE;
                break;
              case ChainBackendNames.NOBLE:
                addressTypeQRCode = FundWalletAddressType.NOBLE;
                break;
              case ChainBackendNames.COREUM:
                addressTypeQRCode = FundWalletAddressType.COREUM;
                break;
              case ChainBackendNames.INJECTIVE:
                addressTypeQRCode = FundWalletAddressType.INJECTIVE;
                break;
              case ChainBackendNames.KUJIRA:
                addressTypeQRCode = FundWalletAddressType.KUJIRA;
                break;
              case ChainBackendNames.SOLANA:
                addressTypeQRCode = FundWalletAddressType.SOLANA;
                break;
              case ChainBackendNames.ZKSYNC_ERA:
                addressTypeQRCode = FundWalletAddressType.ZKSYNC_ERA;
                break;
              case ChainBackendNames.BASE:
                addressTypeQRCode = FundWalletAddressType.BASE;
                break;
              case ChainBackendNames.POLYGON_ZKEVM:
                addressTypeQRCode = FundWalletAddressType.POLYGON_ZKEVM;
                break;
              case ChainBackendNames.AURORA:
                addressTypeQRCode = FundWalletAddressType.AURORA;
                break;
              case ChainBackendNames.MOONBEAM:
                addressTypeQRCode = FundWalletAddressType.MOONBEAM;
                break;
              case ChainBackendNames.MOONRIVER:
                addressTypeQRCode = FundWalletAddressType.MOONRIVER;
                break;
              case ChainBackendNames.POLYGON:
                addressTypeQRCode = FundWalletAddressType.POLYGON;
                break;
              case ChainBackendNames.AVALANCHE:
                addressTypeQRCode = FundWalletAddressType.AVALANCHE;
                break;
              case ChainBackendNames.ARBITRUM:
                addressTypeQRCode = FundWalletAddressType.ARBITRUM;
                break;
              case ChainBackendNames.OPTIMISM:
                addressTypeQRCode = FundWalletAddressType.OPTIMISM;
                break;
              case ChainBackendNames.BSC:
                addressTypeQRCode = FundWalletAddressType.BSC;
                break;
              case ChainBackendNames.ETH:
                addressTypeQRCode = FundWalletAddressType.EVM;
                break;
              default:
                addressTypeQRCode = FundWalletAddressType.EVM;
                break;
            }

            navigation.navigate(screenTitle.QRCODE, {
              addressType: addressTypeQRCode,
            });
          }}>
          <CyDImage
            source={AppImages.RECEIVE_SHORTCUT}
            className={'w-[35px] h-[35px]'}
          />
        </CyDTouchView>
        <CyDText className={'text-center mt-[3px]  text-[12px] font-semibold'}>
          {t<string>('RECEIVE')}
        </CyDText>
      </CyDView>
    </CyDView>
  );
}
