import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import * as C from '../constants/index';
import { Colors } from '../constants/theme';
import { ButtonWithOutImage } from '../containers/Auth/Share';
import { DynamicTouchView } from '../styles/viewStyle';
import { CyDFastImage, CyDView } from '../styles/tailwindStyles';
import FastImage from 'react-native-fast-image';
import LottieView from 'lottie-react-native';
const {
  CText,
  SafeAreaView,
  DynamicView,
  DynamicImage,
  ModalView
} = require('../styles');

const randomColor = [
  AppImages.RED_COIN,
  AppImages.CYAN_COIN,
  AppImages.GREEN_COIN,
  AppImages.PINK_COIN,
  AppImages.BLUE_COIN,
  AppImages.PURPLE_COIN
];

export default function BottomCardConfirm (props) {
  const { isModalVisible, onPayPress, onCancelPress, lowBalance, modalParams } = props;
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [tokenExpiryTime, setTokenExpiryTime] = useState(modalParams?.tokenQuoteExpiry ? modalParams?.tokenQuoteExpiry : 0);
  const [expiryTimer, setExpiryTimer] = useState();
  const [isPayDisabled, setIsPayDisabled] = useState(false);
  const currentTimeStamp = new Date();

  useEffect(() => {
    if (isModalVisible && modalParams?.tokenQuoteExpiry) {
      let tempTokenExpiryTime = modalParams.tokenQuoteExpiry;
      setIsPayDisabled(false);
      setTokenExpiryTime(tempTokenExpiryTime);
      setExpiryTimer(setInterval(() => { tempTokenExpiryTime--; setTokenExpiryTime(tempTokenExpiryTime); }, 1000));
    }
  }, [isModalVisible]);

  useEffect(() => {
    if (tokenExpiryTime === 0 && modalParams?.tokenQuoteExpiry) {
      clearInterval(expiryTimer);
      setIsPayDisabled(true);
    }
  }, [tokenExpiryTime]);

  const hideModal = () => {
    if (modalParams.tokenQuoteExpiry && tokenExpiryTime !== 0) {
      clearInterval(expiryTimer);
    }
    onCancelPress();
  };

  const onLoadPress = () => {
    if (expiryTimer) {
      clearInterval(expiryTimer);
    }
    onPayPress();
  };

  return (
        <Modal isVisible={isModalVisible}
            onBackdropPress={() => { hideModal(); }}
            onRequestClose={() => { hideModal(); }}
            style={styles.modalContainer}
        >
            <DynamicView dynamic dynamicWidth dynamicHeight width={100} height={100} jC={'flex-end'}>
                <DynamicView dynamic dynamicWidth dynamicHeight width={100} height={70} bGC={'white'} style={{
                  borderTopLeftRadius: 25,
                  borderTopRightRadius: 25
                }} aLIT='flex-start'>
                    <DynamicTouchView sentry-label='card-bottom-confirm-cancel-icon' dynamic dynamicWidth width={95} mT={5} aLIT={'flex-end'} onPress={() => { hideModal(); }}>
                        <DynamicImage dynamic dynamicWidthFix aLIT={'flex-end'} mT={10} marginHorizontal={6} height={20} width={20} resizemode='contain'
                        source={AppImages.CLOSE} />
                    </DynamicTouchView>
                    <DynamicView dynamic dynamicWidth width={95} fD={'row'} jC={'center'}>
                        <CText dynamic fF={C.fontsName.FONT_BLACK} fS={20} mL={20} color={Colors.primaryTextColor}>{t('CONFIRM_PAYMENT')}</CText>
                    </DynamicView>

                    <DynamicView dynamic dynamicWidth width={90} mT={15} mB={20} pV={0} bGC={Colors.backLight} bR={18} jC={'center'} style={{ marginLeft: '5%', marginRight: '5%' }}>
                            <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={14} fS={10} color={Colors.primaryTextColor}>TOKEN QUANTITY</CText>
                            {/* <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_EXTRA_BOLD} fS={18} color={Colors.primaryTextColor}>${modalParams.gasFeeDollar}</CText> */}
                            <CText dynamic mL={10} mH={10} tA={'left'} fF={C.fontsName.FONT_EXTRA_BOLD} mB={15} fS={18} color={Colors.primaryTextColor}>{modalParams.tokenAmount} {modalParams.tokenSymbol}</CText>
                            {/* <CText dynamic mL={10} mH={10} tA={'left'} fF={C.fontsName.FONT_EXTRA_BOLD} fS={18} color={Colors.primaryTextColor}>{modalParams.gasFeeETH} {modalParams.networkCurrency}</CText> */}
                    </DynamicView>

                    <DynamicView dynamic dynamicWidth width={100} jC={'flex-start'} pH={30} fD={'row'}>
                    <DynamicView dynamic pos={'relative'}>
                      {modalParams.tokenImage
                        ? (
                          <CyDFastImage
                            className={'h-[30px] w-[30px]'}
                            source={{ uri: modalParams.tokenImage }}
                          />
                          )
                        : (
                          <DynamicView
                            dynamic
                            dynamicWidthFix
                            dynamicHeightFix
                            height={30}
                            width={30}
                            aLIT="center"
                            fD={'row'}
                            jC="center"
                            bGC={Colors.appColor}
                            bR={30}
                          >
                            <DynamicImage
                              dynamic
                              dynamicWidth
                              height={30}
                              width={30}
                              resizemode="contain"
                              source={
                                randomColor[Math.floor(Math.random() * randomColor.length)]
                              }
                            />
                          </DynamicView>
                          )}
                      <DynamicView
                        dynamic
                        style={{ position: 'absolute', top: 15, right: -5 }}
                      >
                        <CyDFastImage
                          className={'h-[16px] w-[16px] rounded-[50px] border-[1px] border-white bg-white'}
                          source={modalParams.appImage}
                          resizeMode={FastImage.resizeMode.contain}
                        />
                      </DynamicView>
                    </DynamicView>
                    <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={7} fS={14} color={Colors.primaryTextColor}>{modalParams.networkName}</CText>
                    <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={7} fS={12} color={Colors.subTextColor}>{modalParams.networkCurrency}</CText>
                    </DynamicView>

                    <DynamicView dynamic dynamicWidth dynamicHeightFix mT={20} height={1} mL={20} width={90} bGC={Colors.portfolioBorderColor} />

                    <DynamicView dynamic dynamicWidth width={100} fD={'row'} pH={30} pV={20}>
                    <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={14} fS={14} color={Colors.primaryTextColor}>Gas Fee</CText>
                    <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={16} fS={12} color={Colors.subTextColor}>{modalParams.gasFeeETH} {modalParams.networkCurrency}</CText>
                    {/* <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={16} fS={12} color={Colors.subTextColor}>{modalParams.tokenAmount} {modalParams.tokenSymbol}</CText> */}
                    <CText dynamic mH={10} fF={C.fontsName.FONT_BOLD} mT={16} fS={12} color={Colors.primaryTextColor}>${modalParams.gasFeeDollar}</CText>
                    </DynamicView>

                    <DynamicView dynamic dynamicWidth dynamicHeightFix mT={20} height={1} mL={20} width={90} bGC={Colors.portfolioBorderColor} />

                    <DynamicView dynamic dynamicWidth width={100} fD={'row'} pH={30}>
                    <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BLACK} mT={14} fS={14} color={Colors.primaryTextColor}>Total</CText>
                    <CText dynamic mH={10} fF={C.fontsName.FONT_REGULAR} mT={16} fS={12} color={Colors.subTextColor}>{modalParams.totalValueTransfer} {modalParams.tokenSymbol}</CText>
                    <CText dynamic mH={10} fF={C.fontsName.FONT_BOLD} mT={16} fS={12} color={Colors.primaryTextColor}>${modalParams.totalValueDollar}</CText>
                    </DynamicView>

                    {lowBalance && <DynamicView dynamic dynamicHeightFix fD={'row'} dynamicWidth width={80} jC={'center'} mT={15} mH={30} height={80} bGC={Colors.lightPink} bR={60}>
                        <DynamicView dynamic dynamicWidth width={50} aLIT={'flex-start'}>
                            <CText dynamic mL={30} tA={'right'} fF={C.fontsName.FONT_REGULAR} mT={10} fS={12} color={Colors.primaryTextColor}>You need 0.00543 more MATIC to complete this transaction </CText>
                        </DynamicView>
                        <DynamicView dynamic dynamicWidth width={40}>
                        <ButtonWithOutImage sentry-label='card-bottom-confirm-cancel-icon'
                             wT={70} bR={30} fE={C.fontsName.FONT_REGULAR} hE={35} bG={Colors.lightPink} vC={Colors.appColor} fC={Colors.pink}
                             text={t('BUY_MORE')} bC={Colors.pink} isBorder={true}
                             onPress={() => { onPress(); }}
                        />
                        </DynamicView>
                    </DynamicView>}
                    <DynamicView dynamic fD={'row'} >
                        <ButtonWithOutImage sentry-label='card-bottom-confirm-cancel-button'
                            mT={20} wT={45} mH={12} bG={Colors.whiteColor} vC={Colors.appColor} mB={30}
                            text={t('CANCEL')} isBorder={true} onPress={() => {
                              hideModal();
                            }}
                        />
                        <ButtonWithOutImage disable={isPayDisabled} sentry-label='card-bottom-confirm-pay-button'
                            mT={20} wT={45} bG={Colors.appColor} vC={Colors.appColor} mB={30}
                            text={t('LOAD_ALL_CAPS') + (tokenExpiryTime ? ' (' + tokenExpiryTime + ')' : '')} isBorder={false} onPress={ async () => {
                              if (!isPayDisabled) {
                                onLoadPress();
                              }
                            }}
                            indicator={loading}
                        />
                    </DynamicView>
                    <DynamicView dynamic bGC={Colors.switchColor} mT={10} bR={10}>
                    </DynamicView>
                </DynamicView>
            </DynamicView>
        </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center'
  }
});
