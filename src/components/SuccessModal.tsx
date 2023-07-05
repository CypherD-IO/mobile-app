import React, { useState } from 'react';
import { Button, FlatList, Text, View } from 'react-native';
import Modal from 'react-native-modal';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import * as C from '../constants/index';
import { Colors } from '../constants/theme';
import { ButtonWithOutImage } from '../containers/Auth/Share';

const {
  CText,
  SafeAreaView,
  DynamicView,
  DynamicImage,
  ModalView
} = require('../styles');

export default function SuccessModal (props) {
  const { isModalVisible, onPress, image, titleMsg, subTitleMsg } = props;
  const { t } = useTranslation();

  return (
          <Modal isVisible={isModalVisible}
          onBackdropPress={() => { onPress(); }}
          onRequestClose={() => { onPress(); }}
          >
            <DynamicView dynamic dynamicWidth width={100} jC='center'>
            <ModalView dynamic dynamicWidth width={90} bGC = {Colors.whiteColor} bR={30} >
            {image && <DynamicImage dynamic source={image} width={100} height={100} mT={30} />}
            <CText dynamic mH={20} mL={30} fF={C.fontsName.FONT_BLACK} fS={18} mT={10} color={Colors.primaryTextColor}>{titleMsg}</CText>
            {subTitleMsg && <CText dynamic mH={40} mL={40} fF={C.fontsName.FONT_REGULAR} fS={15} mT={10} color={Colors.primaryTextColor}>{subTitleMsg}</CText>}

            <ButtonWithOutImage sentry-label='success-modal' mT={10} wT ={80} bG={Colors.appColor} vC={Colors.appColor} mB ={30}
               text={t('OKAY')} isBorder={false} onPress={() => {
                 onPress();
               }}/>
            </ModalView>
            </DynamicView>
          </Modal>
  );
}
