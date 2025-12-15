import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { getSdkError } from '@walletconnect/utils';
import { web3wallet } from '../../../core/walletConnectV2Utils';
import CyDModalLayout from '../modal';
import useWeb3 from '../../../hooks/useWeb3';
import {
  ButtonType,
  SigningModalPayloadFrom,
  Web3Origin,
} from '../../../constants/enum';
import {
  CHAIN_OPTIMISM,
  Chain,
  OP_ETH_ADDRESS,
  SUPPORTED_EVM_CHAINS,
  chainIdNumberMapping,
} from '../../../constants/server';
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils';
import {
  CyDScrollView,
  CyDText,
  CyDView,
} from '../../../styles/tailwindComponents';
import { t } from 'i18next';
import { EIP155_SIGNING_METHODS } from '../../../constants/EIP155Data';
import { useGlobalModalContext } from '../GlobalModal';
import useAxios from '../../../core/HttpRequest';
import {
  HdWalletContext,
  formatAmount,
  getViemPublicClient,
  getWeb3Endpoint,
} from '../../../core/util';
import * as Sentry from '@sentry/react-native';
import { intercomAnalyticsLog } from '../../../containers/utilities/analyticsUtility';
import { GlobalContext } from '../../../core/globalContext';
import {
  DecodeTxnRequestBody,
  IDAppInfo,
  IExtendedDecodedTxnResponse,
  ISendTxnData,
  SessionSigningModalProps,
} from '../../../models/signingModalData.interface';
import { Loader, RenderTitle } from './SigningModals/SigningModalComponents';
import { RenderSignMessageModal } from './SigningModals/SignMessageModal';
import {
  RenderTransactionSignModal,
  RenderTypedTransactionSignModal,
} from './SigningModals/TxnModals';
import { getGasPriceFor } from '../../../containers/Browser/gasHelper';
import Button from '../button';
import { DecimalHelper } from '../../../utils/decimalHelper';
import { formatUnits, PublicClient } from 'viem';

const BASE_GAS_LIMIT = 21000;
const CONTRACT_MULTIPLIER = 2;
const OPTIMISM_MULTIPLIER = 1.3;

export default function SigningModal({
  payloadFrom,
  modalPayload,
  requestEvent,
  isModalVisible,
  hideModal,
}: SessionSigningModalProps) {
  const [handleWeb3] = useWeb3(Web3Origin.WALLETCONNECT);
  const { postWithAuth } = useAxios();
  const { showModal } = useGlobalModalContext();
  const [acceptingRequest, setAcceptingRequest] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(false);
  const [dataIsReady, setDataIsReady] = useState(false);
  const [nativeSendTxnData, setNativeSendTxnData] =
    useState<ISendTxnData | null>(null);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const [decodedABIData, setDecodedABIData] =
    useState<IExtendedDecodedTxnResponse | null>(null);
  const globalContext = useContext<any>(GlobalContext);

  let id: number,
    topic: string,
    params: {
      request: {
        method: string | undefined;
        params: DecodeTxnRequestBody[] | undefined;
      };
      chainId: { split: (arg0: string) => [any, any] };
    },
    method: string | undefined,
    requestParams: DecodeTxnRequestBody[] | undefined,
    paramsFromPayload: DecodeTxnRequestBody[] | undefined,
    requestSession,
    dAppInfo: IDAppInfo | undefined,
    chain: Chain | undefined,
    publicClient: PublicClient;
  const isMessageModalForSigningTypedData =
    modalPayload?.params && 'signMessageTitle' in modalPayload.params;

  // Flag to track if session data could be retrieved
  let isSessionValid = true;

  if (payloadFrom === SigningModalPayloadFrom.WALLETCONNECT) {
    ({ id, topic, params } = requestEvent);
    ({ method, params: requestParams } = params.request);

    // Safely attempt to retrieve the session - it may have been deleted
    // This handles race conditions where the dApp disconnects while a request is pending
    try {
      requestSession = web3wallet?.engine.signClient.session.get(topic);
    } catch (sessionError) {
      // Session was deleted or is invalid - this is expected in race conditions
      // Log as warning since we handle this gracefully with an error UI
      console.warn(
        '[SigningModal] Session expired or disconnected - showing error UI to user',
        sessionError,
      );
      Sentry.captureException(sessionError);
      isSessionValid = false;
    }

    // Additional validation to ensure session data is available
    if (isSessionValid && !requestSession?.peer?.metadata) {
      console.warn(
        '[SigningModal] Session metadata is missing - session may have expired',
      );
      isSessionValid = false;
    }

    if (isSessionValid && requestSession?.peer?.metadata) {
      const { icons, name, url } = requestSession.peer.metadata;
      dAppInfo = {
        name,
        url,
        logo: icons[0],
      };
      const [, chainId] = params.chainId.split(':');
      chain = SUPPORTED_EVM_CHAINS.includes(+chainId)
        ? chainIdNumberMapping[+chainId]
        : undefined;
      if (chain) {
        publicClient = getViemPublicClient(
          getWeb3Endpoint(chain, globalContext),
        );
      } else {
        showModal('state', {
          type: 'error',
          title: t('UNSUPPORTED_CHAIN'),
          description: t('UNSUPPORTED_CHAIN_DESCRIPTION'),
          onSuccess: handleReject,
          onFailure: handleReject,
        });
      }
    }
  } else {
    // The payload is from 'BROWSER'
    if (modalPayload) {
      ({ method, params: paramsFromPayload } = modalPayload.params.payload);
      const chainIdNumber = hdWalletContext?.state.selectedChain.chainIdNumber; // modalPayload.params.chainIdNumber;
      chain = SUPPORTED_EVM_CHAINS.includes(chainIdNumber)
        ? chainIdNumberMapping[chainIdNumber]
        : undefined;
      if (chain) {
        publicClient = getViemPublicClient(
          getWeb3Endpoint(chain, globalContext),
        );
      } else {
        showModal('state', {
          type: 'error',
          title: t('UNSUPPORTED_CHAIN'),
          description: t('UNSUPPORTED_CHAIN_DESCRIPTION'),
          onSuccess: handleReject,
          onFailure: handleReject,
        });
      }
    }
    // TODO: get the dAppInfo here as well.
    dAppInfo = undefined;
  }

  useEffect(() => {
    let decodeTxnRequestBody: DecodeTxnRequestBody;
    const decodeTxnRequest = async () => {
      try {
        const { data, error, isError } = await postWithAuth(
          '/v1/txn/decode',
          decodeTxnRequestBody,
        );
        if (!isError) {
          if (data.isDecoded) {
            setDecodedABIData({
              ...data,
              from_addr: decodeTxnRequestBody.from,
            });
            setDataIsReady(true);
          } else {
            const errorObject = {
              message: 'isDecoded was false when decoding. Showing raw data.',
              error,
              decodeTxnRequestBody,
            };
            Sentry.captureException(errorObject);
            setDecodedABIData({
              from: decodeTxnRequestBody.from,
              to: decodeTxnRequestBody.to,
              data: decodeTxnRequestBody.data,
              gas: decodeTxnRequestBody.gas,
            });
            setDataIsReady(true);
          }
        } else {
          const errorObject = {
            message: 'Decoding response isError is true. Showing raw data.',
            error,
            decodeTxnRequestBody,
          };
          Sentry.captureException(errorObject);
          setDecodedABIData({
            from: decodeTxnRequestBody.from,
            to: decodeTxnRequestBody.to,
            data: decodeTxnRequestBody.data,
            gas: decodeTxnRequestBody.gas,
          });
          setDataIsReady(true);
        }
      } catch (e) {
        const errorObject = {
          message: 'Decoding response caused an exception. Showing raw data.',
          error: e,
          decodeTxnRequestBody,
        };
        Sentry.captureException(errorObject);
        setDecodedABIData({
          from: decodeTxnRequestBody.from,
          to: decodeTxnRequestBody.to,
          data: decodeTxnRequestBody.data,
          gas: decodeTxnRequestBody.gas,
        });
        setDataIsReady(true);
      }
    };

    const decideGasLimitBasedOnTypeOfToAddress = (
      code: string,
      gasLimit: number,
      chainId: number,
      contractAddress: string,
    ): number => {
      if (gasLimit > BASE_GAS_LIMIT) {
        if (code !== '0x') {
          return CONTRACT_MULTIPLIER * gasLimit;
        }
        return gasLimit;
      } else if (
        contractAddress.toLowerCase() === OP_ETH_ADDRESS &&
        chainId === CHAIN_OPTIMISM.chainIdNumber
      ) {
        return BASE_GAS_LIMIT * OPTIMISM_MULTIPLIER;
      } else {
        return BASE_GAS_LIMIT;
      }
    };

    const getDataForNativeTxn = async () => {
      let paramsForDecoding: DecodeTxnRequestBody;
      if (
        payloadFrom === SigningModalPayloadFrom.WALLETCONNECT &&
        requestParams
      ) {
        paramsForDecoding = requestParams[0];
      } else {
        paramsForDecoding = (paramsFromPayload as DecodeTxnRequestBody[])[0];
      }
      try {
        const walletTokenBalance = await publicClient.getBalance({
          address: paramsForDecoding.from as `0x${string}`,
        });
        const tokenDecimals = 18;
        const estimatedGas = await publicClient.estimateGas({
          account: paramsForDecoding.from as `0x${string}`,
          to: paramsForDecoding.to as `0x${string}`,
          gasPrice: BigInt(paramsForDecoding?.gasPrice ?? 0),
          value: BigInt(paramsForDecoding?.value ?? 0),
        });
        const code = await publicClient.getCode({
          address: paramsForDecoding.to as `0x${string}`,
        });
        if (code) {
          const finalEstimatedGas = decideGasLimitBasedOnTypeOfToAddress(
            code,
            Number(estimatedGas),
            paramsForDecoding.chainId,
            paramsForDecoding.to,
          );
          const adjustedTokenBalance = DecimalHelper.multiply(
            walletTokenBalance,
            DecimalHelper.pow(10, -tokenDecimals),
          );
          if (paramsForDecoding?.value && chain?.nativeTokenLogoUrl) {
            const { gasPrice, tokenPrice } = await getGasPriceFor(
              chain,
              web3RPCEndpoint,
            );
            const gasNative = DecimalHelper.multiply(finalEstimatedGas, [
              gasPrice,
              DecimalHelper.pow(10, 9),
              DecimalHelper.pow(10, -tokenDecimals),
            ]);
            const sendTxnData: ISendTxnData = {
              chainLogo: chain.logo_url,
              token: {
                logo: chain?.nativeTokenLogoUrl,
                name: chain.name,
                amount: formatUnits(
                  BigInt(paramsForDecoding.value),
                  tokenDecimals,
                ),
                valueInUSD: DecimalHelper.multiply(
                  formatUnits(BigInt(paramsForDecoding.value), tokenDecimals),
                  tokenPrice,
                ).toString(),
              },
              toAddress: paramsForDecoding.to,
              fromAddress: paramsForDecoding.from,
              gasAndUSDAppx: `${formatAmount(gasNative)} ${
                chain.symbol
              } ≈ $${formatAmount(DecimalHelper.multiply(gasNative, tokenPrice))} USD`,
              availableBalance: `${formatAmount(adjustedTokenBalance)} ${
                chain.symbol
              }`,
            };
            setNativeSendTxnData(sendTxnData);
            setDataIsReady(true);
          }
        }
      } catch (e) {
        const errorObject = {
          error: e,
          paramsForDecoding,
        };
        Sentry.captureException(errorObject);
        setDecodedABIData(paramsForDecoding);
        setDataIsReady(true);
      }
    };
    let paramsForDecoding: DecodeTxnRequestBody;
    if (
      payloadFrom === SigningModalPayloadFrom.WALLETCONNECT &&
      requestParams
    ) {
      paramsForDecoding = requestParams[0];
    } else {
      paramsForDecoding = (paramsFromPayload as DecodeTxnRequestBody[])[0];
    }
    if (paramsForDecoding?.data !== '0x' && chain) {
      if (method === EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION) {
        const {
          from,
          to,
          gas = '0x0',
          value = '0x0',
          data,
          nonce = '0x0',
          maxFeePerGas = '0x0',
          maxPriorityFeePerGas = '0x0',
        } = paramsForDecoding;
        decodeTxnRequestBody = {
          chainId: chain.chainIdNumber,
          from,
          to,
          gas,
          value,
          data,
          nonce,
          maxFeePerGas,
          maxPriorityFeePerGas,
        };
        void decodeTxnRequest();
      } else if (method === EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION) {
        const {
          from,
          to,
          gasLimit: gas = '0x0',
          value = '0x0',
          data,
          nonce = '0x0',
          maxFeePerGas = '0x0',
          maxPriorityFeePerGas = '0x0',
        } = paramsForDecoding;
        decodeTxnRequestBody = {
          chainId: chain.chainIdNumber,
          from,
          to,
          gas,
          value,
          data,
          nonce,
          maxFeePerGas,
          maxPriorityFeePerGas,
        };
        void decodeTxnRequest();
      }
    } else {
      void getDataForNativeTxn();
    }
  }, [requestParams, paramsFromPayload]);

  async function handleAccept() {
    if (payloadFrom === SigningModalPayloadFrom.WALLETCONNECT) {
      try {
        setAcceptingRequest(true);

        if (isMessageModalForSigningTypedData) {
          modalPayload?.resolve(true);
        } else {
          const response = await handleWeb3(
            params.request,
            { title: '', host: '', origin: '', url: '' },
            chain,
          );

          const formattedRPCResponse = formatJsonRpcResult(id, response.result);

          await web3wallet?.respondSessionRequest({
            topic,
            response: formattedRPCResponse,
          });
        }

        setAcceptingRequest(false);
        hideModal();
      } catch (e) {
        setAcceptingRequest(false);
        hideModal();
      }
    } else {
      modalPayload?.resolve(true);
    }
  }

  async function handleReject() {
    if (payloadFrom === SigningModalPayloadFrom.WALLETCONNECT) {
      const requestId = (requestEvent as any)?.id;
      if (requestId) {
        try {
          setRejectingRequest(true);

          if (isMessageModalForSigningTypedData) {
            modalPayload?.resolve(false);
          } else {
            const rejectionResponse = formatJsonRpcError(
              requestId,
              getSdkError('USER_REJECTED_METHODS').message,
            );

            await web3wallet?.respondSessionRequest({
              topic,
              response: rejectionResponse,
            });
          }

          setRejectingRequest(false);
          hideModal();
        } catch (e) {
          setRejectingRequest(false);
          hideModal();
        }
      } else {
        hideModal();
      }
    } else {
      modalPayload?.resolve(false);
    }
  }

  const renderAcceptTitle = (method: string) => {
    if (method.toLowerCase().includes('typeddata')) {
      if (isMessageModalForSigningTypedData) {
        return 'Approve';
      }
      return 'Review Request';
    } else if (
      method.toLowerCase().includes(EIP155_SIGNING_METHODS.PERSONAL_SIGN)
    ) {
      return 'Sign';
    } else {
      return 'Accept';
    }
  };

  // If the session is invalid (deleted), show an error state
  // This handles race conditions where the dApp disconnects while a request is pending
  if (
    payloadFrom === SigningModalPayloadFrom.WALLETCONNECT &&
    !isSessionValid
  ) {
    return (
      <CyDModalLayout
        setModalVisible={() => {}}
        isModalVisible={isModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView className='rounded-t-[24px] bg-n20 px-[25px] py-[20px]'>
          <CyDView className='flex flex-row justify-center'>
            <CyDText className='text-[22px] font-extrabold mt-[14px] mb-[10px]'>
              {t('WC_SESSION_EXPIRED')}
            </CyDText>
          </CyDView>
          <CyDView className='my-[10px]'>
            <CyDText className='text-center text-[14px] text-subTextColor'>
              {t('WC_SESSION_EXPIRED_DESCRIPTION')}
            </CyDText>
          </CyDView>
          <CyDView className='w-full mt-[12px] mb-[24px]'>
            <Button
              style='p-[3%] mt-[12px]'
              title={t('CLOSE')}
              onPress={() => hideModal()}
            />
          </CyDView>
        </CyDView>
      </CyDModalLayout>
    );
  }

  return (
    <CyDModalLayout
      setModalVisible={() => {}}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView className='rounded-t-[24px] bg-n20 max-h-[90%]'>
        {chain && method ? (
          <CyDView className='flex flex-col justify-between'>
            <RenderTitle
              method={method}
              sendType={(decodedABIData as IExtendedDecodedTxnResponse)?.type}
            />
            <CyDScrollView className='px-[25px] pb-[5px] max-h-[70%]'>
              {(method === EIP155_SIGNING_METHODS.PERSONAL_SIGN ||
                method === EIP155_SIGNING_METHODS.ETH_SIGN) &&
                (payloadFrom === SigningModalPayloadFrom.WALLETCONNECT ? (
                  <RenderSignMessageModal
                    dAppInfo={dAppInfo}
                    chain={chain}
                    method={method}
                    messageParams={requestParams}
                  />
                ) : (
                  <RenderSignMessageModal
                    dAppInfo={dAppInfo}
                    chain={chain}
                    method={method}
                    messageParams={paramsFromPayload}
                  />
                ))}
              {(method === EIP155_SIGNING_METHODS.ETH_SEND_RAW_TRANSACTION ||
                method === EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION ||
                method === EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION) &&
                (dataIsReady ? (
                  <RenderTransactionSignModal
                    dAppInfo={dAppInfo}
                    chain={chain}
                    method={method}
                    data={decodedABIData}
                    nativeSendTxnData={nativeSendTxnData}
                  />
                ) : (
                  <Loader />
                ))}
              {(method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA ||
                method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3 ||
                method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4) &&
                (payloadFrom === SigningModalPayloadFrom.WALLETCONNECT ? (
                  <RenderTypedTransactionSignModal
                    dAppInfo={dAppInfo}
                    chain={chain}
                    method={method}
                    messageParams={requestParams}
                  />
                ) : (
                  <RenderTypedTransactionSignModal
                    dAppInfo={dAppInfo}
                    chain={chain}
                    method={method}
                    messageParams={paramsFromPayload}
                  />
                ))}
            </CyDScrollView>
            <CyDView className={'w-full px-[25px] mt-[12px] mb-[24px]'}>
              <Button
                loading={acceptingRequest}
                style='p-[3%] mt-[12px]'
                title={renderAcceptTitle(method)}
                onPress={() => {
                  void handleAccept();
                  void intercomAnalyticsLog('signModal_accept_click');
                }}
              />
              <Button
                loading={rejectingRequest}
                style='p-[3%] mt-[12px]'
                type={ButtonType.TERNARY}
                title='Reject'
                onPress={() => {
                  void handleReject();
                  void intercomAnalyticsLog('signModal_reject_click');
                }}
              />
            </CyDView>
          </CyDView>
        ) : (
          <Loader />
        )}
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
