/**
 * @format
 * @flow
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import { ButtonWithImage } from './Share';
import AppImages from '../../../assets/images/appImages';
const {
  CText,
  SafeAreaView,
  DynamicView,
  DynamicImage
} = require('../../styles');

export default function ImportWallet (props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎

  // NOTE: HELPER METHOD 🍎🍎🍎🍎🍎

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <SafeAreaView dynamic>
      <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} pH={40} jC='flex-start'>
        <CText dynamic fF={C.fontsName.FONT_BLACK} fS={30} mT={50} color={Colors.primaryTextColor}>{t('IMPORT_WALLET_MSG')}</CText>
        <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={16} mT={25} color={Colors.primaryTextColor}>
          {t('IMPORT_WALLET_SUB_MSG')}
        </CText>
        <ButtonWithImage mT={41} bG={Colors.whiteColor} vC={Colors.appColor}
          text={t('ENTER_KEY_MANUALLY')} imageName={AppImages.KEY} isBorder={true} onPress={() => {
            props.navigation.navigate(C.screenTitle.ENTER_KEY);
          }} />
        <ButtonWithImage mT={30} bG={Colors.whiteColor} vC={Colors.appColor}
          text={t('IMPORT_KEY_FROM_ICLOUD')} imageName={AppImages.CLOUD} isBorder={true} onPress={() => {
            // props.navigation.navigate(C.screenTitle.ENTER_KEY)
          }} />
        <DynamicImage dynamic dynamicWidth height={300} width={140} resizemode='cover'
          source={AppImages.HOME} />
      </DynamicView>
    </SafeAreaView>
  );
}
