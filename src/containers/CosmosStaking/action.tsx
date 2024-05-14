import React, { useContext, useEffect, useState } from 'react';
import {
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDView,
  CyDTouchView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { BackHandler, StyleSheet } from 'react-native';
import {
  convertAmountOfContractDecimal,
  convertFromUnitAmount,
  convertNumberToShortHandNotation,
  HdWalletContext,
  logAnalytics,
  parseErrorMessage,
} from '../../core/util';
import LottieView from 'lottie-react-native';
import {
  CosmosActionType,
  CosmosStakingContext,
  COSMOS_STAKING_EMPTY,
} from '../../reducers/cosmosStakingReducer';
import clsx from 'clsx';
import Button from '../../components/v2/button';
import { SigningStargateClient } from '@cosmjs/stargate';
import { getSignerClient } from '../../core/Keychain';
import { OfflineDirectSigner } from '@cosmjs/proto-signing';
import { cosmosConfig, IIBCData } from '../../constants/cosmosConfig';
import { ethers } from 'ethers';
import { screenTitle } from '../../constants';
import CyDModalLayout from '../../components/v2/modal';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import { useTranslation } from 'react-i18next';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { MODAL_HIDE_TIMEOUT } from '../../core/Http';
import { SuccessTransaction } from '../../components/v2/StateModal';
import { AnalyticsType, TokenOverviewTabIndices } from '../../constants/enum';
import { useRoute } from '@react-navigation/native';

export default function CosmosAction({ route, navigation }) {
  const { t } = useTranslation();
  const { tokenData, from, validatorData } = route.params;
  const cosmosStaking = useContext<any>(CosmosStakingContext);
  const globalStateContext = useContext<GlobalContextDef>(GlobalContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [wallets, setWallets] = useState<Map<string, OfflineDirectSigner>>(
    new Map(),
  );
  const [memo, setMemo] = useState<string>('');
  const [signModalVisible, setSignModalVisible] = useState<boolean>(false);
  const [gasFee, setGasFee] = useState<number>(0);
  const [reValidator, setReValidator] = useState({ name: '' });
  const useroute = useRoute();
  const { showModal, hideModal } = useGlobalModalContext();

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    navigation.setOptions({
      title: from,
    });

    BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

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

  function onModalHide() {
    hideModal();
    setTimeout(() => {
      // This is to refresh the staking page again on navigating back to Token overview staking page below to dissatisfy isStakingDispatched() condition there
      cosmosStaking.cosmosStakingDispatch({
        allValidatorsListState: COSMOS_STAKING_EMPTY,
      });
    }, MODAL_HIDE_TIMEOUT);
    setTimeout(() => {
      navigation.navigate(screenTitle.TOKEN_OVERVIEW, {
        tokenData,
        navigateTo: TokenOverviewTabIndices.STAKING,
      });
    }, MODAL_HIDE_TIMEOUT);
  }

  const onAction = async (type = CosmosActionType.SIMULATION) => {
    setLoading(true);
    try {
      const currentChain: IIBCData =
        cosmosConfig[tokenData.chainDetails.chainName];
      let wallet: OfflineDirectSigner | undefined;
      if (type === CosmosActionType.SIMULATION) {
        const wallets: Map<string, OfflineDirectSigner> =
          await getSignerClient(hdWallet);
        wallet = wallets.get(currentChain.prefix);
        setWallets(wallets);
      } else {
        wallet = wallets.get(currentChain.prefix);
      }

      const rpc =
        globalStateContext.globalState.rpcEndpoints[
          tokenData.chainDetails.chainName.toUpperCase()
        ].primary;

      let senderAddress: any = await wallet.getAccounts();
      senderAddress = senderAddress[0].address;

      const client = await SigningStargateClient.connectWithSigner(
        rpc,
        wallet,
        {
          prefix: currentChain.prefix,
        },
      );

      let msg;
      switch (from) {
        case CosmosActionType.DELEGATE: {
          msg = {
            typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
            value: {
              delegatorAddress: senderAddress,
              validatorAddress: validatorData.address,
              amount: {
                denom: currentChain.denom,
                amount: ethers
                  .parseUnits(
                    convertAmountOfContractDecimal(
                      amount,
                      tokenData.contractDecimals,
                    ),
                    tokenData.contractDecimals,
                  )
                  .toString(),
              },
            },
          };
          break;
        }

        case CosmosActionType.UNDELEGATE: {
          msg = {
            typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
            value: {
              delegatorAddress: senderAddress,
              validatorAddress: validatorData.address,
              amount: {
                denom: currentChain.denom,
                amount: ethers
                  .parseUnits(
                    convertAmountOfContractDecimal(
                      amount,
                      tokenData.contractDecimals,
                    ),
                    tokenData.contractDecimals,
                  )
                  .toString(),
              },
            },
          };
          break;
        }
        case CosmosActionType.REDELEGATE: {
          msg = {
            typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
            value: {
              delegatorAddress: senderAddress,
              validatorSrcAddress: validatorData.address,
              validatorDstAddress: reValidator.address,
              amount: {
                denom: currentChain.denom,
                amount: ethers
                  .parseUnits(
                    convertAmountOfContractDecimal(
                      amount,
                      tokenData.contractDecimals,
                    ),
                    tokenData.contractDecimals,
                  )
                  .toString(),
              },
            },
          };
          break;
        }
      }

      const simulation = await client.simulate(senderAddress, [msg], memo);

      const gasFee =
        simulation *
        currentChain.gasPrice *
        1.3 *
        10 ** -currentChain.contractDecimal;
      setGasFee(gasFee);
      if (CosmosActionType.SIMULATION === type) {
        analytics().logEvent(`${from}_simulated`);
        setSignModalVisible(true);
      }

      if (CosmosActionType.TRANSACTION === type) {
        const fee = {
          gas: Math.floor(simulation * 1.3).toString(),
          amount: [
            {
              denom: currentChain.denom,
              amount: parseInt(gasFee.toFixed(6).split('.')[1]).toString(),
            },
          ],
        };
        const resp = await client.signAndBroadcast(
          senderAddress,
          [msg],
          fee,
          memo,
        );

        showModal('state', {
          type: 'success',
          title: t('TRANSACTION_SUCCESS'),
          description: renderSuccessTransaction(resp.transactionHash),
          onSuccess: onModalHide,
          onFailure: hideModal,
        });
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.SUCCESS,
          txnHash: resp.transactionHash,
          chain: tokenData?.chainDetails?.chainName ?? '',
        });
        analytics().logEvent(`${from}_transaction_success`);
      }
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: tokenData?.chainDetails?.chainName ?? '',
        message: parseErrorMessage(error),
        screen: useroute.name,
      });
      showModal('state', {
        type: 'error',
        title: t('TRANSACTION_FAILED'),
        description: error.message,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      Sentry.captureException(error);
      analytics().logEvent(`${from}_failed`);
    }
  };
  return (
    <CyDScrollView className={'bg-white h-full w-full px-[20px]'}>
      <CyDModalLayout
        setModalVisible={setSignModalVisible}
        isModalVisible={signModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView
          className={'bg-white  px-[25px] pb-[30px] rounded-t-[20px] relative'}>
          <CyDTouchView
            onPress={() => setSignModalVisible(false)}
            className={'w-full flex-1 flex-row py-[20px] justify-end z-[50]'}>
            <CyDImage
              source={AppImages.CLOSE}
              className={' w-[18px] h-[18px]'}
            />
          </CyDTouchView>
          <CyDText className={'mt-[10px] font-bold text-center text-[22px]'}>
            {`${from} ${from === CosmosActionType.DELEGATE ? 'to' : 'from'} ${
              validatorData.name
            }`}
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
                }>{`${parseFloat(amount).toFixed(2)} ${
                tokenData.name
              }`}</CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-row mt-[20px]'}>
            <CyDImage
              source={AppImages.GAS_FEES}
              className={'w-[16px] h-[16px] mt-[3px]'}
            />
            <CyDView className={' flex flex-row'}>
              <CyDText
                className={
                  ' font-medium text-[16px] ml-[10px] text-primaryTextColor'
                }>
                {t('GAS_FEE_LABEL')} {`${gasFee.toFixed(6)} ${tokenData.name}`}
              </CyDText>
            </CyDView>
          </CyDView>

          <Button
            onPress={() => {
              setSignModalVisible(false);
              onAction(CosmosActionType.TRANSACTION);
            }}
            title={t('APPROVE')}
            style={'py-[5%] mt-[15px]'}
            loading={loading}
            loaderStyle={{ height: 30 }}
          />

          <Button
            onPress={() => {
              setSignModalVisible(false);
            }}
            title={t('REJECT')}
            type={'secondary'}
            style={'py-[5%] mt-[15px]'}
          />
        </CyDView>
      </CyDModalLayout>

      <CyDText
        className={
          'text-[24px] mt-[24px] font-nunito text-secondaryTextColor font-extrabold text-start'
        }>
        {validatorData.name}
      </CyDText>
      <CyDView className={'flex flex-row items-center justify-start mt-[24px]'}>
        <CyDImage
          source={AppImages.GIFT_BOX_PNG}
          className={'w-[20px] h-[20px]'}
        />
        <CyDText
          className={
            'ml-[12px] text-[14px] font-nunito text-primaryTextColor font-medium text-center'
          }>
          {t('Commision rate ')}
        </CyDText>
        <CyDText
          className={
            'ml-[4px] text-[14px] font-nunito text-secondaryTextColor font-bold text-center'
          }>{`${parseFloat(validatorData.commissionRate) * 100}% `}</CyDText>
      </CyDView>
      <CyDView className={'flex flex-row items-center justify-start mt-[12px]'}>
        {/* <CyDImage source={AppImages.COINS} className={'w-[24px] h-[24px]'}/> */}
        <CyDImage
          source={{
            uri: tokenData.logoUrl,
          }}
          className={'w-[20px] h-[20px]'}
        />

        <CyDText
          className={
            'ml-[12px] text-[14px] font-nunito text-primaryTextColor font-medium text-center'
          }>
          {t('Voting Power of ')}
        </CyDText>
        <CyDText
          className={
            'ml-[4px] text-[14px] font-nunito ttext-secondaryTextColor font-bold text-center'
          }>{`${convertNumberToShortHandNotation(
          convertFromUnitAmount(
            validatorData.tokens,
            tokenData.contractDecimals,
          ),
        )} ${tokenData.name}`}</CyDText>
      </CyDView>

      <CyDView
        className={
          'bg-[#FFE3DB4D] my-[32px] py-[16px] px-[20px] rounded-[8px] flex flex-row'
        }>
        <LottieView
          source={AppImages.INSIGHT_BULB}
          autoPlay
          loop
          resizeMode='cover'
          style={{ width: 40, aspectRatio: 80 / 120, top: -3 }}
        />
        <CyDText
          className={
            'ml-[16px] font-nunito text-[13px] text-primaryTextColor w-10/12 font-semibold'
          }>{`${t('Once you undelegate your staked')} ${tokenData.name}${t(
          ', you will need to wait 21 days for your tokens to be liquid',
        )}`}</CyDText>
      </CyDView>

      <CyDView className={'flex flex-row justify-between items-center'}>
        <CyDText className={'font-nunito text-[16px] text-primaryTextColor'}>
          {'My delegation'}
        </CyDText>
        <CyDText
          className={
            'font-nunito text-[18px] font-bold text-secondaryTextColor'
          }>{`${convertFromUnitAmount(
          validatorData.balance.toString(),
          tokenData.contractDecimals,
        )} ${tokenData.name}`}</CyDText>
      </CyDView>

      {CosmosActionType.DELEGATE === from && (
        <CyDView
          className={
            'mt-[20px] mb-[40px] flex flex-row justify-between items-center'
          }>
          <CyDText className={' font-nunito text-[16px] text-primaryTextColor'}>
            {t('Available balance')}
          </CyDText>
          <CyDText
            className={
              'font-nunito text-[18px] font-bold text-secondaryTextColor'
            }>{`${convertFromUnitAmount(
            cosmosStaking.cosmosStakingState.balance.toString(),
            tokenData.contractDecimals,
          )} ${tokenData.name}`}</CyDText>
        </CyDView>
      )}

      {/* {from === CosmosActionType.DELEGATE && <CyDText
        className={'mt-[4px] font-nunito text-[12px] font-medium text-primaryTextColor'}>{`${t('0.2')} ${tokenData.name}${t(' reserved on MAX')}`}</CyDText>
      } */}
      {from === CosmosActionType.REDELEGATE && (
        <>
          <CyDText
            className={
              'font-nunito text-[16px] mt-[10px] text-primaryTextColor'
            }>
            {t('Validator to Redelegate')}
          </CyDText>
          <CyDTouchView
            className={
              'bg-inputBackgroundColor p-[8px] rounded-[8px] h-[60px] flex flex-row items-center'
            }
            onPress={() => {
              navigation.navigate(screenTitle.COSMOS_REVALIDATOR, {
                validatorData,
                tokenData,
                setReValidator,
                from: CosmosActionType.REDELEGATE,
              });
            }}>
            <CyDText
              className={
                'ml-[4px] bg-[#F6F6F6] text-[16px] w-11/12 font-nunito'
              }>
              {reValidator.name}
            </CyDText>
            <CyDImage
              source={AppImages.RIGHT_ARROW}
              className={'w-[16px] h-[16px]'}
            />
          </CyDTouchView>
        </>
      )}
      <CyDText
        className={
          'mt-[20px] font-nunito text-[16px] text-primaryTextColor'
        }>{`${t('Amount to ')}${from}`}</CyDText>

      <CyDView
        className={
          'bg-inputBackgroundColor p-[8px] mt-[10px] h-[60px] rounded-[8px] flex flex-row items-center'
        }>
        <CyDTextInput
          className={
            'ml-[4px] bg-inputBackgroundColor text-[16px] w-[63%] font-nunito text-primaryTextColor'
          }
          keyboardType={'numeric'}
          onChangeText={text => {
            setAmount(text);
          }}
          value={amount}
        />
        <CyDText
          className={clsx('ml-[12px] text-subTextColor', {
            'text-[16px]': tokenData.name.length <= 5,
            'text-[12px]': tokenData.name.length > 5,
          })}>
          {tokenData.name.toUpperCase()}
        </CyDText>
        <Button
          onPress={() => {
            if (
              CosmosActionType.DELEGATE === from &&
              parseFloat(cosmosStaking.cosmosStakingState.balance) *
                10 ** -tokenData.contractDecimals -
                0.2 >
                0
            )
              setAmount(
                (
                  parseFloat(cosmosStaking.cosmosStakingState.balance) *
                    10 ** -tokenData.contractDecimals -
                  0.2
                ).toFixed(6),
              );
            else if (CosmosActionType.UNDELEGATE === from)
              setAmount(
                (
                  parseFloat(validatorData.balance) *
                  10 ** -tokenData.contractDecimals
                ).toFixed(6),
              );
            else if (CosmosActionType.REDELEGATE === from)
              setAmount(
                (
                  parseFloat(validatorData.balance) *
                  10 ** -tokenData.contractDecimals
                ).toFixed(6),
              );
          }}
          title={t('MAX')}
          type={'primary'}
          style={'p-[3%] mr-[2px] text-[12px] bg-inputBorderColor'}
          titleStyle={'text-[14px]'}
        />
      </CyDView>

      {from === CosmosActionType.DELEGATE && (
        <CyDText
          className={
            'mt-[4px] font-nunito text-[12px] font-medium text-primaryTextColor'
          }>{`${t('0.2')} ${tokenData.name}${t(' reserved on MAX')}`}</CyDText>
      )}

      <CyDText
        className={'font-nunito text-[16px] my-[10px] text-primaryTextColor'}>
        {t('Memo')}
      </CyDText>
      <CyDView
        className={
          'bg-inputBackgroundColor p-[10px] h-[60px] rounded-[8px] flex flex-row items-center'
        }>
        <CyDTextInput
          className={
            'ml-[4px] bg-inputBackgroundColor text-[16px] w-7/12 font-nunito'
          }
          onChangeText={text => {
            setMemo(text);
          }}
          placeholder={'(optional)'}
          placeholderTextColor={'#929292'}
          value={memo}
        />
      </CyDView>

      <CyDView className={'flex flex-col my-[20px] justify-around'}>
        <Button
          disabled={
            amount === '' ||
            (from === CosmosActionType.DELEGATE &&
              parseFloat(amount) >
                parseInt(cosmosStaking.cosmosStakingState.balance) *
                  10 ** -tokenData.contractDecimals) ||
            (from === CosmosActionType.UNDELEGATE &&
              parseFloat(amount) >
                parseFloat(
                  convertFromUnitAmount(
                    validatorData.balance.toString(),
                    tokenData.contractDecimals,
                  ),
                ))
          }
          onPress={async () => {
            await onAction(CosmosActionType.SIMULATION);
          }}
          loading={loading}
          title={`${from.toUpperCase()}`}
          style={loading ? 'px-[7%] min-h-[60px]' : 'p-[5%] min-h-[60px]'}
        />
        <Button
          onPress={() => {
            navigation.goBack();
          }}
          title={t('CANCEL')}
          type={'secondary'}
          style={'p-[5%] mt-[16px]'}
        />
      </CyDView>
    </CyDScrollView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
