import React, { useState } from 'react';
import Modal from 'react-native-modal';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import * as C from '../constants/index';
import { Colors } from '../constants/theme';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import { DynamicTouchView } from '../styles/viewStyle';
import { Platform } from 'react-native';
const {
  CText,
  DynamicView,
  DynamicImage
} = require('../styles');

export default function BottomBridgeTokenConfirm (props) {
  const { isModalVisible, onPayPress, onCancelPress, lowBalance, modalParams } = props;
  const { t } = useTranslation();

  return (
        <Modal isVisible={isModalVisible}
            onBackdropPress={() => { onCancelPress(); }}
            onRequestClose={() => { onCancelPress(); }}
             style={{ margin: 0 }}
        >
            <DynamicView dynamic dynamicWidth dynamicHeight width={100} height={100} jC={'flex-end'} >
                <DynamicView dynamic dynamicWidth dynamicHeight width={100} height={lowBalance ? 80 : 70} bGC={'white'} style={{
                  borderTopLeftRadius: 25,
                  borderTopRightRadius: 25
                }} aLIT='center'>
                    <DynamicTouchView sentry-label='bridge-bottom-cancel-icon' dynamic dynamicWidth width={90} mT={5}
                                      onPress={() => { onCancelPress(); }} style={{ position: 'relative' }}>

                    <DynamicImage dynamic mT={10} marginHorizontal={10} height={14} width={14} resizemode='contain'
                        source={AppImages.CLOSE} style={{ position: 'absolute', right: 0 }}/>

                        <CText dynamic fF={C.fontsName.FONT_BLACK} fS={20} mT={10} color={Colors.primaryTextColor}>{t('TOKEN_TRANSFER')}</CText>

                    </DynamicTouchView>

                    <DynamicView dynamic dynamicWidth width={100} height={500} bGC={Colors.whiteColor} bR={18} jC={'center'}>
                    <DynamicView dynamic dynamicWidth width={90} bGC={Colors.backLight} bR={18} jC={'center'} pB={12}>
                        <DynamicView dynamic dynamicWidth width={100} jC={'center'} fD={'row'}>
                            <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={14} fS={10} color={Colors.primaryTextColor}>RECEIVE ON</CText>
                            <DynamicImage dynamic dynamicWidthFix aLIT={'flex-end'} mT={10} marginHorizontal={6} height={20} width={20} resizemode='contain'
                                source={modalParams.to_appImage} />
                            <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={14} fS={14} color={Colors.primaryTextColor}>{modalParams.to_chain}</CText>
                        </DynamicView>
                        <DynamicView dynamic dynamicWidth width={100} fD={'row'} pH={30}>
                            <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={14} fS={14} color={Colors.primaryTextColor}>Value</CText>
                            <CText dynamic mH={10} fF={C.fontsName.FONT_BOLD} mT={16} fS={12} color={Colors.primaryTextColor}>{modalParams.totalReceivedToken} {modalParams.receivedTokenSymbol}</CText>
                            <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={16} fS={12} color={Colors.subTextColor}>${modalParams.totalReceivedValueUSD}</CText>
                        </DynamicView>
                    </DynamicView>

                    <DynamicView dynamic dynamicWidth width={90} jC={'center'} fD={'row'} >
                        <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={20} fS={10} color={Colors.primaryTextColor}>SEND ON</CText>
                        <DynamicImage dynamic dynamicWidthFix aLIT={'flex-end'} mT={20} marginHorizontal={6} height={20} width={20} resizemode='contain'
                            source={modalParams.from_appImage} />
                        <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={20} fS={14} color={Colors.primaryTextColor}>{modalParams.from_chain}</CText>
                    </DynamicView>

                    <DynamicView dynamic dynamicWidth width={100} fD={'row'} jC={'space-around'}>
                        <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BOLD} mT={20} fS={14} color={Colors.primaryTextColor}>Value</CText>
                        <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={22} fS={12} color={Colors.primaryTextColor} tA={'right'}>{modalParams.totalTokenSent} {modalParams.sentTokenSymbol}</CText>
                        <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={22} fS={12} color={Colors.subTextColor} tA={'right'} pR={20}>${parseFloat(modalParams.totalValueSentUSD).toFixed(2)}</CText>
                    </DynamicView>

                    <DynamicView dynamic dynamicWidth dynamicHeightFix mT={10} height={1} mH={20} width={90} bGC={Colors.portfolioBorderColor} />

                    <DynamicView dynamic dynamicWidth width={100} fD={'row'} jC={'space-around'}>
                        <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BOLD} mT={14} fS={14} color={Colors.primaryTextColor}>Gas</CText>

                        <DynamicView dynamic fD='row'>
                            {modalParams.gasFeeNative < 0.00001 && <CText dynamic mH={10} fF={C.fontsName.FONT_BOLD} mT={16} fS={16} color={Colors.secondaryTextColor}>{'≈'}</CText>}

                            <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={16} fS={12} color={Colors.primaryTextColor} style={{ left: 10 }} tA={'right'}>{modalParams.gasFeeNative > 0.00001 ? modalParams.gasFeeNative : modalParams.gasFeeNative} {modalParams.fromNativeTokenSymbol}</CText>
                        </DynamicView>
                        <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={16} fS={12} color={Colors.subTextColor} tA={'right'} pR={20}>${parseFloat(modalParams.gasFeeDollar).toFixed(2)}</CText>
                    </DynamicView>

                    <DynamicView dynamic dynamicWidth dynamicHeightFix mT={10} height={1} mH={20} width={90} bGC={Colors.portfolioBorderColor} />

                    <DynamicView dynamic dynamicWidth width={100} fD={'row'} mB={10} jC={'space-around'}>
                        <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={14} fS={14} color={Colors.primaryTextColor} >Total</CText>
                        <CText dynamic mH={10} fF={C.fontsName.FONT_BLACK} mT={16} fS={12} color={Colors.primaryTextColor} style={{ left: 10 }} tA={'right'}>{parseFloat(modalParams.totalTokenSent).toFixed(3)} {modalParams.sentTokenSymbol}</CText>
                        <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={16} fS={12} color={Colors.subTextColor} tA={'right'} pR={20} >${parseFloat(parseFloat(modalParams.gasFeeDollar) + parseFloat(modalParams.totalValueSentUSD)).toFixed(2)}</CText>
                    </DynamicView>

                    <DynamicView dynamic fD={'row'} mB={10} >
                        <ButtonWithOutImage sentry-label='bridge-bottom-cancel-button'
                            mT={30} wT={45} mH={12} bG={Colors.whiteColor} vC={Colors.appColor} mB={30}
                            text={t('CANCEL')} isBorder={true} onPress={() => {
                              onCancelPress();
                            }}
                        />
                        <ButtonWithOutImage sentry-label='bridge-bottom-pay-button'
                            mT={30} wT={45} bG={Colors.appColor} vC={Colors.appColor} mB={30}
                            text={t('TRANSFER')} isBorder={false} onPress={() => {
                              onPayPress();
                            }}
                        />
                    </DynamicView>
                    <DynamicView dynamic bGC={Colors.switchColor} mT={Platform.OS == 'android' ? 100 : 10} bR={0}>
                    </DynamicView>
                    </DynamicView>

                </DynamicView>
            </DynamicView>
        </Modal>
  );
}
