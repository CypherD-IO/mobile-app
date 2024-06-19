import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CyDFastImage, CyDText, CyDView } from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import {
  ActivityContext,
  formatAmount,
  HdWalletContext,
  limitDecimalPlaces,
  logAnalytics,
  parseErrorMessage,
} from '../../../core/util';
import Button from '../../../components/v2/button';
import { AnalyticsType, ButtonType } from '../../../constants/enum';
import { get } from 'lodash';
import {
  CHAIN_OSMOSIS,
  ChainConfigMapping,
  ChainNameMapping,
  ChainNames,
  PURE_COSMOS_CHAINS,
} from '../../../constants/server';
import { useTranslation } from 'react-i18next';
import LottieView from 'lottie-react-native';
import { PayTokenModalParams } from '../../../models/card.model';
import {
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  DebitCardTransaction,
} from '../../../reducers/activity_reducer';
import { genId } from '../../utilities/activityUtilities';
import useTransactionManager from '../../../hooks/useTransactionManager';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { screenTitle } from '../../../constants';
import { MODAL_HIDE_TIMEOUT_250 } from '../../../core/Http';
import useAxios from '../../../core/HttpRequest';
import { intercomAnalyticsLog } from '../../utilities/analyticsUtility';
import * as Sentry from '@sentry/react-native';
import { StyleSheet } from 'react-native';

export default function CardQuote({
  navigation,
  route,
}: {
  navigation: any;
  route: { params: PayTokenModalParams; name: string };
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const {
    hasSufficientBalanceAndGasFee,
    tokenSendParams,
    cardProvider,
    cardId,
  } = route.params;
  const {
    chain,
    amountInCrypto,
    amountInFiat,
    symbol,
    gasFeeInCrypto,
    gasFeeInFiat,
    nativeTokenSymbol,
    selectedToken,
    tokenQuote,
  } = tokenSendParams;
  const quoteExpiry = 60;
  const [tokenExpiryTime, setTokenExpiryTime] = useState(quoteExpiry);
  const [expiryTimer, setExpiryTimer] = useState<NodeJS.Timer>();
  const [isPayDisabled, setIsPayDisabled] = useState<boolean>(
    hasSufficientBalanceAndGasFee,
  );
  const hdWallet = useContext<any>(HdWalletContext);
  const ethereum = hdWallet.state.wallet.ethereum;
  const activityContext = useContext<any>(ActivityContext);
  const activityRef = useRef<DebitCardTransaction | null>(null);
  const { sendEvmToken, sendCosmosToken, interCosmosIBC, evmosIBC } =
    useTransactionManager();
  const { showModal, hideModal } = useGlobalModalContext();
  const { postWithAuth } = useAxios();

  const cosmos = hdWallet.state.wallet.cosmos;
  const osmosis = hdWallet.state.wallet.osmosis;
  const juno = hdWallet.state.wallet.juno;
  const stargaze = hdWallet.state.wallet.stargaze;
  const noble = hdWallet.state.wallet.noble;
  const coreum = hdWallet.state.wallet.coreum;
  const kujira = hdWallet.state.wallet.kujira;

  const cosmosAddresses = {
    cosmos: cosmos.address,
    osmosis: osmosis.address,
    juno: juno.address,
    stargaze: stargaze.address,
    noble: noble.address,
    coreum: coreum.address,
    kujira: kujira.address,
  };

  const chainLogo = get(
    ChainConfigMapping,
    get(ChainNameMapping, chain),
  )?.logo_url;

  useEffect(() => {
    let tempIsPayDisabled = false;
    tempIsPayDisabled = !hasSufficientBalanceAndGasFee;
    setIsPayDisabled(tempIsPayDisabled);
    if (quoteExpiry && !tempIsPayDisabled) {
      let tempTokenExpiryTime = quoteExpiry;
      setIsPayDisabled(false);
      setTokenExpiryTime(tempTokenExpiryTime);
      setExpiryTimer(
        setInterval(() => {
          tempTokenExpiryTime--;
          setTokenExpiryTime(tempTokenExpiryTime);
        }, 1000),
      );
    }
  }, []);

  useEffect(() => {
    if (tokenExpiryTime === 0 && quoteExpiry) {
      clearInterval(expiryTimer);
      setIsPayDisabled(true);
    }
  }, [tokenExpiryTime]);

  const onCancel = () => {
    void intercomAnalyticsLog('cancel_transfer_token', {
      from: ethereum.address,
    });
    if (quoteExpiry && tokenExpiryTime !== 0) {
      clearInterval(expiryTimer);
    }
    activityRef.current &&
      activityContext.dispatch({
        type: ActivityReducerAction.DELETE,
        value: { id: activityRef.current.id },
      });
    navigation.goBack();
  };

  const transferSentQuote = async (
    address: string,
    quoteId: string,
    txnHash: string,
  ) => {
    const transferSentUrl = `/v1/cards/${cardProvider}/card/${cardId}/deposit`;
    const body = {
      address,
      quoteUUID: quoteId,
      txnHash,
    };

    try {
      if (!body.txnHash) {
        showModal('state', {
          type: 'error',
          title: 'Unable to process your transaction',
          description: `Incase your transaction went through, please contact customer support with the quote_id: ${quoteId}`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }
      const response = await postWithAuth(transferSentUrl, body);
      if (!response.isError) {
        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              status: ActivityStatus.INPROCESS,
              transactionHash: txnHash,
              quoteId,
            },
          });
        setLoading(false);
        showModal('state', {
          type: 'success',
          title: t('FUNDING_IN_PROGRESS'),
          description:
            'Your card funding is in progress and will be done within 5 mins!',
          onSuccess: () => {
            hideModal();
            setTimeout(() => {
              navigation.navigate(screenTitle.OPTIONS, {
                screen: screenTitle.ACTIVITIES,
                initial: false,
              });
              navigation.popToTop();
            }, MODAL_HIDE_TIMEOUT_250);
          },
          onFailure: hideModal,
        });
      } else {
        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              status: ActivityStatus.FAILED,
              quoteId,
              transactionHash: txnHash,
              reason: `Please contact customer support with the quote_id: ${quoteId}`,
            },
          });
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: 'Error processing your txn',
          description: `Please contact customer support with the quote_id: ${quoteId}`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      activityRef.current &&
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityRef.current.id,
            status: ActivityStatus.FAILED,
            quoteId,
            transactionHash: txnHash,
            reason: `Please contact customer support with the quote_id: ${quoteId}`,
          },
        });
      Sentry.captureException(error);
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: 'Error processing your txn',
        description: `Please contact customer support with the quote_id: ${quoteId}`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const sendTransaction = useCallback(async () => {
    try {
      const {
        contractAddress,
        chainDetails,
        contractDecimals,
        denom,
        symbol,
        name,
      } = selectedToken;
      const actualTokensRequired = limitDecimalPlaces(
        tokenQuote.tokensRequired,
        contractDecimals,
      );
      const { chainName } = chainDetails;
      const activityData: DebitCardTransaction = {
        id: genId(),
        status: ActivityStatus.PENDING,
        type: ActivityType.CARD,
        quoteId: '',
        tokenSymbol: symbol ?? '',
        chainName: chainDetails?.backendName ?? '',
        tokenName: name.toString() ?? '',
        amount: tokenQuote.tokensRequired.toString() ?? '',
        amountInUsd: tokenQuote.amount ?? '',
        datetime: new Date(),
        transactionHash: '',
      };
      activityRef.current = activityData;
      activityContext.dispatch({
        type: ActivityReducerAction.POST,
        value: activityRef.current,
      });
      setLoading(true);
      if (tokenQuote && selectedToken) {
        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              gasAmount: tokenSendParams.gasFeeInCrypto,
            },
          });
        if (chainName != null) {
          let response: {
            isError: boolean;
            hash: string;
            contractData?: string | undefined;
            error?: any;
            gasFeeInCrypto?: string | undefined;
          };
          if (chainName === ChainNames.ETH) {
            response = await sendEvmToken({
              chain: selectedToken.chainDetails.backendName,
              amountToSend: actualTokensRequired,
              toAddress: tokenQuote.targetAddress,
              contractAddress,
              contractDecimals,
              symbol: selectedToken.symbol,
            });
          } else if (
            PURE_COSMOS_CHAINS.includes(chainName) &&
            chainName !== ChainNames.OSMOSIS
          ) {
            response = await interCosmosIBC({
              fromChain: chainDetails,
              toChain: CHAIN_OSMOSIS,
              denom,
              amount: actualTokensRequired,
              fromAddress: get(cosmosAddresses, chainDetails.chainName),
              toAddress: tokenQuote.targetAddress,
              contractDecimals,
            });
          } else if (chainName === ChainNames.OSMOSIS) {
            response = await sendCosmosToken({
              fromChain: chainDetails,
              denom,
              amount: actualTokensRequired,
              fromAddress: get(cosmosAddresses, chainDetails.chainName),
              toAddress: tokenQuote.targetAddress,
              contractDecimals,
            });
          } else {
            response = await evmosIBC({
              toAddress: tokenQuote.targetAddress,
              toChain: CHAIN_OSMOSIS,
              amount: actualTokensRequired,
              denom,
              contractDecimals,
            });
          }
          const { hash, isError, error } = response;
          if (!isError) {
            void logAnalytics({
              type: AnalyticsType.SUCCESS,
              txnHash: hash,
              chain: selectedToken?.chainDetails?.chainName ?? '',
              ...(response?.contractData
                ? { contractData: response?.contractData }
                : ''),
              address: PURE_COSMOS_CHAINS.includes(
                selectedToken?.chainDetails?.chainName,
              )
                ? get(
                    cosmosAddresses,
                    selectedToken?.chainDetails?.chainName,
                    '',
                  )
                : get(ethereum, 'address', ''),
            });
            void transferSentQuote(
              tokenQuote.fromAddress,
              tokenQuote.quoteId,
              hash,
            );
          } else {
            void logAnalytics({
              type: AnalyticsType.ERROR,
              chain: selectedToken?.chainDetails?.chainName ?? '',
              message: parseErrorMessage(error),
              screen: route.name,
              address: PURE_COSMOS_CHAINS.includes(
                selectedToken?.chainDetails?.chainName,
              )
                ? get(
                    cosmosAddresses,
                    selectedToken?.chainDetails?.chainName,
                    '',
                  )
                : get(ethereum, 'address', ''),
            });
            activityRef.current &&
              activityContext.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activityRef.current.id,
                  status: ActivityStatus.FAILED,
                  quoteId: tokenQuote.quoteId,
                  reason: error,
                },
              });
            setLoading(false);
            showModal('state', {
              type: 'error',
              title: 'Transaction Failed',
              description: `${String(error)}. Please contact customer support with the quote_id: ${tokenQuote.quoteId}`,
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
        }
      } else {
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: t('MISSING_QUOTE'),
          description: t('MISSING_QUOTE_DESCRIPTION'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: selectedToken?.chainDetails?.backendName ?? '',
        message: parseErrorMessage(error),
        screen: route.name,
        address: PURE_COSMOS_CHAINS.includes(
          selectedToken?.chainDetails?.chainName,
        )
          ? get(cosmosAddresses, selectedToken?.chainDetails?.chainName, '')
          : get(ethereum, 'address', ''),
      });
      activityRef.current &&
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityRef.current.id,
            status: ActivityStatus.FAILED,
            quoteId: tokenQuote.quoteId,
            reason: error,
          },
        });
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: 'Transaction Failed',
        description: `${String(error)}. Please contact customer support with the quote_id: ${tokenQuote.quoteId}`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  }, []);

  const onLoadPress = async () => {
    if (expiryTimer) {
      clearInterval(expiryTimer);
    }
    await sendTransaction();
  };

  return (
    <CyDView
      className={
        'flex-1 w-full bg-white pb-[30px] flex flex-col justify-between'
      }>
      <CyDView className={'mx-[22px]'}>
        <CyDView className='flex flex-col justify-center items-center pb-[45px] border-b-[2px] border-sepratorColor'>
          <CyDText className='text-[52px] text-mandarin font-bold'>
            {'$' + limitDecimalPlaces(amountInFiat, 4)}
          </CyDText>
          <CyDText className='mt-[6px]'>
            {t('AMOUNT_TO_BE_LOADED_CARD')}
          </CyDText>
        </CyDView>
        <CyDView
          className={
            'flex flex-row justify-between items-center mt-[40px] pb-[16px]'
          }>
          <CyDText className={'font-bold text-[14px]'}>{t('SEND_ON')}</CyDText>
          <CyDView
            className={'flex flex-row justify-center items-center pl-[25px]'}>
            <CyDFastImage source={chainLogo} className={'w-[18px] h-[18px]'} />
            <CyDText className={'font-medium text-[14px] ml-[4px]'}>
              {chain}
            </CyDText>
          </CyDView>
        </CyDView>
        <CyDView
          className={'flex flex-row justify-between items-center py-[16px]'}>
          <CyDText className={'font-bold text-[14px]'}>
            {t('CRYPTO_VALUE')}
          </CyDText>
          <CyDView
            className={'flex flex-col flex-wrap justify-between items-end'}>
            <CyDText
              className={' font-medium text-[16px] text-primaryTextColor'}>
              {String(formatAmount(amountInCrypto)) + ' ' + symbol}
            </CyDText>
            <CyDText className={' font-medium text-[16px]'}>
              {'$' + limitDecimalPlaces(amountInFiat, 4)}
            </CyDText>
          </CyDView>
        </CyDView>

        <CyDView
          className={'flex flex-row justify-between items-center py-[16px]'}>
          <CyDText className={'font-bold text-[14px]'}>
            {t('ESTIMATED_GAS')}
          </CyDText>
          <CyDView
            className={'flex flex-col flex-wrap justify-between items-end'}>
            <CyDText
              className={'font-medium text-[14px] text-primaryTextColor'}>
              {String(gasFeeInCrypto) + ' ' + nativeTokenSymbol}
            </CyDText>
            <CyDText className={'font-medium text-[14px]'}>
              {'$' + String(formatAmount(gasFeeInFiat))}
            </CyDText>
          </CyDView>
        </CyDView>

        <CyDView className={'flex flex-row justify-between py-[16px]'}>
          <CyDView className='flex flex-row justify-start items-center w-[50%]'>
            <CyDText className={'font-bold text-[14px]'}>
              {t('ESTIMATED_TIME')}
            </CyDText>
            <LottieView
              source={AppImages.ESTIMATED_TIME}
              resizeMode={'contain'}
              autoPlay
              loop
              style={styles.loaderStyle}
            />
          </CyDView>

          <CyDView className={'flex flex-row justify-between items-center'}>
            <CyDText
              className={
                'font-nunito font-[16px] text-black font-bold ml-[12px]'
              }>
              ~ 4 mins
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
      {!hasSufficientBalanceAndGasFee ? (
        <CyDView className='flex flex-row items-center rounded-[8px] justify-center py-[15px] mt-[20px] mb-[10px] bg-warningRedBg'>
          <CyDFastImage
            source={AppImages.CYPHER_WARNING_RED}
            className='h-[20px] w-[20px] ml-[13px] mr-[13px]'
            resizeMode='contain'
          />
          <CyDText className='text-red-500 font-medium text-[14px] px-[10px] w-[80%]'>
            {t<string>('INSUFFICIENT_BALANCE_CARD')}
          </CyDText>
        </CyDView>
      ) : null}
      <CyDView
        className={'flex flex-row justify-between items-center px-[10px]'}>
        <Button
          title={t<string>('CANCEL')}
          titleStyle='text-[14px]'
          disabled={loading}
          type={ButtonType.SECONDARY}
          onPress={() => {
            onCancel();
          }}
          style={'h-[60px] w-[46%] mr-[6px]'}
        />
        <Button
          title={
            t<string>('LOAD_ALL_CAPS') +
            (!isPayDisabled
              ? tokenExpiryTime
                ? ' (' + String(tokenExpiryTime) + ')'
                : ''
              : '')
          }
          titleStyle='text-[14px]'
          loading={loading}
          disabled={isPayDisabled}
          onPress={() => {
            if (!isPayDisabled) {
              void onLoadPress();
            }
          }}
          isPrivateKeyDependent={true}
          style={'h-[60px] w-[46%] ml-[6px]'}
        />
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  loaderStyle: {
    width: 20,
  },
});
