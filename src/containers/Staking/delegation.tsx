import * as React from 'react';
import { useContext, useEffect, useState } from 'react';
import { Colors } from '../../constants/theme';
import AppImages from '../../../assets/images/appImages';
import {
  HdWalletContext,
  StakingContext,
  validateAmount,
  convertToEvmosFromAevmos,
  getExplorerUrl,
  convertAmountOfContractDecimal
} from '../../core/util';
import * as C from '../../constants';
import { BackHandler, Keyboard, TextInput, StyleSheet } from 'react-native';
import axios, { MODAL_HIDE_TIMEOUT, MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import {
  createTxMsgDelegate,
  createTxMsgUndelegate,
  createTxMsgBeginRedelegate,
  createTxRawEIP712,
  signatureToWeb3Extension
} from '@tharsis/transactions';
import { signTypedData, SignTypedDataVersion, personalSign } from '@metamask/eth-sig-util';
import { generatePostBodyBroadcast } from '@tharsis/provider';
import { DELEGATE, RE_DELEGATE, UN_DELEGATE } from '../../reducers/stakingReducer';
import LottieView from 'lottie-react-native';
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import { signatureToPubkey } from '@hanchon/signature-to-pubkey';
import { ethers } from 'ethers';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import Button from '../../components/v2/button';
import { useTranslation } from 'react-i18next';
import { CyDImage, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import CyDModalLayout from '../../components/v2/modal';
import { SuccessTransaction } from '../../components/v2/StateModal';
import { cosmosConfig } from '../../constants/cosmosConfig';
import { TokenOverviewTabIndices } from '../../constants/enum';

const {
  CText,
  DynamicView,
  DynamicImage,
  DynamicTouchView,
  DynamicScrollView
} = require('../../styles');

export default function StakingDelegation ({ route, navigation }) {
  const { itemData, tokenData, reDelegator = '' } = route.params;
  const stakingValidators = useContext<any>(StakingContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const [amount, setAmount] = useState<string>('');
  const [reDelegatorName, setReDelegatorName] = useState<string>(reDelegator);
  const [loading, setLoading] = useState<boolean>(false);
  const [signModalVisible, setSignModalVisible] = useState<boolean>(false);
  const [finalAmount, setFinalAmount] = useState<bigint>(BigInt(0));
  const [maxEnabled, setMaxEnabled] = useState<boolean>(false);
  const [finalGasFee, setFinalGasFee] = useState<number>(0);
  const [finalData, setFinalData] = useState({});
  const [onSubmit, setOnSubmit] = useState(false);

  const { showModal, hideModal } = useGlobalModalContext();

  const { t } = useTranslation();

  const evmos = hdWallet.state.wallet.evmos;
  const ethereum = hdWallet.state.wallet.ethereum;

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

  const convert = n => {
    if (n < 1e3) return n;
    if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(1) + 'K';
    if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(1) + 'M';
    if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(1) + 'B';
    if (n >= 1e12) return +(n / 1e12).toFixed(1) + 'T';
  };

  const gasPrice = 0.000000075;

  const generatePublicKey = () => {
    const privateKeyBuffer = Buffer.from(
      ethereum.privateKey.substring(2),
      'hex'
    );

    const sig = personalSign({
      privateKey: privateKeyBuffer,
      data: 'generate_pubkey'
    });

    const publicKey = signatureToPubkey(
      sig,
      Buffer.from([
        50, 215, 18, 245, 169, 63, 252, 16, 225, 169, 71, 95, 254, 165, 146, 216,
        40, 162, 115, 78, 147, 125, 80, 182, 25, 69, 136, 250, 65, 200, 94, 178
      ]));

    return publicKey;
  };

  const generateTransactionBody = (response, gasFee = '14000000000000000', gasLimit = '700000') => {
    const chain = {
      chainId: 9001,
      cosmosChainId: 'evmos_9001-2'
    };
    const sender = {
      accountAddress: evmos.wallets[evmos.currentIndex].address,
      sequence: response.data.account.base_account.sequence ? response.data.account.base_account.sequence : 0,
      accountNumber: response.data.account.base_account.account_number,
      pubkey: response.data.account.base_account.pub_key ? response.data.account.base_account.pub_key.key : generatePublicKey()
    };
    const fee = {
      amount: gasFee,
      denom: 'aevmos',
      gas: gasLimit
    };

    const memo = '';

    if (DELEGATE === stakingValidators.stateStaking.typeOfDelegation) {
      const params = {
        validatorAddress: itemData.address,
        amount: finalAmount.toString(),
        denom: 'aevmos'
      };
      var msg = createTxMsgDelegate(chain, sender, fee, memo, params);
    }

    if (UN_DELEGATE === stakingValidators.stateStaking.typeOfDelegation) {
      const params = {
        validatorAddress: itemData.address,
        amount: finalAmount.toString(),
        denom: 'aevmos'
      };

      var msg = createTxMsgUndelegate(chain, sender, fee, memo, params);
    }

    if (RE_DELEGATE === stakingValidators.stateStaking.typeOfDelegation) {
      const params = {
        validatorSrcAddress: itemData.address,
        validatorDstAddress: stakingValidators.stateStaking.reValidator.address,
        amount: finalAmount.toString(),
        denom: 'aevmos'
      };
      var msg = createTxMsgBeginRedelegate(chain, sender, fee, memo, params);
    }

    const privateKeyBuffer = Buffer.from(
      ethereum.privateKey.substring(2),
      'hex'
    );

    const signature = signTypedData({
      privateKey: privateKeyBuffer,
      data: msg.eipToSign,
      version: SignTypedDataVersion.V4
    });

    const extension = signatureToWeb3Extension(chain, sender, signature);
    const rawTx = createTxRawEIP712(msg.legacyAmino.body, msg.legacyAmino.authInfo, extension);

    const body = generatePostBodyBroadcast(rawTx);

    return body;
  };

  const txnSimulation = async () => {
    setLoading(true);

    try {
      const accountDetailsResponse = await axios.get(`https://lcd-evmos.keplr.app/cosmos/auth/v1beta1/accounts/${evmos.wallets[evmos.currentIndex].address}`, { timeout: 2000 });
      const bodyForSimulate = generateTransactionBody(accountDetailsResponse);
      void analytics().logEvent(`evmos_simulate_${stakingValidators.stateStaking.typeOfDelegation}`);

      const simulationResponse = await axios.post('https://lcd-evmos.keplr.app/cosmos/tx/v1beta1/simulate', bodyForSimulate);
      const gasWanted = simulationResponse.data.gas_info.gas_used;
      const bodyForTransaction = generateTransactionBody(accountDetailsResponse,
        ethers.utils
          .parseUnits(convertAmountOfContractDecimal((cosmosConfig.evmos.gasPrice * gasWanted).toString(), 18), 18).toString(),
        Math.floor(gasWanted * 1.3).toString());
      setFinalGasFee(parseInt(simulationResponse.data.gas_info.gas_used) * gasPrice);
      setFinalData(bodyForTransaction);
      setLoading(false);
      setSignModalVisible(true);
    } catch (error: any) {
      setLoading(false);
      Sentry.captureException(error);
      await analytics().logEvent('evmos_staking_error', { from: 'error while simulating the transaction in evmos staking/delegation.tsx' });
      showModal('state', { type: 'error', title: t('TRANSACTION_FAILED'), description: error.response.data.message, onSuccess: hideModal, onFailure: hideModal });
    }
  };

  const renderSuccessTransaction = (hash: string) => {
    return <SuccessTransaction
      hash={hash}
      symbol={tokenData.chainDetails.symbol}
      name={tokenData.chainDetails.name}
      navigation={navigation}
      hideModal={hideModal}
    />;
  };

  function onTransModalHide () {
    hideModal();
    setTimeout(() => {
      navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
        tokenData,
        navigateTo: TokenOverviewTabIndices.STAKING
      });
    }, MODAL_HIDE_TIMEOUT);
  }

  const finalTxn = async () => {
    setLoading(true);
    try {
      const txnResponse = await axios.post('https://lcd-evmos.keplr.app/cosmos/tx/v1beta1/txs', finalData);
      if (txnResponse.data.tx_response.raw_log === '[]') {
        setLoading(false);
        setSignModalVisible(false);
        await analytics().logEvent(`evmos_${stakingValidators.stateStaking.typeOfDelegation}_completed`);
        setTimeout(() => {
          showModal('state', {
            type: 'success',
            title: t('TRANSACTION_SUCCESS'),
            description: renderSuccessTransaction(txnResponse.data.tx_response.txhash),
            onSuccess: onTransModalHide,
            onFailure: hideModal
          });
        }, MODAL_HIDE_TIMEOUT_250);
      } else {
        setLoading(false);
        setSignModalVisible(false);
        Sentry.captureException(txnResponse);
        await analytics().logEvent('evmos_staking_error', {
          from: `error while broadcasting the transaction in evmos staking/delegation.tsx : ${txnResponse.data.tx_response.raw_log}`
        });
        setTimeout(() => {
          showModal('state', { type: 'error', title: t('TRANSACTION_FAILED'), description: txnResponse.data.tx_response.raw_log, onSuccess: hideModal, onFailure: hideModal });
        }, MODAL_HIDE_TIMEOUT_250);
      }
    } catch (error: any) {
      setLoading(false);
      setSignModalVisible(false);
      Sentry.captureException(error);
      await analytics().logEvent('evmos_staking_error', { from: 'error while broadcasting the transaction in evmos staking/delegation.tsx' });
      setTimeout(() => {
        showModal('state', { type: 'error', title: t('TRANSACTION_FAILED'), description: error.response.data, onSuccess: hideModal, onFailure: hideModal });
      }, MODAL_HIDE_TIMEOUT_250);
    }
    setLoading(false);
  };

  useEffect(() => {
    setReDelegatorName(stakingValidators.stateStaking.reValidator.description.name);
  }, [stakingValidators.stateStaking.reValidator]);

  useEffect(() => {
    if (finalAmount > 0) { void txnSimulation(); } else if (finalAmount < 0) {
      showModal('state', { type: 'error', title: t('TRANSACTION_FAILED'), description: 'Insufficient balance for gas fee', onSuccess: hideModal, onFailure: hideModal });
    }
  }, [finalAmount, onSubmit]);

  function onModalHide () {
    setLoading(false);
    setSignModalVisible(false);
  }

  return (
        <>
        <CyDModalLayout setModalVisible={onModalHide} isModalVisible={signModalVisible} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
            <CyDView className={'bg-white p-[25px] pb-[30px] rounded-[20px] relative'}>
              <CyDTouchView onPress={() => onModalHide()} className={'z-[50]'}>
                <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] top-[-10px] absolute right-[0px] '} />
              </CyDTouchView>
              <CyDText className={'mt-[10] font-bold text-center text-[22px]'}>
                {stakingValidators.stateStaking.typeOfDelegation} {UN_DELEGATE === stakingValidators.stateStaking.typeOfDelegation ? 'from ' : 'to '} {RE_DELEGATE === stakingValidators.stateStaking.typeOfDelegation ? reDelegatorName : itemData.description.name}
              </CyDText>

              <CyDView className={'flex flex-row mt-[40px]'}>
                  <CyDImage source={AppImages[tokenData.chainDetails.backendName + '_LOGO']} className={'h-[20px] w-[20px]'}/>
                  <CyDView className={' flex flex-row'}>
                    <CyDText className={' font-bold text-[16px] ml-[5px] text-primaryTextColor'}>{convertToEvmosFromAevmos(finalAmount).toFixed(6) + ' EVMOS '}</CyDText>
                  </CyDView>
                </CyDView>

                <CyDView className={'flex flex-row mt-[20px]'}>
                  <CyDImage source={AppImages.GAS_FEES} className={'w-[16px] h-[16px] mt-[3px]'} />
                  <CyDView className={' flex flex-row'}>
                    <CyDText className={' font-medium text-[16px] ml-[10px] text-primaryTextColor'}>{t('GAS_FEE_LABEL')} {finalGasFee.toFixed(6) + ' EVMOS'}</CyDText>
                  </CyDView>
                </CyDView>

                <Button onPress={() => {
                  void finalTxn();
                }} title={t('APPROVE')} style={'py-[5%] mt-[15px]'} loaderStyle={{ height: 30 }} loading={loading}/>

                <Button onPress={() => {
                  setSignModalVisible(false);
                  setLoading(false);
                }}
                  title={t('REJECT')}
                  type={'secondary'}
                  style={'py-[5%] mt-[15px]'}/>
              </CyDView>
          </CyDModalLayout>

            <DynamicView dynamic dynamicWidth width={100} dynamicHeight fD={'column'}
                         aLIT={'center'} jC={'center'} height={100} bGC={Colors.whiteColor}>

            <DynamicScrollView dynamic dynamicWidth width={100} dynamicHeight height={100} style={{ paddingHorizontal: 16 }}>

                <DynamicView dynamic dynamicWidth width={100} >
                    <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={14} pV={5}
                           color={Colors.primaryTextColor}>{itemData.description.name}</CText>
                    <DynamicView dynamic fD={'row'}>
                        <DynamicImage dynamic mR={8} source={AppImages.GIFT_BOX_PNG} width={12} height={12}/>
                        <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={12} tA={'left'} color={Colors.subTextColor}>{'Commission at ' + itemData.commission * 100 + ' %'}</CText>
                    </DynamicView>

                    <DynamicView dynamic fD={'row'}>
                        <DynamicImage dynamic mR={8} source={AppImages.COINS} width={15} height={12}/>
                        <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={12} tA={'left'} color={Colors.subTextColor}>{'Voting power with ' + convert(convertToEvmosFromAevmos(itemData.tokens)) + ' EVMOS'}</CText>
                    </DynamicView>
                </DynamicView>

                <DynamicView dynamic dynamicWidth width={100} bR={8} mT={32} mB={32} pH={20} pT={16} pB={16} fD={'row'} jC={'center'}
                bGC={Colors.lightOrange}>
                    <DynamicView dynamic>
                        <LottieView source={AppImages.INSIGHT_BULB} autoPlay loop resizeMode='cover'
                                    style={{ width: 40, aspectRatio: 80 / 120, top: -3 }}/>
                    </DynamicView>
                    <CText dynamic mL={8} fF={C.fontsName.FONT_SEMI_BOLD} fS={12} tA={'left'} color={Colors.primaryTextColor}>
                        {'Once you undelegate your staked EVMOS, you will need to wait 14 days for your tokens to be liquid'}
                    </CText>
                </DynamicView>

                 <DynamicView dynamic mB={24} fD={'row'} jC={'space-between'} dynamicWidth width={100}>
                    <CText dynamic mL={8} fF={C.fontsName.FONT_REGULAR} fS={16} tA={'left'} color={Colors.primaryTextColor}>
                        My delegation
                    </CText>
                    <CText dynamic mL={8} fF={C.fontsName.FONT_BOLD} fS={16} tA={'left'} color={Colors.primaryTextColor}>
                        {convertToEvmosFromAevmos(itemData.balance).toFixed(6) + ' EVMOS'}
                    </CText>
                </DynamicView>

                {DELEGATE === stakingValidators.stateStaking.typeOfDelegation && <DynamicView dynamic mB={28} fD={'row'} jC={'space-between'} dynamicWidth width={100}>
                    <CText dynamic mL={8} fF={C.fontsName.FONT_REGULAR} fS={16} tA={'left'} color={Colors.primaryTextColor}>
                        Available balance
                    </CText>
                    <CText dynamic mL={8} fF={C.fontsName.FONT_BOLD} fS={16} tA={'left'} color={Colors.primaryTextColor}>
                        {convertToEvmosFromAevmos(stakingValidators.stateStaking.unStakedBalance).toFixed(6) + ' EVMOS'}
                    </CText>
                </DynamicView>}

                {RE_DELEGATE === stakingValidators.stateStaking.typeOfDelegation && <DynamicView dynamic mB={10} fD={'row'} jC={'space-between'} dynamicWidth width={100}>
                    <CText dynamic mL={8} fF={C.fontsName.FONT_REGULAR} fS={16} tA={'left'} color={Colors.primaryTextColor}>
                        Validator to redelegate
                    </CText>
                </DynamicView>}

                {RE_DELEGATE === stakingValidators.stateStaking.typeOfDelegation &&
                    <DynamicTouchView dynamic mT={10} dynamicWidth dynamicHeightFix height={52}
                                 width={100} bR={8} bGC={'#F6F6F6'}
                                 aLIT={'center'} jC={'flex-start'} fD={'row'}
                                 style={{ position: 'relative', marginBottom: 28 }}
                                  onPress={() => {
                                    navigation.navigate(C.screenTitle.STAKING_REDELEGATE, {
                                      itemData,
                                      tokenData,
                                      currentValidatorName: itemData.description.name
                                    });
                                  }}
                    >
                        <TextInput
                            value={reDelegatorName}
                            autoCorrect={false}
                            editable={false}
                            style={{
                              borderRadius: 8,
                              fontSize: 18,
                              backgroundColor: '#F6F6F6',
                              width: '90%',
                              color: Colors.secondaryTextColor,
                              height: 52,
                              paddingLeft: 20,
                              paddingRight: 30
                            }}
                        ></TextInput>
                        <DynamicView style={{ position: 'absolute', right: 10 }} fD={'row'} dynamic >
                            <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={14} tA={'left'} color={Colors.subTextColor}>
                                <DynamicImage dynamic source={AppImages.RIGHT_ARROW} width={12} height={16}/>
                            </CText>
                        </DynamicView>
                    </DynamicTouchView>

                }

                <DynamicView dynamic mB={10} fD={'row'} jC={'space-between'} dynamicWidth width={100}>
                    <CText dynamic mL={8} fF={C.fontsName.FONT_REGULAR} fS={16} tA={'left'} color={Colors.primaryTextColor}>
                        {stakingValidators.stateStaking.typeOfDelegation === DELEGATE ? 'Amount to delegate' : stakingValidators.stateStaking.typeOfDelegation === UN_DELEGATE ? 'Amount to undelegate' : 'Amount to redelegate'}
                    </CText>
                </DynamicView>

                <DynamicView dynamic mT={10} dynamicWidth dynamicHeightFix height={52}
                              width={100} bR={8} bGC={'#F6F6F6'}
                             aLIT={'center'} jC={'flex-start'} fD={'row'}
                             style={{ position: 'relative' }}
                >
                    <TextInput
                        onChangeText={(e) => {
                          setAmount(e);
                          setMaxEnabled(false);
                        }}
                        value={amount}
                        keyboardType = 'numeric'
                        autoCorrect={false}
                        caretHidden={false}
                                  style={{
                                    borderRadius: 8,
                                    fontSize: 18,
                                    backgroundColor: '#F6F6F6',
                                    width: '85%',
                                    height: 52,
                                    paddingLeft: 20,
                                    paddingRight: 100,
                                    color: '#000000'
                                  }}
                    ></TextInput>
                    <DynamicView style={{ position: 'absolute', right: 10 }} fD={'row'} dynamic>
                        <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={14} tA={'left'} color={Colors.subTextColor}>
                            EVMOS
                        </CText>
                        <DynamicTouchView sentry-label='evmos-staking-input-max-value' dynamic dynamicWidthFix width={60} bR={8} mL={8}
                                          bO={1} bGC={maxEnabled ? '#FFDE59' : '#F6F6F6'} style={{ borderColor: '#FFDE59' }}
                                          onPress={() => {
                                            Keyboard.dismiss();
                                            stakingValidators.stateStaking.typeOfDelegation === DELEGATE ? setAmount((convertToEvmosFromAevmos(stakingValidators.stateStaking.unStakedBalance) - 0.2).toString()) : setAmount((convertToEvmosFromAevmos(itemData.balance)).toString());
                                            setMaxEnabled(true);
                                          }}
                        >
                            <DynamicView dynamic aLIT={'center'} jC={'center'}>
                                <CText dynamic fF={C.fontsName.FONT_BOLD} fS={14} pV={8}
                                       color={Colors.primaryTextColor}>Max</CText>
                            </DynamicView>
                        </DynamicTouchView>
                    </DynamicView>
                </DynamicView>
                {stakingValidators.stateStaking.typeOfDelegation === DELEGATE && <DynamicView>
                      <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} mT={10} fS={12} tA={'left'} color={Colors.subTextColor}>
                            {`${t('0.2')} EVMOS${t(' reserved on MAX')}`}
                        </CText>
                    </DynamicView>}

                <DynamicView dynamic dynamicWidth width={100} fD={'column'} jC={'center'} mT={25} mB={32}>
                  <CyDView className={'w-[100%]'}>

                    <Button
                      disabled={parseFloat(amount) <= 0 || amount === ''}
                        onPress={() => {
                          if (validateAmount(amount)) {
                            if (stakingValidators.stateStaking.typeOfDelegation === DELEGATE && parseFloat(amount) > (convertToEvmosFromAevmos(stakingValidators.stateStaking.unStakedBalance))) {
                              setFinalAmount(stakingValidators.stateStaking.unStakedBalance);
                            } else if (stakingValidators.stateStaking.typeOfDelegation !== DELEGATE && parseFloat(amount) > (convertToEvmosFromAevmos(itemData.balance))) {
                              setFinalAmount(itemData.balance);
                            } else if (maxEnabled && stakingValidators.stateStaking.typeOfDelegation === DELEGATE) {
                              setFinalAmount(stakingValidators.stateStaking.unStakedBalance - BigInt(100000000000000000));
                            } else if (maxEnabled && stakingValidators.stateStaking.typeOfDelegation !== DELEGATE) {
                              setFinalAmount(itemData.balance);
                            } else {
                              const numberOfTokens = ethers.utils.parseUnits(amount, '18');
                              setFinalAmount(BigInt(numberOfTokens.toString()));
                            }

                            setOnSubmit(!onSubmit);
                            analytics().logEvent(`evmos_${stakingValidators.stateStaking.typeOfDelegation}_initiated`);
                          }
                        }}
                      loading={loading}
                      title={stakingValidators.stateStaking.typeOfDelegation.toUpperCase()}
                      style={loading ? 'px-[7%] min-h-[60px]' : 'p-[5%] min-h-[60px]'}
                    />
                    <Button onPress={() => {
                      navigation.navigate(C.screenTitle.STAKING_VALIDATORS, {
                        itemData,
                        tokenData
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
    justifyContent: 'flex-end'
  }
});
