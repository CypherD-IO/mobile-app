/* eslint-disable array-callback-return */
/* eslint-disable no-void */

import React, { useContext, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SignClientTypes, SessionTypes } from '@walletconnect/types';
import CyDModalLayout from '../modal';
import { web3wallet } from '../../../core/walletConnectV2Utils';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { t } from 'i18next';
import { ButtonType } from '../../../constants/enum';
import {
  CyDFastImage,
  CyDScrollView,
  CyDText,
  CyDView,
} from '../../../styles/tailwindComponents';
import Button from '../button';
import {
  WalletConnectActions,
  WalletConnectContext,
} from '../../../reducers/wallet_connect_reducer';
import { HdWalletContext } from '../../../core/util';
import { EIP155_CHAIN_IDS } from '../../../constants/EIP155Data';
import { has, isEmpty } from 'lodash';
import { wcDebug, wcError } from '../../../core/walletConnectDebug';

interface PairingModalProps {
  // WalletConnect SDK event typing differs across versions; we only rely on
  // a small, runtime-checked subset of fields.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentProposal: any | undefined;
  currentETHAddress: string;
  isModalVisible: boolean;
  hideModal: () => void;
}

export default function PairingModal({
  currentProposal,
  currentETHAddress,
  isModalVisible,
  hideModal,
}: PairingModalProps) {
  const noop = () => null;
  const [acceptingRequest, setAcceptingRequest] = useState<boolean>(false);
  const [rejectingRequest, setRejectingRequest] = useState<boolean>(false);
  const { walletConnectState, walletConnectDispatch } =
    useContext<any>(WalletConnectContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { wallet } = hdWalletContext.state;
  const cosmosAddress = wallet?.cosmos?.address;
  const proposalParams = currentProposal?.params;
  const proposer = proposalParams?.proposer;
  const requiredNamespaces = proposalParams?.requiredNamespaces ?? {};
  const optionalNamespaces = proposalParams?.optionalNamespaces ?? {};
  const metadata = proposer?.metadata ?? {};
  const eip155 = requiredNamespaces?.eip155 ?? optionalNamespaces?.eip155;
  const name = String(metadata?.name ?? '');
  const url = String(metadata?.url ?? '');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const icons: string[] = Array.isArray(metadata?.icons) ? metadata.icons : [];
  const icon = icons?.[0] ?? '';
  const message =
    'Requesting permission to view addresses of your accounts and approval for transactions';

  /**
   * Wait for session to be available in active sessions after approval.
   * This addresses a race condition where the dApp may send requests before
   * the session is fully persisted to storage.
   */
  const waitForSessionAvailability = async (
    pairingTopic: string,
    maxRetries = 10,
    delayMs = 200,
  ): Promise<string | null> => {
    for (let i = 0; i < maxRetries; i++) {
      if (web3wallet) {
        const sessions = Object.values(web3wallet.getActiveSessions());
        const session = sessions.find(s => s.pairingTopic === pairingTopic);
        if (session?.topic) {
          return session.topic;
        }
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return null;
  };

  const checkAndAddPairingToConnectionsList = async () => {
    let isPairingAlreadyAvailable = false;
    for (const connection of walletConnectState.dAppInfo) {
      if (
        connection?.version === 'v2' &&
        connection.topic === currentProposal?.params.pairingTopic
      ) {
        isPairingAlreadyAvailable = true;
        break;
      }
    }

    // Wait for session to be available with retry logic
    const sessionTopic = await waitForSessionAvailability(
      currentProposal?.params.pairingTopic ?? '',
    );

    if (!sessionTopic) {
      console.warn(
        '[WalletConnect] Session not found after approval, may cause issues with subsequent requests',
      );
    }

    if (!isPairingAlreadyAvailable) {
      const connector = {
        topic: currentProposal?.params.pairingTopic,
        name,
        url,
        methods: eip155?.methods ?? optionalNamespaces?.eip155?.methods,
        icon,
        version: 'v2',
        sessionTopic: sessionTopic ?? '',
      };
      walletConnectDispatch({
        type: WalletConnectActions.ADD_CONNECTOR,
        value: connector,
      });
      walletConnectDispatch({
        type: WalletConnectActions.ADD_DAPP_INFO,
        value: connector,
      });
    } else {
      walletConnectDispatch({
        type: WalletConnectActions.WALLET_CONNECT_TRIGGER_REFRESH,
      });
    }
  };

  const handleAccept = async () => {
    try {
      setAcceptingRequest(true);
      if (!currentProposal?.id || !currentProposal?.params) {
        wcError('WalletKit', 'handleAccept called without valid proposal', {
          hasProposal: Boolean(currentProposal),
        });
        setAcceptingRequest(false);
        hideModal();
        return;
      }
      const id = currentProposal.id as number;
      const proposalRequiredNamespaces =
        currentProposal?.params?.requiredNamespaces ?? {};
      wcDebug('WalletKit', 'User accepted session_proposal', {
        id,
        pairingTopic: currentProposal?.params?.pairingTopic,
        proposerName: currentProposal?.params?.proposer?.metadata?.name,
        requiredNamespaces: Object.keys(proposalRequiredNamespaces ?? {}),
        optionalNamespaces: Object.keys(optionalNamespaces ?? {}),
      });
      if (currentProposal) {
        const namespaces: SessionTypes.Namespaces = {};
        const namespaceKeys = !isEmpty(proposalRequiredNamespaces)
          ? Object.keys(proposalRequiredNamespaces)
          : Object.keys(optionalNamespaces);
        const accounts: string[] = [];
        const eip155Chains: string[] = [];
        namespaceKeys.forEach(key => {
          if (proposalRequiredNamespaces && has(proposalRequiredNamespaces, key)) {
            proposalRequiredNamespaces[key].chains.map((chain: string) => {
              if (key === 'eip155') {
                [currentETHAddress].map(acc => {
                  eip155Chains.push(chain);
                  accounts.push(`${String(chain)}:${String(acc)}`);
                });
              } else if (key === 'cosmos' && cosmosAddress) {
                [cosmosAddress].map(acc =>
                  accounts.push(`${String(chain)}:${String(acc)}`),
                );
              }
            });
          }

          if (optionalNamespaces && has(optionalNamespaces, key)) {
            optionalNamespaces[key].chains.map((chain: string) => {
              if (key === 'eip155') {
                [currentETHAddress].map(acc => {
                  eip155Chains.push(chain);
                  accounts.push(`${String(chain)}:${String(acc)}`);
                });
              } else if (key === 'cosmos' && cosmosAddress) {
                [cosmosAddress].map(acc =>
                  accounts.push(`${String(chain)}:${String(acc)}`),
                );
              }
            });
          }
          // for (const chain of EIP155_CHAIN_IDS) {
          //   [currentETHAddress].map(acc => accounts.push(`${chain}:${acc}`));
          // }
          let namespaceMethods: any = [];
          let namespaceEvents: any = [];

          if (proposalRequiredNamespaces[key]?.methods) {
            namespaceMethods = namespaceMethods.concat(
              ...proposalRequiredNamespaces[key].methods,
            );
          }
          if (optionalNamespaces[key]?.methods) {
            namespaceMethods = namespaceMethods.concat(
              ...optionalNamespaces[key].methods,
            );
          }
          if (proposalRequiredNamespaces[key]?.events) {
            namespaceEvents = namespaceEvents.concat(
              ...proposalRequiredNamespaces[key].events,
            );
          }
          if (optionalNamespaces[key]?.events) {
            namespaceEvents = namespaceEvents.concat(
              ...optionalNamespaces[key].events,
            );
          }

          namespaces[key] = {
            chains: eip155Chains,
            accounts,
            methods: namespaceMethods,
            events: namespaceEvents,
          };
        });

        wcDebug('WalletKit', 'Approving session with namespaces', {
          id,
          namespaceKeys,
          accountsCount: accounts.length,
          eip155ChainsCount: eip155Chains.length,
        });

        // const approvedNamespaces = buildApprovedNamespaces({
        //   proposal: params,
        //   supportedNamespaces: {
        //     eip155: {
        //       chains: eip155Chains,
        //       methods: ['eth_sendTransaction', 'personal_sign'],
        //       events: ['accountsChanged', 'chainChanged'],
        //       accounts,
        //     },
        //   },
        // });

        await web3wallet?.approveSession({
          id,
          namespaces,
        });

        // Wait for session to be fully persisted before updating UI
        await checkAndAddPairingToConnectionsList();

        setAcceptingRequest(false);
        hideModal();
        wcDebug('WalletKit', 'Session approved and UI updated', {
          id,
          pairingTopic: currentProposal?.params?.pairingTopic,
        });
      }
    } catch (e) {
      wcError('WalletKit', 'Failed to approve session', {
        id: currentProposal?.id,
        pairingTopic: currentProposal?.params?.pairingTopic,
        error: e,
      });
      walletConnectDispatch({
        type: WalletConnectActions.WALLET_CONNECT_TRIGGER_REFRESH,
      });
      hideModal();
      setAcceptingRequest(false);
    }
  };

  const handleReject = async () => {
    try {
      if (currentProposal) {
        setRejectingRequest(true);
        const { id } = currentProposal as { id: number };
        wcDebug('WalletKit', 'User rejected session_proposal', {
          id,
          pairingTopic: currentProposal?.params?.pairingTopic,
          proposerName: currentProposal?.params?.proposer?.metadata?.name,
        });
        await web3wallet?.rejectSession({
          id,
          reason: getSdkError('USER_REJECTED_METHODS'),
        });
        setRejectingRequest(false);
        walletConnectDispatch({
          type: WalletConnectActions.WALLET_CONNECT_TRIGGER_REFRESH,
        });
        hideModal();
      }
    } catch (e) {
      wcError('WalletKit', 'Failed to reject session', {
        id: currentProposal?.id,
        pairingTopic: currentProposal?.params?.pairingTopic,
        error: e,
      });
      walletConnectDispatch({
        type: WalletConnectActions.WALLET_CONNECT_TRIGGER_REFRESH,
      });
      setRejectingRequest(false);
      hideModal();
    }
  };

  const RenderDAPPInfo = () => {
    return (
      <CyDView className='flex flex-row items-center mt-[12px] border-[1px] rounded-[8px] border-n40 p-[8px]'>
        <CyDView className='flex flex-row rounded-r-[20px] self-center px-[10px]'>
          <CyDFastImage
            className={'h-[35px] w-[35px] rounded-[50px]'}
            source={{ uri: icon }}
            resizeMode='contain'
          />
        </CyDView>
        <CyDView className='ml-[10px] max-w-[80%]'>
          <CyDView className={'flex flex-row items-center align-center'}>
            <CyDText className={'font-extrabold text-[16px]'}>{name}</CyDText>
          </CyDView>
          <CyDView className={'flex flex-row items-center align-center'}>
            <CyDText className={'text-[14px] w-[200px]'}>{url}</CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  };

  const Divider = () => {
    return <CyDView className={'h-[1px] bg-n40 mt-[14px] mb-[8px]'} />;
  };

  const RenderMessage = () => {
    return (
      <CyDScrollView className='my-[5px] border-[1px] border-n40 bg-n0 rounded-[6px]'>
        <CyDView className={'p-[10px]'}>
          <CyDText className={'text-[14px] ml-[6px]'}>{message}</CyDText>
        </CyDView>
      </CyDScrollView>
    );
  };

  return (
    <CyDModalLayout
      setModalVisible={noop}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView className='flex flex-col max-h-[70%] bg-n20 rounded-t-[24px] px-[20px] '>
        <CyDView className={'flex flex-row justify-center'}>
          <CyDText className={'text-[24px] font-extrabold mt-[14px] mb-[4px]'}>
            {t<string>('WALLET_PERMISSIONS')}
          </CyDText>
        </CyDView>
        <CyDView className='max-h-[70%]'>
          <RenderDAPPInfo />
          <Divider />
          <RenderMessage />
          <Divider />
        </CyDView>
        <CyDView className={'w-full flex justify-end'}>
          <Button
            loading={acceptingRequest}
            style={'mb-[10px]'}
            title='Accept'
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
});
