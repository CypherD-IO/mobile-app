/**
 * @format
 * @flow
 */
import React, { useContext, useState } from 'react';
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

export default function otpScreen (props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const [OTP, setOTP] = useState<String>('');
  const [showError, setShowError] = useState<Boolean>(false);
  const hdWallet = useContext<any>(HdWalletContext);

  const ethereum = hdWallet.state.wallet.ethereum;

  // NOTE: DEFINE HOOKS 🍎🍎🍎🍎🍎🍎

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎

  // NOTE: HELPER METHOD 🍎🍎🍎🍎

  const submitCode = () => {
    setShowError(false);
    axios.post(
            `${PORTFOLIO_HOST}/v1/card/mobile/submit_code`,
            {
              address: ethereum.address,
              code: OTP
            },
            { headers: { uuid: hdWallet.state.pre_card_token }, timeout: 30000 }
    ).then(function (response) {
      if (response.status === 200) {
        analytics().logEvent('otp_success', { from: ethereum.address });
        props.navigation.navigate(C.screenTitle.PERSONAL_SCREEN);
      }
    }).catch(function (error) {
      // handle error
      Sentry.captureException(error);
      analytics().logEvent('otp_failure', { from: ethereum.address });
      setShowError(true);
    });
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
        <SafeAreaView dynamic>
            <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} jC='flex-start' aLIT={'flex-start'}>
                <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} pH={30} jC='flex-start' aLIT={'flex-start'}>
                    <CText dynamic fF={C.fontsName.FONT_BOLD} fS={28} mT={10} color={Colors.primaryTextColor}>{t('VERIFY_ACC')}</CText>
                    <CText dynamic fF={C.fontsName.FONT_REGULAR} tA={'left'} fS={15} mT={10} color={Colors.primaryTextColor}>{t('VERIFY_TEXT')}</CText>
                    <DynamicView dynamic fD={'row'} bO={0.5} bR={5} bC={Colors.sepratorColor} mT={30} dynamicHeightFix dynamicWidth height={50} width={100} aLIT={'flex-start'} >
                        <WebsiteInput
                            onChangeText={(text) => {
                              setOTP(text);
                              setShowError(false);
                            }}
                            value={OTP}
                            placeholder="Enter OTP"
                            style={{ width: '75%', height: 50, color: 'black' }}
                            selectTextOnFocus={true}
                            keyboardType="number-pad"
                            maxLength={6}
                        ></WebsiteInput>
                    </DynamicView>
                    {showError && <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} mT={10} color={Colors.red}>{t('OTP_ERROR')}</CText>}
                    <DynamicView dynamic dynamicWidth dynamicHeight height={15} width={100} jC='center' aLIT={'center'} >
                        <ButtonWithOutImage sentry-label='card-submit-code' wT={100} bR={10} fE={C.fontsName.FONT_BOLD} hE={45} mT={15} bG={Colors.appColor}
                            vC={Colors.appColor} text={t('NEXT')}
                            onPress={() => {
                              if (OTP.length === 6) {
                                submitCode();
                              } else {
                                setShowError(true);
                              }
                            }
                            } />
                    </DynamicView>
                </DynamicView>
                <DynamicView dynamic style={{ position: 'absolute', bottom: 0 }}>
                    <BottomTracker index={2} />
                </DynamicView>
            </DynamicView>
        </SafeAreaView>
  );
}
