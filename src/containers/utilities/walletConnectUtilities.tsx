/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { encodeSecp256k1Signature, serializeSignDoc } from '@cosmjs-rn/amino';
import { Secp256k1, sha256 } from '@cosmjs-rn/crypto';
import { StdSignDoc } from '@cosmjs/launchpad';
import { PrivKeySecp256k1 } from '@keplr-wallet/crypto';
import * as Sentry from '@sentry/react-native';
import WalletConnect from '@walletconnect/client';
import { t } from 'i18next';
import { Dispatch } from 'react';
import Toast from 'react-native-toast-message';
import Web3 from 'web3';
import AppImages from '../../../assets/images/appImages';
import { CHAIN_ARBITRUM, CHAIN_AVALANCHE, CHAIN_BASE, CHAIN_BSC, CHAIN_ETH, CHAIN_EVMOS, CHAIN_FTM, CHAIN_OPTIMISM, CHAIN_OSMOSIS, CHAIN_POLYGON, CHAIN_POLYGON_ZKEVM, CHAIN_SHARDEUM, CHAIN_SHARDEUM_SPHINX, CHAIN_ZKSYNC_ERA } from '../../constants/server';
import { EVENTS, OSMOSIS_WALLET_CONNECT_METHODS, WEB3METHODS } from '../../constants/web3';
import { hexToUint } from '../../core/Address';
import { getMaskedAddress } from '../../core/util';
import { ActivityStatus, ActivityType, WalletConnectTransaction } from '../../reducers/activity_reducer';
import { HDWallet } from '../../reducers/hdwallet_reducer';
import { IdAppInfo, IWalletConnect, WalletConnectActions } from '../../reducers/wallet_connect_reducer';
import { WebsiteInfo } from '../../types/Browser';
import { SendTransactionCosmosFunc } from '../Browser/ConfirmationModalPromises';
import { genId } from './activityUtilities';
import { has } from 'lodash';

const SUPPORTED_CHAIN_ID_MAP = {
  1: CHAIN_ETH,
  137: CHAIN_POLYGON,
  56: CHAIN_BSC,
  43114: CHAIN_AVALANCHE,
  250: CHAIN_FTM,
  9001: CHAIN_EVMOS,
  0: CHAIN_OSMOSIS,
  42161: CHAIN_ARBITRUM,
  10: CHAIN_OPTIMISM,
  8081: CHAIN_SHARDEUM,
  8082: CHAIN_SHARDEUM_SPHINX,
  8453: CHAIN_BASE,
  1101: CHAIN_POLYGON_ZKEVM,
  324: CHAIN_ZKSYNC_ERA

};

const SUPPORTED_CHAIN_ID = [
  CHAIN_ETH.chain_id,
  CHAIN_POLYGON.chain_id,
  CHAIN_BSC.chain_id,
  CHAIN_AVALANCHE.chain_id,
  CHAIN_FTM.chain_id,
  CHAIN_EVMOS.chain_id,
  CHAIN_OSMOSIS.chain_id,
  CHAIN_ARBITRUM.chain_id,
  CHAIN_OPTIMISM.chain_id,
  CHAIN_SHARDEUM.chain_id,
  CHAIN_SHARDEUM_SPHINX.chain_id,
  CHAIN_POLYGON_ZKEVM.chain_id,
  CHAIN_ZKSYNC_ERA.chain_id,
  CHAIN_BASE.chain_id
];

const SUPPORTED_CHAIN_ID_NO = [
  1, 137, 56, 43114, 250, 9001, 42161, 10, 8453, 1101, 324
];

const OSMOSIS_METHODS = [
  OSMOSIS_WALLET_CONNECT_METHODS.ENABLE_WALLET_CONNECT,
  OSMOSIS_WALLET_CONNECT_METHODS.GET_KEY_WALLET_CONNECT,
  OSMOSIS_WALLET_CONNECT_METHODS.SIGN_AMINO
];

const embedChainIdBasedOnPlatform = (peerMetaName: string) => {
  switch (peerMetaName) {
    case CHAIN_OSMOSIS.name:
      return CHAIN_OSMOSIS.chainIdNumber;
    default:
      return CHAIN_ETH.chainIdNumber;
  }
};

export const subscribeToEvents = async (connector: WalletConnect | null, setWalletConnectModalVisible: Dispatch<boolean>, setRequest: Dispatch<boolean>, walletConnectDispatch: Dispatch<IWalletConnect>, hdWalletState: HDWallet, modalContext) => {
  if (!connector?.connected && has(connector, 'version') && connector?.version === 1) {
    await connector?.createSession();
  }

  if (connector && has(connector, 'version') && connector?.version === 1) {
    connector.on(EVENTS.SESSION_REQUEST, (error, payload) => {
      if (error) {
        throw error;
      }
      const { params: [{ peerMeta, chainId }] } = payload;
      if (chainId === null) {
        const { params: [object] } = payload;
        object.chainId = embedChainIdBasedOnPlatform(peerMeta.name);
        const newPayload = payload;
        payload.params = [object];
        setRequest({ payload: newPayload, connector, event: EVENTS.SESSION_REQUEST });
        setWalletConnectModalVisible(true);
      } else if (!SUPPORTED_CHAIN_ID_NO.includes(chainId)) {
        connector.rejectSession();
        Toast.show({
          type: t('TOAST_TYPE_ERROR'),
          text1: t('SCAN_FAILURE'),
          text2: t('CHAIN_NOT_SUPPORTED'),
          position: t('BOTTOM')
        });
        Sentry.captureMessage(`${t('CHAIN_NOT_SUPPORTED')} - Chain ID: ${chainId}`);
      } else {
        setRequest({ payload, connector, event: EVENTS.SESSION_REQUEST });
        setWalletConnectModalVisible(true);
      }
    });

    connector.on(EVENTS.CONNECT, (error, payload) => {
      if (error) {
        throw error;
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    connector.on(EVENTS.CALL_REQUEST, async (error, payload) => {
      const { id, method, params: [{ chainId }] } = payload;

      if (method === WEB3METHODS.SWITCH_ETHEREUM_CHAIN && !SUPPORTED_CHAIN_ID.includes(chainId)) {
        if (error) {
          throw error;
        }
        connector.rejectRequest({
          id,
          error: { message: 'Chain is not Supported' }
        });
        // showModal('state', {type: 'error', title: t('SCAN_FAILURE'), description: t('CHAIN_NOT_SUPPORTED'), onSuccess: hideModal, onFailure: hideModal});
        Toast.show({
          type: t('TOAST_TYPE_ERROR'),
          text1: t('SCAN_FAILURE'),
          text2: t('CHAIN_NOT_SUPPORTED'),
          position: t('BOTTOM')
        });
      } else if (OSMOSIS_METHODS.includes(method)) {
        switch (method) {
          case OSMOSIS_WALLET_CONNECT_METHODS.ENABLE_WALLET_CONNECT : {
            connector.approveRequest({
              id: payload.id,
              result: []
            });
            break;
          }
          case OSMOSIS_WALLET_CONNECT_METHODS.GET_KEY_WALLET_CONNECT : {
            const { wallet: { osmosis: { address: bech32Address, privateKey } } } = hdWalletState;

            const privateKeyInstance = new PrivKeySecp256k1(hexToUint(privateKey as string));
            const publicKey = privateKeyInstance.getPubKey();

            const pubKey = publicKey.toBytes();
            const address = publicKey.getAddress();

            connector.approveRequest({
              id: payload.id,
              result: [
                {
                  algo: 'secp256k1',
                  bech32Address,
                  pubKey: Buffer.from(pubKey).toString('hex'),
                  address: Buffer.from(address).toString('hex'),
                  name: bech32Address
                }
              ]
            });
            break;
          }
          case OSMOSIS_WALLET_CONNECT_METHODS.SIGN_AMINO: {
            // setRequest({ payload, connector, event: EVENTS.CALL_REQUEST });
            // setWalletConnectModalVisible(true);
            try {
              const { wallet: { osmosis: { publicKey, privateKey } } } = hdWalletState;
              const ack = await SendTransactionCosmosFunc(modalContext, payload.params[2]);
              if (ack) {
                const result = await signAmino(payload.params[2], hexToUint(publicKey as string), hexToUint(privateKey as string));
                connector.approveRequest({
                  id: payload.id,
                  result: [result]
                });
                Toast.show({
                  type: t('TOAST_TYPE_SUCCESS'),
                  text1: t('TRANSACTION_APPROVED'),
                  text2: result?.signature.signature,
                  position: t('BOTTOM')
                });
              } else {
                throw new Error('Request rejected');
              }
            } catch (e) {
              connector.rejectRequest({
                id: payload.id,
                error: { message: e.message }
              });
              Toast.show({
                type: t('TOAST_TYPE_ERROR'),
                text1: t('TRANSACTION_FAILURE'),
                text2: e.message,
                position: t('BOTTOM')
              });
              Sentry.captureException(e);
            }
          }
        }
      } else {
        setRequest({ payload, connector, event: EVENTS.CALL_REQUEST });
        setWalletConnectModalVisible(true);
      }
    });
    connector.on(EVENTS.DISCONNECT, (error, payload) => {
      if (error) {
        throw error;
      }
      walletConnectDispatch({ type: WalletConnectActions.DELETE_DAPP_INFO, value: { connector } });
    });
  }
};

const approveSession = (connector: WalletConnect, address: String, payload, dispatchFn: Dispatch<IWalletConnect>) => {
  const { params: [{ chainId }] } = payload;
  if (connector) {
    if (chainId === 0) {
      connector.approveSession({
        chainId: 99999,
        accounts: []
      });
    } else {
      connector.approveSession({ chainId, accounts: [address] });
    }
  }
  const dAppInfo = { ...payload.params[0].peerMeta, chainId };
  dispatchFn({ type: WalletConnectActions.ADD_DAPP_INFO, value: dAppInfo });
};

const updateSession = (connector: WalletConnect, address: String, chainId: String, dAppInfo: IdAppInfo, dispatchFn: Dispatch<IWalletConnect>) => {
  if (connector) {
    connector.updateSession({
      chainId: parseInt(chainId),
      accounts: [address]
    });
  }

  const newdAppInfo = { ...dAppInfo, chainId: parseInt(chainId) };
  dispatchFn({ type: WalletConnectActions.UPDATE_DAPP_INFO, value: { oldInfo: dAppInfo, newInfo: newdAppInfo } });
};

const rejectSession = (connector: WalletConnect) => {
  if (connector) {
    connector.rejectSession();
  }
};

const rejectRequest = (connector: WalletConnect, id: number) => {
  if (connector) {
    connector.rejectRequest({
      id,
      error: { message: 'Failed or Rejected Request' }
    });
  }
};

export const walletConnectRejectRequest = (params) => {
  const { connector, method, payload, dispatch } = params;
  if (method === EVENTS.REJECT_SESSION) {
    rejectSession(connector);
  } else if (method === EVENTS.REJECT_REQUEST) {
    rejectRequest(connector, payload.id);
  }
};

const signAmino = async (signDoc: StdSignDoc, pubkey: Uint8Array, privKey: Uint8Array) => {
  const message = sha256(serializeSignDoc(signDoc));
  const signature = await Secp256k1.createSignature(message, privKey);
  const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)]);
  return {
    signed: signDoc,
    signature: encodeSecp256k1Signature(pubkey, signatureBytes)
  };
};

export const walletConnectApproveRequest = async (handleWeb3, params, dispatchActivity) => {
  const { connector, address, payload, dispatchFn, dAppInfo, HdWalletContext } = params;
  switch (payload.method) {
    case EVENTS.SESSION_REQUEST : {
      approveSession(connector, address, payload, dispatchFn);
      break;
    }
    default:
      if (payload.method === WEB3METHODS.SWITCH_ETHEREUM_CHAIN) {
        updateSession(connector, address, payload.params[0].chainId, dAppInfo, dispatchFn);
      } else {
        let activityData: WalletConnectTransaction | null = null;

        const { params: [{ data, value, to }] } = payload;
        const [, , host] = dAppInfo.url.split('/');
        const websiteInfo: WebsiteInfo = {
          title: dAppInfo.name,
          host,
          origin: host,
          url: dAppInfo.url
        };
        let transactionValue = '';
        transactionValue = value ?? data;
        if (payload.method === WEB3METHODS.SEND_TRANSACTION) {
          const chainInfo = SUPPORTED_CHAIN_ID_MAP[dAppInfo.chainId];

          const { symbol, name }: any = chainInfo;

          activityData = {
            id: genId(),
            status: ActivityStatus.PENDING,
            type: ActivityType.WALLETCONNECT,
            transactionHash: '',
            fromAddress: address,
            toAddress: to,
            websiteInfo,
            chainName: name,
            symbol,
            datetime: new Date(),
            amount: parseFloat(Web3.utils.fromWei(Web3.utils.hexToNumberString(transactionValue))).toString()
          };
        }
        try {
          const chain = SUPPORTED_CHAIN_ID_MAP[dAppInfo.chainId];

          // activityData && dispatchActivity({ type: ActivityReducerAction.POST, value: activityData });

          const hash = await handleWeb3(payload, websiteInfo, chain);

          if (hash.error) {
            Toast.show({
              type: t('TOAST_TYPE_ERROR'),
              text1: t('TRANSACTION_FAILURE'),
              text2: hash.error?.message,
              position: t('BOTTOM')
            });
            connector.rejectRequest({
              id: payload.id,
              ...hash
            });
          };

          // activityData && dispatchActivity({ type: ActivityReducerAction.PATCH, value: { id: activityData.id, status: ActivityStatus.SUCCESS, transactionHash: hash } });
          connector.approveRequest({
            id: payload.id,
            ...hash
          });
        } catch (e: any) {
          connector.rejectRequest({
            id: payload.id,
            error: { message: e.message }
          });
          // activityData && dispatchActivity({ type: ActivityReducerAction.PATCH, value: { id: activityData.id, status: ActivityStatus.FAILED, reason: e.message } });

          Sentry.captureException(e);
        }
      }
      break;
  }
};

export const getRenderContent = (request, address, walletConnectState) => {
  try {
    if (request.event === EVENTS.SESSION_REQUEST) {
      const { params: [{ peerMeta, chainId }] } = request.payload;

      return ({
        title: t('WALLET_PERMISSIONS'),
        buttonMessage: t('CONNECT_WALLET'),
        dAppInfo: {
          name: peerMeta.name,
          image: peerMeta.icons[0]
        },
        chainInfo: {
          address: getMaskedAddress(address),
          image: SUPPORTED_CHAIN_ID_MAP[chainId].logo_url,
          chainId: Web3.utils.hexToNumberString(chainId)
        },
        staticInfo: [
          {
            image: AppImages.WALLET_PERMISSION,
            description: t('WALLET_PERMISSIONS_DESCRIPTION')
          },
          {
            image: AppImages.TRANSACTION_APPROVAL,
            description: t('TRANSACTION_APPROVALS')
          }
        ]
      });
    } else if (request.event === EVENTS.CALL_REQUEST) {
      if (request.payload.method === WEB3METHODS.SWITCH_ETHEREUM_CHAIN) {
        const { params: [{ chainId }] } = request.payload;
        return ({
          title: t('SWITCH_CHAIN'),
          buttonMessage: t('SWITCH'),
          dAppInfo: {
            name: walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].name.length > 10 ? `${walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].name.substring(0, 10)}..` : walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].name,
            image: walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].icons[0]
          },
          chainInfo: {
            address: getMaskedAddress(address),
            image: SUPPORTED_CHAIN_ID_MAP[Web3.utils.hexToNumberString(chainId)].logo_url,
            chainId: Web3.utils.hexToNumberString(chainId)
          }
        });
      } else {
        let otherInfo = [];
        if (request.payload.method === WEB3METHODS.PERSONAL_SIGN) {
          const { params: [data] } = request.payload;
          otherInfo = [{
            key: 'Data',
            value: `${data.substring(0, 10)}...`
          }];
        } else if (request.payload.method === WEB3METHODS.SIGN_TYPED_DATA) {
          return ({
            title: t('SIGN_PERMIT'),
            buttonMessage: t('SIGN_PERMIT'),
            dAppInfo: {
              name: walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].name.length > 10 ? `${walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].name.substring(0, 10)}..` : walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].name,
              image: walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].icons[1]
            },
            chainInfo: {
              address: getMaskedAddress(address),
              image: SUPPORTED_CHAIN_ID_MAP[walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].chainId].logo_url
            }
          });
        } else {
          const { params: [{ value, gas }] } = request.payload;
          otherInfo = [];
          const index = walletConnectState.connectors.indexOf(request.connector);
          const chainId = walletConnectState.dAppInfo[index].chainId;
          const symbol = SUPPORTED_CHAIN_ID_MAP[chainId].symbol;

          if (value) {
            otherInfo.push({
              key: t('VALUE'),
              value: `${Web3.utils.fromWei(Web3.utils.hexToNumberString(value))}  ${symbol}`
            });
          } else {
            otherInfo.push({
              key: t('VALUE'),
              value: `0.000  ${symbol}`
            });
          }
          if (gas) {
            otherInfo.push({
              key: t('NETWORK_FEE'),
              value: `${Web3.utils.fromWei(Web3.utils.hexToNumberString(gas))}  ${symbol}`
            });
          } else {
            otherInfo.push({
              key: t('NETWORK_FEE'),
              value: `0.000  ${symbol}`
            });
          }
        }
        return ({
          title: t('Sign Permissions'),
          buttonMessage: t('APPROVE_ALL_CAPS'),
          dAppInfo: {
            name: walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].name.length > 10 ? `${walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].name.substring(0, 10)}..` : walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].name,
            image: walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].icons[0]
          },
          chainInfo: {
            address: getMaskedAddress(address),
            image: SUPPORTED_CHAIN_ID_MAP[walletConnectState.dAppInfo[walletConnectState.connectors.indexOf(request.connector)].chainId].logo_url
          },
          otherInfo
        });
      }
    }
  } catch (e) {
    Sentry.captureException(e);
  }
};
