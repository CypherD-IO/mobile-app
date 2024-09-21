import React, { ReactNode, useEffect, useState } from 'react';
import {
  CyDFastImage,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { Chain, QRScannerScreens } from '../../../constants/server';
import AppImages from '../../../../assets/images/appImages';
import { screenTitle } from '../../../constants';
import { BarCodeReadEvent } from 'react-native-camera';
import { ConnectionTypes } from '../../../constants/enum';
import useConnectionManager from '../../../hooks/useConnectionManager';

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
          'h-[40px] w-[54px] bg-chainColor px-[8px] py-[4px] rounded-[18px] flex flex-row items-center justify-between border border-sepratorColor'
        }>
        <CyDFastImage
          className={'h-[22px] w-[22px]'}
          source={selectedChain.logo_url}
        />
        <CyDFastImage className={'h-[8px] w-[8px]'} source={AppImages.DOWN} />
      </CyDTouchView>
      {/* <CyDAnimatedView style={opacity}>{renderTitleComponent}</CyDAnimatedView> */}
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
          <CyDFastImage
            source={AppImages.QR_CODE_SCANNER_BLACK}
            className={'h-[23px] w-[23px] mt-[5px]'}
            resizeMode='contain'
          />
        </CyDTouchView>
      )}
    </CyDView>
  );
};
