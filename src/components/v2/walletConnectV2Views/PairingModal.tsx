/* eslint-disable array-callback-return */
/* eslint-disable no-void */
/* eslint-disable react-native/no-color-literals */
import React, { useContext, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SignClientTypes, SessionTypes } from '@walletconnect/types';
import CyDModalLayout from '../modal';
import { web3wallet } from '../../../core/walletConnectV2Utils';
import { getSdkError } from '@walletconnect/utils';
import { t } from 'i18next';
import { ButtonType } from '../../../constants/enum';
import { CyDFastImage, CyDText, CyDView } from '../../../styles/tailwindStyles';
import Button from '../button';
import { WalletConnectActions, WalletConnectContext } from '../../../reducers/wallet_connect_reducer';
import { HdWalletContext } from '../../../core/util';
import { EIP155_CHAIN_IDS } from '../../../constants/EIP155Data';
import { has } from 'lodash';

interface PairingModalProps {
  currentProposal:
  | SignClientTypes.EventArguments['session_proposal']
  | undefined
  currentETHAddress: string
  isModalVisible: boolean
  hideModal: () => void
}

export default function PairingModal ({
  currentProposal,
  currentETHAddress,
  isModalVisible,
  hideModal
}: PairingModalProps) {
  const [acceptingRequest, setAcceptingRequest] = useState<boolean>(false);
  const [rejectingRequest, setRejectingRequest] = useState<boolean>(false);
  const { walletConnectState, walletConnectDispatch } = useContext<any>(WalletConnectContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { wallet } = hdWalletContext.state;
  const { address: cosmosAddress } = wallet?.cosmos;
  const { params } = currentProposal;
  const { proposer, requiredNamespaces, optionalNamespaces } = params;
  const { metadata } = proposer;
  const { eip155 } = requiredNamespaces;
  const { name, url, icons } = metadata;
  const { methods } = eip155;
  const icon = icons[0];
  const message = 'Requesting permission to view addresses of your accounts and approval for transactions';

  const checkAndAddPairingToConnectionsList = () => {
    let isPairingAlreadyAvailable = false;
    for (const connection of walletConnectState.dAppInfo) {
      if (connection?.version === 'v2' && connection.topic === currentProposal?.params.pairingTopic) {
        isPairingAlreadyAvailable = true;
        break;
      }
    }
    let sessionTopic = '';
    if (web3wallet) {
      const sessions = Object.values(web3wallet?.getActiveSessions());
      if (sessions) {
        const [session] = sessions.filter((sessionObj) => sessionObj.pairingTopic === currentProposal?.params.pairingTopic);
        sessionTopic = session?.topic;
      }
    }
    if (!isPairingAlreadyAvailable) {
      const connector = {
        topic: currentProposal?.params.pairingTopic,
        name,
        url,
        methods,
        icon,
        version: 'v2',
        sessionTopic
      };
      walletConnectDispatch({ type: WalletConnectActions.ADD_CONNECTOR, value: connector });
      walletConnectDispatch({ type: WalletConnectActions.ADD_DAPP_INFO, value: connector });
    } else {
      walletConnectDispatch({ type: WalletConnectActions.WALLET_CONNECT_TRIGGER_REFRESH });
    }
  };

  const handleAccept = async () => {
    try {
      setAcceptingRequest(true);
      const { id, params } = currentProposal;
      const { requiredNamespaces, relays } = params;
      if (currentProposal) {
        const namespaces: SessionTypes.Namespaces = {};
        Object.keys(requiredNamespaces).forEach((key) => {
          const accounts: string[] = [];
          requiredNamespaces[key].chains.map((chain: string) => {
            if (key === 'eip155') {
              [currentETHAddress].map((acc) => accounts.push(`${chain}:${acc}`));
            } else if (key === 'cosmos' && cosmosAddress) {
              [cosmosAddress].map((acc) => accounts.push(`${chain}:${acc}`));
            }
          });

          if (optionalNamespaces && has(optionalNamespaces, key)) {
            optionalNamespaces[key].chains.map((chain: string) => {
              if (key === 'eip155') {
                [currentETHAddress].map((acc) => accounts.push(`${chain}:${acc}`));
              } else if (key === 'cosmos' && cosmosAddress) {
                [cosmosAddress].map((acc) => accounts.push(`${chain}:${acc}`));
              }
            });
          }

          namespaces[key] = {
            chains: EIP155_CHAIN_IDS,
            accounts,
            methods: [...requiredNamespaces[key].methods, ...(has(optionalNamespaces, key) ? optionalNamespaces[key]?.methods : [])],
            events: [...requiredNamespaces[key].events, ...(has(optionalNamespaces, key) ? optionalNamespaces[key]?.events : [])]
          };
        });

        await web3wallet?.approveSession({
          id,
          relayProtocol: relays[0].protocol,
          namespaces
        });
        setAcceptingRequest(false);
        checkAndAddPairingToConnectionsList();
        hideModal();
      }
    } catch (e) {
      walletConnectDispatch({ type: WalletConnectActions.WALLET_CONNECT_TRIGGER_REFRESH });
      hideModal();
      setAcceptingRequest(false);
    }
  };

  const handleReject = async () => {
    try {
      if (currentProposal) {
        setRejectingRequest(true);
        const { id } = currentProposal;
        await web3wallet?.rejectSession({
          id,
          reason: getSdkError('USER_REJECTED_METHODS')
        });
        setRejectingRequest(false);
        walletConnectDispatch({ type: WalletConnectActions.WALLET_CONNECT_TRIGGER_REFRESH });
        hideModal();
      }
    } catch (e) {
      walletConnectDispatch({ type: WalletConnectActions.WALLET_CONNECT_TRIGGER_REFRESH });
      setRejectingRequest(false);
      hideModal();
    }
  };

  const RenderDAPPInfo = () => {
    return (
      <CyDView className='flex flex-row items-center mt-[12px] border-[1px] rounded-[8px] border-fadedGrey'>
        <CyDView className='flex flex-row rounded-r-[20px] self-center px-[10px]'>
          <CyDFastImage
            className={'h-[35px] w-[35px] rounded-[50px]'}
            source={{ uri: icon }}
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

  const Divider = () => {
    return (
      <CyDView className={'h-[1px] bg-sepratorColor mt-[14px] mb-[8px]'}></CyDView>
    );
  };

  const RenderMessage = () => {
    return (
      <CyDView>
        <CyDText className={'text-[16px] ml-[6px]'}>{message}</CyDText>
      </CyDView>
    );
  };

  return (
    <CyDModalLayout setModalVisible={() => {}} isModalVisible={isModalVisible} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
      <CyDView style={styles.modalContentContainer}>
        <CyDView className={'flex flex-row justify-center'}>
          <CyDText className={'text-[24px] font-extrabold mt-[14px] mb-[4px]'}>{t<string>('WALLET_PERMISSIONS')}</CyDText>
        </CyDView>
        <CyDView>
          <RenderDAPPInfo />
          <Divider />
          <RenderMessage />
          <Divider />
        </CyDView>
        <CyDView className={'w-full'}>
          <Button loading={acceptingRequest} style={'mb-[10px]'} title='Accept' onPress={() => void handleAccept()}></Button>
          <Button loading={rejectingRequest} style={'mb-[10px]'} type={ButtonType.TERNARY} title='Reject' onPress={() => void handleReject()}></Button>
        </CyDView>
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
    alignItems: 'center',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    color: 'red',
    backgroundColor: 'white',
    bottom: 0,
    paddingHorizontal: 45
  }
});