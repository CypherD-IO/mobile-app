/**
 * @format
 * @flow
 */
import { estimateGas, getGasPriceFor } from './gasHelper';
import * as Sentry from '@sentry/react-native';
import Toast from 'react-native-toast-message';
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { ALL_CHAINS, CHAIN_ETH } from '../../constants/server';
import axios from '../../core/Http';
import {
  ActivityReducerAction,
  ActivityStatus,
} from '../../reducers/activity_reducer';
import { hostWorker } from '../../global';
import { loadPrivateKeyFromKeyChain } from '../../core/Keychain';
import {
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  getViemPublicClient,
} from '../../core/util';
import { isHex } from 'web3-validator';
import {
  createWalletClient,
  hexToString,
  http,
  SendTransactionParameters,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { get } from 'lodash';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';

const chainIdToChain = (chainId: number) =>
  ALL_CHAINS.find(chain => chain.chainIdNumber === chainId) ?? CHAIN_ETH;

export function toJson<T>(
  me: T,
  removes?: Array<keyof T>,
  space?: number,
): string {
  return JSON.stringify(
    me,
    (k, v) => (removes?.some(r => r === k) ? undefined : v),
    space,
  );
}

export async function sendTransaction(
  hdWalletContext,
  payload,
  finalGasPrice,
  gasLimit,
  webviewRef,
  activityRef: any,
  activityContext: any,
  rpc: string,
) {
  let isHashGenerated = false;
  const ethereumAddress = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    undefined,
  );
  try {
    const {
      params: [{ to, data, value }],
    } = payload;
    const privateKey = await loadPrivateKeyFromKeyChain(
      false,
      hdWalletContext.state.pinValue,
    );

    if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
      const publicClient = getViemPublicClient(rpc);
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        transport: http(rpc),
      });

      const txParams: SendTransactionParameters = {
        account,
        chain: null,
        to: to as `0x${string}`,
        value: BigInt(parseInt(value || '0', 16)),
        data: data as `0x${string}`,
        gas: BigInt(parseInt(gasLimit || '0', 16)),
        gasPrice: BigInt(parseInt(finalGasPrice || '0', 16)),
      };

      const hash = await walletClient.sendTransaction(txParams);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      });

      if (receipt?.transactionHash) {
        isHashGenerated = true;
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(receipt.transactionHash)})`,
        );

        Toast.show({
          type: 'success',
          text1: 'Transaction Hash',
          text2: receipt.transactionHash,
          position: 'bottom',
        });

        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              transactionHash: receipt.transactionHash,
              status: ActivityStatus.SUCCESS,
            },
          });

        void logAnalyticsToFirebase(AnalyticEvent.TRANSACTION_SUBMIT, {
          from: ethereumAddress,
          to: payload.params[0].to,
          gasPrice: finalGasPrice,
          data: payload.params[0].data,
          value: payload.params[0].value,
          gas: gasLimit,
          hash: receipt.transactionHash,
          chain: hdWalletContext.state.selectedChain.name,
        });
      }
    }
  } catch (e: any) {
    if (!isHashGenerated) {
      activityContext.dispatch({
        type: ActivityReducerAction.DELETE,
        value: { id: activityRef.current.id },
      });
    } else {
      activityContext.dispatch({
        type: ActivityReducerAction.PATCH,
        value: {
          id: activityRef.current.id,
          status: ActivityStatus.FAILED,
          reason: e.message,
        },
      });
    }

    Sentry.captureException(e);
  }
}

export async function signTypedDataCypherD(
  hdWalletContext,
  payload,
  webviewRef,
  typeDataVersion,
) {
  const privateKey = await loadPrivateKeyFromKeyChain(
    false,
    hdWalletContext.state.pinValue,
  );
  if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
    const privateKeyBuffer = Buffer.from(privateKey.substring(2), 'hex');
    let eip712Data;
    if (typeDataVersion === SignTypedDataVersion.V1) {
      eip712Data = payload.params[0];
    } else {
      eip712Data = JSON.parse(payload.params[1]);
    }
    const signature = signTypedData({
      privateKey: privateKeyBuffer,
      data: eip712Data,
      version: typeDataVersion,
    });

    webviewRef.current.injectJavaScript(
      `window.ethereum.sendResponse(${payload.id}, "${signature}")`,
    );
  }
}

export async function personalSign(hdWalletContext, payload, webviewRef, rpc) {
  const ethereumAddress = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    undefined,
  );
  let messageToSign = '';
  if (payload.method === 'personal_sign') {
    messageToSign = payload.params[0];
  } else if (payload.method === 'eth_sign') {
    messageToSign = payload.params[1];
  }

  const privateKey = await loadPrivateKeyFromKeyChain(
    false,
    hdWalletContext.state.pinValue,
  );
  if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      transport: http(rpc),
    });
    const signature = await walletClient.signMessage({
      message: messageToSign,
    });
    webviewRef.current.injectJavaScript(
      `window.ethereum.sendResponse(${payload.id}, "${signature}")`,
    );
    Toast.show({
      type: 'success',
      text1: 'Message Signed',
      text2: 'Message Signed',
      position: 'bottom',
    });
    await logAnalyticsToFirebase(AnalyticEvent.TRANSACTION_PERSONAL_SIGN, {
      from: ethereumAddress,
      method: payload.method,
      chain: hdWalletContext.state.selectedChain.name,
    });
  }
}

export function parseWebviewPayload(
  payload,
  webviewRef,
  hdWalletContext,
  selectedChain,
  updateSelectedChain,
  payModal,
  signModal,
  pushModal,
  rpc,
) {
  const ethereumAddress = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    undefined,
  );
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const pushPermissionURL = `${PORTFOLIO_HOST}/v1/push/permissions`;
  const publicClient = getViemPublicClient(rpc);

  if (payload.method === 'wallet_pushPermission') {
    const walletaddress = ethereumAddress;

    const params = new URLSearchParams();
    params.append('wallet_address', walletaddress);
    params.append('app_id', payload.params[0].app_id);
    axios
      .get(pushPermissionURL, {
        params,
        timeout: 1000,
      })
      .then(res => {
        if (res.data.permission) {
          if (
            res.data.permission === 'NO_DATA' ||
            res.data.permission === 'DENY'
          ) {
            pushModal({
              app_name: payload.params[0].app_name,
              appImage: payload.params[0].appImage,
              reasonMessage: payload.params[0].reasonMessage,
              app_id: payload.params[0].app_id,
              wallet_address: walletaddress,
              payload_id: payload.id,
            });
          } else if (res.data.permission === 'ALLOW') {
            webviewRef.current.injectJavaScript(
              `window.ethereum.sendResponse(${payload.id}, "${res.data.permission}")`,
            );
          }
        }
      })
      .catch(error => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, "")`,
        );
        Sentry.captureException(error);
      });
  } else if (payload.method === 'eth_sendTransaction') {
    getGasPriceFor(selectedChain, publicClient)
      .then(async gasFeeResponse => {
        await estimateGas(
          payload,
          publicClient,
          hdWalletContext?.state?.wallet?.ethereum?.address,
          selectedChain,
          gasFeeResponse,
          payModal,
        );
      })
      .catch(async gasFeeError => {
        Sentry.captureException(gasFeeError);
        await estimateGas(
          payload,
          publicClient,
          hdWalletContext?.state?.wallet?.ethereum?.address,
          selectedChain,
          { chainId: selectedChain.backendName, gasPrice: 0, tokenPrice: 0 },
          payModal,
        );
      });
  } else if (
    payload.method === 'eth_accounts' ||
    payload === 'eth_accounts' ||
    payload === 'eth_requestAccounts' ||
    payload.method === 'eth_requestAccounts'
  ) {
    webviewRef.current.injectJavaScript(
      `window.ethereum.sendResponse(${payload.id}, ["${ethereumAddress}"])`,
    );
  } else if (payload.method === 'eth_getBalance') {
    let tmpAddress;
    if (payload.params !== undefined) {
      tmpAddress = payload.params[0];
    } else {
      tmpAddress = ethereumAddress;
    }
    publicClient
      .getBalance(tmpAddress)
      .then(result => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, "${result}")`,
        );
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_blockNumber') {
    publicClient
      .getBlockNumber()
      .then(result => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${result})`,
        );
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_getBlockByHash') {
    publicClient
      .getBlock({
        includeTransactions: payload.params[0],
        blockHash: payload.params[0],
      })
      .then(result => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(
            result,
          )})`,
        );
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_getBlockByNumber') {
    publicClient
      .getBlock({
        includeTransactions: payload.params[0],
        blockNumber: payload.params[0],
      })
      .then(result => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(
            result,
          )})`,
        );
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_gasPrice') {
    publicClient
      .getGasPrice()
      .then(result => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(
            result,
          )})`,
        );
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (
    payload.method === 'net_version' ||
    payload === 'net_version' ||
    payload.method === 'eth_chainId' ||
    payload === 'eth_chainid'
  ) {
    publicClient
      .getChainId()
      .then(result => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${result})`,
        );
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_getLogs') {
    publicClient
      .getLogs({
        address: payload?.params?.[0],
      })
      .then(result => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(
            result,
          )})`,
        );
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_call') {
    publicClient
      .call(payload.params[0])
      .then(result => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(
            result,
          )})`,
        );
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_getTransactionByHash') {
    publicClient
      .getTransaction(payload.params[0])
      .then(result => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(
            result,
          )})`,
        );
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_getTransactionReceipt') {
    publicClient
      .getTransactionReceipt(payload.params[0])
      .then(result => {
        let res: any = result;
        if (result) {
          res = { ...result, status: result.status ? '0x1' : '0x0' };
        }
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(res)})`,
        );
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_getTransactionCount') {
    publicClient
      .getTransactionCount(payload.params[0])
      .then(result => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(
            result,
          )})`,
        );
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'personal_sign') {
    let signMsg = payload.params[0];
    if (isHex(payload.params[0])) {
      try {
        signMsg = hexToString(payload.params[0]);
      } catch (err) {
        signMsg = payload.params[0];
      }
    }
    signModal(
      'Sign to prove that you own this wallet\n' + signMsg,
      payload,
      'Message',
    );
  } else if (payload.method === 'eth_sign') {
    signModal(
      'Sign to prove that you own this wallet\n' + payload.params[1],
      payload,
      'Message',
    );
  } else if (payload.method === 'eth_estimateGas') {
    publicClient
      .estimateGas(payload.params[0])
      .then(result => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(
            result,
          )})`,
        );
      })
      .catch(err => {
        Sentry.captureException(err);
        // ('state', {type: 'error', title: 'Error', description: err.toString(), onSuccess: hideModal, onFailure: hideModal});
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: err.toString(),
          position: 'bottom',
        });
        webviewRef.current.reload();
      });
  } else if (payload.method === 'eth_feeHistory') {
    publicClient
      .getFeeHistory({
        blockCount: payload.params[0],
        blockNumber: payload.params[1],
        rewardPercentiles: payload.params[2],
      })
      .then(result => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(
            result,
          )})`,
        );
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_signTypedData') {
    signModal(JSON.stringify(payload.params[0]), payload, 'Message');
  } else if (payload.method === 'eth_signTypedData_v3') {
    signModal(payload.params[1], payload, 'Message');
  } else if (payload.method === 'eth_signTypedData_v4') {
    const eip712Object = JSON.parse(payload.params[1]);
    let payloadMessage = '';
    let signMessageTitleLocal = '';
    if (eip712Object.primaryType === 'Permit') {
      payloadMessage =
        'Approve ' +
        String(eip712Object.message.value) +
        ' ' +
        String(eip712Object.domain.name) +
        ' \nuntil block number ' +
        String(eip712Object.message.deadline) +
        ' \nfor contract ' +
        String(eip712Object.message.spender);
      signMessageTitleLocal = 'Approve';
    } else {
      payloadMessage = JSON.stringify(eip712Object.message);
      signMessageTitleLocal = 'Message';
    }
    signModal(payloadMessage, payload, signMessageTitleLocal);
    void logAnalyticsToFirebase(AnalyticEvent.ETH_SIGN_TYPED_DATA_V4, {
      from: ethereumAddress,
      method: payload.method,
      chain: hdWalletContext.state.selectedChain.name,
      primary_type: eip712Object.primaryType,
    });
  } else if (
    payload.method === 'wallet_addEthereumChain' ||
    payload.method === 'wallet_switchEthereumChain'
  ) {
    let addEthereumChainId = payload.params[0].chainId;
    let supportedChain = false;
    for (let i = 0; i < ALL_CHAINS.length; i++) {
      if (ALL_CHAINS[i].chain_id === addEthereumChainId) {
        supportedChain = true;
      }
    }
    // onmeta - arch beta - staging hack
    // if (addEthereumChainId === '0x13881') {
    //   supportedChain = true;
    //   addEthereumChainId = '0x89';
    // }
    if (!supportedChain) {
      addEthereumChainId = '0x1';
    }
    const intChainId = parseInt(addEthereumChainId, 16);
    const strChainName = chainIdToChain(intChainId);
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(
        `window.ethereum.chainId="${intChainId}"`,
      );
      webviewRef.current.injectJavaScript(
        `window.ethereum.sendResponse(${payload.id}, "null")`,
      );
      webviewRef.current.injectJavaScript(
        `window.ethereum.loadChainChange(${payload.id}, ${addEthereumChainId})`,
      );
    }

    updateSelectedChain(strChainName);
  } else if (payload.method === 'eth_getCode') {
    // To be implementated
  } else {
    void logAnalyticsToFirebase(AnalyticEvent.UNKNOWN_RPC_CALL, {
      from: ethereumAddress,
      method: payload.method,
      chain: hdWalletContext.state.selectedChain.name,
    });
  }
}
