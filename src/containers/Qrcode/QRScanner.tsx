import React, { useState } from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { Dimensions, ImageBackground } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CyDView, CyDText, CyDTouchView } from '../../styles/tailwindStyles';
import { QRScannerScreens } from '../../constants/server';
import { BarCodeReadEvent } from 'react-native-camera';
import AppImages from '../../../assets/images/appImages';
import * as C from '../../constants/index';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function QRScanner (props: { route: { params: { fromPage: string | (() => string), onSuccess: (e: BarCodeReadEvent) => void } }, navigation: { goBack: () => void } }) {
  const { t } = useTranslation();
  const [fromPage] = useState<string>(props.route.params.fromPage);

  const renderText = () => {
    switch (fromPage) {
      case QRScannerScreens.SEND:
        return t('QRSCAN_SEND');
      case QRScannerScreens.IMPORT:
        return t('QRSCAN_IMPORT');
      case QRScannerScreens.WALLET_CONNECT:
        return t('QRSCAN_WALLET_CONNECT');
      default:
        return t('QRSCAN_TEXT');
    }
  };

  return (
        <QRCodeScanner
            showMarker
            fadeIn={false}
            onRead={(e) => {
              props.navigation.goBack();
              props.route.params.onSuccess(e);
            }}
            cameraStyle = {{ height: SCREEN_HEIGHT }}
            customMarker={
              <ImageBackground
                source={AppImages.SCANNER_BG} resizeMode="cover"
                style={{ height: '100%', width: '100%' }}
                imageStyle={{ height: '100%', width: '100%' }}
              >
                <CyDView className={'flex flex-column justify-end items-center h-screen w-screen'}>
                  <CyDView className={'flex items-center justify-center h-1/2 w-10/12 pt-[10px]'} >
                    <CyDText className = {'font-nunito text-center text-[20px] color-white'}>
                      { renderText() }
                    </CyDText>
                    {fromPage === QRScannerScreens.WALLET_CONNECT && <CyDTouchView
                      className={
                        'flex items-center justify-center mt-[40px] h-[60px] w-2/3 border-[1px] border-[#8E8E8E] rounded-[12px]'
                      }
                      onPress={() => props.navigation.navigate(C.screenTitle.WALLET_CONNECT)}
                    >
                      <CyDText className={'text-white text-[15px] font-extrabold'}>{t('Manage Connections')}</CyDText>
                    </CyDTouchView>}
                  </CyDView>
                </CyDView>
              </ImageBackground>
            }
        />
  );
}
