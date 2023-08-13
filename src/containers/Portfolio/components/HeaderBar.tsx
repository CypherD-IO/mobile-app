import React, { ReactNode, useContext } from 'react';
import { CyDAnimatedView, CyDFastImage, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import { PortfolioContext } from '../../../core/util';
import { QRScannerScreens } from '../../../constants/server';
import AppImages from '../../../../assets/images/appImages';
import { screenTitle } from '../../../constants';
import { BarCodeReadEvent } from 'react-native-camera';
import { SharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { H_BALANCE_BANNER, OFFSET_TABVIEW } from '../constants';

interface HeaderBarProps {
  navigation: any
  setChooseChain: Function
  scrollY: SharedValue<number>
  onWCSuccess: (e: BarCodeReadEvent) => void
  renderTitleComponent?: ReactNode
}

export const HeaderBar = ({ navigation, setChooseChain, scrollY, onWCSuccess, renderTitleComponent }: HeaderBarProps) => {
  const portfolioState = useContext<any>(PortfolioContext);

  const opacity = useAnimatedStyle(() => {
    return {
      opacity: withTiming(scrollY.value > OFFSET_TABVIEW + 0.6 * H_BALANCE_BANNER ? 1 : 0, {
        duration: 300
      })
    };
  });

  const onSuccess = onWCSuccess;
  return (
      <CyDView className={'flex flex-row mx-[20px] justify-between items-center bg-white'}>
        <CyDTouchView onPress={() => { setChooseChain(true); }} className={'h-[40px] w-[54px] bg-chainColor px-[8px] py-[4px] rounded-[18px] flex flex-row items-center justify-between border border-sepratorColor'}>
          <CyDFastImage className={'h-[22px] w-[22px]'} source={portfolioState.statePortfolio.selectedChain.logo_url} />
          <CyDFastImage className={'h-[8px] w-[8px]'} source={AppImages.DOWN} />
        </CyDTouchView>
        <CyDAnimatedView style={opacity}>
          {renderTitleComponent}
        </CyDAnimatedView>
        <CyDTouchView
        className={'pl-[8px] rounded-[18px]'}
          onPress={() => {
            navigation.navigate(screenTitle.QR_CODE_SCANNER, {
              navigation,
              fromPage: QRScannerScreens.WALLET_CONNECT,
              onSuccess
            });
          }}
        >
          <CyDFastImage source={AppImages.QR_CODE_SCANNER_BLACK} className={'h-[23px] w-[23px] mt-[5px]'} resizeMode='contain'/>
        </CyDTouchView>
      </CyDView>
  );
};
