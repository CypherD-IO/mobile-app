import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { getSdkError } from '@walletconnect/utils';
import { web3wallet } from '../../../core/walletConnectV2Utils';
import CyDModalLayout from '../modal';
import useWeb3 from '../../../hooks/useWeb3';
import { ButtonType, SigningModalPayloadFrom, Web3Origin } from '../../../constants/enum';
import { Chain, SUPPORTED_EVM_CHAINS, chainIdNumberMapping } from '../../../constants/server';
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils';
import { CyDScrollView, CyDView } from '../../../styles/tailwindStyles';
import { t } from 'i18next';
import Web3 from 'web3';
import Button from '../button';
import { EIP155_SIGNING_METHODS } from '../../../constants/EIP155Data';
import { useGlobalModalContext } from '../GlobalModal';
import useAxios from '../../../core/HttpRequest';
import { HdWalletContext, formatAmount, getWeb3Endpoint } from '../../../core/util';
import * as Sentry from '@sentry/react-native';
import { intercomAnalyticsLog } from '../../../containers/utilities/analyticsUtility';
import { GlobalContext } from '../../../core/globalContext';
import { DecodeTxnRequestBody, IDAppInfo, IEvmosTxnMessage, IExtendedDecodedTxnResponse, ISendTxnData, SessionSigningModalProps } from '../../../models/signingModalData.interface';
import { Loader, RenderTitle } from './SigningModals/SigningModalComponents';
import { RenderSignMessageModal } from './SigningModals/SignMessageModal';
import { RenderTransactionSignModal, RenderTypedTransactionSignModal } from './SigningModals/TxnModals';
import { getGasPriceFor } from '../../../containers/Browser/gasHelper';
import { decideGasLimitBasedOnTypeOfToAddress } from '../../../core/NativeTransactionHandler';

export default function SigningModal({
  payloadFrom,
  modalPayload,
  requestEvent,
  isModalVisible,
  hideModal
}: SessionSigningModalProps) {
  const [handleWeb3] = useWeb3(Web3Origin.WALLETCONNECT);
  const { postWithAuth } = useAxios();
  const { showModal } = useGlobalModalContext();
  const [acceptingRequest, setAcceptingRequest] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(false);
  const [dataIsReady, setDataIsReady] = useState(false);
  const [nativeSendTxnData, setNativeSendTxnData] = useState<ISendTxnData | null>(null);
  const hdWalletContext = useContext<any>(HdWalletContext);;
  const [decodedABIData, setDecodedABIData] = useState<IExtendedDecodedTxnResponse | IEvmosTxnMessage | null>(null);
  const globalContext = useContext<any>(GlobalContext);

  let id: number, topic: string, params: { request: { method: string | undefined, params: DecodeTxnRequestBody[] | undefined }, chainId: { split: (arg0: string) => [any, any] } }, method: string | undefined, requestParams: DecodeTxnRequestBody[] | undefined, paramsFromPayload: DecodeTxnRequestBody[] | undefined, requestSession, dAppInfo: IDAppInfo | undefined, chain: Chain | undefined, web3RPCEndpoint: Web3;
  const isMessageModalForSigningTypedData = modalPayload?.params && 'signMessageTitle' in modalPayload.params;

  if (payloadFrom === SigningModalPayloadFrom.WALLETCONNECT) {
    ({ id, topic, params } = requestEvent);
    ({ method, params: requestParams } = params.request);
    requestSession = web3wallet?.engine.signClient.session.get(topic);
    const { icons, name, url } = requestSession?.peer.metadata;
    dAppInfo = {
      name,
      url,
      logo: icons[0]
    };
    const [, chainId] = params.chainId.split(':');
    chain = SUPPORTED_EVM_CHAINS.includes(+chainId) ? chainIdNumberMapping[+chainId] : undefined;
    if (chain) {
      web3RPCEndpoint = new Web3(getWeb3Endpoint(chain, globalContext));
    } else {
      showModal('state', { type: 'error', title: t('UNSUPPORTED_CHAIN'), description: t('UNSUPPORTED_CHAIN_DESCRIPTION'), onSuccess: handleReject, onFailure: handleReject });
    }
  } else { // The payload is from 'BROWSER'
    if (modalPayload) {
      ({ method, params: paramsFromPayload } = modalPayload.params.payload);
      const chainIdNumber = hdWalletContext?.state.selectedChain.chainIdNumber;// modalPayload.params.chainIdNumber;
      chain = SUPPORTED_EVM_CHAINS.includes(chainIdNumber) ? chainIdNumberMapping[chainIdNumber] : undefined;
      if (chain) {
        web3RPCEndpoint = new Web3(getWeb3Endpoint(chain, globalContext));
      } else {
        showModal('state', { type: 'error', title: t('UNSUPPORTED_CHAIN'), description: t('UNSUPPORTED_CHAIN_DESCRIPTION'), onSuccess: handleReject, onFailure: handleReject });
      }
    }
    // TODO: get the dAppInfo here as well.
    dAppInfo = undefined;
  }

  // if (requestParams[0]?.gasPrice.startsWith('0x')) {
  //   requestParams[0].gasPrice = parseFloat(Web3.utils.fromWei(Web3.utils.hexToNumberString(requestParams[0]?.gasPrice), 'Gwei'));
  // } else {
  //   // Finally this code path has a breaking test-case with KOGE when gasPrice is an integer
  //   requestParams[0].gasPrice = parseFloat(Web3.utils.fromWei(requestParams[0], 'Gwei'));
  // }
  // console.log('GasPrice Detail', JSON.stringify(requestParams[0], undefined, 4));

  useEffect(() => {
    let decodeTxnRequestBody: DecodeTxnRequestBody;
    const decodeTxnRequest = async () => {
      try {
        if (decodeTxnRequestBody.chainId !== 9001) {
          const { data, error, isError } = await postWithAuth('/v1/txn/decode', decodeTxnRequestBody);
          if (!isError) {
            if (data.isDecoded) {
              setDecodedABIData({ ...data, from_addr: decodeTxnRequestBody.from });
              setDataIsReady(true);
            } else {
              const errorObject = {
                message: 'isDecoded was false when decoding. Showing raw data.',
                error,
                decodeTxnRequestBody
              };
              Sentry.captureException(errorObject);
              setDecodedABIData({ from: decodeTxnRequestBody.from, to: decodeTxnRequestBody.to, data: decodeTxnRequestBody.data, gas: decodeTxnRequestBody.gas });
              setDataIsReady(true);
            }
          } else {
            const errorObject = {
              message: 'Decoding response isError is true. Showing raw data.',
              error,
              decodeTxnRequestBody
            };
            Sentry.captureException(errorObject);
            setDecodedABIData({ from: decodeTxnRequestBody.from, to: decodeTxnRequestBody.to, data: decodeTxnRequestBody.data, gas: decodeTxnRequestBody.gas });
            setDataIsReady(true);
          }
        } else {
          // Setting the data as it is for EVMOS
          setDecodedABIData({ from: decodeTxnRequestBody.from, to: decodeTxnRequestBody.to, data: decodeTxnRequestBody.data, gas: decodeTxnRequestBody.gas });
          setDataIsReady(true);
        }
      } catch (e) {
        const errorObject = {
          message: 'Decoding response caused an exception. Showing raw data.',
          error: e,
          decodeTxnRequestBody
        };
        Sentry.captureException(errorObject);
        setDecodedABIData({ from: decodeTxnRequestBody.from, to: decodeTxnRequestBody.to, data: decodeTxnRequestBody.data, gas: decodeTxnRequestBody.gas });
        setDataIsReady(true);
      }
    };
    const getDataForNativeTxn = async () => {
      let paramsForDecoding: DecodeTxnRequestBody;
      if (payloadFrom === SigningModalPayloadFrom.WALLETCONNECT && requestParams) { paramsForDecoding = requestParams[0]; } else { paramsForDecoding = (paramsFromPayload as DecodeTxnRequestBody[])[0]; };
      try {
        const walletTokenBalance = await web3RPCEndpoint.eth.getBalance(paramsForDecoding.from);
        const tokenDecimals = 18;
        const estimatedGas = await web3RPCEndpoint.eth.estimateGas({ from: paramsForDecoding.from, to: paramsForDecoding.to, gasPrice: paramsForDecoding.gasPrice, value: paramsForDecoding.value });
        const code = await web3RPCEndpoint.eth.getCode(paramsForDecoding.to);
        const finalEstimatedGas = decideGasLimitBasedOnTypeOfToAddress(code, estimatedGas);
        const adjustedTokenBalance = parseFloat(walletTokenBalance) * 10 ** -tokenDecimals;
        if (paramsForDecoding?.value && chain?.nativeTokenLogoUrl) {
          const { gasPrice, tokenPrice } = await getGasPriceFor(chain, web3RPCEndpoint);
          const gasNative = finalEstimatedGas * (gasPrice * 10 ** 9) * (10 ** -tokenDecimals);
          const sendTxnData: ISendTxnData = {
            chainLogo: chain.logo_url,
            token: {
              logo: chain?.nativeTokenLogoUrl,
              name: chain.name,
              amount: parseFloat(Web3.utils.fromWei(Web3.utils.hexToNumberString(paramsForDecoding.value))),
              valueInUSD: parseFloat(Web3.utils.fromWei(Web3.utils.hexToNumberString(paramsForDecoding.value))) * tokenPrice
            },
            toAddress: paramsForDecoding.to,
            fromAddress: paramsForDecoding.from,
            gasAndUSDAppx: `${formatAmount(gasNative)} ${chain.symbol} ≈ $${formatAmount(gasNative * tokenPrice)} USD`,
            availableBalance: `${formatAmount(adjustedTokenBalance)} ${chain.symbol}`
          };
          setNativeSendTxnData(sendTxnData);
          setDataIsReady(true);
        }
      } catch (e) {
        const errorObject = {
          error: e,
          paramsForDecoding
        };
        Sentry.captureException(errorObject);
        setDecodedABIData(paramsForDecoding);
        setDataIsReady(true);
      }
    };
    let paramsForDecoding: DecodeTxnRequestBody;
    if (payloadFrom === SigningModalPayloadFrom.WALLETCONNECT && requestParams) { paramsForDecoding = requestParams[0]; } else { paramsForDecoding = (paramsFromPayload as DecodeTxnRequestBody[])[0]; };
    if (paramsForDecoding?.data !== '0x' && chain) {
      if (method === EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION) {
        const { from, to, gas = '0x0', value = '0x0', data, nonce = '0x0', maxFeePerGas = '0x0', maxPriorityFeePerGas = '0x0' } = paramsForDecoding;
        decodeTxnRequestBody = {
          chainId: chain.chainIdNumber,
          from,
          to,
          gas,
          value,
          data,
          nonce,
          maxFeePerGas,
          maxPriorityFeePerGas
        };
        void decodeTxnRequest();
      } else if (method === EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION) {
        const { from, to, gasLimit: gas = '0x0', value = '0x0', data, nonce = '0x0', maxFeePerGas = '0x0', maxPriorityFeePerGas = '0x0' } = paramsForDecoding;
        decodeTxnRequestBody = {
          chainId: chain.chainIdNumber,
          from,
          to,
          gas,
          value,
          data,
          nonce,
          maxFeePerGas,
          maxPriorityFeePerGas
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
          const response = await handleWeb3(params.request, { title: '', host: '', origin: '', url: '' }, chain);
          const formattedRPCResponse = formatJsonRpcResult(id, response.result);
          await web3wallet?.respondSessionRequest({
            topic,
            response: formattedRPCResponse
          });
        }
        (hideModal as () => void)(); // Type asserting that hideModal cannot be undefined here.
      } catch (e) {
        (hideModal as () => void)(); // Type asserting that hideModal cannot be undefined here.
      }
    } else {
      modalPayload?.resolve(true);
    }
  };

  async function handleReject() {
    if (payloadFrom === SigningModalPayloadFrom.WALLETCONNECT) {
      const { id } = requestEvent;
      if (id) {
        try {
          setRejectingRequest(true);
          if (isMessageModalForSigningTypedData) {
            modalPayload?.resolve(false);
          } else {
            const rejectionResponse = formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message);
            await web3wallet?.respondSessionRequest({
              topic,
              response: rejectionResponse
            });
          }
          (hideModal as () => void)(); // Type asserting that hideModal cannot be undefined here.
        } catch (e) {
          (hideModal as () => void)(); // Type asserting that hideModal cannot be undefined here.
        }
      } else {
        (hideModal as () => void)(); // Type asserting that hideModal cannot be undefined here.
      }
    } else {
      modalPayload?.resolve(false);
    }
  };

  const renderAcceptTitle = (method: string) => {
    if (method.toLowerCase().includes('typeddata')) {
      if (isMessageModalForSigningTypedData) {
        return 'Approve';
      }
      return 'Review Request';
    } else if (method.toLowerCase().includes(EIP155_SIGNING_METHODS.PERSONAL_SIGN)) {
      return 'Sign';
    } else {
      return 'Accept';
    }
  };

  return (
    <CyDModalLayout setModalVisible={() => { }} isModalVisible={isModalVisible} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
      <CyDView className='rounded-t-[24px] bg-white max-h-[90%]'>
        {(chain && method)
          ? <CyDView className='flex flex-col justify-between'>
            <RenderTitle method={method} sendType={(decodedABIData as IExtendedDecodedTxnResponse)?.type} />
            <CyDScrollView className='px-[25px] pb-[5px] max-h-[70%]'>
              {(method === EIP155_SIGNING_METHODS.PERSONAL_SIGN || method === EIP155_SIGNING_METHODS.ETH_SIGN) && (payloadFrom === SigningModalPayloadFrom.WALLETCONNECT ? <RenderSignMessageModal dAppInfo={dAppInfo} chain={chain} method={method} messageParams={requestParams} /> : <RenderSignMessageModal dAppInfo={dAppInfo} chain={chain} method={method} messageParams={paramsFromPayload} />)}
              {(method === EIP155_SIGNING_METHODS.ETH_SEND_RAW_TRANSACTION || method === EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION || method === EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION) &&
                (dataIsReady
                  ? <RenderTransactionSignModal dAppInfo={dAppInfo} chain={chain} method={method} data={decodedABIData} nativeSendTxnData={nativeSendTxnData} />
                  : <Loader />
                )
              }
              {(method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA || method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3 || method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4) && (payloadFrom === SigningModalPayloadFrom.WALLETCONNECT ? <RenderTypedTransactionSignModal dAppInfo={dAppInfo} chain={chain} method={method} messageParams={requestParams} /> : <RenderTypedTransactionSignModal dAppInfo={dAppInfo} chain={chain} method={method} messageParams={paramsFromPayload} />)}
            </CyDScrollView>
            <CyDView className={'w-full px-[25px]'}>
              <Button loading={acceptingRequest} style={acceptingRequest ? 'mb-[10px] py-[7px]' : 'mb-[10px] py-[15px]'} title={renderAcceptTitle(method)} onPress={() => { void handleAccept(); void intercomAnalyticsLog('signModal_accept_click'); }} />
              <Button loading={rejectingRequest} style={rejectingRequest ? 'mb-[10px] py-[7px]' : 'mb-[10px] py-[15px]'} type={ButtonType.TERNARY} title='Reject' onPress={() => { void handleReject(); void intercomAnalyticsLog('signModal_reject_click'); }} />
            </CyDView>
          </CyDView>
          : <Loader />
        }
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  }
});
