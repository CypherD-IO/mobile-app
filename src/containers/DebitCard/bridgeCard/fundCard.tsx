import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard } from 'react-native';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import { ChainNames, COSMOS_CHAINS, ChainNameMapping, NativeTokenMapping } from '../../../constants/server';
import {
  ActivityContext,
  getWeb3Endpoint,
  HdWalletContext,
  PortfolioContext,
  getNativeTokenBalance
} from '../../../core/util';
import { CyDFastImage, CyDImage, CyDSafeAreaView, CyDText, CyDTextInput, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import { MODAL_HIDE_TIMEOUT_250 } from '../../../core/Http';
import { getGasPriceFor } from '../../Browser/gasHelper';
import { GasPriceDetail } from '../../../core/types';
import * as Sentry from '@sentry/react-native';
import { GlobalContext } from '../../../core/globalContext';
import Web3 from 'web3';
import { ethers } from 'ethers';
import { cosmosSendTokens, estimateGasForCosmosTransaction, estimateGasForNativeTransaction, getCosmosSignerClient, sendNativeCoinOrTokenToAnyAddress } from '../../../core/NativeTransactionHandler';
import { ActivityStatus, DebitCardTransaction, ActivityReducerAction, ActivityType } from '../../../reducers/activity_reducer';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import BottomTokenCardConfirm from '../../../components/BottomTokenCardConfirm';
import { genId } from '../../utilities/activityUtilities';
import { intercomAnalyticsLog } from '../../utilities/analyticsUtility';
import { CHOOSE_TOKEN_MODAL_TIMEOUT } from '../../../constants/timeOuts';
import { hostWorker } from '../../../global';
import { screenTitle } from '../../../constants';
import { useIsFocused } from '@react-navigation/native';
import { gasFeeReservation } from '../../../constants/data';
import ChooseTokenModal from '../../../components/v2/chooseTokenModal';
import CyDTokenAmount from '../../../components/v2/tokenAmount';
import useAxios from '../../../core/HttpRequest';
import { get } from 'lodash';
import { CardProviders } from '../../../constants/enum';

export default function BridgeFundCardScreen ({ route }: {route: any}) {
  const { navigation, currentCardProvider, currentCardIndex }: {navigation: any, currentCardProvider: CardProviders, currentCardIndex: number} = route.params;
  const portfolioState = useContext<any>(PortfolioContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ethereum = hdWallet.state.wallet.ethereum;
  const wallet = hdWallet.state.wallet;
  const globalStateContext = useContext<any>(GlobalContext);
  const activityContext = useContext<any>(ActivityContext);
  const cardProfile = globalContext.globalState.cardProfile;
  const { cardId, last4 }: {cardId: string, last4: string} = get(cardProfile, currentCardProvider)?.cards[currentCardIndex];
  const activityRef = useRef<DebitCardTransaction | null>(null);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { getWithAuth, postWithAuth } = useAxios();

  const cosmos = hdWallet.state.wallet.cosmos;
  const osmosis = hdWallet.state.wallet.osmosis;
  const juno = hdWallet.state.wallet.juno;
  const stargaze = hdWallet.state.wallet.stargaze;
  const noble = hdWallet.state.wallet.noble;

  const senderAddress = {
    cosmos: cosmos.address,
    osmosis: osmosis.address,
    juno: juno.address,
    stargaze: stargaze.address,
    noble: noble.address
  };

  const rpc = {
    cosmos: globalStateContext.globalState.rpcEndpoints.COSMOS.primary,
    osmosis: globalStateContext.globalState.rpcEndpoints.OSMOSIS.primary,
    juno: globalStateContext.globalState.rpcEndpoints.JUNO.primary,
    stargaze: globalContext.globalState.rpcEndpoints.STARGAZE.primary,
    noble: globalContext.globalState.rpcEndpoints.NOBLE.primary
  };

  const [isChooseTokenVisible, setIsChooseTokenVisible] = useState<boolean>(false);
  const [payTokenBottomConfirm, setPayTokenBottomConfirm] = useState<boolean>(false);
  const [payTokenModalParams, setPayTokenModalParams] = useState<any>({});
  const [cosmosPayTokenModalParams, setCosmosPayTokenModalParams] = useState<any>({});
  const [tokenQuote, setTokenQuote] = useState<any>({});
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [lowBalance, setLowBalance] = useState<boolean>(false);
  const minTokenValueLimit = 10;
  const maxTokenValueLimit = 1000;
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });
  const [selectedToken, setSelectedToken] = useState();
  const [nativeTokenBalance, setNativeTokenBalance] = useState<number>(0);
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const tokenQuoteExpiry = 60;
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      if (route.params?.tokenData) {
        setSelectedToken(route.params.tokenData);
      } else {
        setTimeout(() => {
          setIsChooseTokenVisible(true);
        }, CHOOSE_TOKEN_MODAL_TIMEOUT);
      }
    }
  }, [isFocused]);

  useEffect(() => {
    if (payTokenModalParams.tokenAmount && activityRef.current === null) {
      const activityData: DebitCardTransaction = {
        id: genId(),
        status: ActivityStatus.PENDING,
        type: ActivityType.CARD,
        quoteId: '',
        tokenSymbol: payTokenModalParams.tokenSymbol.toString() ?? '',
        chainName: selectedToken?.chainDetails?.backendName.toString() ?? '',
        tokenName: selectedToken?.name.toString() ?? '',
        amount: payTokenModalParams.tokenAmount.toString() ?? '',
        amountInUsd: payTokenModalParams.totalValueDollar.toString() ?? '',
        datetime: new Date(),
        transactionHash: ''
      };

      activityRef.current = activityData;
      activityContext.dispatch({ type: ActivityReducerAction.POST, value: activityRef.current });
    }
  }, [payTokenModalParams]);

  const payTokenModal = (payTokenModalParamsLocal: any) => {
    payTokenModalParamsLocal.tokenQuoteExpiry = tokenQuoteExpiry;
    payTokenModalParamsLocal.cardNumber = 'xxxx xxxx xxxx ' + last4;
    setPayTokenModalParams(payTokenModalParamsLocal);
    setPayTokenBottomConfirm(true);
  };

  const cosmosPayTokenModal = (cosmosPayTokenModalParamsLocal: any) => {
    setCosmosPayTokenModalParams(cosmosPayTokenModalParamsLocal);
    const payTokenModalParamsLocal = {
      gasFeeDollar: cosmosPayTokenModalParamsLocal.finalGasPrice,
      gasFeeETH: cosmosPayTokenModalParamsLocal.gasFeeNative,
      networkName: cosmosPayTokenModalParamsLocal.chain,
      networkCurrency: cosmosPayTokenModalParamsLocal.sentTokenSymbol,
      totalDollar: parseFloat(cosmosPayTokenModalParamsLocal.gasFeeNative) + parseFloat(cosmosPayTokenModalParams),
      appImage: cosmosPayTokenModalParamsLocal.appImage,
      tokenImage: cosmosPayTokenModalParamsLocal.tokenImage,
      finalGasPrice: cosmosPayTokenModalParamsLocal.finalGasPrice,
      gasLimit: cosmosPayTokenModalParamsLocal.fee.gas,
      gasPrice: cosmosPayTokenModalParamsLocal.gasPrice,
      tokenSymbol: cosmosPayTokenModalParamsLocal.sentTokenSymbol,
      tokenAmount: cosmosPayTokenModalParamsLocal.sentTokenAmount,
      tokenValueDollar: cosmosPayTokenModalParamsLocal.sentValueUSD,
      tokenQuoteExpiry,
      totalValueTransfer: (parseFloat(cosmosPayTokenModalParamsLocal.gasFeeNative) + parseFloat(cosmosPayTokenModalParamsLocal.sentTokenAmount)).toFixed(6),
      totalValueDollar: (parseFloat(cosmosPayTokenModalParamsLocal.finalGasPrice) + parseFloat(cosmosPayTokenModalParamsLocal.sentValueUSD)).toFixed(6),
      cardNumber: 'xxxx xxxx xxxx ' + last4
    };
    setPayTokenModalParams(payTokenModalParamsLocal);
    setPayTokenBottomConfirm(true);
  };

  const transferSentQuote = async (address: string, quoteUUID: string, txnHash: string) => {
    const transferSentUrl = `/v1/cards/${currentCardProvider}/card/${cardId}/deposit`;
    const body = {
      address,
      quoteUUID,
      txnHash
    };

    try {
      const response = await postWithAuth(transferSentUrl, body);
      if (!response.isError && response.status === 201) {
        activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityRef.current.id, status: ActivityStatus.INPROCESS, transactionHash: txnHash, quoteId: quoteUUID } });
        setLoading(false);
        showModal('state', {
          type: 'success',
          title: '',
          description: 'Success, Your card funding is in progress and will be done within 5 mins!',
          onSuccess: () => {
            hideModal();
            setTimeout(() => {
              navigation.navigate(screenTitle.OPTIONS, { screen: screenTitle.ACTIVITIES, initial: false });
              navigation.popToTop();
            }, MODAL_HIDE_TIMEOUT_250);
          },
          onFailure: hideModal
        });
      } else {
        activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityRef.current.id, status: ActivityStatus.FAILED, quoteId: quoteUUID, transactionHash: txnHash, reason: `Please contact customer support with the quote_id: ${quoteUUID}` } });
        setLoading(false);
        showModal('state', { type: 'error', title: 'Error processing your txn', description: `Please contact customer support with the quote_id: ${quoteUUID}`, onSuccess: hideModal, onFailure: hideModal });
      }
    } catch (error) {
      activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityRef.current.id, status: ActivityStatus.FAILED, quoteId: quoteUUID, transactionHash: txnHash, reason: `Please contact customer support with the quote_id: ${quoteUUID}` } });
      Sentry.captureException(error);
      setLoading(false);
      showModal('state', { type: 'error', title: 'Error processing your txn', description: `Please contact customer support with the quote_id: ${quoteUUID}`, onSuccess: hideModal, onFailure: hideModal });
    };
  };

  const handleTransactionResult = (message: string, quoteUUID: string, fromAddress: string, isError: boolean) => {
    if (isError) {
      activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityRef.current.id, status: ActivityStatus.FAILED, quoteId: quoteUUID, reason: message } });
      setLoading(false);
      showModal('state', { type: 'error', title: 'Transaction Failed', description: `${message}. Please contact customer support with the quote_id: ${quoteUUID}`, onSuccess: hideModal, onFailure: hideModal });
    } else {
      void transferSentQuote(fromAddress, quoteUUID, message);
    }
  };

  const handleSuccessfulTransaction = async (result: any, analyticsData: any) => {
    try {
      await intercomAnalyticsLog('transaction_submit', analyticsData);
    } catch (error) {
      Sentry.captureException(error);
    }
    void transferSentQuote(analyticsData.from, analyticsData.uuid, result.transactionHash);
  };

  const handleFailedTransaction = async (_err: any, uuid: string) => {
    // Sentry.captureException(err);
    activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityRef.current.id, status: ActivityStatus.FAILED, quoteId: uuid, reason: `Please contact customer support with the quote_id: ${uuid}` } });
    setLoading(false);
    showModal('state', { type: 'error', title: 'Error processing your txn', description: `Please contact customer support with the quote_id: ${uuid}`, onSuccess: hideModal, onFailure: hideModal });
  };

  const sendTransaction = async (payTokenModalParamsLocal: any) => {
    const { contractAddress, chainDetails, contractDecimals } = selectedToken;
    const { chainName } = selectedToken.chainDetails;
    const currentTimeStamp = new Date();
    setLoading(true);
    setPayTokenBottomConfirm(false);
    if (Math.floor((Number(currentTimeStamp) - tokenQuote.expiry) / 1000) < tokenQuoteExpiry) {
      activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityRef.current.id, gasAmount: payTokenModalParams.gasFeeDollar } });
      if (chainName != null) {
        if (chainName === ChainNames.ETH || chainName === ChainNames.EVMOS) {
          void intercomAnalyticsLog('send_token_for_card', {
            from: ethereum.address,
            dollar: selectedToken.chainDetails,
            token_quantity: tokenQuote.tokenRequired,
            from_contract: contractAddress,
            quote_uuid: tokenQuote.quoteUUID
          });
          await sendNativeCoinOrTokenToAnyAddress(
            hdWallet,
            portfolioState,
            chainDetails,
            tokenQuote.tokenRequired,
            contractAddress,
            contractDecimals,
            tokenQuote.quoteUUID,
            handleTransactionResult,
            tokenQuote.targetWallet,
            payTokenModalParamsLocal.finalGasPrice,
            payTokenModalParamsLocal.gasLimit,
            globalContext
          );
        } else if (COSMOS_CHAINS.includes(chainName)) {
          const amount = (ethers.utils.parseUnits(parseFloat(cosmosPayTokenModalParams.sentTokenAmount.length > 8 ? cosmosPayTokenModalParams.sentTokenAmount.substring(0, 8) : cosmosPayTokenModalParams.sentTokenAmount).toFixed(6), 6)).toString();
          await cosmosSendTokens(
            cosmosPayTokenModalParams.to_address,
            cosmosPayTokenModalParams.signingClient,
            cosmosPayTokenModalParams.fee,
            get(senderAddress, chainName),
            amount, t('FUND_CARD_MEMO'),
            handleSuccessfulTransaction,
            handleFailedTransaction,
            chainName,
            tokenQuote.quoteUUID
          );
          void intercomAnalyticsLog('send_token_for_card', {
            from: get(senderAddress, chainName),
            dollar: selectedToken.chainDetails,
            token_quantity: tokenQuote.tokenRequired,
            from_contract: contractAddress,
            quote_uuid: tokenQuote.quoteUUID
          });
        }
      } else {
        showModal('state', { type: 'error', title: 'Please select a blockchain to proceed', description: '', onSuccess: hideModal, onFailure: hideModal });
      }
    } else {
      showModal('state', { type: 'error', title: t('QUOTE_EXPIRED'), description: t('QUOTE_EXPIRED_DESCRIPTION'), onSuccess: hideModal, onFailure: hideModal });
    }
  };

  const fundCard = async () => {
    const { chainName, backendName }: {chainName: string, backendName: string} = selectedToken.chainDetails;
    const { contractAddress, coinGeckoId, contractDecimals, chainDetails }: { contractAddress: string, coinGeckoId: string | number, contractDecimals: string | number, chainDetails: any } = selectedToken;
    setLoading(true);
    Keyboard.dismiss();
    if (chainName === ChainNames.ETH || chainName === ChainNames.EVMOS) {
      const getQuoteUrl = `/v1/cards/${currentCardProvider}/card/${cardId}/quote/evm?chain=${backendName}&tokenAddress=${contractAddress}&amount=${amount}&address=${String(ethereum.address)}&contractDecimals=${contractDecimals}`;
      const response = await getWithAuth(getQuoteUrl);
      if (response?.data && !response.isError) {
        if (chainName != null) {
          let gasPrice: GasPriceDetail = { chainId: backendName, gasPrice: 0, tokenPrice: 0 };
          const quote = response.data;
          quote.tokenRequired = String(Number((quote.tokenRequired)).toFixed(5));
          const web3RPCEndpoint = new Web3(getWeb3Endpoint(hdWallet.state.selectedChain, globalContext));
          const targetWalletAddress = quote.targetWallet ? quote.targetWallet : '';
          getGasPriceFor(chainDetails, web3RPCEndpoint)
            .then((gasFeeResponse) => {
              gasPrice = gasFeeResponse;
              setLoading(false);
              estimateGasForNativeTransaction(hdWallet, chainDetails, selectedToken, quote.tokenRequired, true, gasPrice, payTokenModal, globalContext, targetWalletAddress);
            })
            .catch((gasFeeError) => {
              // TODO (user feedback): Give feedback to user.
              Sentry.captureException(gasFeeError);
              estimateGasForNativeTransaction(hdWallet, chainDetails, selectedToken, quote.tokenRequired, true, gasPrice, payTokenModal, globalContext, targetWalletAddress);
            });
          // setDisplayQuote(true);
          quote.token_required = String(Number((quote.tokenRequired)).toFixed(5));
          // setQuoteString(quote.token_required + " " + fromTokenItem.symbol);
          setTokenQuote(response.data);
        }
      } else {
        Sentry.captureException(response.error);
        showModal('state', { type: 'error', title: '', description: t('UNABLE_TO_TRANSFER'), onSuccess: hideModal, onFailure: hideModal });
        setLoading(false);
      }
    } else if (COSMOS_CHAINS.includes(chainName)) {
      try {
        const quoteUrl = `/v1/cards/${currentCardProvider}/card/${cardId}/quote/cosmos?chain=${backendName}&address=${String(wallet[chainName].address)}&primaryAddress=${String(ethereum.address)}&amount=${amount}&coinId=${coinGeckoId}&contractDecimals=${contractDecimals}`;
        const response = await getWithAuth(quoteUrl);
        if (response?.data && response.status === 200 && response.data.status !== 'ERROR') {
          if (chainName != null) {
            const quote = response.data;
            quote.tokenRequired = String(Number((quote.tokenRequired)).toFixed(5));
            const valueForUsd = quote.tokenRequired;
            const amount = (ethers.utils.parseUnits(parseFloat(valueForUsd.length > 8 ? valueForUsd.substring(0, 8) : valueForUsd).toFixed(6), 6)).toString();
            const targetWalletAddress = quote.targetWallet;

            let retryCount = 0;
            const signer = await getCosmosSignerClient(chainDetails);
            while (retryCount < 3) {
              try {
                await estimateGasForCosmosTransaction(chainDetails, signer, amount, get(senderAddress, chainName), targetWalletAddress, selectedToken, get(rpc, chainName), cosmosPayTokenModal, valueForUsd.toString());
              } catch (err) {
                if (retryCount < 3) {
                  retryCount += 1;
                  if (retryCount === 3) {
                    showModal('state', { type: 'error', title: '', description: err?.message, onSuccess: hideModal, onFailure: hideModal });
                  }
                  continue;
                }
                Sentry.captureException(err);
              }
              break;
            }
            setLoading(false);
            setTokenQuote(response.data);
          }
        } else {
          showModal('state', { type: 'error', title: '', description: t('UNABLE_TO_TRANSFER'), onSuccess: hideModal, onFailure: hideModal });
          setLoading(false);
        }
      } catch (error) {
        Sentry.captureException(error);
        setLoading(false);
        showModal('state', { type: 'error', title: '', description: t('UNABLE_TO_TRANSFER'), onSuccess: hideModal, onFailure: hideModal });
      };
    }
  };

  const isLoadCardDisabled = () => {
    const { symbol, backendName } = selectedToken?.chainDetails ?? {};
    const nativeTokenSymbol = get(NativeTokenMapping, symbol) || symbol;
    return (Number(amount) < minTokenValueLimit ||
    !selectedToken ||
    nativeTokenBalance <= get(gasFeeReservation, backendName) ||
    Number(amount) > Number(selectedToken?.totalValue) ||
    (selectedToken?.symbol === nativeTokenSymbol && Number(amount) / selectedToken?.price > Number((nativeTokenBalance - get(gasFeeReservation, backendName)).toFixed(6))));
  };

  const onSelectingToken = (item: {symbol: string, chainDetails: {backendName: string}}) => {
    setSelectedToken(item);
    setIsChooseTokenVisible(false);
    setNativeTokenBalance(
      getNativeTokenBalance(
        get(NativeTokenMapping, item.symbol) || item.symbol,
        portfolioState.statePortfolio.tokenPortfolio[
          get(ChainNameMapping, item.chainDetails.backendName)
        ].holdings
      )
    );
  };

  const RenderSelectedToken = () => {
    return (
      <CyDTouchView
        className={'bg-[#F7F8FE] mx-[40] my-[16] border-[1px] border-[#EBEBEB] rounded-[16px]'} onPress={() => setIsChooseTokenVisible(true)}>
        <CyDView className={'p-[18px] flex flex-row flex-wrap justify-between items-center'}>
          {selectedToken && <CyDView className={'flex flex-row w-[50%] items-center'}>
            <CyDImage
              source={{ uri: selectedToken.logoUrl }}
              className={'w-[25px] h-[25px] rounded-[20px]'}
            />
            <CyDText
              className={'text-center text-black font-nunito font-bold text-[16px] ml-[8px]'}>
              {selectedToken.name}
            </CyDText>
          </CyDView>}
          {!selectedToken && <CyDView>
              <CyDText>{t<string>('CHOOSE_TOKEN')}</CyDText>
          </CyDView>}

          <CyDView className='flex flex-row items-center'>
            {selectedToken && <><CyDTokenAmount className={'font-extrabold mr-[3px]'}>{selectedToken.actualBalance}
            </CyDTokenAmount>
            <CyDText className={'font-extrabold mr-[5px]'}>
              {selectedToken.symbol}
            </CyDText>
            </>
            }
            <CyDFastImage source={AppImages.DOWN_ARROW} className='h-[15px] w-[15px]' resizeMode='contain'/>
          </CyDView>
        </CyDView>
      </CyDTouchView>
    );
  };

  const RenderWarningMessage = () => {
    const { symbol, backendName }: {symbol?: string, backendName?: string} = selectedToken?.chainDetails ?? {};
    if (selectedToken && symbol && backendName) {
      const nativeTokenSymbol = get(NativeTokenMapping, symbol) || symbol;
      if (Number(amount) > Number(selectedToken?.totalValue)) {
        return (
          <CyDView className='mb-[10px]'>
            <CyDText className='text-center'>
              {t<string>('INSUFFICIENT_FUNDS')}
            </CyDText>
          </CyDView>
        );
      } else if (nativeTokenBalance <= get(gasFeeReservation, backendName)) {
        return (
          <CyDView className='mb-[10px]'>
            <CyDText className='text-center'>
              {String(`Insufficient ${String(nativeTokenSymbol)} to pay gas fee`)}
            </CyDText>
          </CyDView>
        );
      } else if (selectedToken?.symbol === nativeTokenSymbol && (Number(amount) / selectedToken?.price) > Number((nativeTokenBalance - get(gasFeeReservation, backendName)).toFixed(6))) {
        return (
          <CyDView className='mb-[10px]'>
            <CyDText className='text-center'>
              {t<string>('INSUFFICIENT_GAS_FEE')}
            </CyDText>
          </CyDView>
        );
      }
    }
    return null;
  };

  return (
    <CyDSafeAreaView className='h-full bg-white'>
      <ChooseTokenModal
        isChooseTokenModalVisible = {isChooseTokenVisible}
        tokenList = {portfolioState.statePortfolio.tokenPortfolio.totalHoldings}
        minTokenValueLimit = {minTokenValueLimit}
        onSelectingToken = {(token) => { setIsChooseTokenVisible(false); onSelectingToken(token); }}
        onCancel={() => { setIsChooseTokenVisible(false); hdWallet.dispatch({ type: 'HIDE_TAB_BAR', value: { tabBarHidden: false } }); navigation.goBack(); }}
        noTokensAvailableMessage={t<string>('CARD_INSUFFICIENT_FUNDS')}
        renderPage={'fundCardPage'}
      />
      <BottomTokenCardConfirm
        modalParams={payTokenModalParams}
        isModalVisible={payTokenBottomConfirm}
        onPayPress={ async () => {
          setLowBalance(false);
          await sendTransaction(payTokenModalParams);
        }}
        onCancelPress={() => {
          setPayTokenBottomConfirm(false);
          setLowBalance(false);
          void intercomAnalyticsLog('cancel_transfer_token', { from: ethereum.address });
          activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.DELETE, value: { id: activityRef.current.id } });
        }}
        lowBalance={lowBalance}
      />
      <RenderSelectedToken/>
      <CyDView className={'pb-[0px] bg-[#F7F8FE]  mx-[40] rounded-[20px]'}>
        <CyDView className={'pb-[10px] bg-[#F7F8FE]  mx-[20]'}>
          <CyDText
            className={'font-extrabold text-[22px] text-center mt-[20px] font-nunito text-black'}>
            {t<string>('ENTER_AMOUNT')}
          </CyDText>
          <CyDView className={'flex flex-row justify-center items-center'}>
            <CyDText className='text-[50px] font-extrabold'>{String('$')}</CyDText>
            <CyDTextInput
              className={'h-[100px] min-w-[70px] font-nunito text-[60px] font-bold'}
              value={amount}
              keyboardType={'numeric'}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(val: number) => setAmount(val)}
            />
          </CyDView>
          {(!amount || Number(amount) < minTokenValueLimit) && <CyDView className='mb-[10px]'>
            <CyDText className='text-center'>
              {t<string>('CARD_LOAD_MIN_AMOUNT')}
            </CyDText>
          </CyDView>}
          {((Number(amount) > maxTokenValueLimit)) && <CyDView className='mb-[10px]'>
            <CyDText className='text-center'>
              {t<string>('CARD_LOAD_MAX_AMOUNT')}
            </CyDText>
          </CyDView>}
          <RenderWarningMessage />
          {selectedToken && <CyDView className='flex flex-column justify-center items-center'>
            <CyDText>{new Intl.NumberFormat('en-US', {
              maximumSignificantDigits: 4
            }).format(Number(amount) / selectedToken.price)} {selectedToken.symbol}</CyDText>
             <CyDText>{String(`1 ${String(selectedToken.symbol)} = ${currencyFormatter.format(selectedToken.price)}`)}</CyDText>
          </CyDView>}
        </CyDView>
        <Button
          onPress={() => { void fundCard(); }}
          disabled={isLoadCardDisabled()}
          title={t('LOAD_CARD')}
          style={loading ? 'py-[7px] mx-[15px] top-[15px]' : 'py-[15px] mx-[15px] top-[15px]'}
          loading={loading}
        />
      </CyDView>
    </CyDSafeAreaView>
  );
}