import React, { useState } from 'react';
import Modal from 'react-native-modal';
import { useTranslation } from 'react-i18next';
import * as C from '../constants/index';
import { Colors } from '../constants/theme';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import { isIphoneX } from 'react-native-iphone-x-helper';

const {
  CText,
  DynamicView
} = require('../styles');

export default function AlertModal (props) {
  const { isModalVisible, errorMsg, onPress } = props;
  const { t } = useTranslation();

  return (
        <Modal isVisible={isModalVisible}
            onBackdropPress={() => { onPress(); }}
            style={{ margin: 0 }}
        >
            <DynamicView dynamic dynamicWidth dynamicHeight width={100} height={100} jC={'center'}>
                <DynamicView dynamic dynamicWidth dynamicHeight height={isIphoneX() ? 35 : 42} bR={30} width={80} bGC={Colors.whiteColor}>
                <CText dynamic fF={C.fontsName.FONT_BOLD} mT={20} fS={26} color={Colors.primaryTextColor} >Alert</CText>
                <DynamicView dynamic jC={'flex-start'} aLIT={'flex-start'} bGC={Colors.lightPurple} bR={20} mB={30}
                                dynamicWidth dynamicHeight width={80} height={40}>
                    <CText dynamic fF={C.fontsName.FONT_BOLD} mT={12} fS={14} mL={25} color={Colors.primaryTextColor}>Message</CText>
                    <CText dynamic fF={C.fontsName.FONT_REGULAR} mT={4} fS={12} mL={25} color={Colors.primaryTextColor} tA={'left'}>{errorMsg}</CText>
                </DynamicView>
                <ButtonWithOutImage sentry-label='alert-on-press'
                    mB={30} wT={70} bG={Colors.appColor} vC={Colors.appColor}
                    text={t('OK')} isBorder={false} onPress={() => {
                      onPress();
                    }}
                />
                </DynamicView>

            </DynamicView>
        </Modal>
  );
}
