import React, { useContext } from 'react';
import { CyDFastImage, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import { PortfolioContext } from '../../core/util';
import { QRScannerScreens } from '../../constants/server';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import { BarCodeReadEvent } from 'react-native-camera';

interface HeaderBarProps {navigation: any, setChooseChain: Function, onWCSuccess: (e: BarCodeReadEvent) => void }

export const HeaderBar = ({ navigation, setChooseChain, onWCSuccess }: HeaderBarProps) => {
  const portfolioState = useContext<any>(PortfolioContext);
  const onSuccess = onWCSuccess;
  return (
      <CyDView className={'flex flex-row h-[50px] mx-[20px] justify-between items-center'}>
        <CyDTouchView onPress={() => { setChooseChain(true); }} className={'h-[40px] w-[54px] bg-chainColor mt-[10px] px-[8px] py-[4px] rounded-[18px] flex flex-row items-center justify-between border border-sepratorColor'}>
          <CyDFastImage className={'h-[22px] w-[22px]'} source={portfolioState.statePortfolio.selectedChain.logo_url} />
          <CyDFastImage className={'h-[8px] w-[8px]'} source={AppImages.DOWN} />
        </CyDTouchView>
        <CyDTouchView
          onPress={() => {
            navigation.navigate(screenTitle.QR_CODE_SCANNER, {
              navigation,
              fromPage: QRScannerScreens.WALLET_CONNECT,
              onSuccess
            });
          }}
        >
          <CyDFastImage source={AppImages.QR_CODE_SCANNER_BLACK} className={'h-[23px] w-[23px] mt-[10px]'} resizeMode='contain'/>
        </CyDTouchView>
      </CyDView>
  );
};
