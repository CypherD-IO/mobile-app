/**
 * @format
 * @flow
 */
import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import { ButtonWithImage } from './Share';
import AppImages from '../../../assets/images/appImages';
import { HdWalletContext } from '../../core/util';
import { createWallet } from '../../core/HdWallet';
import { ifIphoneX } from 'react-native-iphone-x-helper';
const {
  CText,
  SafeAreaView,
  DynamicView,
  DynamicImage,
} = require('../../styles');

export default function Login(props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);

  // NOTE: DEFINE HOOKS 🍎🍎🍎🍎🍎🍎
  const hdWalletContext = useContext(HdWalletContext);

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎

  // NOTE: HELPER METHOD 🍎🍎🍎🍎🍎

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <SafeAreaView dynamic>
      <DynamicView
        dynamic
        dynamicWidth
        dynamicHeight
        height={100}
        width={100}
        pH={40}
        jC='flex-start'>
        <CText
          dynamic
          fF={C.fontsName.FONT_BLACK}
          fS={30}
          mT={50}
          color={Colors.primaryTextColor}>
          {t('LETS_CONNECT_MSG')}
        </CText>
        <CText
          dynamic
          fF={C.fontsName.FONT_REGULAR}
          fS={16}
          mT={25}
          color={Colors.primaryTextColor}>
          {t('LETS_CONNECT_SUB_MSG')}
        </CText>

        <ButtonWithImage
          mT={41}
          bG={Colors.appColor}
          vC={Colors.appColor}
          text={t('CREATE_WALLET')}
          indicator={loading}
          imageName={AppImages.PLUS}
          isBorder={false}
          onPress={() => {
            setLoading(true);
            setTimeout(() => {
              createWallet(hdWalletContext);
            }, 50);
          }}
        />
        <ButtonWithImage
          mT={30}
          bG={Colors.whiteColor}
          vC={Colors.appColor}
          text={t('IMPORT_WALLET')}
          imageName={AppImages.ARROW}
          isBorder={true}
          onPress={() => {
            props.navigation.navigate(C.screenTitle.ENTER_KEY);
          }}
        />
        <DynamicImage
          dynamic
          dynamicWidth
          {...ifIphoneX(
            {
              mT: 35,
            },
            {
              mT: 2,
            },
          )}
          height={200}
          width={120}
          resizemode='cover'
          source={AppImages.HOME}
        />
      </DynamicView>
    </SafeAreaView>
  );
}
