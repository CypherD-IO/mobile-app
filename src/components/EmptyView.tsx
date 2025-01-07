import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import * as C from '../constants/index';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import LottieView from 'lottie-react-native';
import { CyDFastImage, CyDText, CyDView } from '../styles/tailwindStyles';

const { DynamicView, DynamicImage, CText } = require('../styles');

export default function EmptyView(props) {
  const {
    text,
    image,
    buyVisible,
    marginTop,
    isLottie = false,
    height = 100,
    width = 100,
  } = props;
  const { t } = useTranslation();

  return (
    <CyDView
      className={`flex flex-col items-center justify-center h-[${height}px] w-[${width}px] mt-[${marginTop}px]`}>
      {!isLottie ? (
        <CyDFastImage source={image} className='w-[150px] h-[150px]' />
      ) : (
        <CyDView className='w-[150px] h-[150px]'>
          <LottieView source={image} autoPlay loop />
        </CyDView>
      )}
      <CyDText className='mt-[15px] text-[14px]'>{text}</CyDText>
      {buyVisible ? (
        <ButtonWithOutImage
          mT={20}
          wT={80}
          bG={Colors.appColor}
          vC={Colors.appColor}
          mB={30}
          text={t('BUY')}
          isBorder={false}
          onPress={() => {
            //  onPress()
          }}
        />
      ) : (
        <ButtonWithOutImage />
      )}
    </CyDView>
  );
}
