/* eslint-disable @typescript-eslint/no-misused-promises */
/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import { HdWalletContext } from '../../core/util';
import Web3 from 'web3';
import AppImages from '../../../assets/images/appImages';
import { DynamicTouchView } from '../../styles/viewStyle';
import { ButtonWithOutImage } from '../../containers/Auth/Share';
import CookieManager from '@react-native-cookies/cookies';
import analytics from '@react-native-firebase/analytics';
import axios, { MODAL_HIDE_TIMEOUT } from '../../core/Http';
import { FlatList } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { CyDText, CyDView, CyDTouchView } from '../../styles/tailwindStyles';
import { useIsFocused } from '@react-navigation/native';
import Loading from '../../components/v2/loading';
import { screenTitle } from '../../constants/index';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { GlobalContext } from '../../core/globalContext';
import { CardProfile } from '../../models/cardProfile.model';
import { hostWorker } from '../../global';
import CardWailtList from './cardWaitList';
import Intercom from '@intercom/intercom-react-native';
import RNExitApp from 'react-native-exit-app';
import Dialog, { DialogButton, DialogContent, DialogFooter } from 'react-native-popup-dialog';
import { sendFirebaseEvent } from '../utilities/analyticsUtility';

const {
  DynamicView,
  DynamicImage,
  CText
} = require('../../styles');

export default function AptoCardScreen ({ navigation, route }) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { params } = route;
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const hdWallet = useContext<any>(HdWalletContext);
  const [balance, setBalance] = useState<string>('');
  const [transactions, setTransactions] = useState<any>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const { showModal, hideModal } = useGlobalModalContext();
  const [tamperedSignMessageModal, setTamperedSignMessageModal] = useState<boolean>(false);

  const ethereum = hdWallet.state.wallet.ethereum;

  const isValidMessage = (messageToBeValidated: string): boolean => {
    const messageToBeValidatedWith = /^Hi there from CypherD! Sign this message to prove you have access to this account and we'll log you in. This won't cost you any Ether. Unique ID no one can guess: [0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return messageToBeValidatedWith.test(messageToBeValidated);
  };

  const personalSign = (messageToSign: string) => {
    if (isValidMessage(messageToSign)) {
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
            if (params?.toScreen === screenTitle.FUND_CARD_SCREEN) navigation.navigate(C.screenTitle.FUND_CARD_SCREEN);
          } else {
            setIsLoading(false);
            hdWallet.dispatch({ type: 'PRE_CARD_TOKEN', value: { pre_card_token: res.data.uuid } });
          }
        }
      }).catch(error => {
        setIsLoading(false);
        Sentry.captureException(error);
        showModal('state', { type: 'error', title: t('TEMP_SYSTEM_ERROR'), description: t('UNABLE_TO_LOAD_CARD'), onSuccess: onModalHide, onFailure: onModalHide });
      });
    } else {
      console.log('validation failed');
      setIsLoading(false);
      setTamperedSignMessageModal(true);
    }
  };

  function onModalHide () {
    hideModal();
    setTimeout(() => {
      navigation.navigate(C.screenTitle.PORTFOLIO_SCREEN);
    }, MODAL_HIDE_TIMEOUT);
  }

  function verify_message () {
    if (hdWallet.state.card !== undefined) {
      setIsLoading(false);
      return;
    }
    const sign_message = `${PORTFOLIO_HOST}/v1/card/mobile/sign_message?address=${ethereum.address}`;
    axios.get(sign_message).then(res => {
      const input_message = res.data.message;
      personalSign(input_message);
    }).catch(error => {
      setIsLoading(false);
      Sentry.captureException(error);
      showModal('state', { type: 'error', title: t('TEMP_SYSTEM_ERROR'), description: t('UNABLE_TO_LOAD_CARD'), onSuccess: onModalHide, onFailure: onModalHide });
    });
  }

  // NOTE: DEFINE HOOKS 🍎🍎🍎🍎🍎🍎

  useEffect(() => {
    if (isFocused) {
      setIsLoading(true);
      verify_message();
    }
  }, [isFocused]);

  useEffect(() => {
    if (hdWallet.state.card !== undefined) {
      navigation.setOptions({
        title: 'Cypher Card',
        headerShown: true,
        headerLeft: () => <></>,
        headerRight: () => {
          return (cardProfile?.bc ?? cardProfile?.pc)
            ? (
                <CyDTouchView onPress={() => { navigation.navigate(screenTitle.DEBIT_CARD_SCREEN); }}>
                  <CyDText className={' underline text-blue-500  text-[12px] font-extrabold'}>
                    {t<string>('GO_TO_NEW_CARD') + ' ->'}
                  </CyDText>
                </CyDTouchView>
              )
            : null;
        }
      });
      const balance = `${PORTFOLIO_HOST}/v1/card/mobile/balance`;
      axios.post(balance, { address: ethereum.address, token: hdWallet.state.card.token }).then(res => {
        setBalance(res.data.balance);
      }).catch(error => {
        setIsLoading(false);
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(error);
      });

      const transactions = `${PORTFOLIO_HOST}/v1/card/mobile/transactions`;
      axios.post(transactions, { address: ethereum.address, token: hdWallet.state.card.token }).then(res => {
        setTransactions(res.data.transactions);
      }).catch(error => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(error);
        setIsLoading(false);
      });
      setIsLoading(false);
    }
  }, [hdWallet]);

  function getFormatedTime (timestamp: any) {
    return new Date(timestamp * 1000).toISOString().slice(0, 10);
  }

  const Item = ({ item }) => (
        <>
            <DynamicTouchView sentry-label='card-txn' dynamic dynamicWidth width={100} fD={'row'} pV={8}>
                {item.transaction_type !== 'reversal' || item.transaction_type !== 'refund'
                  ? <DynamicImage dynamic dynamicWidthFix dynamicHeightFix height={34} width={34} resizemode='contain'
                        source={item.transaction_type === 'declined' ? AppImages.ICON_CANCEL : item.transaction_type === 'credit' ? AppImages.ICON_DOWN : AppImages.ICON_UP}
                    />
                  : <></>}
                <DynamicView dynamic dynamicHeightFix height={54} fD={'row'} bR={20}>
                    <DynamicView dynamic dynamicWidthFix width={130} dynamicHeightFix height={54} aLIT='flex-start' fD={'column'} jC='center' pH={8}>
                        <CText numberOfLines={2} tA={'left'} dynamicWidth width={100} dynamic fF={C.fontsName.FONT_EXTRA_BOLD} fS={15} color={Colors.primaryTextColor}>
                            {(item.merchant && item.merchant.name) ? item.merchant.name : (item.store && item.store.name) ? item.store.name : item.description}
                        </CText>
                        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={14} tA={'left'} color={Colors.subTextColor}>{getFormatedTime(item.created_at)}</CText>
                    </DynamicView>
                </DynamicView>
                <DynamicView dynamic dynamicHeightFix height={54} fD={'row'} jC='center'>
                    <DynamicView dynamic dynamicWidthFix width={120} dynamicHeightFix height={54} aLIT='flex-end' fD={'column'} jC='center' pH={8}>
                        <CText dynamic fF={C.fontsName.FONT_EXTRA_BOLD} fS={14} color={Colors.primaryTextColor}>{item.billing_amount.amount} {item.billing_amount.currency}</CText>
                        {/* <CText dynamic fF={C.fontsName.FONT_BOLD} fS={14} color={Colors.subTextColor}>10</CText> */}
                    </DynamicView>
                </DynamicView>
            </DynamicTouchView>
            <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={100} bGC={Colors.portfolioBorderColor} />
        </>
  );

  const renderItem = ({ item, index }) => <Item item={item} />;

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
        <>
            {isLoading
              ? (
                    <Loading />
                )
              : (
                    <CyDView className={'h-full bg-[#fbfbfb]'}>
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
                              onPress={async () => {
                                await Intercom.displayMessenger();
                                sendFirebaseEvent(hdWallet, 'support');
                              }}
                            />
                          </DialogFooter>
                        }
                        width={0.8}>
                        <DialogContent>
                          <CyDText className={'font-bold text-[16px] text-primaryTextColor mt-[20px] text-center'}>
                            {t<string>('SOMETHING_WENT_WRONG')}
                          </CyDText>
                          <CyDText className={'font-bold text-[13px] text-primaryTextColor mt-[20px] text-center'}>
                            {t<string>('CONTACT_CYPHERD_SUPPORT')}
                          </CyDText>
                        </DialogContent>
                      </Dialog>
                        {hdWallet.state.card !== undefined
                          ? <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} mT={5} jC='flex-start' pH={15} bGC={Colors.whiteColor}>
                                <DynamicView dynamic dynamicWidth dynamicHeight height={33} width={100} jC='flex-start'>
                                    <DynamicView dynamic mT={20} aLIT='flex-start' style={{ backgroundColor: Colors.chainColor, borderRadius: 10 }}>
                                        <DynamicView style={{ padding: 20 }}>
                                            <CText dynamic fF={C.fontsName.FONT_EXTRA_BOLD} fS={20} color={Colors.primaryTextColor}>${balance}</CText>
                                            <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={15} color={Colors.primaryTextColor}>Your Debit Card Balance</CText>
                                        </DynamicView>
                                    </DynamicView>
                                    <ButtonWithOutImage sentry-label='fund-card-button' wT={70} bR={30} fE={C.fontsName.FONT_BOLD} hE={35} mT={15} bG={Colors.appColor} vC={Colors.appColor} text={t('FUND_CARD')} onPress={() => {
                                      analytics().logEvent('fund_card', { from: ethereum.address });
                                      navigation.navigate(C.screenTitle.FUND_CARD_SCREEN, { refresh: true });
                                    }
                                    }
                                    />
                                    <DynamicTouchView sentry-label='get-card-details' mT={7} dynamic dynamicWidth width={100} fD={'row'} jC='center' pV={8} onPress={() => {
                                      const date = new Date();
                                      date.setTime(date.getTime() + 60000);
                                      analytics().logEvent('see_card', { from: ethereum.address });
                                      CookieManager.set('https://app.cypherd.io', {
                                        name: 'native_card_id',
                                        value: hdWallet.state.card.id,
                                        path: '/',
                                        version: '1',
                                        expires: date.toISOString()
                                      }).then((done) => {

                                      });
                                      CookieManager.set('https://app.cypherd.io', {
                                        name: 'native_card_token',
                                        value: hdWallet.state.card.token,
                                        path: '/',
                                        version: '1',
                                        expires: date.toISOString()
                                      }).then((done) => {

                                      });
                                      navigation.navigate(C.screenTitle.OPEN_LEGAL_SCREEN, { url: 'https://app.cypherd.io/native_card' });
                                    }}>
                                        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={14} tA={'center'} color={Colors.selectedTextColor}>Get Card Details</CText>
                                    </DynamicTouchView>
                                </DynamicView>
                                <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={100} bGC={Colors.portfolioBorderColor} />
                                {transactions.length !== 0
                                  ? <FlatList
                                        nestedScrollEnabled
                                        data={transactions}
                                        renderItem={renderItem}
                                        style={{ width: '100%', backgroundColor: Colors.whiteColor }}
                                        keyExtractor={item => item.id}
                                        showsVerticalScrollIndicator={false}
                                    />
                                  : <CText mT={30} dynamic fF={C.fontsName.FONT_BOLD} fS={20} color={Colors.primaryTextColor}>
                                        {'No transactions yet :('}
                                    </CText>
                                }
                            </DynamicView>

                          : <CardWailtList navigation={navigation}/>
                        }
                    </CyDView>
                )
            }
        </>
  );
}
