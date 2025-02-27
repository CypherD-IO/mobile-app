import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import ChooseChainModal from '../../components/v2/chooseChainModal';
import {
  ActivityContext,
  HdWalletContext,
  validateAmount,
  limitDecimalPlaces,
  logAnalytics,
  parseErrorMessage,
  formatAmount,
} from '../../core/util';
import clsx from 'clsx';
import { Chain, ChainBackendNames, IBC_CHAINS } from '../../constants/server';
import * as Sentry from '@sentry/react-native';
import SignatureModal from '../../components/v2/signatureModal';
import { screenTitle } from '../../constants';
import {
  MODAL_HIDE_TIMEOUT_250,
  MODAL_HIDE_TIMEOUT_600,
} from '../../core/Http';
import { useTranslation } from 'react-i18next';
import { BackHandler, ActivityIndicator } from 'react-native';
import Button from '../../components/v2/button';
import {
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  IBCTransaction,
} from '../../reducers/activity_reducer';
import { genId } from '../utilities/activityUtilities';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { MODAL_CLOSING_TIMEOUT } from '../../constants/timeOuts';
import { SuccessTransaction } from '../../components/v2/StateModal';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import { AnalyticsType, ButtonType } from '../../constants/enum';
import { get } from 'lodash';
import useTransactionManager from '../../hooks/useTransactionManager';
import { Holding } from '../../core/portfolio';
import usePortfolio from '../../hooks/usePortfolio';
import { DecimalHelper } from '../../utils/decimalHelper';
import useGasService from '../../hooks/useGasService';
import { usePortfolioRefresh } from '../../hooks/usePortfolioRefresh';

export default function IBC({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const { tokenData } = route.params;
  const { t } = useTranslation();
  const hdWallet = useContext<any>(HdWalletContext);
  const cosmos = hdWallet.state.wallet.cosmos;
  const osmosis = hdWallet.state.wallet.osmosis;
  const noble = hdWallet.state.wallet.noble;
  const coreum = hdWallet.state.wallet.coreum;
  const injective = hdWallet.state.wallet.injective;

  const cosmosAddresses = {
    cosmos: cosmos.address,
    osmosis: osmosis.address,
    noble: noble.address,
    coreum: coreum.address,
    injective: injective.address,
  };

  const [chain, setChain] = useState<Chain>([]);
  const [chainData, setChainData] = useState<Chain[]>(IBC_CHAINS);
  const [showChain, setShowChain] = useState<boolean>(false);
  const [showMerged, setShowMerged] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>('0.00');
  const [loading, setLoading] = useState<boolean>(false);
  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [senderAddress, setSenderAddress] = useState<string>('');
  const [signModalVisible, setSignModalVisible] = useState<boolean>(false);
  const [nativeToken, setNativeToken] = useState<Holding>();
  const [gasFee, setGasFee] = useState<string | number>(0);
  const activityContext = useContext<any>(ActivityContext);
  const activityRef = useRef<IBCTransaction | null>(null);
  const { showModal, hideModal } = useGlobalModalContext();
  const { interCosmosIBC } = useTransactionManager();
  const { getNativeToken } = usePortfolio();
  const { estimateGasForCosmosIBCRest } = useGasService();
  const { refreshPortfolio } = usePortfolioRefresh();
  const [maxLoading, setMaxLoading] = useState<boolean>(false);

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

  useEffect(() => {
    const temp: Chain[] = [];
    IBC_CHAINS.forEach(item => {
      if (tokenData.chainDetails.backendName !== item.backendName) {
        temp.push(item);
      }
    });

    setChainData(temp);
    setChain(temp[0]);
    void fetchNativeToken();
  }, []);

  const fetchNativeToken = async () => {
    const tempNativeToken = await getNativeToken(
      tokenData?.chainDetails?.backendName,
    );
    setNativeToken(tempNativeToken);
  };

  const getAddress = () => {
    switch (chain.backendName) {
      case ChainBackendNames.COSMOS:
        return cosmos.address;
      case ChainBackendNames.OSMOSIS:
        return osmosis.address;
      case ChainBackendNames.NOBLE:
        return noble.address;
      case ChainBackendNames.COREUM:
        return coreum.address;
      case ChainBackendNames.INJECTIVE:
        return injective.address;
      default:
        return undefined;
    }
  };

  useEffect(() => {
    const address = getAddress();
    setSenderAddress(address);
    if (receiverAddress === senderAddress && senderAddress !== '') {
      setReceiverAddress(address);
    } else setReceiverAddress('');
  }, [chain]);

  function onModalHide() {
    hideModal();
    setTimeout(() => {
      navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
    }, MODAL_HIDE_TIMEOUT_250);
  }

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

  const ibcTransfer = async (type = 'simulation'): Promise<void> => {
    try {
      const activityData: IBCTransaction = {
        id: genId(),
        status: ActivityStatus.PENDING,
        type: ActivityType.IBC,
        transactionHash: '',
        token: tokenData.name,
        fromChain: tokenData.chainDetails.name,
        toChain: chain.name,
        symbol: tokenData.symbol,
        tokenLogoUrl: tokenData.logoUrl,
        amount: limitDecimalPlaces(amount, 3),
        datetime: new Date(),
        receiverAddress,
      };

      if (type === 'txn') {
        activityRef.current = activityData;
        activityContext.dispatch({
          type: ActivityReducerAction.POST,
          value: activityRef.current,
        });
      }

      if (
        [
          ChainBackendNames.COSMOS,
          ChainBackendNames.OSMOSIS,
          ChainBackendNames.NOBLE,
          ChainBackendNames.COREUM,
          ChainBackendNames.INJECTIVE,
        ].includes(tokenData.chainDetails.backendName)
      ) {
        setLoading(true);
        const fromAddress = get(
          cosmosAddresses,
          tokenData.chainDetails.chainName,
        );
        if (type === 'simulation') {
          const gasDetails = await estimateGasForCosmosIBCRest({
            fromChain: tokenData?.chainDetails,
            toChain: chain,
            denom: tokenData?.denom,
            amount,
            fromAddress,
            toAddress: receiverAddress,
          });
          setGasFee(gasDetails?.gasFeeInCrypto);
          const hasEnoughNAtiveBalanceForGas =
            DecimalHelper.isGreaterThanOrEqualTo(
              DecimalHelper.fromString(nativeToken?.balanceDecimal),
              DecimalHelper.fromString(gasDetails?.gasFeeInCrypto),
            );
          if (hasEnoughNAtiveBalanceForGas) {
            setTimeout(() => {
              setSignModalVisible(true);
            }, 500);
          } else {
            await showModal('state', {
              type: 'error',
              title: 'Insufficient balance for gas',
              description: `You do not have enough balance in ${nativeToken?.name} to perform this action. Please load more ${nativeToken?.name} tokens in ${tokenData.chainDetails.name} chain to continue.`,
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
        } else if (type === 'txn') {
          const transaction = await interCosmosIBC({
            fromChain: tokenData.chainDetails,
            toChain: chain,
            denom: tokenData.denom,
            amount,
            fromAddress,
            toAddress: receiverAddress,
            contractDecimals: tokenData.contractDecimals,
          });
          if (!transaction.isError) {
            setSignModalVisible(false);
            setTimeout(
              () =>
                showModal('state', {
                  type: t<string>('TOAST_TYPE_SUCCESS'),
                  title: t<string>('IBC_SUCCESS'),
                  description: renderSuccessTransaction(transaction.hash),
                  onSuccess: onModalHide,
                  onFailure: onModalHide,
                }),
              MODAL_HIDE_TIMEOUT_600,
            );
            activityRef.current &&
              activityContext.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activityRef.current.id,
                  status: ActivityStatus.SUCCESS,
                  transactionHash: transaction.hash,
                },
              });
            // monitoring api
            void logAnalytics({
              type: AnalyticsType.SUCCESS,
              txnHash: transaction.hash,
              chain: tokenData.chainDetails?.backendName ?? '',
            });
            void refreshPortfolio();
          } else {
            activityRef.current &&
              activityContext.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activityRef.current.id,
                  status: ActivityStatus.FAILED,
                },
              });
            void logAnalytics({
              type: AnalyticsType.ERROR,
              chain: tokenData.chainDetails?.chainName ?? '',
              message: parseErrorMessage(transaction.error),
              screen: route.name,
            });
            Sentry.captureException(transaction.error);
            setSignModalVisible(false);
            setTimeout(
              () =>
                showModal('state', {
                  type: t<string>('TOAST_TYPE_ERROR'),
                  title: 'Transaction failed',
                  description: parseErrorMessage(transaction.error) ?? '',
                  onSuccess: hideModal,
                  onFailure: hideModal,
                }),
              MODAL_HIDE_TIMEOUT_250,
            );
          }
        }

        setLoading(false);
      }
    } catch (e) {
      Sentry.captureException(e, {
        extra: {
          action: 'ibcTransfer',
          chain: tokenData.chainDetails?.chainName,
          token: tokenData.name,
          amount,
          receiverAddress,
        },
      });
      setLoading(false);
    }
  };

  const onIBCSubmit = () => {
    showModal('state', {
      type: 'warning',
      title: 'Warning',
      description: t('IBC_WARNING'),
      onSuccess: () => {
        if (validateAmount(amount)) {
          hideModal();
          setTimeout(
            async () => await ibcTransfer('simulation'),
            MODAL_CLOSING_TIMEOUT,
          );
          setLoading(false);
        }
      },
      onFailure: hideModal,
    });
  };

  const handleMaxPress = async () => {
    try {
      setMaxLoading(true);
      let gasReserved = '0';
      if (tokenData?.isNativeToken) {
        const gasDetails = await estimateGasForCosmosIBCRest({
          fromChain: tokenData?.chainDetails,
          toChain: chain,
          denom: tokenData?.denom,
          amount: tokenData?.balanceDecimal,
          fromAddress: get(cosmosAddresses, tokenData.chainDetails.chainName),
          toAddress: receiverAddress,
        });

        if (gasDetails?.isError) {
          throw new Error('Error estimating gas');
        }

        gasReserved = gasDetails?.gasFeeInCrypto;
      }

      const maxAmount = DecimalHelper.subtract(
        tokenData.balanceDecimal,
        gasReserved,
      );
      const textAmount = DecimalHelper.isLessThan(maxAmount, 0)
        ? '0.00'
        : limitDecimalPlaces(maxAmount.toString(), 6);
      setAmount(textAmount);
    } catch (error) {
      // Handle error appropriately
    } finally {
      setMaxLoading(false);
    }
  };

  return (
    <CyDScrollView className={'w-full h-full bg-n20'}>
      <CyDKeyboardAwareScrollView>
        <ChooseChainModal
          setModalVisible={setShowChain}
          isModalVisible={showChain}
          data={chainData}
          title={'Choose Chain'}
          selectedItem={chain?.name}
          onPress={({ item }: { item: Chain }) => {
            setChain(item);
          }}
        />

        <SignatureModal
          isModalVisible={signModalVisible}
          setModalVisible={setSignModalVisible}
          onCancel={() => {
            setSignModalVisible(false);
          }}>
          <CyDView className={'px-[40px]'}>
            <CyDText
              className={'text-center  text-[24px] font-bold   mt-[20px]'}>
              {'Transfer tokens '}
            </CyDText>
            <CyDView
              className={
                'flex flex-row justify-around my-[20px] bg-n0 rounded-[20px] px-[15px] py-[20px] '
              }>
              <CyDView className={'flex items-center justify-center'}>
                <CyDImage
                  source={{ uri: tokenData.logoUrl }}
                  className={'w-[44px] h-[44px]'}
                />
                <CyDText
                  className={
                    'my-[6px] mx-[2px] text-[14px] font-semibold flex flex-row justify-center '
                  }>
                  {tokenData.name}
                </CyDText>
                <CyDView
                  className={
                    'bg-n0 rounded-[20px] flex flex-row items-center p-[4px]'
                  }>
                  <CyDImage
                    source={tokenData.chainDetails.logo_url}
                    className={'w-[14px] h-[14px]'}
                  />
                  <CyDText className={'ml-[6px]  font-normal text-[12px]'}>
                    {tokenData.chainDetails.name}
                  </CyDText>
                </CyDView>
              </CyDView>

              <CyDView className={'flex justify-center'}>
                <CyDMaterialDesignIcons
                  name={'arrow-right-thin'}
                  size={16}
                  className=''
                />
              </CyDView>

              <CyDView className={'flex items-center justify-center '}>
                <CyDImage
                  source={{ uri: tokenData.logoUrl }}
                  className={'w-[44px] h-[44px]'}
                />
                <CyDText
                  className={
                    'my-[6px] mx-[2px] text-[14px] font-semibold flex flex-row justify-center '
                  }>
                  {tokenData.name}
                </CyDText>
                <CyDView
                  className={
                    'bg-n0 rounded-[20px] flex flex-row items-center p-[4px]'
                  }>
                  <CyDImage
                    source={chain.logo_url}
                    className={'w-[14px] h-[14px]'}
                  />
                  <CyDText className={'ml-[6px] font-normal text-[12px]'}>
                    {chain.name}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-row justify-between mb-[14px]'}>
              <CyDText className={'  text-[16px] font-medium'}>
                {t('TO_ADDRESS')}
              </CyDText>
              <CyDView className={'mr-[6%] flex flex-col items-end'}>
                <CyDText className={' text-[16px] font-bold underline'}>
                  {receiverAddress.substring(0, 8) +
                    '...' +
                    receiverAddress.substring(receiverAddress.length - 8)}
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-row justify-between mb-[14px]'}>
              <CyDText className={'text-[16px] font-medium'}>
                {t('SENT_AMOUNT')}
              </CyDText>
              <CyDView className={'mr-[6%] flex flex-col items-end'}>
                <CyDText className={' text-[16px] font-bold'}>
                  {`${limitDecimalPlaces(amount, 3)} ${tokenData?.name}`}
                </CyDText>
                <CyDText className={' text-[12px] text-[#929292] font-bold'}>
                  {limitDecimalPlaces(
                    DecimalHelper.multiply(amount, tokenData.price),
                    3,
                  ) + ' USD'}
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-row justify-between mb-[14px]'}>
              <CyDText className={' text-[16px] font-medium'}>
                {t('TOTAL_GAS')}
              </CyDText>
              <CyDView className={'mr-[6%] flex flex-col items-end'}>
                <CyDText className={' text-[16px] font-bold'}>
                  {formatAmount(gasFee) + ' ' + String(nativeToken?.symbol)}
                </CyDText>
                <CyDText className={' text-[12px] text-base100 font-bold'}>
                  {String(
                    formatAmount(
                      DecimalHelper.multiply(nativeToken?.price, gasFee),
                    ),
                  ) + ' USD'}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>

          <CyDView
            className={
              'flex flex-row justify-between items-center px-[20px] pb-[42px]'
            }>
            <Button
              title={t<string>('CANCEL')}
              titleStyle='text-[14px]'
              disabled={loading}
              type={ButtonType.SECONDARY}
              onPress={() => {
                setSignModalVisible(false);
              }}
              style={'h-[60px] w-[166px] mx-[6px]'}
            />
            <Button
              title={'IBC'}
              titleStyle='text-[14px]'
              loading={loading}
              onPress={() => {
                void ibcTransfer('txn');
              }}
              isPrivateKeyDependent={true}
              style={'h-[60px] w-[166px] mx-[6px]'}
            />
          </CyDView>
        </SignatureModal>

        {!showMerged && (
          <CyDView>
            <CyDView
              className={
                'bg-n0 mx-[20px] border-[1px] border-n40 rounded-[16px] mt-[16px]'
              }>
              <CyDView className={'h-[60px] flex flex-row w-full'}>
                <CyDView
                  className={
                    'w-3/12 border-r-[1px] border-n40 bg-n0 px-[18px] rounded-l-[16px] flex items-center justify-center'
                  }>
                  <CyDText className={'text-[16px] font-extrabold'}>
                    {'From'}
                  </CyDText>
                  <CyDText className={'text-[16px] font-extrabold'}>
                    {'Chain'}
                  </CyDText>
                </CyDView>

                <CyDView
                  className={
                    'flex flex-row items-center justify-between w-9/12 p-[18px]'
                  }>
                  <CyDView className={'flex flex-row items-center'}>
                    <CyDImage
                      source={tokenData.chainDetails.logo_url}
                      className={'w-[30px] h-[30px]'}
                    />
                    <CyDText className={'text-center text-[16px] ml-[20px]'}>
                      {tokenData.chainDetails.name}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>

            <CyDView
              className={
                'bg-n0 mx-[20px] border-[1px] border-n40 rounded-[16px] mt-[16px]'
              }>
              <CyDView className={'h-[60px] flex flex-row w-full'}>
                <CyDView
                  className={
                    'w-3/12 border-r-[1px] border-n40 bg-n0 px-[18px] rounded-l-[16px] flex items-center justify-center'
                  }>
                  <CyDText className={' text-[16px] font-extrabold'}>
                    {'From'}
                  </CyDText>
                  <CyDText className={' text-[16px] font-extrabold'}>
                    {'Token'}
                  </CyDText>
                </CyDView>

                <CyDView
                  className={
                    'flex flex-row items-center justify-between w-9/12 p-[18px]'
                  }>
                  <CyDView className={'flex flex-row items-center'}>
                    <CyDImage
                      source={{ uri: tokenData.logoUrl }}
                      className={'w-[30px] h-[30px]'}
                    />
                    <CyDText className={'text-center  text-[16px] ml-[20px]'}>
                      {tokenData.name}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>

            <CyDTouchView
              className={
                'bg-n0 mx-[20px] my-[16px] border-[1px] border-n40 rounded-[16px]'
              }
              onPress={() => setShowChain(true)}>
              <CyDView className={'h-[60px] flex flex-row w-full'}>
                <CyDView
                  className={
                    'w-3/12 border-r-[1px] border-n40 bg-n0 px-[18px] rounded-l-[16px] flex items-center justify-center'
                  }>
                  <CyDText className={'text-[16px] font-extrabold'}>
                    {'To'}
                  </CyDText>
                  <CyDText className={' text-[16px] font-extrabold'}>
                    {'Chain'}
                  </CyDText>
                </CyDView>

                <CyDView
                  className={
                    'flex flex-row items-center justify-between w-9/12 p-[18px]'
                  }>
                  <CyDView className={'flex flex-row items-center'}>
                    <CyDImage
                      source={chain?.logo_url}
                      className={'w-[30px] h-[30px]'}
                    />
                    <CyDText className={'text-center text-[16px] ml-[20px]'}>
                      {chain?.name}
                    </CyDText>
                  </CyDView>
                  <CyDMaterialDesignIcons
                    name={'chevron-down'}
                    size={20}
                    className={'text-base400'}
                  />
                </CyDView>
              </CyDView>
            </CyDTouchView>

            <CyDView
              className={
                'bg-n0 mx-[20px] border-[1px] border-n40 rounded-[16px] pl-[16px] pr-[10px] py-[8px] h-[60px] flex flex-row justify-center items-center'
              }>
              <CyDTextInput
                className={clsx(
                  'font-medium text-left text-[16px] w-[90%] mr-[10px] rounded-[16px]',
                )}
                onChangeText={text => {
                  setReceiverAddress(text);
                }}
                placeholder={'Receiver Address'}
                placeholderTextColor={'#929292'}
                value={receiverAddress}
                autoFocus={false}
              />
              <CyDTouchView
                className={''}
                onPress={() => {
                  setReceiverAddress('');
                }}>
                <CyDMaterialDesignIcons
                  name={'close'}
                  size={24}
                  className='text-base400'
                />
              </CyDTouchView>
            </CyDView>

            <CyDTouchView
              className={
                'flex flex-row justify-end mx-[30px] mb-[16px] mt-[4px]'
              }
              onPress={() => {
                const address = getAddress();
                setReceiverAddress(address);
              }}>
              <CyDText className={'underline font-normal text-[12px]'}>
                {'Use My Address'}
              </CyDText>
            </CyDTouchView>

            <CyDView
              className={
                'bg-n0 mx-[20px] border-[1px] border-n40 rounded-[16px] pl-[16px] pr-[10px] py-[8px] h-[60px] flex flex-row justify-center items-center'
              }>
              <CyDTextInput
                className={clsx(
                  'font-medium text-left text-black  text-[16px] w-[90%] mr-[10px]',
                )}
                onChangeText={text => {
                  setMemo(text);
                }}
                placeholder={'Memo (optional)'}
                placeholderTextColor={'#929292'}
                value={memo}
                autoFocus={false}
              />
              <CyDTouchView
                className={''}
                onPress={() => {
                  setMemo('');
                }}>
                <CyDMaterialDesignIcons
                  name={'close'}
                  size={24}
                  className='text-base400'
                />
              </CyDTouchView>
            </CyDView>
          </CyDView>
        )}

        {showMerged && (
          <CyDTouchView
            onPress={() => {
              setShowMerged(false);
            }}
            className={
              'flex flex-row justify-between my-[16px] bg-n40 rounded-[20px] mx-[20px] px-[15px] py-[20px] '
            }>
            <CyDView className={'flex items-center justify-center'}>
              <CyDImage
                source={{ uri: tokenData.logoUrl }}
                className={'w-[44px] h-[44px]'}
              />
              <CyDText
                className={
                  'my-[6px] mx-[2px] text-[14px] font-semibold flex flex-row justify-center '
                }>
                {tokenData.name}
              </CyDText>
              <CyDView
                className={
                  'bg-n0 rounded-[20px] flex flex-row items-center p-[4px]'
                }>
                <CyDImage
                  source={tokenData.chainDetails.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText className={'ml-[6px]  font-normal text-[12px]'}>
                  {tokenData.chainDetails.name}
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex justify-center'}>
              <CyDMaterialDesignIcons
                name={'arrow-right-thin'}
                size={16}
                className=''
              />
            </CyDView>

            <CyDView className={'flex items-center justify-center '}>
              <CyDImage
                source={{ uri: tokenData.logoUrl }}
                className={'w-[44px] h-[44px]'}
              />
              <CyDText
                className={
                  'my-[6px] mx-[2px] text-[14px] font-semibold flex flex-row justify-center '
                }>
                {tokenData.name}
              </CyDText>
              <CyDView
                className={
                  'bg-n0 rounded-[20px] flex flex-row items-center p-[4px]'
                }>
                <CyDImage
                  source={chain.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText className={'ml-[6px] font-normal text-[12px]'}>
                  {chain?.name}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDTouchView>
        )}

        <CyDTouchView
          className={clsx(
            ' mt-[25px] pb-[30px] bg-n0 mx-[20px] rounded-[20px]',
          )}
          onPress={() => {
            amount === '0.00' ? setAmount('') : setAmount(amount);
            setShowMerged(true);
          }}>
          <CyDText
            className={'font-extrabold text-[22px] text-center mt-[20px]'}>
            {'Enter Amount'}
          </CyDText>

          <CyDText
            className={
              'font-extrabold text-[20px] text-center mt-[10px]  bottom-0'
            }>
            {tokenData.name}
          </CyDText>

          <CyDView className={'flex items-center justify-center '}>
            {!showMerged && (
              <CyDText
                className={clsx('font-bold text-[70px] h-[80px] text-justify')}>
                {limitDecimalPlaces(amount, 2)}
              </CyDText>
            )}
            {showMerged && (
              <CyDView
                className={
                  'flex flex-row items-center justify-center relative'
                }>
                <CyDTouchView
                  onPress={() => void handleMaxPress()}
                  className={clsx(
                    'absolute bg-n0 rounded-full h-[40px] w-[40px] flex justify-center items-center ' +
                      'p-[4px] left-[-14%]',
                  )}>
                  {maxLoading ? (
                    <ActivityIndicator size='small' color='#000000' />
                  ) : (
                    <CyDText className={''}>{'MAX'}</CyDText>
                  )}
                </CyDTouchView>
                <CyDTextInput
                  className={clsx(
                    'font-bold text-center h-[80px]  w-8/12 pt-[16px]',
                    {
                      'text-[70px]': amount.length <= 5,
                      'text-[40px]': amount.length > 5,
                    },
                  )}
                  keyboardType='numeric'
                  onChangeText={(text: string) => {
                    setAmount(text);
                  }}
                  value={amount}
                  autoFocus={true}
                />
              </CyDView>
            )}
          </CyDView>
          <CyDView className='flex flex-row flex-wrap justify-center items-center'>
            <CyDText
              className={
                'font-semibold text-[14px] text-center text-base100 mt-[8px] mr-1'
              }>{`${tokenData.name} balance `}</CyDText>
            <CyDTokenAmount className='ml-[10px]' decimalPlaces={6}>
              {tokenData.balanceDecimal}
            </CyDTokenAmount>
          </CyDView>
        </CyDTouchView>

        <CyDView className={'flex flex-row items-center justify-center mt-4'}>
          <Button
            title={t('SUBMIT')}
            loading={loading}
            disabled={
              loading ||
              DecimalHelper.isLessThanOrEqualTo(amount, 0) ||
              receiverAddress === '' ||
              DecimalHelper.isGreaterThan(amount, tokenData.balanceDecimal)
            }
            onPress={() => {
              onIBCSubmit();
            }}
            isPrivateKeyDependent={true}
            style={'w-[90%] h-[60px]'}
          />
        </CyDView>
      </CyDKeyboardAwareScrollView>
    </CyDScrollView>
  );
}
