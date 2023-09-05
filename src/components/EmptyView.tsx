import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import * as C from '../constants/index';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import LottieView from 'lottie-react-native';

const { DynamicView, DynamicImage, CText } = require('../styles');

export default function EmptyView(props) {
  const {
    text,
    image,
    buyVisible,
    marginTop,
    isLottie = false,
    height,
    width,
  } = props;
  const { t } = useTranslation();

  return (
    <DynamicView
      dynamic
      dynamicHeight
      height={height || 100}
      width={width || 100}
      mT={marginTop || 10}
      jC={'center'}
    >
      {!isLottie ? (
        <DynamicImage dynamic source={image} width={150} height={150} />
      ) : (
        <DynamicView dynamic width={150} height={150}>
          <LottieView source={image} autoPlay loop />
        </DynamicView>
      )}
      <CText
        dynamic
        fF={C.fontsName.FONT_BOLD}
        mT={15}
        fS={14}
        color={Colors.primaryTextColor}
      >
        {text}
      </CText>
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
    </DynamicView>
  );
}
