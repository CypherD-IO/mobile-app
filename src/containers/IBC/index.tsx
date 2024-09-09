import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import ChooseChainModal from '../../components/v2/chooseChainModal';
import AppImages from '../../../assets/images/appImages';
import {
  ActivityContext,
  HdWalletContext,
  validateAmount,
  limitDecimalPlaces,
  logAnalytics,
  parseErrorMessage,
  getNativeToken,
  PortfolioContext,
  formatAmount,
} from '../../core/util';
import clsx from 'clsx';
import {
  Chain,
  ChainBackendNames,
  ChainNameMapping,
  IBC_CHAINS,
  NativeTokenMapping,
} from '../../constants/server';
import { gasFeeReservation } from '../../constants/data';
import * as Sentry from '@sentry/react-native';
import SignatureModal from '../../components/v2/signatureModal';
import { screenTitle } from '../../constants';
import { MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
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
import { get, random } from 'lodash';
import useGasService from '../../hooks/useGasService';
import useTransactionManager from '../../hooks/useTransactionManager';

export default function IBC({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const { tokenData } = route.params;
  const portfolioState = useContext<any>(PortfolioContext);
  const nativeToken = getNativeToken(
    get(NativeTokenMapping, tokenData?.chainDetails.symbol) ||
      tokenData?.chainDetails.symbol,
    portfolioState.statePortfolio.tokenPortfolio[
      get(ChainNameMapping, tokenData?.chainDetails.backendName)
    ].holdings,
  );
  const { t } = useTranslation();
  const hdWallet = useContext<any>(HdWalletContext);
  const cosmos = hdWallet.state.wallet.cosmos;
  const osmosis = hdWallet.state.wallet.osmosis;
  const juno = hdWallet.state.wallet.juno;
  const stargaze = hdWallet.state.wallet.stargaze;
  const noble = hdWallet.state.wallet.noble;
  const coreum = hdWallet.state.wallet.coreum;
  const injective = hdWallet.state.wallet.injective;
  const kujira = hdWallet.state.wallet.kujira;

  const cosmosAddresses = {
    cosmos: cosmos.address,
    osmosis: osmosis.address,
    juno: juno.address,
    stargaze: stargaze.address,
    noble: noble.address,
    coreum: coreum.address,
    injective: injective.address,
    kujira: kujira.address,
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
  const [gasFee, setGasFee] = useState<string | number>(0);
  const activityContext = useContext<any>(ActivityContext);
  const activityRef = useRef<IBCTransaction | null>(null);
  const { showModal, hideModal } = useGlobalModalContext();
  const { interCosmosIBC } = useTransactionManager();
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
      if (
        (tokenData.chainDetails.backendName === ChainBackendNames.STARGAZE &&
          item.backendName === ChainBackendNames.COSMOS) ||
        (tokenData.chainDetails.backendName === ChainBackendNames.COSMOS &&
          item.backendName === ChainBackendNames.STARGAZE)
      ) {
        return;
      }
      if (tokenData.chainDetails.backendName !== item.backendName) {
        temp.push(item);
      }
    });

    setChainData(temp);
    setChain(temp[0]);
  }, []);

  const getAddress = () => {
    switch (chain.backendName) {
      case ChainBackendNames.COSMOS:
        return cosmos.address;
      case ChainBackendNames.OSMOSIS:
        return osmosis.address;
      case ChainBackendNames.JUNO:
        return juno.address;
      case ChainBackendNames.STARGAZE:
        return stargaze.address;
      case ChainBackendNames.NOBLE:
        return noble.address;
      case ChainBackendNames.COREUM:
        return coreum.address;
      case ChainBackendNames.INJECTIVE:
        return injective.address;
      case ChainBackendNames.KUJIRA:
        return kujira.address;
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
      amount: parseFloat(amount).toFixed(3),
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
        ChainBackendNames.JUNO,
        ChainBackendNames.STARGAZE,
        ChainBackendNames.NOBLE,
        ChainBackendNames.COREUM,
        ChainBackendNames.INJECTIVE,
        ChainBackendNames.KUJIRA,
      ].includes(tokenData.chainDetails.backendName)
    ) {
      setLoading(true);
      const fromAddress = get(
        cosmosAddresses,
        tokenData.chainDetails.chainName,
      );
      if (type === 'simulation') {
        const gasDetails = {
          gasFeeInCrypto: parseFloat(String(random(0.01, 0.1, true))).toFixed(
            4,
          ),
        };
        setGasFee(gasDetails?.gasFeeInCrypto);
        setSignModalVisible(true);
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
            MODAL_HIDE_TIMEOUT_250,
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
            chain: tokenData.chainDetails?.chainName ?? '',
          });
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

  return (
    <CyDScrollView className={'w-full h-full bg-white'}>
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
          type={'chain'}
        />

        <SignatureModal
          isModalVisible={signModalVisible}
          setModalVisible={setSignModalVisible}
          onCancel={() => {
            setSignModalVisible(false);
          }}>
          <CyDView className={'px-[40px]'}>
            <CyDText
              className={
                'text-center font-manrope text-[24px] font-bold   mt-[20px]'
              }>
              {'Transfer tokens '}
            </CyDText>
            <CyDView
              className={
                'flex flex-row justify-around my-[20px] bg-[#F7F8FE] rounded-[20px] px-[15px] py-[20px] '
              }>
              <CyDView className={'flex items-center justify-center'}>
                <CyDImage
                  source={{ uri: tokenData.logoUrl }}
                  className={'w-[44px] h-[44px]'}
                />
                <CyDText
                  className={
                    'my-[6px] mx-[2px] text-black text-[14px] font-semibold flex flex-row justify-center font-manrope'
                  }>
                  {tokenData.name}
                </CyDText>
                <CyDView
                  className={
                    'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                  }>
                  <CyDImage
                    source={tokenData.chainDetails.logo_url}
                    className={'w-[14px] h-[14px]'}
                  />
                  <CyDText
                    className={
                      'ml-[6px] font-manrope font-normal text-black  text-[12px]'
                    }>
                    {tokenData.chainDetails.name}
                  </CyDText>
                </CyDView>
              </CyDView>

              <CyDView className={'flex justify-center'}>
                <CyDImage source={AppImages.RIGHT_ARROW_LONG} />
              </CyDView>

              <CyDView className={'flex items-center justify-center '}>
                <CyDImage
                  source={{ uri: tokenData.logoUrl }}
                  className={'w-[44px] h-[44px]'}
                />
                <CyDText
                  className={
                    'my-[6px] mx-[2px] text-black text-[14px] font-semibold flex flex-row justify-center font-manrope'
                  }>
                  {tokenData.name}
                </CyDText>
                <CyDView
                  className={
                    'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                  }>
                  <CyDImage
                    source={chain.logo_url}
                    className={'w-[14px] h-[14px]'}
                  />
                  <CyDText
                    className={
                      'ml-[6px] font-manrope text-black font-normal text-[12px]'
                    }>
                    {chain.name}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-row justify-between mb-[14px]'}>
              <CyDText
                className={
                  'font-[#434343] font-manrope font-[16px] text-medium'
                }>
                {t('TO_ADDRESS')}
              </CyDText>
              <CyDView className={'mr-[6%] flex flex-col items-end'}>
                <CyDText
                  className={
                    'font-manrope font-[16px] text-black font-bold underline'
                  }>
                  {receiverAddress.substring(0, 8) +
                    '...' +
                    receiverAddress.substring(receiverAddress.length - 8)}
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-row justify-between mb-[14px]'}>
              <CyDText
                className={
                  'font-[#434343] font-manrope font-[16px] text-medium'
                }>
                {t('SENT_AMOUNT')}
              </CyDText>
              <CyDView className={'mr-[6%] flex flex-col items-end'}>
                <CyDText
                  className={'font-manrope font-[16px] text-black font-bold'}>
                  {`${parseFloat(amount).toFixed(3)} ${tokenData.name}`}
                </CyDText>
                <CyDText
                  className={
                    'font-manrope font-[12px] text-[#929292] font-bold'
                  }>
                  {(tokenData.price * parseFloat(amount)).toFixed(3) + ' USD'}
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-row justify-between mb-[14px]'}>
              <CyDText
                className={
                  'font-[#434343] font-manrope font-[16px] text-medium'
                }>
                {t('TOTAL_GAS')}
              </CyDText>
              <CyDView className={'mr-[6%] flex flex-col items-end'}>
                <CyDText
                  className={'font-manrope font-[16px] text-black font-bold'}>
                  {String(formatAmount(Number(gasFee))) +
                    ' ' +
                    String(nativeToken?.symbol)}
                </CyDText>
                <CyDText
                  className={
                    'font-manrope font-[12px] text-[#929292] font-bold'
                  }>
                  {String(
                    formatAmount(Number(nativeToken.price) * Number(gasFee)),
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
                'bg-[#F7F8FE] mx-[20px] border-[1px] border-[#EBEBEB] rounded-[16px] mt-[16px]'
              }>
              <CyDView className={'h-[60px] flex flex-row w-full'}>
                <CyDView
                  className={
                    'w-3/12 border-r-[1px] border-[#EBEBEB] bg-white px-[18px] rounded-l-[16px] flex items-center justify-center'
                  }>
                  <CyDText
                    className={'text-[#434343] text-[16px] font-extrabold'}>
                    {'From'}
                  </CyDText>
                  <CyDText
                    className={'text-[#434343] text-[16px] font-extrabold'}>
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
                    <CyDText
                      className={
                        'text-center text-black font-manrope text-[16px] ml-[20px]'
                      }>
                      {tokenData.chainDetails.name}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>

            <CyDView
              className={
                'bg-[#F7F8FE] mx-[20px] border-[1px] border-[#EBEBEB] rounded-[16px] mt-[16px]'
              }>
              <CyDView className={'h-[60px] flex flex-row w-full'}>
                <CyDView
                  className={
                    'w-3/12 border-r-[1px] border-[#EBEBEB] bg-white px-[18px] rounded-l-[16px] flex items-center justify-center'
                  }>
                  <CyDText
                    className={'text-[#434343] text-[16px] font-extrabold'}>
                    {'From'}
                  </CyDText>
                  <CyDText
                    className={'text-[#434343] text-[16px] font-extrabold'}>
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
                    <CyDText
                      className={
                        'text-center text-black font-manrope text-[16px] ml-[20px]'
                      }>
                      {tokenData.name}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>

            <CyDTouchView
              className={
                'bg-[#F7F8FE] mx-[20px] my-[16px] border-[1px] border-[#EBEBEB] rounded-[16px]'
              }
              onPress={() => setShowChain(true)}>
              <CyDView className={'h-[60px] flex flex-row w-full'}>
                <CyDView
                  className={
                    'w-3/12 border-r-[1px] border-[#EBEBEB] bg-white px-[18px] rounded-l-[16px] flex items-center justify-center'
                  }>
                  <CyDText
                    className={'text-[#434343] text-[16px] font-extrabold'}>
                    {'To'}
                  </CyDText>
                  <CyDText
                    className={'text-[#434343] text-[16px] font-extrabold'}>
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
                    <CyDText
                      className={
                        'text-center text-black font-manrope text-[16px] ml-[8px] ml-[20px]'
                      }>
                      {chain?.name}
                    </CyDText>
                  </CyDView>
                  <CyDImage source={AppImages.DOWN_ARROW} />
                </CyDView>
              </CyDView>
            </CyDTouchView>

            <CyDView
              className={
                'bg-[#F7F8FE] mx-[20px] border-[1px] border-[#EBEBEB] rounded-[16px] pl-[16px] pr-[10px] py-[8px] h-[60px] flex flex-row justify-center items-center'
              }>
              <CyDTextInput
                className={clsx(
                  'font-medium text-left text-black font-manrope text-[16px] w-[90%] mr-[10px]',
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
                <CyDImage source={AppImages.CLOSE_CIRCLE} />
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
              <CyDText
                className={'underline font-normal text-[12px] text-black'}>
                {'Use My Address'}
              </CyDText>
            </CyDTouchView>

            <CyDView
              className={
                'bg-[#F7F8FE] mx-[20px] border-[1px] border-[#EBEBEB] rounded-[16px] pl-[16px] pr-[10px] py-[8px] h-[60px] flex flex-row justify-center items-center'
              }>
              <CyDTextInput
                className={clsx(
                  'font-medium text-left text-black font-manrope text-[16px] w-[90%] mr-[10px]',
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
                <CyDImage source={AppImages.CLOSE_CIRCLE} />
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
              'flex flex-row justify-between my-[16px] bg-[#F7F8FE] rounded-[20px] mx-[20px] px-[15px] py-[20px] '
            }>
            <CyDView className={'flex items-center justify-center'}>
              <CyDImage
                source={{ uri: tokenData.logoUrl }}
                className={'w-[44px] h-[44px]'}
              />
              <CyDText
                className={
                  'my-[6px] mx-[2px] text-black text-[14px] font-semibold flex flex-row justify-center font-manrope'
                }>
                {tokenData.name}
              </CyDText>
              <CyDView
                className={
                  'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                }>
                <CyDImage
                  source={tokenData.chainDetails.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText
                  className={
                    'ml-[6px] font-manrope text-black font-normal text-[12px]'
                  }>
                  {tokenData.chainDetails.name}
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex justify-center'}>
              <CyDImage
                source={AppImages.RIGHT_ARROW_LONG}
                style={{ tintColor: 'black' }}
                className={'w-[40px] h-[20px]'}
              />
            </CyDView>

            <CyDView className={'flex items-center justify-center '}>
              <CyDImage
                source={{ uri: tokenData.logoUrl }}
                className={'w-[44px] h-[44px]'}
              />
              <CyDText
                className={
                  'my-[6px] mx-[2px] text-black text-[14px] font-semibold flex flex-row justify-center font-manrope'
                }>
                {tokenData.name}
              </CyDText>
              <CyDView
                className={
                  'bg-white rounded-[20px] flex flex-row items-center p-[4px]'
                }>
                <CyDImage
                  source={chain.logo_url}
                  className={'w-[14px] h-[14px]'}
                />
                <CyDText
                  className={
                    'ml-[6px] font-manrope text-black font-normal text-[12px]'
                  }>
                  {chain?.name}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDTouchView>
        )}

        <CyDTouchView
          className={clsx(
            ' mt-[25px] pb-[30px] bg-[#F7F8FE] mx-[20px] rounded-[20px]',
          )}
          onPress={() => {
            amount === '0.00' ? setAmount('') : setAmount(amount);
            setShowMerged(true);
          }}>
          <CyDText
            className={
              'font-extrabold text-[22px] text-center mt-[20px] font-manrope text-black'
            }>
            {'Enter Amount'}
          </CyDText>

          <CyDText
            className={
              'font-extrabold text-[20px] text-center mt-[10px] font-manrope bottom-0 text-black '
            }>
            {tokenData.name}
          </CyDText>

          <CyDView className={'flex items-center justify-center items-center'}>
            {!showMerged && (
              <CyDText
                className={clsx(
                  'font-bold text-[70px] h-[80px] text-justify font-manrope text-black ',
                )}>
                {parseFloat(amount).toFixed(2)}
              </CyDText>
            )}
            {showMerged && (
              <CyDView
                className={
                  'flex flex-row items-center justify-center relative'
                }>
                <CyDTouchView
                  onPress={() => {
                    const gasReserved =
                      tokenData?.chainDetails?.symbol === tokenData?.symbol
                        ? gasFeeReservation[tokenData.chainDetails.backendName]
                        : 0;

                    const maxAmount =
                      parseFloat(tokenData?.actualBalance) - gasReserved;
                    const textAmount =
                      maxAmount < 0
                        ? '0.00'
                        : limitDecimalPlaces(maxAmount.toString(), 6);
                    setAmount(textAmount);
                  }}
                  className={clsx(
                    'absolute bg-white rounded-full h-[40px] w-[40px] flex justify-center items-center ' +
                      'p-[4px] left-[-14%]',
                  )}>
                  <CyDText className={'font-manrope text-black '}>
                    {'MAX'}
                  </CyDText>
                </CyDTouchView>
                <CyDTextInput
                  className={clsx(
                    'font-bold text-center text-black h-[80px] font-manrope w-8/12 pt-[16px]',
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
                'font-semibold text-[14px] text-center text-[#929292] font-manrope mt-[8px]'
              }>{`${tokenData.name} balance`}</CyDText>
            <CyDTokenAmount className='ml-[10px]' decimalPlaces={6}>
              {tokenData.actualBalance}
            </CyDTokenAmount>
          </CyDView>
        </CyDTouchView>

        <CyDView
          className={'flex flex-row items-center justify-center my-[10px]'}>
          <Button
            title={t('SUBMIT')}
            loading={loading}
            disabled={
              loading ||
              parseFloat(amount) <= 0 ||
              receiverAddress === '' ||
              parseFloat(amount) > parseFloat(tokenData.actualBalance)
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
