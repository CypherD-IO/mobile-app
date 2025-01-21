import React, { ReactNode, useContext, useEffect, useState } from 'react';
import {
  CyDFastImage,
  CydMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { Chain, QRScannerScreens } from '../../../constants/server';
import { screenTitle } from '../../../constants';
import { BarCodeReadEvent } from 'react-native-camera';
import { ConnectionTypes } from '../../../constants/enum';
import useConnectionManager from '../../../hooks/useConnectionManager';
import { HdWalletContext } from '../../../core/util';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';
import { t } from 'i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderBarProps {
  navigation: any;
  setChooseChain: (arg: boolean) => void;
  selectedChain: Chain;
  onWCSuccess: (e: BarCodeReadEvent) => void;
  renderTitleComponent?: ReactNode;
}

export const HeaderBar = ({
  navigation,
  setChooseChain,
  selectedChain,
  onWCSuccess,
  renderTitleComponent,
}: HeaderBarProps) => {
  const insets = useSafeAreaInsets();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { isReadOnlyWallet } = hdWalletContext.state;
  const { connectionType } = useConnectionManager();
  const [connectionTypeValue, setConnectionTypeValue] =
    useState(connectionType);

  useEffect(() => {
    setConnectionTypeValue(connectionType);
  }, [connectionType]);

  const onSuccess = onWCSuccess;
  return (
    <CyDView
      className={'z-20 flex flex-row mx-[20px] justify-between items-center'}>
      <CyDTouchView
        onPress={() => {
          setChooseChain(true);
        }}
        className={
          'h-[40px] w-[54px] bg-blue20 px-[8px] py-[4px] rounded-[18px] flex flex-row items-center justify-between border-[0.5px] border-n40'
        }>
        <CyDFastImage
          className={'h-[22px] w-[22px]'}
          source={selectedChain.logo_url}
        />
        <CydMaterialDesignIcons
          name='menu-down'
          size={26}
          className='text-base400 mr-2'
        />
      </CyDTouchView>
      {isReadOnlyWallet && (
        <CyDView className='flex flex-row items-center p-[6px] bg-p20 rounded-[8px]'>
          <CydMaterialDesignIcons
            name='lock'
            size={20}
            className='text-base400 mr-[5px]'
          />
          <CyDText className='text-[14px] font-medium'>
            {t('READ_ONLY_MODE')}
          </CyDText>
        </CyDView>
      )}
      {connectionTypeValue !== ConnectionTypes.WALLET_CONNECT && (
        <CyDTouchView
          className={'pl-[8px] rounded-[18px]'}
          onPress={() => {
            navigation.navigate(screenTitle.QR_CODE_SCANNER, {
              navigation,
              fromPage: QRScannerScreens.WALLET_CONNECT,
              onSuccess,
            });
          }}>
          <CydMaterialDesignIcons
            name='qrcode-scan'
            size={24}
            className='text-base400'
          />
        </CyDTouchView>
      )}
    </CyDView>
  );
};
