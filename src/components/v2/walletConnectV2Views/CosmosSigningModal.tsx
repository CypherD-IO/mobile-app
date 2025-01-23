/* eslint-disable no-void */

import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SignClientTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { web3wallet } from '../../../core/walletConnectV2Utils';
import CyDModalLayout from '../modal';
import useWeb3 from '../../../hooks/useWeb3';
import { ButtonType, Web3Origin } from '../../../constants/enum';
import { Chain, chainIdNumberMapping } from '../../../constants/server';
import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils';
import { CyDFastImage, CyDText, CyDView } from '../../../styles/tailwindStyles';
import { t } from 'i18next';
import Button from '../button';

interface CosmosSigningModalProps {
  requestEvent: SignClientTypes.EventArguments['session_request'] | undefined;
  isModalVisible: boolean;
  hideModal: () => void;
}

export default function CosmosSigningModal({
  requestEvent,
  isModalVisible,
  hideModal,
}: CosmosSigningModalProps) {
  const [, handleWeb3Cosmos] = useWeb3(Web3Origin.WALLETCONNECT);
  const [acceptingRequest, setAcceptingRequest] = useState<boolean>(false);
  const [rejectingRequest, setRejectingRequest] = useState<boolean>(false);
  const { id, topic, params } = requestEvent;
  const { params: requestParams, method: requestMethod } = params.request;
  const { signerAddress, signDoc } = requestParams;
  const [, method] = requestMethod.split('_');
  const requestSession = web3wallet.engine.signClient.session.get(topic);
  const { icons, name, url } = requestSession.peer.metadata;
  const [, chainId] = params.chainId.split(':');

  const chain: Chain = chainIdNumberMapping[+chainId];

  const handleAccept = async () => {
    try {
      setAcceptingRequest(true);
      const payload = {
        id,
        method,
        type: 'proxy-request',
        args: [chainId, signerAddress, signDoc],
      };
      if (payload.method === 'signAmino') payload.args.push({});
      const response = await handleWeb3Cosmos(payload, {
        title: '',
        host: '',
        origin: '',
        url: '',
      });
      const formattedRPCResponse = formatJsonRpcResult(id, response.signature);
      await web3wallet.respondSessionRequest({
        topic,
        response: formattedRPCResponse,
      });
      hideModal();
    } catch (e) {
      hideModal();
    }
  };

  const handleReject = async () => {
    const { id } = requestEvent;

    try {
      setRejectingRequest(true);
      const rejectionResponse = formatJsonRpcError(
        id,
        getSdkError('USER_REJECTED_METHODS').message,
      );
      await web3wallet.respondSessionRequest({
        topic,
        response: rejectionResponse,
      });
      hideModal();
    } catch (e) {
      hideModal();
    }
  };

  const RenderDAPPInfo = () => {
    return (
      <CyDView className='flex flex-row items-center mt-[12px] border-[1px] rounded-[8px] border-n40'>
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
                <CyDText className={'font-extrabold text-[16px]'}>
                  {name}
                </CyDText>
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

  const RenderMethod = () => {
    return (
      <CyDView>
        <CyDView>
          <CyDText className={'text-[18px] font-bold mb-[6px] ml-[4px]'}>
            {'Method'}
          </CyDText>
        </CyDView>
        <CyDView>
          <CyDView>
            <CyDText className={'text-[16px] ml-[6px]'}>{method}</CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  };

  const Divider = () => {
    return <CyDView className={'h-[1px] bg-n40 mt-[14px] mb-[8px]'} />;
  };

  const RenderTitle = () => {
    return (
      <CyDView className={'flex flex-row justify-center'}>
        <CyDText className={'text-[22px] font-extrabold mt-[14px] mb-[10px]'}>
          {t<string>('APPROVE_REQUEST')}
        </CyDText>
      </CyDView>
    );
  };

  return (
    <CyDModalLayout
      setModalVisible={() => {}}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView style={styles.modalContentContainer}>
        <RenderTitle />
        <RenderDAPPInfo />
        <Divider />
        <RenderMethod />
        <Divider />
        <CyDView className={'w-full'}>
          <Button
            loading={acceptingRequest}
            style={'mb-[10px]'}
            title='Review Request'
            onPress={() => void handleAccept()}
          />
          <Button
            loading={rejectingRequest}
            style={'mb-[10px]'}
            type={ButtonType.TERNARY}
            title='Reject'
            onPress={() => void handleReject()}
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContentContainer: {
    display: 'flex',
    justifyContent: 'center',
    // alignItems: 'center',
    borderTopRightRadius: 34,
    borderTopLeftRadius: 34,
    borderWidth: 1,
    color: 'red',
    backgroundColor: 'white',
    bottom: 0,
    paddingHorizontal: 45,
  },
});
