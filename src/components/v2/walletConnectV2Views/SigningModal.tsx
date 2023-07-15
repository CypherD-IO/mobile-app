/* eslint-disable array-callback-return */
/* eslint-disable no-void */
/* eslint-disable react-native/no-color-literals */
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SignClientTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { web3wallet } from '../../../core/walletConnectV2Utils';
import CyDModalLayout from '../modal';
import useWeb3 from '../../../hooks/useWeb3';
import { ButtonType, DecodedResponseTypes, Web3Origin } from '../../../constants/enum';
import { Chain, SUPPORTED_EVM_CHAINS, chainIdNumberMapping } from '../../../constants/server';
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils';
import { CyDFastImage, CyDScrollView, CyDText, CyDView } from '../../../styles/tailwindStyles';
import { t } from 'i18next';
import Web3 from 'web3';
import Button from '../button';
import { EIP155_SIGNING_METHODS } from '../../../constants/EIP155Data';
import { useGlobalModalContext } from '../GlobalModal';
import useAxios from '../../../core/HttpRequest';
import AppImages from '../../../../assets/images/appImages';
import { getMaskedAddress } from '../../../core/util';
import { IDecodedTransactionResponse } from '../../../models/txnDecode.interface';
import EmptyView from '../../EmptyView';
import * as Sentry from '@sentry/react-native';
import { intercomAnalyticsLog } from '../../../containers/utilities/analyticsUtility';

interface SessionSigningModalProps {
  requestEvent:
  | SignClientTypes.EventArguments['session_request']
  | undefined
  isModalVisible: boolean
  hideModal: () => void
}

interface IExtendedDecodedTxnResponse extends IDecodedTransactionResponse {
  from_addr: string
}

export default function SigningModal ({
  requestEvent,
  isModalVisible,
  hideModal
}: SessionSigningModalProps) {
  const [handleWeb3] = useWeb3(Web3Origin.WALLETCONNECT);
  const [acceptingRequest, setAcceptingRequest] = useState<boolean>(false);
  const [rejectingRequest, setRejectingRequest] = useState<boolean>(false);
  const { showModal } = useGlobalModalContext();
  const { id, topic, params } = requestEvent;
  const { params: requestParams, method } = params.request;
  const requestSession = web3wallet?.engine.signClient.session.get(topic);
  const { postWithAuth } = useAxios();
  const [decodedABIData, setDecodedABIData] = useState<IExtendedDecodedTxnResponse | null>(null);
  // if (requestParams[0]?.gasPrice.startsWith('0x')) {
  //   requestParams[0].gasPrice = parseFloat(Web3.utils.fromWei(Web3.utils.hexToNumberString(requestParams[0]?.gasPrice), 'Gwei'));
  // } else {
  //   // Finally this code path has a breaking test-case with KOGE when gasPrice is an integer
  //   requestParams[0].gasPrice = parseFloat(Web3.utils.fromWei(requestParams[0], 'Gwei'));
  // }
  // console.log('GasPrice Detail', JSON.stringify(requestParams[0], undefined, 4));
  const { icons, name, url } = requestSession.peer.metadata;
  const [, chainId] = params.chainId.split(':');
  let chain: Chain;

  interface DecodeTxnRequestBody {
    chainId: number
    from: string
    to: string
    gas: string
    value: string
    data: string
    nonce: string
    maxFeePerGas?: string
    maxPriorityFeePerGas?: string
  }

  useEffect(() => {
    console.log(decodedABIData);
  }, [decodedABIData]);

  useEffect(() => {
    let decodeTxnRequestBody: DecodeTxnRequestBody;
    const decodeTxnRequest = async () => {
      try {
        const { data, error, isError } = await postWithAuth('/v1/txn/decode', decodeTxnRequestBody);
        if (!isError) {
          setDecodedABIData({ ...data, from_addr: decodeTxnRequestBody.from });
        } else {
          throw (error);
        }
      } catch (e) {
        const errorObject = {
          error: e,
          decodeTxnRequestBody
        };
        Sentry.captureException(errorObject);
      }
    };
    if (method === 'eth_sendTransaction') {
      const { from, to, gas = '0x0', value = '0x0', data, nonce = '0x0', maxFeePerGas = '0x0', maxPriorityFeePerGas = '0x0' } = requestParams[0];
      decodeTxnRequestBody = {
        chainId: Number(chainId),
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
    } else if (method === 'eth_signTransaction') {
      const { from, to, gasLimit: gas = '0x0', value = '0x0', data, nonce = '0x0', maxFeePerGas = '0x0', maxPriorityFeePerGas = '0x0' } = requestParams[0];
      decodeTxnRequestBody = {
        chainId: Number(chainId),
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
    } else {
      console.log(method, 'decoding not supported.');
    }
  }, [requestParams[0].data]);

  if (SUPPORTED_EVM_CHAINS.includes(+chainId)) {
    chain = chainIdNumberMapping[+chainId];
  }

  const handleAccept = async () => {
    try {
      setAcceptingRequest(true);
      const response = await handleWeb3(params.request, { title: '', host: '', origin: '', url: '' }, chain);
      const formattedRPCResponse = formatJsonRpcResult(id, response.result);
      await web3wallet?.respondSessionRequest({
        topic,
        response: formattedRPCResponse
      });
      hideModal();
    } catch (e) {
      hideModal();
    }
  };

  const handleReject = async () => {
    const { id } = requestEvent;

    if (id) {
      try {
        setRejectingRequest(true);
        const rejectionResponse = formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message);
        await web3wallet?.respondSessionRequest({
          topic,
          response: rejectionResponse
        });
        hideModal();
      } catch (e) {
        hideModal();
      }
    } else {
      hideModal();
    }
  };

  const RenderDAPPInfo = () => {
    return (
      <CyDView className='flex flex-row items-center mt-[12px] border-[1px] rounded-[12px] border-fadedGrey'>
        <CyDView className='flex flex-row rounded-r-[20px] self-center px-[10px]'>
          <CyDFastImage
            className={'h-[35px] w-[35px] rounded-[50px]'}
            source={{ uri: icons[0] }}
            resizeMode='contain'
          />
        </CyDView>
        <CyDView className={'flex flex-row'}>
          <CyDView className='flex flex-row w-full justify-between items-center rounded-r-[20px] py-[15px] pr-[20px]'>
            <CyDView className='ml-[10px]'>
              <CyDView className={'flex flex-row items-center align-center'}>
                <CyDText className={'font-extrabold text-[16px]'}>{name}</CyDText>
              </CyDView>
              <CyDView className={'flex flex-row items-center align-center'}>
                <CyDText className={'text-[14px]'}>{url}</CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  };

  const RenderNetwork = () => {
    return (
      <CyDView>
        <CyDView>
          <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>{t<string>('NETWORK_INIT_CAPS')}</CyDText>
        </CyDView>
        <CyDView>
          <CyDView className={'flex flex-row items-center'}>
            <CyDFastImage source={chain.logo_url} className={'h-[24px] w-[24px]'} />
            <CyDText className={'text-[16px] ml-[6px]'}>{chain.name}</CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  };

  const RenderMethod = () => {
    return (
      <CyDView>
        <CyDView>
          <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>{t('METHOD')}</CyDText>
        </CyDView>
        <CyDView>
          <CyDView>
            <CyDText className={'text-[16px] ml-[6px]'}>{method}</CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  };

  const RenderMessage = () => {
    let message = '';
    if (method === EIP155_SIGNING_METHODS.PERSONAL_SIGN) {
      message = Web3.utils.hexToUtf8(requestParams[0]);
    } else if (method === EIP155_SIGNING_METHODS.ETH_SIGN) {
      message = Web3.utils.hexToUtf8(requestParams[1]);
    }
    return (
      <CyDView>
        <CyDView>
          <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>{t('MESSAGE')}</CyDText>
        </CyDView>
        <CyDView className={'my-[5px] border-[1px] border-sepratorColor bg-infoTextBackground rounded-[6px]'}>
          <CyDView className={'p-[10px]'}>
            <CyDText className={'text-[15px] ml-[6px]'}>{message}</CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  };

  const Divider = () => {
    return (
      <CyDView className={'h-[1px] bg-sepratorColor mt-[14px] mb-[8px]'}></CyDView>
    );
  };

  const RenderTitle = () => {
    let title = method;
    if (method === EIP155_SIGNING_METHODS.PERSONAL_SIGN || method === EIP155_SIGNING_METHODS.ETH_SIGN) {
      title = t<string>('SIGN_MESSAGE');
    } else if (method === EIP155_SIGNING_METHODS.ETH_SEND_RAW_TRANSACTION || method === EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION || method === EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION) {
      title = t<string>('APPROVE_TRANSACTION');
    } else if (method.includes(EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA)) {
      title = t<string>('APPROVE_TYPED_TRANSACTION');
    }

    return (
      <CyDView className={'flex flex-row justify-center'}>
          <CyDText className={'text-[22px] font-extrabold mt-[14px] mb-[10px]'}>{title}</CyDText>
        </CyDView>
    );
  };

  const renderAcceptTitle = () => {
    if (method?.toLowerCase().includes('typeddata')) {
      return 'Review Request';
    } else {
      return 'Accept';
    }
  };

  const RenderSignMessageModal = () => {
    return (
        <CyDView>
          <RenderDAPPInfo />
          <Divider />
          <RenderNetwork />
          <Divider />
          <RenderMethod />
          <Divider />
          <RenderMessage />
        </CyDView>
    );
  };

  const RenderTransactionSignModal = () => {
    const decodedResponseType = decodedABIData?.type;
    switch (decodedResponseType) {
      case DecodedResponseTypes.SEND : {
        void intercomAnalyticsLog('eth_sendTransaction_SEND');
        return <RenderSendTransactionSignModal />;
      }
      case DecodedResponseTypes.APPROVE : {
        void intercomAnalyticsLog('eth_sendTransaction_APPROVE');
        return <RenderApproveTokenModal />;
      }
      case DecodedResponseTypes.CALL : {
        void intercomAnalyticsLog('eth_sendTransaction_CALL');
        return <RenderSwapTransactionSignModal />;
      }
      default : {
        void intercomAnalyticsLog('eth_sendTransaction_DEFAULT');
        return <RenderDefaultSignModal />;
      }
    }
  };

  const RenderDefaultSignModal = () => {
    return (
      <CyDView>
        {decodedABIData
          ? <>
        <RenderDAPPInfo />
        <Divider />
        <RenderNetwork />
        <Divider />
        <RenderMethod />
        <Divider />
        <CyDView>
            <CyDView>
              <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>{t<string>('DATA')}</CyDText>
            </CyDView>
            <CyDView>
              <CyDView className={'my-[5px] border-[1px] border-sepratorColor bg-infoTextBackground rounded-[6px]'}>
                <CyDView className='p-[10px]'>
                  <CyDText className={'text-[16px] ml-[6px]'}>{JSON.stringify(decodedABIData, null, '\t')}</CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
      </>
          : <CyDView className='flex justify-center items-center'>
      <EmptyView
        text={'Loading...'}
        image={AppImages.LOADING_IMAGE}
        buyVisible={false}
        marginTop={50}
        isLottie={true}
      />
    </CyDView>
      }
      </CyDView>
    );
  };

  const RenderSendTransactionSignModal = () => {
    if (decodedABIData?.gasPrice && decodedABIData.native_token.amount && decodedABIData.type_send) {
      const gasPriceInWei = decodedABIData?.gasPrice * 10 ** 9;
      const gasInTokens = (
        decodedABIData?.gas.gas_limit *
        gasPriceInWei *
        10 ** -decodedABIData?.native_token.decimals
      );
      const gasWithUSDAppx = `${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 }).format(gasInTokens)} ${decodedABIData?.native_token.symbol} ≈ $${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 }).format(gasInTokens * decodedABIData?.native_token.price)} USD`;
      const availableBalance = `${decodedABIData.native_token.amount.toFixed(4)} ${decodedABIData.native_token.symbol}`;
      return (
        <CyDView>
          <RenderDAPPInfo />
          <CyDView className='my-[10px]'>
            <CyDView>
              <CyDView className='flex flex-col items-center'>
                <CyDView className={'flex flex-row justify-center items-center'}>
                  <CyDView className='flex flex-row h-full mb-[10px] items-center rounded-r-[20px] self-center pl-[13px] pr-[10px]'>
                    <CyDFastImage
                      className={'h-[30px] w-[30px] rounded-[50px]'}
                      source={{ uri: decodedABIData?.type_send?.token.logo_url }}
                      resizeMode='contain'
                      />
                    <CyDView className='absolute top-[60%] right-[3px]'>
                      <CyDFastImage
                        className={'h-[18px] w-[18px] rounded-[50px] border-[1px] border-white bg-white'}
                        source={chain.logo_url}
                        resizeMode='contain'
                        />
                    </CyDView>
                  </CyDView>
                  <CyDView>
                    <CyDText className='text-[22px] font-bold mb-[10px]'>{decodedABIData.type_send.token.name}</CyDText>
                  </CyDView>
                </CyDView>
                <CyDView>
                    <CyDText className='text-[48px] font-bold'>{decodedABIData?.type_send?.token_amount.toFixed(4)}</CyDText>
                </CyDView>
                <CyDView>
                    <CyDText className='text-[24px] text-subTextColor font-semibold'>{(decodedABIData?.type_send.token_amount * decodedABIData?.type_send?.token.price).toFixed(4) + ' USD'}</CyDText>
                </CyDView>
              </CyDView>
              <CyDView className='my-[10px]'>
                <CyDView className={'bg-sepratorColor rounded-[12px] py-[20px] px-[10px]'}>
                  <CyDView className='flex flex-row justify-between'>
                    <CyDText className={'text-[16px] ml-[6px] font-bold'}>{t('TO')}</CyDText>
                    <CyDText className={'text-[16px]'}>{getMaskedAddress(decodedABIData?.type_send?.to_addr, 10)}</CyDText>
                  </CyDView>
                  <CyDView className={'h-[1px] bg-gray-200 mt-[14px] mb-[8px]'}></CyDView>
                  <CyDView className='flex flex-row justify-between'>
                    <CyDText className={'text-[16px] ml-[6px] font-bold'}>{t('FROM')}</CyDText>
                    <CyDText className={'text-[16px]'}>{getMaskedAddress(decodedABIData?.from_addr, 10)}</CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
              <CyDView className='my-[10px]'>
                <CyDView className={'bg-infoTextBackground rounded-[12px] py-[20px] px-[10px]'}>
                  <CyDView className='flex flex-row justify-between'>
                  <CyDText className={'font-bold text-[16px]'}>{t('GAS')}</CyDText>
                  <CyDText className={'font-medium text-[16px] text-subTextColor'}>{gasWithUSDAppx}</CyDText>
                  </CyDView>
                  <CyDView className={'h-[1px] bg-gray-200 mt-[14px] mb-[8px]'}></CyDView>
                  <CyDView className='flex flex-row justify-between'>
                  <CyDText className={'font-bold text-[16px]'}>{t('AVAILABLE_BALANCE')}</CyDText>
                  <CyDText className={'font-medium text-[16px] text-subTextColor'}>{availableBalance}</CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
          </CyDView>
        </CyDView>
        </CyDView>
      );
    }
    return <RenderDefaultSignModal />;
  };

  const RenderSwapTransactionSignModal = () => {
    if (decodedABIData?.gasPrice) {
      const { send_token_list: sendTokenList, receive_token_list: receiveTokenList } = decodedABIData.balance_change;
      if (sendTokenList[0].amount && sendTokenList[0].usd_value && receiveTokenList[0].amount && receiveTokenList[0].usd_value) {
        const sentAmountInTokens = `${sendTokenList[0]?.amount.toFixed(3)} ${sendTokenList[0].symbol}`;
        const sentAmountInUSD = `${sendTokenList[0]?.usd_value.toFixed(3)} USD`;
        const receivedAmountInTokens = `${receiveTokenList[0].amount.toFixed(3)} ${receiveTokenList[0].symbol}`;
        const receivedAmountInUSD = `${receiveTokenList[0].usd_value.toFixed(3)} USD`;
        const gasPriceInWei = decodedABIData?.gasPrice * 10 ** 9;
        const gasInTokens = (
          decodedABIData?.gas.gas_limit *
          gasPriceInWei *
          10 ** -decodedABIData?.native_token.decimals
        );
        const gasInTokensAndSymbol = `${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 }).format(gasInTokens)} ${decodedABIData?.native_token.symbol}`;
        const gasInUSD = `${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 }).format(gasInTokens * decodedABIData?.native_token.price)} USD`;
        return (
          <CyDView>
            <RenderDAPPInfo />
            <CyDView className='my-[10px]'>
                <CyDView className='flex flex-col items-center'>
                  <CyDView className={'flex flex-row justify-center items-center'}>
                  <CyDView className={'flex flex-row justify-between items-center w-[100%] my-[20px] bg-[#F7F8FE] rounded-[20px] px-[15px] py-[20px]'}>
                        <CyDView className={'flex w-[40%] items-center justify-center'}>
                          <CyDView className="items-center">
                            <CyDFastImage source={{ uri: sendTokenList[0].logo_url }} className={'w-[44px] h-[44px]'} />
                              <CyDText className={'my-[6px] mx-[2px] text-black text-[14px] text-center font-semibold flex flex-row justify-center font-nunito'}>
                                {sendTokenList[0].name}
                              </CyDText>
                              <CyDView className={'bg-white rounded-[20px] flex flex-row items-center p-[4px]'}>
                                <CyDFastImage source={chain.logo_url} className={'w-[14px] h-[14px]'} />
                                <CyDText className={'ml-[6px] font-nunito font-normal text-black  text-[12px]'}>
                                  {chain.name}
                                </CyDText>
                              </CyDView>
                          </CyDView>
                        </CyDView>
                        <CyDView className={'flex h-[16px] w-[16px] justify-center'}>
                          <CyDFastImage source={AppImages.SWAP} className='h-full w-full' resizeMode='contain' />
                        </CyDView>
                        <CyDView className={'flex w-[40%] items-center self-center align-center justify-center'}>
                          <CyDView className="items-center">
                            <CyDFastImage source={{ uri: receiveTokenList[0].logo_url }} className={'w-[44px] h-[44px]'} />
                            <CyDText className={'my-[6px] mx-[2px] text-black text-[14px] text-center font-semibold flex flex-row justify-center font-nunito'}>
                              {receiveTokenList[0].name}
                            </CyDText>
                            <CyDView className={'bg-white rounded-[20px] flex flex-row items-center p-[4px]'}>
                              <CyDFastImage source={chain.logo_url} className={'w-[14px] h-[14px]'} />
                              <CyDText className={'ml-[6px] font-nunito text-black font-normal text-[12px]'}>
                                {chain.name}
                              </CyDText>
                            </CyDView>
                          </CyDView>
                        </CyDView>
                      </CyDView>
                    </CyDView>
                  </CyDView>
                <Divider />
                <CyDView className='flex flex-row justify-between items-center'>
                  <CyDText className={'text-[16px] font-semibold'}>
                    {t<string>('SENT_AMOUNT')}
                  </CyDText>
                  <CyDView className={'mr-[10px] flex items-end'}>
                    <CyDText className='text-[14px] font-bold max-w-[150px]'>
                      {sentAmountInTokens}
                    </CyDText>
                    <CyDText className='text-[12px] text-subTextColor font-bold'>
                      {sentAmountInUSD}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <Divider />
                <CyDView className='flex flex-row justify-between items-center'>
                  <CyDText className={'text-[16px] font-semibold'}>
                    {t<string>('TOTAL_RECEIVED')}
                  </CyDText>
                  <CyDView className={'mr-[10px] flex items-end'}>
                    <CyDText className='text-[14px] font-bold max-w-[150px]'>
                      {receivedAmountInTokens}
                    </CyDText>
                    <CyDText className='text-[12px] text-subTextColor font-bold'>
                      {receivedAmountInUSD}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <Divider />
                <CyDView className='flex flex-row justify-between items-center'>
                  <CyDText className={'text-[16px] font-semibold'}>
                    {t<string>('GAS_FEE')}
                  </CyDText>
                  <CyDView className={'mr-[10px] flex items-end'}>
                    <CyDText className='text-[12px] font-bold max-w-[150px]'>
                      {gasInTokensAndSymbol}
                    </CyDText>
                    <CyDText className='text-[12px] text-subTextColor font-bold'>
                      {gasInUSD}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <Divider />
              </CyDView>
          </CyDView>
        );
      }
    }
    return <RenderDefaultSignModal />;
  };

  const RenderApproveTokenModal = () => {
    if (decodedABIData?.type_token_approval && decodedABIData.gasPrice && decodedABIData.native_token.amount) {
      const approvalToken = decodedABIData?.type_token_approval?.token;
      const amountInTokens = `${decodedABIData.type_token_approval.token_amount} ${decodedABIData.type_token_approval.token_symbol}`;
      const amountInUSD = `$${(decodedABIData.type_token_approval.token_amount * approvalToken.price).toLocaleString()}`;
      const spender = { address: getMaskedAddress(decodedABIData.type_token_approval.spender, 10), protocolLogoUrl: decodedABIData.type_token_approval.spender_protocol_logo_url, protocolName: decodedABIData.type_token_approval.spender_protocol_name };
      const gasPriceInWei = decodedABIData?.gasPrice * 10 ** 9;
      const gasInTokens = (
        decodedABIData?.gas.gas_limit *
        gasPriceInWei *
        10 ** -decodedABIData?.native_token.decimals
      );
      const gasWithUSDAppx = `${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 }).format(gasInTokens)} ${decodedABIData?.native_token.symbol} ≈ $${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 }).format(gasInTokens * decodedABIData?.native_token.price)} USD`;
      const availableBalance = `${decodedABIData.native_token.amount.toFixed(4)} ${decodedABIData.native_token.symbol}`;
      return (
        <CyDView>
          <RenderDAPPInfo />
          <CyDView className='my-[10px]'>
          <CyDView className='flex flex-col gap-[10px] items-center rounded-[20px] bg-sepratorColor'>
                <CyDView className='px-[10px] my-[10px]'>
                  <CyDText className='font-bold text-[16px]'>
                      {t('APPROVAL_AMOUNT')}
                  </CyDText>
                </CyDView>
              <CyDView className='flex flex-row gap-[10px]'>
                <CyDView className={'flex flex-row justify-center items-center my-[10px]'}>
                  <CyDView className='flex flex-row h-full mb-[10px] items-center rounded-r-[20px] self-center pl-[13px] pr-[10px]'>
                    <CyDFastImage
                      className={'h-[24px] w-[24px] rounded-[50px]'}
                      source={{ uri: approvalToken.logo_url }}
                      resizeMode='contain'
                      />
                    <CyDView className='absolute top-[60%] right-[3px]'>
                      <CyDFastImage
                        className={'h-[16px] w-[16px] rounded-[50px] border-[1px] border-white bg-white'}
                        source={chain.logo_url}
                        resizeMode='contain'
                        />
                    </CyDView>
                  </CyDView>
                </CyDView>
                <CyDText className='font-bold text-[18px] text-left'>
                    {amountInTokens}
                </CyDText>
              </CyDView>
              <CyDView className='py-[7px]'>
                <CyDText className='font-semibold text-[16px] text-subTextColor'>
                    {amountInUSD}
                </CyDText>
              </CyDView>
            </CyDView>
          <CyDView className='my-[10px]'>
            <CyDView className={'bg-sepratorColor rounded-[12px] py-[20px] px-[10px]'}>
              <CyDView className='flex flex-row justify-between'>
                <CyDText className={'text-[14px] ml-[6px] font-bold'}>{t('SPENDER')}</CyDText>
                <CyDText className={'text-[14px]'}>{spender.address}</CyDText>
              </CyDView>
              <CyDView className={'h-[1px] bg-gray-200 mt-[14px] mb-[8px]'}></CyDView>
              <CyDView className='flex flex-row justify-between'>
                <CyDText className={'text-[14px] ml-[6px] font-bold'}>{t('APPROVE_TO')}</CyDText>
                <CyDView>
                <CyDFastImage source={{ uri: spender.protocolLogoUrl }} />
                <CyDText className={'text-[14px]'}>{spender.protocolName}</CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className='my-[10px]'>
            <CyDView className={'bg-infoTextBackground rounded-[12px] py-[20px] px-[10px]'}>
              <CyDView className='flex flex-row justify-between'>
                <CyDText className={'font-bold text-[16px]'}>{t('GAS')}</CyDText>
                <CyDText className={'font-medium text-[16px] text-subTextColor'}>{gasWithUSDAppx}</CyDText>
              </CyDView>
              <CyDView className={'h-[1px] bg-gray-200 mt-[14px] mb-[8px]'}></CyDView>
              <CyDView className='flex flex-row justify-between'>
                <CyDText className={'font-bold text-[16px]'}>{t('AVAILABLE_BALANCE')}</CyDText>
                <CyDText className={'font-medium text-[16px] text-subTextColor'}>{availableBalance}</CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
      );
    }
    return <RenderDefaultSignModal />;
  };

  const RenderTypedTransactionSignModal = () => {
    return (
      <CyDView>
        <CyDView>
          <RenderDAPPInfo />
          <Divider />
          <RenderNetwork />
          <Divider />
        </CyDView>
      </CyDView>
    );
  };

  const RenderBody = () => {
    return (
      <CyDView>
        {chain && <CyDView className='flex flex-col justify-between'>
          <RenderTitle />
          <CyDScrollView className='max-h-[70%]'>
            {(method === EIP155_SIGNING_METHODS.PERSONAL_SIGN || method === EIP155_SIGNING_METHODS.ETH_SIGN) && <RenderSignMessageModal />}
            {(method === EIP155_SIGNING_METHODS.ETH_SEND_RAW_TRANSACTION || method === EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION || method === EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION) && <RenderTransactionSignModal />}
            {(method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA || method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3 || method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4) && <RenderTypedTransactionSignModal />}
          </CyDScrollView>
          <CyDView className={'w-full'}>
            <Button loading={acceptingRequest} style={'my-[10px]'} title={renderAcceptTitle()} onPress={() => { void handleAccept(); void intercomAnalyticsLog('signModal_accept_click'); }}></Button>
            <Button loading={rejectingRequest} style={'my-[10px]'} type={ButtonType.TERNARY} title='Reject' onPress={() => { void handleReject(); void intercomAnalyticsLog('signModal_reject_click'); }}></Button>
          </CyDView>
        </CyDView>}
        {!chain && showModal('state', { type: 'error', title: t('UNSUPPORTED_CHAIN'), description: t('UNSUPPORTED_CHAIN_DESCRIPTION'), onSuccess: handleReject, onFailure: handleReject })}
      </CyDView>
    );
  };

  return (
    <CyDModalLayout setModalVisible={() => {}} isModalVisible={isModalVisible} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
      <CyDView style={styles.modalContentContainer}>
        <RenderBody />
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  },
  modalContentContainer: {
    display: 'flex',
    justifyContent: 'center',
    borderTopRightRadius: 34,
    borderTopLeftRadius: 34,
    borderWidth: 1,
    color: 'red',
    backgroundColor: 'white',
    bottom: 0,
    paddingHorizontal: 20
  }
});
