/**
 * @format
 * @flow
 */
import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import BottomTracker from '../../components/BottomTracker';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import { ButtonWithOutImage } from '../../containers/Auth/Share';
import { HdWalletContext } from '../../core/util';
import axios from '../../core/Http';
import LottieView from 'lottie-react-native';
import EmptyView from '../../components/EmptyView';
import Web3 from 'web3';
import analytics from '@react-native-firebase/analytics';
import * as Sentry from '@sentry/react-native';
import { hostWorker } from '../../global';
const {
  SafeAreaView,
  DynamicView,
  DynamicImage,
  CText,
  DynamicTouchView
} = require('../../styles');

export default function LegalAgreementScreen (props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const hdWallet = useContext<any>(HdWalletContext);
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [calledAgreements, setCalledAgreements] = useState<boolean>(false);
  const [successPart, setSuccessPart] = useState<boolean>(false);
  const [kyc, setKyc] = useState<boolean>(false);

  const ethereum = hdWallet.state.wallet.ethereum;

  function personal_sign (messageToSign) {
    const web3 = new Web3();
    const verifyMessage = `${PORTFOLIO_HOST}/v1/card/mobile/verify_message?address=${ethereum.address}`;
    const signature = web3.eth.accounts.sign(messageToSign, ethereum.privateKey);
    axios.post(verifyMessage, {
      address: ethereum.address,
      signed_message: signature.signature
    }).then(res => {
      if (res.status === 200) {
        if (res.data.user_has_card) {
          hdWallet.dispatch({ type: 'CARD_REFRESH', value: { card: { id: res.data.card_id, token: res.data.token } } });
        } else {
          hdWallet.dispatch({ type: 'PRE_CARD_TOKEN', value: { pre_card_token: res.data.uuid } });
        }
      }
    }).catch(error => {
      // TODO (user feedback): Give feedback to user.
      Sentry.captureException(error);
    });
  }

  function verify_message () {
    if (hdWallet.state.card !== undefined) {
      return;
    }
    const sign_message = `${PORTFOLIO_HOST}/v1/card/mobile/sign_message?address=${ethereum.address}`;
    axios.get(sign_message).then(res => {
      const input_message = res.data.message;
      personal_sign(input_message);
    }).catch(error => {
      // TODO (user feedback): Give feedback to user.
      Sentry.captureException(error);
    });
  }

  const acceptAgreements = () => {
    setErrorMessage('');
    setCalledAgreements(true);
    axios.post(
            `${PORTFOLIO_HOST}/v1/card/mobile/accept_all_agreements`,
            {
              address: ethereum.address
            },
            { headers: { uuid: hdWallet.state.pre_card_token }, timeout: 60000 }
    ).then(function (response) {
      if (response && response.data && response.status === 200) {
        if (response.data.message === 'success') {
          analytics().logEvent('card_issued', { from: ethereum.address });
          setSuccessPart(true);
        } else {
          analytics().logEvent('card_kyc_error', { from: ethereum.address });
          setKyc(true);
        }
      }
    }).catch(function (error) {
      // TODO (user feedback): Give feedback to user.
      Sentry.captureException(error);
      analytics().logEvent('card_agreement_error', { from: ethereum.address });
      setCalledAgreements(false);
      setErrorMessage('Please accept again');
    });
  };

  // NOTE: DEFINE HOOKS 🍎🍎🍎🍎🍎🍎
  const DATA = [
    {
      id: '1',
      title: 'Cardholder Agreement',
      url: 'https://public-media-prd-usw1-shift.s3-us-west-1.amazonaws.com/developer_portal/disclaimers/apto_cardholder_agreement.htm'
    },
    {
      id: '2',
      title: 'Evolve bank & Trust customer account terms',
      url: 'https://public-media-prd-usw1-shift.s3-us-west-1.amazonaws.com/developer_portal/disclaimers/evolve_customer_account_terms.html'
    },
    {
      id: '3',
      title: 'Apto Privacy policy',
      url: 'https://public-media-prd-usw1-shift.s3-us-west-1.amazonaws.com/developer_portal/disclaimers/apto_privacy_policy.html'
    },
    {
      id: '4',
      title: 'Evolve bank & Trust Privacy policy',
      url: 'https://public-media-prd-usw1-shift.s3-us-west-1.amazonaws.com/developer_portal/disclaimers/Evolve+Privacy+Policy.html'
    },
    {
      id: '5',
      title: 'E-signature and electromic disclosure agreement',
      url: 'https://public-media-prd-usw1-shift.s3-us-west-1.amazonaws.com/developer_portal/disclaimers/apto_esign_agreement.htm'
    }
  ];

  const renderItem = ({ item }) => {
    return (
            <DynamicTouchView sentry-label='fund-card-chain-item' dynamic jC='flex-start' aLIT={'flex-start'}
                onPress={() => {
                  props.navigation.navigate(C.screenTitle.OPEN_LEGAL_SCREEN, {
                    url: item.url
                  });
                }}>
                <DynamicView dynamic fD={'row'}>
                    <CText dynamic dynamicWidth width={90} fF={C.fontsName.FONT_REGULAR} tA={'left'} fS={14} mT={12} color={Colors.primaryTextColor}>{item.title}</CText>
                    <DynamicImage dynamic dynamicWidthFix mT={5} height={20} width={20} resizemode='contain'
                        source={AppImages.UP_ARROW} style={{ transform: [{ rotate: '90deg' }] }} />
                </DynamicView>
                <DynamicView dynamic dynamicWidth width={95} mT={12} height={1} bGC={Colors.sepratorColor}></DynamicView>
            </DynamicTouchView>
    );
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎

  // NOTE: HELPER METHOD 🍎🍎🍎🍎

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
        <SafeAreaView dynamic>
            <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} jC='flex-start' aLIT={'flex-start'}>
                {!calledAgreements
                  ? <DynamicView dynamic dynamicWidth dynamicHeight height={80} width={100} pH={25} jC='flex-start' aLIT={'flex-start'}>
                        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={28} mT={10} color={Colors.primaryTextColor}>{t('LEGAL_AGREE')}</CText>
                        <CText jC='left' aLIT={'left'} dynamic fF={C.fontsName.FONT_REGULAR} fS={15} mT={10} color={Colors.primaryTextColor}>{t('Please carefully review all the documents listed before you proceed.')}</CText>
                        <FlatList
                            showsVerticalScrollIndicator={false}
                            data={DATA}
                            renderItem={renderItem}
                            style={{ marginTop: 20, marginBottom: 30 }}
                        />
                        <DynamicView dynamic dynamicWidth dynamicHeight height={15} width={100} jC='center' aLIT={'center'} >
                            <ButtonWithOutImage sentry-label='card-accept-agreements' wT={100} bR={10} fE={C.fontsName.FONT_BOLD} hE={45} mT={15} bG={Colors.appColor}
                                vC={Colors.appColor} text={t('ACCEPT_ALL_AGREEMENTS')}
                                onPress={() => {
                                  acceptAgreements();
                                }} />
                        </DynamicView>
                    </DynamicView>
                  : successPart
                    ? <DynamicView dynamic dynamicWidth dynamicHeight height={80} width={100} pH={25} jC='flex-start' aLIT={'flex-start'}>
                        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={28} mT={10} color={Colors.primaryTextColor}>{t('Card approved!')}</CText>
                        <LottieView
                            autoPlay
                            loop
                            source={require('./animation.json')}
                            style={{ height: 200 }}
                        >
                        </LottieView>
                        <ButtonWithOutImage sentry-label='card-confirm-legal' wT={100} bR={10} fE={C.fontsName.FONT_BOLD} hE={45} mT={25} bG={Colors.appColor}
                                vC={Colors.appColor} text={t('NEXT')}
                                onPress={() => {
                                  verify_message();
                                  analytics().logEvent('card_approved_navigate', { from: ethereum.address });
                                  props.navigation.navigate(C.screenTitle.DEBIT_CARD_SCREEN);
                                }
                                } />
                    </DynamicView>
                    : kyc
                      ? <DynamicView jC='flex-start' aLIT={'flex-start'} dynamic dynamicWidth dynamicHeight height={80} width={100} pH={25}>
                        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={28} mT={10} color={Colors.primaryTextColor}>{t('KYC Error')}</CText>
                        <CText jC='left' aLIT={'left'} dynamic fF={C.fontsName.FONT_REGULAR} fS={15} mT={10} color={Colors.primaryTextColor}>{t('We need more details to approve you. Our banking partner will reach out ASAP!')}</CText>
                    </DynamicView>
                      : <>
                        <DynamicView aLIT='center' fD={'row'} jC='center' dynamic dynamicWidth dynamicHeight height={80} width={100} pH={25}>
                            <EmptyView
                                text={'Applying card..'}
                                image={AppImages.LOADING_IMAGE}
                                buyVisible={false}
                                marginTop={-50}
                                isLottie={true}
                            />
                        </DynamicView>
                    </>

                }
                <DynamicView dynamic style={{ position: 'absolute', bottom: 0 }}>
                    <BottomTracker index={4} />
                </DynamicView>
            </DynamicView>
        </SafeAreaView>
  );
}
