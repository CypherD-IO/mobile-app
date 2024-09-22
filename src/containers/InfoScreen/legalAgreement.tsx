/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
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
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import axios from '../../core/Http';
import LottieView from 'lottie-react-native';
import EmptyView from '../../components/EmptyView';
import Web3 from 'web3';
import analytics from '@react-native-firebase/analytics';
import * as Sentry from '@sentry/react-native';
import { hostWorker } from '../../global';
import Intercom from '@intercom/intercom-react-native';
import RNExitApp from 'react-native-exit-app';
import Dialog, {
  DialogFooter,
  DialogButton,
  DialogContent,
} from 'react-native-popup-dialog';
import { CyDText } from '../../styles/tailwindStyles';
import { sendFirebaseEvent } from '../utilities/analyticsUtility';
import { loadPrivateKeyFromKeyChain } from '../../core/Keychain';
const {
  SafeAreaView,
  DynamicView,
  DynamicImage,
  CText,
  DynamicTouchView,
} = require('../../styles');

export default function LegalAgreementScreen(props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const hdWallet = useContext<any>(HdWalletContext);
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [calledAgreements, setCalledAgreements] = useState<boolean>(false);
  const [successPart, setSuccessPart] = useState<boolean>(false);
  const [kyc, setKyc] = useState<boolean>(false);
  const [tamperedSignMessageModal, setTamperedSignMessageModal] =
    useState<boolean>(false);

  const ethereum = hdWallet.state.wallet.ethereum;

  const isValidMessage = (messageToBeValidated: string): boolean => {
    const messageToBeValidatedWith =
      /^Hi there from CypherD! Sign this message to prove you have access to this account and we'll log you in. This won't cost you any Ether. Unique ID no one can guess: [0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return messageToBeValidatedWith.test(messageToBeValidated);
  };

  const personalSign = async (messageToSign: string) => {
    if (isValidMessage(messageToSign)) {
      const web3 = new Web3();
      const verifyMessage = `${PORTFOLIO_HOST}/v1/card/mobile/verify_message?address=${ethereum.address}`;
      const privateKey = await loadPrivateKeyFromKeyChain(
        false,
        hdWallet.state.pinValue,
      );
      if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
        const signature = web3.eth.accounts.sign(messageToSign, privateKey);
        axios
          .post(verifyMessage, {
            address: ethereum.address,
            signed_message: signature.signature,
          })
          .then(res => {
            if (res.status === 200) {
              if (res.data.user_has_card) {
                hdWallet.dispatch({
                  type: 'CARD_REFRESH',
                  value: {
                    card: { id: res.data.card_id, token: res.data.token },
                  },
                });
              } else {
                hdWallet.dispatch({
                  type: 'PRE_CARD_TOKEN',
                  value: { pre_card_token: res.data.uuid },
                });
              }
            }
          })
          .catch(error => {
            // TODO (user feedback): Give feedback to user.
            Sentry.captureException(error);
          });
      }
    } else {
      setTamperedSignMessageModal(true);
    }
  };

  const verifyMessage = () => {
    if (hdWallet.state.card !== undefined) {
      return;
    }
    const signMessage = `${PORTFOLIO_HOST}/v1/card/mobile/sign_message?address=${ethereum.address}`;
    axios
      .get(signMessage)
      .then(async res => {
        const inputMessage = res.data.message;
        await personalSign(inputMessage);
      })
      .catch(error => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(error);
      });
  };

  const acceptAgreements = () => {
    setErrorMessage('');
    setCalledAgreements(true);
    axios
      .post(
        `${PORTFOLIO_HOST}/v1/card/mobile/accept_all_agreements`,
        {
          address: ethereum.address,
        },
        { headers: { uuid: hdWallet.state.pre_card_token }, timeout: 60000 },
      )
      .then(async response => {
        if (response?.data && response.status === 200) {
          if (response.data.message === 'success') {
            await analytics().logEvent('card_issued', {
              from: ethereum.address,
            });
            setSuccessPart(true);
          } else {
            await analytics().logEvent('card_kyc_error', {
              from: ethereum.address,
            });
            setKyc(true);
          }
        }
      })
      .catch(async error => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(error);
        await analytics().logEvent('card_agreement_error', {
          from: ethereum.address,
        });
        setCalledAgreements(false);
        setErrorMessage('Please accept again');
      });
  };

  // NOTE: DEFINE HOOKS 🍎🍎🍎🍎🍎🍎
  const DATA = [
    {
      id: '1',
      title: 'Cardholder Agreement',
      url: 'https://public-media-prd-usw1-shift.s3-us-west-1.amazonaws.com/developer_portal/disclaimers/apto_cardholder_agreement.htm',
    },
    {
      id: '2',
      title: 'Evolve bank & Trust customer account terms',
      url: 'https://public-media-prd-usw1-shift.s3-us-west-1.amazonaws.com/developer_portal/disclaimers/evolve_customer_account_terms.html',
    },
    {
      id: '3',
      title: 'Apto Privacy policy',
      url: 'https://public-media-prd-usw1-shift.s3-us-west-1.amazonaws.com/developer_portal/disclaimers/apto_privacy_policy.html',
    },
    {
      id: '4',
      title: 'Evolve bank & Trust Privacy policy',
      url: 'https://public-media-prd-usw1-shift.s3-us-west-1.amazonaws.com/developer_portal/disclaimers/Evolve+Privacy+Policy.html',
    },
    {
      id: '5',
      title: 'E-signature and electromic disclosure agreement',
      url: 'https://public-media-prd-usw1-shift.s3-us-west-1.amazonaws.com/developer_portal/disclaimers/apto_esign_agreement.htm',
    },
  ];

  const renderItem = ({ item }) => {
    return (
      <DynamicTouchView
        sentry-label='fund-card-chain-item'
        dynamic
        jC='flex-start'
        aLIT={'flex-start'}
        onPress={() => {
          props.navigation.navigate(C.screenTitle.OPEN_LEGAL_SCREEN, {
            url: item.url,
          });
        }}>
        <DynamicView dynamic fD={'row'}>
          <CText
            dynamic
            dynamicWidth
            width={90}
            fF={C.fontsName.FONT_REGULAR}
            tA={'left'}
            fS={14}
            mT={12}
            color={Colors.primaryTextColor}>
            {item.title}
          </CText>
          <DynamicImage
            dynamic
            dynamicWidthFix
            mT={5}
            height={20}
            width={20}
            resizemode='contain'
            source={AppImages.UP_ARROW}
            style={{ transform: [{ rotate: '90deg' }] }}
          />
        </DynamicView>
        <DynamicView
          dynamic
          dynamicWidth
          width={95}
          mT={12}
          height={1}
          bGC={Colors.sepratorColor}></DynamicView>
      </DynamicTouchView>
    );
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎

  // NOTE: HELPER METHOD 🍎🍎🍎🍎

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <SafeAreaView dynamic>
      <Dialog
        visible={tamperedSignMessageModal}
        footer={
          <DialogFooter>
            <DialogButton
              text={t('CLOSE')}
              onPress={() => {
                RNExitApp.exitApp();
              }}
            />
            <DialogButton
              text={t('CONTACT_TEXT')}
              onPress={() => {
                void Intercom.present();
                sendFirebaseEvent(hdWallet, 'support');
              }}
            />
          </DialogFooter>
        }
        width={0.8}>
        <DialogContent>
          <CyDText className={'font-bold text-[16px]  mt-[20px] text-center'}>
            {t<string>('SOMETHING_WENT_WRONG')}
          </CyDText>
          <CyDText className={'font-bold text-[13px]  mt-[20px] text-center'}>
            {t<string>('CONTACT_CYPHERD_SUPPORT')}
          </CyDText>
        </DialogContent>
      </Dialog>
      <DynamicView
        dynamic
        dynamicWidth
        dynamicHeight
        height={100}
        width={100}
        jC='flex-start'
        aLIT={'flex-start'}>
        {!calledAgreements ? (
          <DynamicView
            dynamic
            dynamicWidth
            dynamicHeight
            height={80}
            width={100}
            pH={25}
            jC='flex-start'
            aLIT={'flex-start'}>
            <CText
              dynamic
              fF={C.fontsName.FONT_BOLD}
              fS={28}
              mT={10}
              color={Colors.primaryTextColor}>
              {t('LEGAL_AGREE')}
            </CText>
            <CText
              jC='left'
              aLIT={'left'}
              dynamic
              fF={C.fontsName.FONT_REGULAR}
              fS={15}
              mT={10}
              color={Colors.primaryTextColor}>
              {t(
                'Please carefully review all the documents listed before you proceed.',
              )}
            </CText>
            <FlatList
              showsVerticalScrollIndicator={false}
              data={DATA}
              renderItem={renderItem}
              style={{ marginTop: 20, marginBottom: 30 }}
            />
            <DynamicView
              dynamic
              dynamicWidth
              dynamicHeight
              height={15}
              width={100}
              jC='center'
              aLIT={'center'}>
              <ButtonWithOutImage
                sentry-label='card-accept-agreements'
                wT={100}
                bR={10}
                fE={C.fontsName.FONT_BOLD}
                hE={45}
                mT={15}
                bG={Colors.appColor}
                vC={Colors.appColor}
                text={t('ACCEPT_ALL_AGREEMENTS')}
                onPress={() => {
                  acceptAgreements();
                }}
              />
            </DynamicView>
          </DynamicView>
        ) : successPart ? (
          <DynamicView
            dynamic
            dynamicWidth
            dynamicHeight
            height={80}
            width={100}
            pH={25}
            jC='flex-start'
            aLIT={'flex-start'}>
            <CText
              dynamic
              fF={C.fontsName.FONT_BOLD}
              fS={28}
              mT={10}
              color={Colors.primaryTextColor}>
              {t('Card approved!')}
            </CText>
            <LottieView
              autoPlay
              loop
              source={require('./animation.json')}
              style={{ height: 200 }}></LottieView>
            <ButtonWithOutImage
              sentry-label='card-confirm-legal'
              wT={100}
              bR={10}
              fE={C.fontsName.FONT_BOLD}
              hE={45}
              mT={25}
              bG={Colors.appColor}
              vC={Colors.appColor}
              text={t('NEXT')}
              onPress={() => {
                verifyMessage();
                analytics().logEvent('card_approved_navigate', {
                  from: ethereum.address,
                });
                props.navigation.navigate(C.screenTitle.DEBIT_CARD_SCREEN);
              }}
            />
          </DynamicView>
        ) : kyc ? (
          <DynamicView
            jC='flex-start'
            aLIT={'flex-start'}
            dynamic
            dynamicWidth
            dynamicHeight
            height={80}
            width={100}
            pH={25}>
            <CText
              dynamic
              fF={C.fontsName.FONT_BOLD}
              fS={28}
              mT={10}
              color={Colors.primaryTextColor}>
              {t('KYC Error')}
            </CText>
            <CText
              jC='left'
              aLIT={'left'}
              dynamic
              fF={C.fontsName.FONT_REGULAR}
              fS={15}
              mT={10}
              color={Colors.primaryTextColor}>
              {t(
                'We need more details to approve you. Our banking partner will reach out ASAP!',
              )}
            </CText>
          </DynamicView>
        ) : (
          <>
            <DynamicView
              aLIT='center'
              fD={'row'}
              jC='center'
              dynamic
              dynamicWidth
              dynamicHeight
              height={80}
              width={100}
              pH={25}>
              <EmptyView
                text={'Applying card..'}
                image={AppImages.LOADING_IMAGE}
                buyVisible={false}
                marginTop={-50}
                isLottie={true}
              />
            </DynamicView>
          </>
        )}
        <DynamicView dynamic style={{ position: 'absolute', bottom: 0 }}>
          <BottomTracker index={4} />
        </DynamicView>
      </DynamicView>
    </SafeAreaView>
  );
}
