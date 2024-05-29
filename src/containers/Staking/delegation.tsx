import analytics from '@react-native-firebase/analytics';
import { useRoute } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { ethers } from 'ethers';
import { get, random } from 'lodash';
import LottieView from 'lottie-react-native';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Keyboard, StyleSheet, TextInput } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { SuccessTransaction } from '../../components/v2/StateModal';
import Button from '../../components/v2/button';
import CyDModalLayout from '../../components/v2/modal';
import * as C from '../../constants';
import { gasFeeReservation } from '../../constants/data';
import { AnalyticsType, TokenOverviewTabIndices } from '../../constants/enum';
import { Colors } from '../../constants/theme';
import { MODAL_HIDE_TIMEOUT, MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import {
  StakingContext,
  convertToEvmosFromAevmos,
  logAnalytics,
  parseErrorMessage,
  validateAmount,
} from '../../core/util';
import useTransactionManager from '../../hooks/useTransactionManager';
import {
  DELEGATE,
  RESET,
  RE_DELEGATE,
  UN_DELEGATE,
} from '../../reducers/stakingReducer';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';

const {
  CText,
  DynamicView,
  DynamicImage,
  DynamicTouchView,
  DynamicScrollView,
} = require('../../styles');

export default function StakingDelegation({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const { itemData, tokenData, reDelegator = '' } = route.params;
  const stakingValidators = useContext<any>(StakingContext);
  const [amount, setAmount] = useState<string>('');
  const [reDelegatorName, setReDelegatorName] = useState<string>(reDelegator);
  const [loading, setLoading] = useState<boolean>(false);
  const [signModalVisible, setSignModalVisible] = useState<boolean>(false);
  const [finalAmount, setFinalAmount] = useState<bigint>(BigInt(0));
  const [maxEnabled, setMaxEnabled] = useState<boolean>(false);
  const [finalGasFee, setFinalGasFee] = useState<number>(0);
  const [onSubmit, setOnSubmit] = useState(false);

  const { showModal, hideModal } = useGlobalModalContext();
  const { delegateEvmosToken, reDelegateEvmosToken, unDelegateEvmosToken } =
    useTransactionManager();

  const { t } = useTranslation();
  const gasReserved = get(
    gasFeeReservation,
    tokenData.chainDetails?.backendName,
    0.02,
  );

  const useroute = useRoute();

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  const convert = (n: number) => {
    if (n < 1e3) return n;
    if (n >= 1e3 && n < 1e6) return (n / 1e3).toFixed(1) + 'K';
    if (n >= 1e6 && n < 1e9) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e9 && n < 1e12) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  };

  const txnSimulation = async () => {
    setFinalGasFee(random(0.001, 0.01, true));
    setSignModalVisible(true);
  };

  const renderSuccessTransaction = (hash: string) => {
    return (
      <SuccessTransaction
        hash={hash}
        symbol={tokenData.chainDetails.symbol}
        name={tokenData.chainDetails.name}
        navigation={navigation}
        hideModal={hideModal}
      />
    );
  };

  function onTransModalHide() {
    hideModal();
    setTimeout(() => {
      navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
        tokenData,
        navigateTo: TokenOverviewTabIndices.STAKING,
      });
    }, MODAL_HIDE_TIMEOUT);
  }

  const isGasReserved = (cryptoValue: string, balance: number) => {
    return parseFloat(cryptoValue) <= balance - finalGasFee;
  };

  const haveEnoughNativeBalance = (balance: number) => {
    return balance >= finalGasFee;
  };

  const finalTxn = async () => {
    setLoading(true);
    const balance = parseFloat(
      convertToEvmosFromAevmos(
        stakingValidators.stateStaking.unStakedBalance,
      ).toFixed(6),
    );
    if (
      (DELEGATE === stakingValidators.stateStaking.typeOfDelegation &&
        !isGasReserved(amount, balance)) ||
      !haveEnoughNativeBalance(balance)
    ) {
      setSignModalVisible(false);
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: t('INSUFFICIENT_FUNDS'),
          description: `You don't have sufficient ${tokenData.chainDetails.symbol as string} to pay gas fee.`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, MODAL_HIDE_TIMEOUT_250);
    } else {
      try {
        let txnResponse: any;
        if (DELEGATE === stakingValidators.stateStaking.typeOfDelegation) {
          txnResponse = await delegateEvmosToken({
            validatorAddress: itemData.address,
            amountToDelegate: ethers.formatUnits(finalAmount, 18),
          });
        } else if (
          UN_DELEGATE === stakingValidators.stateStaking.typeOfDelegation
        ) {
          txnResponse = await unDelegateEvmosToken({
            validatorAddress: itemData.address,
            amountToUnDelegate: ethers.formatUnits(finalAmount, 18),
          });
        } else if (
          RE_DELEGATE === stakingValidators.stateStaking.typeOfDelegation
        ) {
          txnResponse = await reDelegateEvmosToken({
            validatorSrcAddress: itemData.address,
            validatorDstAddress:
              stakingValidators.stateStaking.reValidator.address,
            amountToReDelegate: ethers.formatUnits(finalAmount, 18),
          });
        }
        if (!txnResponse?.isError) {
          setLoading(false);
          setSignModalVisible(false);
          await analytics().logEvent(
            `evmos_${stakingValidators.stateStaking.typeOfDelegation as string}_completed`,
          );
          setTimeout(() => {
            stakingValidators.dispatchStaking({
              type: RESET,
            });
            // monitoring api
            void logAnalytics({
              type: AnalyticsType.SUCCESS,
              txnHash: txnResponse?.hash,
              chain: tokenData?.chainDetails?.chainName ?? '',
            });
            showModal('state', {
              type: 'success',
              title: t('TRANSACTION_SUCCESS'),
              description: renderSuccessTransaction(txnResponse?.hash),
              onSuccess: onTransModalHide,
              onFailure: hideModal,
            });
          }, MODAL_HIDE_TIMEOUT_250);
        } else {
          setLoading(false);
          setSignModalVisible(false);
          // monitoring api
          void logAnalytics({
            type: AnalyticsType.ERROR,
            chain: tokenData.chainDetails.chainName,
            message: `error while broadcasting the transaction in evmos staking/delegation.tsx : ${txnResponse.data.tx_response.raw_log}`,
            screen: useroute.name,
          });
          Sentry.captureException(txnResponse);
          await analytics().logEvent('evmos_staking_error', {
            from: `error while broadcasting the transaction in evmos staking/delegation.tsx : ${txnResponse.data.tx_response.raw_log}`,
          });
          setTimeout(() => {
            showModal('state', {
              type: 'error',
              title: t('TRANSACTION_FAILED'),
              description: txnResponse.data.tx_response.raw_log,
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }, MODAL_HIDE_TIMEOUT_250);
          // }
        }
      } catch (error: any) {
        setLoading(false);
        setSignModalVisible(false);
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: tokenData?.chainDetails?.chainName ?? '',
          message: parseErrorMessage(error),
          screen: useroute.name,
        });
        Sentry.captureException(error);
        await analytics().logEvent('evmos_staking_error', {
          from: 'error while broadcasting the transaction in evmos staking/delegation.tsx',
        });
        setTimeout(() => {
          showModal('state', {
            type: 'error',
            title: t('TRANSACTION_FAILED'),
            description: error.response.data,
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }, MODAL_HIDE_TIMEOUT_250);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    setReDelegatorName(
      stakingValidators.stateStaking.reValidator.description.name,
    );
  }, [stakingValidators.stateStaking.reValidator]);

  useEffect(() => {
    if (finalAmount > 0) {
      const balance = convertToEvmosFromAevmos(
        stakingValidators.stateStaking.unStakedBalance,
      );
      if (
        DELEGATE === stakingValidators.stateStaking.typeOfDelegation &&
        parseFloat(amount) > balance
      ) {
        setTimeout(() => {
          showModal('state', {
            type: 'error',
            title: t('INSUFFICIENT_FUNDS'),
            description: t('ENTER_AMOUNT_LESS_THAN_BALANCE'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }, MODAL_HIDE_TIMEOUT_250);
      } else {
        void txnSimulation();
      }
    }
  }, [finalAmount, onSubmit]);

  function onModalHide() {
    setLoading(false);
    setSignModalVisible(false);
  }

  return (
    <>
      <CyDModalLayout
        setModalVisible={onModalHide}
        isModalVisible={signModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView
          className={'bg-white p-[25px] pb-[30px] rounded-t-[20px] relative'}>
          <CyDTouchView onPress={() => onModalHide()} className={'z-[50]'}>
            <CyDImage
              source={AppImages.CLOSE}
              className={
                ' w-[22px] h-[22px] z-[50] top-[-10px] absolute right-[0px] '
              }
            />
          </CyDTouchView>
          <CyDText className={'mt-[10px] font-bold text-center text-[22px]'}>
            {stakingValidators.stateStaking.typeOfDelegation}{' '}
            {UN_DELEGATE === stakingValidators.stateStaking.typeOfDelegation
              ? 'from '
              : 'to '}{' '}
            {RE_DELEGATE === stakingValidators.stateStaking.typeOfDelegation
              ? reDelegatorName
              : itemData.description.name}
          </CyDText>

          <CyDView className={'flex flex-row mt-[40px]'}>
            <CyDImage
              source={AppImages[tokenData.chainDetails.backendName + '_LOGO']}
              className={'h-[20px] w-[20px]'}
            />
            <CyDView className={' flex flex-row'}>
              <CyDText
                className={
                  ' font-bold text-[16px] ml-[5px] text-primaryTextColor'
                }>
                {convertToEvmosFromAevmos(finalAmount).toFixed(6) + ' EVMOS '}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-row mt-[20px]'}>
            <CyDImage
              source={AppImages.GAS_FEES}
              className={'w-[16px] h-[16px] mt-[3px]'}
              resizeMode='contain'
            />
            <CyDView className={' flex flex-row'}>
              <CyDText
                className={
                  ' font-medium text-[16px] ml-[10px] text-primaryTextColor'
                }>
                {t('GAS_FEE_LABEL')} {finalGasFee.toFixed(6) + ' EVMOS'}
              </CyDText>
            </CyDView>
          </CyDView>

          <Button
            onPress={() => {
              void finalTxn();
            }}
            title={t('APPROVE')}
            style={'py-[5%] mt-[15px]'}
            loaderStyle={{ height: 24 }}
            loading={loading}
          />

          <Button
            onPress={() => {
              setSignModalVisible(false);
              setLoading(false);
            }}
            title={t('REJECT')}
            type={'secondary'}
            style={'py-[5%] mt-[15px]'}
          />
        </CyDView>
      </CyDModalLayout>

      <DynamicView
        dynamic
        dynamicWidth
        width={100}
        dynamicHeight
        fD={'column'}
        aLIT={'center'}
        jC={'center'}
        height={100}
        bGC={Colors.whiteColor}>
        <DynamicScrollView
          dynamic
          dynamicWidth
          width={100}
          dynamicHeight
          height={100}
          style={{ paddingHorizontal: 16 }}>
          <DynamicView dynamic dynamicWidth width={100}>
            <CText
              dynamic
              fF={C.fontsName.FONT_SEMI_BOLD}
              fS={14}
              pV={5}
              color={Colors.primaryTextColor}>
              {itemData.description.name}
            </CText>
            <DynamicView dynamic fD={'row'}>
              <DynamicImage
                dynamic
                mR={8}
                source={AppImages.GIFT_BOX_PNG}
                width={12}
                height={12}
              />
              <CText
                dynamic
                fF={C.fontsName.FONT_SEMI_BOLD}
                fS={12}
                tA={'left'}
                color={Colors.subTextColor}>
                {'Commission at ' + itemData.commission * 100 + ' %'}
              </CText>
            </DynamicView>

            <DynamicView dynamic fD={'row'}>
              <DynamicImage
                dynamic
                mR={8}
                source={AppImages.COINS}
                width={15}
                height={12}
              />
              <CText
                dynamic
                fF={C.fontsName.FONT_SEMI_BOLD}
                fS={12}
                tA={'left'}
                color={Colors.subTextColor}>
                {'Voting power with ' +
                  convert(convertToEvmosFromAevmos(itemData.tokens)) +
                  ' EVMOS'}
              </CText>
            </DynamicView>
          </DynamicView>

          <DynamicView
            dynamic
            dynamicWidth
            width={100}
            bR={8}
            mT={32}
            mB={32}
            pH={20}
            pT={16}
            pB={16}
            fD={'row'}
            jC={'center'}
            bGC={Colors.lightOrange}>
            <DynamicView dynamic>
              <LottieView
                source={AppImages.INSIGHT_BULB}
                autoPlay
                loop
                resizeMode='cover'
                style={{ width: 40, aspectRatio: 80 / 120, top: -3 }}
              />
            </DynamicView>
            <CText
              dynamic
              mL={8}
              fF={C.fontsName.FONT_SEMI_BOLD}
              fS={12}
              tA={'left'}
              color={Colors.primaryTextColor}>
              {t('UNDELEGATE_WAIT_DAYS')}
            </CText>
          </DynamicView>

          <DynamicView
            dynamic
            mB={24}
            fD={'row'}
            jC={'space-between'}
            dynamicWidth
            width={100}>
            <CText
              dynamic
              mL={8}
              fF={C.fontsName.FONT_REGULAR}
              fS={16}
              tA={'left'}
              color={Colors.primaryTextColor}>
              {t('MY_DELEGATION')}
            </CText>
            <CText
              dynamic
              mL={8}
              fF={C.fontsName.FONT_BOLD}
              fS={16}
              tA={'left'}
              color={Colors.primaryTextColor}>
              {convertToEvmosFromAevmos(itemData.balance).toFixed(6) + ' EVMOS'}
            </CText>
          </DynamicView>

          {DELEGATE === stakingValidators.stateStaking.typeOfDelegation && (
            <DynamicView
              dynamic
              mB={28}
              fD={'row'}
              jC={'space-between'}
              dynamicWidth
              width={100}>
              <CText
                dynamic
                mL={8}
                fF={C.fontsName.FONT_REGULAR}
                fS={16}
                tA={'left'}
                color={Colors.primaryTextColor}>
                {t('AVAILABLE_BALANCE')}
              </CText>
              <CText
                dynamic
                mL={8}
                fF={C.fontsName.FONT_BOLD}
                fS={16}
                tA={'left'}
                color={Colors.primaryTextColor}>
                {convertToEvmosFromAevmos(
                  stakingValidators.stateStaking.unStakedBalance,
                ).toFixed(6) + ' EVMOS'}
              </CText>
            </DynamicView>
          )}

          {RE_DELEGATE === stakingValidators.stateStaking.typeOfDelegation && (
            <DynamicView
              dynamic
              mB={10}
              fD={'row'}
              jC={'space-between'}
              dynamicWidth
              width={100}>
              <CText
                dynamic
                mL={8}
                fF={C.fontsName.FONT_REGULAR}
                fS={16}
                tA={'left'}
                color={Colors.primaryTextColor}>
                {t('VALIDATOR_REDELEGATE')}
              </CText>
            </DynamicView>
          )}

          {RE_DELEGATE === stakingValidators.stateStaking.typeOfDelegation && (
            <DynamicTouchView
              dynamic
              mT={10}
              dynamicWidth
              dynamicHeightFix
              height={52}
              width={100}
              bR={8}
              bGC={'#F6F6F6'}
              aLIT={'center'}
              jC={'flex-start'}
              fD={'row'}
              style={{ position: 'relative', marginBottom: 28 }}
              onPress={() => {
                navigation.navigate(C.screenTitle.STAKING_REDELEGATE, {
                  itemData,
                  tokenData,
                  currentValidatorName: itemData.description.name,
                });
              }}>
              <TextInput
                value={reDelegatorName}
                autoCorrect={false}
                editable={false}
                style={styles.reDelegatorBox}
              />
              <DynamicView
                style={{ position: 'absolute', right: 10 }}
                fD={'row'}
                dynamic>
                <CText
                  dynamic
                  fF={C.fontsName.FONT_SEMI_BOLD}
                  fS={14}
                  tA={'left'}
                  color={Colors.subTextColor}>
                  <DynamicImage
                    dynamic
                    source={AppImages.RIGHT_ARROW}
                    width={12}
                    height={16}
                  />
                </CText>
              </DynamicView>
            </DynamicTouchView>
          )}

          <DynamicView
            dynamic
            mB={10}
            fD={'row'}
            jC={'space-between'}
            dynamicWidth
            width={100}>
            <CText
              dynamic
              mL={8}
              fF={C.fontsName.FONT_REGULAR}
              fS={16}
              tA={'left'}
              color={Colors.primaryTextColor}>
              {stakingValidators.stateStaking.typeOfDelegation === DELEGATE
                ? 'Amount to delegate'
                : stakingValidators.stateStaking.typeOfDelegation ===
                    UN_DELEGATE
                  ? 'Amount to undelegate'
                  : 'Amount to redelegate'}
            </CText>
          </DynamicView>

          <DynamicView
            dynamic
            mT={10}
            dynamicWidth
            dynamicHeightFix
            height={52}
            width={100}
            bR={8}
            bGC={'#F6F6F6'}
            aLIT={'center'}
            jC={'flex-start'}
            fD={'row'}
            style={{ position: 'relative' }}>
            <TextInput
              onChangeText={e => {
                setAmount(e);
                setMaxEnabled(false);
              }}
              value={amount}
              keyboardType='numeric'
              autoCorrect={false}
              caretHidden={false}
              style={styles.valueBox}
            />
            <DynamicView
              style={{ position: 'absolute', right: 10 }}
              fD={'row'}
              dynamic>
              <CText
                dynamic
                fF={C.fontsName.FONT_SEMI_BOLD}
                fS={14}
                tA={'left'}
                color={Colors.subTextColor}>
                {'EVMOS'}
              </CText>
              <DynamicTouchView
                sentry-label='evmos-staking-input-max-value'
                dynamic
                dynamicWidthFix
                width={60}
                bR={8}
                mL={8}
                bO={1}
                bGC={maxEnabled ? '#FFDE59' : '#F6F6F6'}
                style={{ borderColor: '#FFDE59' }}
                onPress={() => {
                  Keyboard.dismiss();
                  const maxAmount =
                    stakingValidators.stateStaking.typeOfDelegation === DELEGATE
                      ? convertToEvmosFromAevmos(
                          stakingValidators.stateStaking.unStakedBalance,
                        ) - gasReserved
                      : convertToEvmosFromAevmos(itemData.balance);
                  const textAmount =
                    maxAmount < 0 ? '0.00' : maxAmount.toString();
                  setAmount(textAmount);
                  setMaxEnabled(true);
                }}>
                <DynamicView dynamic aLIT={'center'} jC={'center'}>
                  <CText
                    dynamic
                    fF={C.fontsName.FONT_BOLD}
                    fS={14}
                    pV={8}
                    color={Colors.primaryTextColor}>
                    {t<string>('MAX')}
                  </CText>
                </DynamicView>
              </DynamicTouchView>
            </DynamicView>
          </DynamicView>
          {stakingValidators.stateStaking.typeOfDelegation === DELEGATE && (
            <DynamicView>
              <CText
                dynamic
                fF={C.fontsName.FONT_SEMI_BOLD}
                mT={10}
                fS={12}
                tA={'left'}
                color={Colors.subTextColor}>
                {`${gasReserved} EVMOS${t(' reserved on MAX')}`}
              </CText>
            </DynamicView>
          )}

          <DynamicView
            dynamic
            dynamicWidth
            width={100}
            fD={'column'}
            jC={'center'}
            mT={25}
            mB={32}>
            <CyDView className={'w-[100%]'}>
              <Button
                disabled={
                  parseFloat(amount) <= 0 ||
                  amount === '' ||
                  (stakingValidators.stateStaking.typeOfDelegation ===
                    RE_DELEGATE &&
                    reDelegatorName === '')
                }
                onPress={() => {
                  if (validateAmount(amount)) {
                    if (
                      stakingValidators.stateStaking.typeOfDelegation ===
                        DELEGATE &&
                      parseFloat(amount) >
                        convertToEvmosFromAevmos(
                          stakingValidators.stateStaking.unStakedBalance,
                        )
                    ) {
                      setFinalAmount(
                        stakingValidators.stateStaking.unStakedBalance,
                      );
                    } else if (
                      stakingValidators.stateStaking.typeOfDelegation !==
                        DELEGATE &&
                      parseFloat(amount) >
                        convertToEvmosFromAevmos(itemData.balance)
                    ) {
                      setFinalAmount(itemData.balance);
                    } else if (
                      maxEnabled &&
                      stakingValidators.stateStaking.typeOfDelegation ===
                        DELEGATE
                    ) {
                      setFinalAmount(
                        stakingValidators.stateStaking.unStakedBalance -
                          BigInt(100000000000000000),
                      );
                    } else if (
                      maxEnabled &&
                      stakingValidators.stateStaking.typeOfDelegation !==
                        DELEGATE
                    ) {
                      setFinalAmount(itemData.balance);
                    } else {
                      const numberOfTokens = ethers.parseUnits(amount, 18);
                      setFinalAmount(BigInt(numberOfTokens.toString()));
                    }

                    setOnSubmit(!onSubmit);
                    void analytics().logEvent(
                      `evmos_${stakingValidators.stateStaking.typeOfDelegation}_initiated`,
                    );
                  }
                }}
                loading={loading}
                title={stakingValidators.stateStaking.typeOfDelegation.toUpperCase()}
                style={loading ? 'px-[7%] min-h-[60px]' : 'p-[5%] min-h-[60px]'}
              />
              <Button
                onPress={() => {
                  navigation.navigate(C.screenTitle.STAKING_VALIDATORS, {
                    itemData,
                    tokenData,
                  });
                }}
                title={t('CANCEL')}
                type={'secondary'}
                style={'p-[5%] mt-[16px]'}
              />
            </CyDView>
          </DynamicView>
        </DynamicScrollView>
      </DynamicView>
    </>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  valueBox: {
    borderRadius: 8,
    fontSize: 18,
    backgroundColor: '#F6F6F6',
    width: '85%',
    height: 52,
    paddingLeft: 20,
    paddingRight: 100,
    color: '#000000',
  },
  reDelegatorBox: {
    borderRadius: 8,
    fontSize: 18,
    backgroundColor: '#F6F6F6',
    width: '90%',
    color: Colors.secondaryTextColor,
    height: 52,
    paddingLeft: 20,
    paddingRight: 30,
  },
});
