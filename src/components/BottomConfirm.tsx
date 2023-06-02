import React, { useState } from 'react';
import Modal from 'react-native-modal';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import * as C from '../constants/index';
import { Colors } from '../constants/theme';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import { DynamicTouchView } from '../styles/viewStyle';
import { PayModalParams } from '../types/Browser';
const {
  CText,
  SafeAreaView,
  DynamicView,
  DynamicImage,
  ModalView
} = require('../styles');

export default function BottomConfirm (props: {
  isModalVisible: boolean,
  onPayPress: () => void,
  onCancelPress: () => void,
  modalParams: PayModalParams
}) {
  const { isModalVisible, onPayPress, onCancelPress, modalParams } = props;
  const { t } = useTranslation();

  return (
        <Modal isVisible={isModalVisible}
            onBackdropPress={() => { onCancelPress(); }}
            onRequestClose={() => { onCancelPress(); }}
            style={{ margin: 0 }}
        >
            <DynamicView dynamic dynamicWidth dynamicHeight width={100} height={100} jC={'flex-end'}>
                <DynamicView dynamic dynamicWidth dynamicHeight width={100} height={75} bGC={'white'} style={{
                  borderTopLeftRadius: 25,
                  borderTopRightRadius: 25
                }}>
                    <DynamicTouchView sentry-label='bottom-confirm-cancel-icon' dynamic dynamicWidth width={95} mT={5} aLIT={'flex-end'} onPress={() => { onCancelPress(); }}>
                        <DynamicImage dynamic dynamicWidthFix aLIT={'flex-end'} mT={10} marginHorizontal={6} height={20} width={20} resizemode='contain'
                        source={AppImages.CLOSE} />
                    </DynamicTouchView>
                    <DynamicView dynamic dynamicWidth width={95} fD={'row'} jC={'center'}>
                        <CText dynamic fF={C.fontsName.FONT_BLACK} fS={16} mT={5} mL={20} color={Colors.primaryTextColor}>{t('CONFIRM_PAYMENT')}</CText>
                    </DynamicView>

                    <DynamicView dynamic dynamicWidth width={80} mT={15} pV={10} bGC={Colors.backLight} bR={18} jC={'center'}>
                            <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={14} fS={10} color={Colors.primaryTextColor}>BLOCKCHAIN TRANSACTION FEE</CText>
                            <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_EXTRA_BOLD} fS={18} color={Colors.primaryTextColor}>${modalParams.gasFeeDollar}</CText>
                            <CText dynamic mL={10} mH={10} tA={'left'} fF={C.fontsName.FONT_EXTRA_BOLD} fS={18} color={Colors.primaryTextColor}>{modalParams.gasFeeETH} {modalParams.networkCurrency}</CText>
                    </DynamicView>

                    <DynamicView dynamic dynamicWidth width={100} jC={'center'} fD={'row'}>
                    <DynamicImage dynamic dynamicWidthFix aLIT={'flex-end'} mT={10} marginHorizontal={6} height={20} width={20} resizemode='contain'
                        source={modalParams.appImage} />
                    <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={14} fS={14} color={Colors.primaryTextColor}>{modalParams.networkName}</CText>
                    <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={16} fS={12} color={Colors.subTextColor}>{modalParams.networkCurrency}</CText>
                    </DynamicView>

                    <DynamicView dynamic dynamicWidth width={100} fD={'row'} pH={30}>
                    <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={14} fS={14} color={Colors.primaryTextColor}>Value</CText>
                    <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={16} fS={12} color={Colors.subTextColor}>{modalParams.valueETH} {modalParams.networkCurrency}</CText>
                    <CText dynamic mH={10} fF={C.fontsName.FONT_BOLD} mT={16} fS={12} color={Colors.primaryTextColor}>${modalParams.valueDollar}</CText>
                    </DynamicView>

                    <DynamicView dynamic dynamicWidth dynamicHeightFix mT={10} height={1} width={80} bGC={Colors.portfolioBorderColor} />

                    <DynamicView dynamic dynamicWidth width={100} fD={'row'} pH={30}>
                    <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={14} fS={14} color={Colors.primaryTextColor}>Total</CText>
                    <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={16} fS={12} color={Colors.subTextColor}>{modalParams.totalETH} {modalParams.networkCurrency}</CText>
                    <CText dynamic mH={10} fF={C.fontsName.FONT_BOLD} mT={16} fS={12} color={Colors.primaryTextColor}>${modalParams.totalDollar}</CText>
                    </DynamicView>

                    <DynamicView dynamic fD={'row'} >
                        <ButtonWithOutImage sentry-label='bottom-confirm-cancel-button'
                            mT={20} wT={45} mH={12} bG={Colors.whiteColor} vC={Colors.appColor} mB={30}
                            text={t('CANCEL')} isBorder={true} onPress={() => {
                              onCancelPress();
                            }}
                        />
                        <ButtonWithOutImage sentry-label='bottom-confirm-pay-button'
                            mT={20} wT={45} bG={Colors.appColor} vC={Colors.appColor} mB={30}
                            text={t('PAY')} isBorder={false} onPress={() => {
                              onPayPress();
                            }}
                        />
                    </DynamicView>

                    <DynamicView dynamic bGC={Colors.switchColor} mT={10} bR={10}>
                    </DynamicView>
                </DynamicView>
            </DynamicView>
        </Modal>
  );
}
