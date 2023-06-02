/**
 * @format
 * @flow
 */
import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import BottomTracker from '../../components/BottomTracker';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import { ButtonWithOutImage } from '../Auth/Share';
import { HdWalletContext } from '../../core/util';
import axios from '../../core/Http';
import analytics from '@react-native-firebase/analytics';
import * as Sentry from '@sentry/react-native';
import { hostWorker } from '../../global';
const {
  SafeAreaView,
  DynamicView,
  DynamicImage,
  CText,
  WebsiteInput
} = require('../../styles');

export default function InfoScreen (props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const [phoneNumber, setPhoneNumber] = useState<String>('');
  const [showCommonError, setShowCommonError] = useState<boolean>(false);
  const [showDuplicateError, setShowDuplicateError] = useState<Boolean>(false);
  const hdWallet = useContext<any>(HdWalletContext);
  const ethereum = hdWallet.state.wallet.ethereum;

  const startVerification = () => {
    setShowCommonError(false);
    setShowDuplicateError(false);
    axios.post(
            `${PORTFOLIO_HOST}/v1/card/mobile/start_verification`,
            {
              address: ethereum.address,
              phone: phoneNumber
            },
            { headers: { uuid: hdWallet.state.pre_card_token }, timeout: 30000 }
    ).then(function (response) {
      if (response.status === 200) {
        if (response.data.message === 'success') {
          analytics().logEvent('phone_success', { from: ethereum.address });
          props.navigation.navigate(C.screenTitle.OTP_SCREEN);
        } else if (response.data.message === 'phone_present') {
          analytics().logEvent('phone_already_present', { from: ethereum.address });
          setShowDuplicateError(true);
        }
      }
    }).catch(function (error) {
      // handle error
      Sentry.captureException(error);
      setShowCommonError(true);
    });
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
        <SafeAreaView dynamic>
            <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} jC='flex-start' aLIT={'flex-start'}>
                <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} pH={30} jC='flex-start' aLIT={'flex-start'}>
                    <CText dynamic fF={C.fontsName.FONT_BOLD} fS={28} mT={10} color={Colors.primaryTextColor}>{t('GET_STARTED')}</CText>
                    <CText dynamic fF={C.fontsName.FONT_REGULAR} tA={'left'} fS={15} mT={10} color={Colors.primaryTextColor}>{t('INFO_TEXT')}</CText>
                    <DynamicView dynamic fD={'row'} bO={0.5} bR={5} bC={Colors.sepratorColor} mT={30} dynamicHeightFix dynamicWidth height={50} width={100} aLIT={'flex-start'} >
                        <DynamicView dynamic fD={'row'} dynamicWidth dynamicHeight width={20} height={100} jC='center' aLIT={'center'}>
                            <DynamicImage dynamic dynamicWidthFix mT={5} height={40} width={40} resizemode='contain'
                                source={AppImages.US_FLAG} />
                            <DynamicView dynamic mL={5} width={1} height={40} bGC={Colors.sepratorColor}></DynamicView>
                        </DynamicView>
                        <WebsiteInput
                            onChangeText={(text) => {
                              setPhoneNumber(text);
                              setShowCommonError(false);
                              setShowDuplicateError(false);
                            }}
                            value={phoneNumber}
                            placeholder="Phone Number"
                            style={{ width: '75%', height: 50, color: 'black' }}
                            selectTextOnFocus={true}
                            keyboardType="number-pad"
                            maxLength={10}
                        ></WebsiteInput>
                    </DynamicView>
                    {showCommonError && <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} mT={10} color={Colors.red}>{t('PHONE_ERROR')}</CText>}
                    {showDuplicateError && <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} mT={10} color={Colors.red}>{t('PNONE_DUPLICATE_ERROR')}</CText>}
                    <DynamicView dynamic dynamicWidth dynamicHeight height={15} width={100} jC='center' aLIT={'center'} >
                        <ButtonWithOutImage sentry-label='card-start-verification' wT={100} bR={10} fE={C.fontsName.FONT_BOLD} hE={45} mT={15} bG={Colors.appColor}
                            vC={Colors.appColor} text={t('NEXT')}
                            onPress={() => {
                              if (phoneNumber.length === 10) {
                                startVerification();
                              } else {
                                setShowCommonError(true);
                              }
                            }
                            } />
                    </DynamicView>
                </DynamicView>
                <DynamicView dynamic style={{ position: 'absolute', bottom: 0 }}>
                    <BottomTracker index={1} />
                </DynamicView>
            </DynamicView>
        </SafeAreaView>
  );
}
