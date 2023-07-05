/* eslint-disable array-callback-return */
/* eslint-disable no-void */
/* eslint-disable react-native/no-color-literals */
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SignClientTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { web3wallet } from '../../../core/walletConnectV2Utils';
import CyDModalLayout from '../modal';
import useWeb3 from '../../../hooks/useWeb3';
import { ButtonType, Web3Origin } from '../../../constants/enum';
import { Chain, SUPPORTED_EVM_CHAINS, chainIdNumberMapping } from '../../../constants/server';
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils';
import { CyDFastImage, CyDScrollView, CyDText, CyDView } from '../../../styles/tailwindStyles';
import { t } from 'i18next';
import Web3 from 'web3';
import Button from '../button';
import { EIP155_SIGNING_METHODS } from '../../../constants/EIP155Data';
import { useGlobalModalContext } from '../GlobalModal';

interface SessionSigningModalProps {
  requestEvent:
  | SignClientTypes.EventArguments['session_request']
  | undefined
  isModalVisible: boolean
  hideModal: () => void
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
      <CyDView className='flex flex-row items-center mt-[12px] border-[1px] rounded-[8px] border-fadedGrey'>
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
          <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>{'Network'}</CyDText>
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
          <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>{'Method'}</CyDText>
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
          <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>{'Message'}</CyDText>
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
    return (
      <CyDView>
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
              <CyDView>
                <CyDText className={'text-[16px] ml-[6px]'}>{requestParams[0].data}</CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
      </CyDView>
    );
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
            {(method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA || method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3 || method === EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4) && < RenderTypedTransactionSignModal/>}
          </CyDScrollView>
          <CyDView className={'w-full'}>
            <Button loading={acceptingRequest} style={'my-[10px]'} title={renderAcceptTitle()} onPress={() => void handleAccept()}></Button>
            <Button loading={rejectingRequest} style={'my-[10px]'} type={ButtonType.TERNARY} title='Reject' onPress={() => void handleReject()}></Button>
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
