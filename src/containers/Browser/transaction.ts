/**
 * @format
 * @flow
 */
import { estimateGas, getGasPriceFor } from './gasHelper';
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import Toast from 'react-native-toast-message';
import Web3 from 'web3';
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { ALL_CHAINS, CHAIN_ETH } from '../../constants/server';
import axios from '../../core/Http';
import BigNumber from 'bignumber.js';
import { ActivityReducerAction, ActivityStatus } from '../../reducers/activity_reducer';
import { hostWorker } from '../../global';

const chainIdToChain = (chainId) => ALL_CHAINS.find(chain => chain.chainIdNumber == chainId) ?? CHAIN_ETH;

export function toJson<T> (me: T, removes?: Array<keyof T>, space?: number): string {
  return JSON.stringify(me, (k, v) => (removes?.some((r) => r === k) ? undefined : v), space);
}

const bigNumberToHex = (val: string) => `0x${new BigNumber(val, 10).toString(16)}`;

export function sendTransaction (hdWalletContext, payload, finalGasPrice, gasLimit, webviewRef, web3RPCEndpoint: Web3, activityRef: any, activityContext: any) {
  // const {showModal, hideModal} = useGlobalModalContext();
  const { ethereum } = hdWalletContext.state.wallet;
  let isHashGenerated = false;
  try {
    const { params: [{ to, data, value }] } = payload;
    const tx = {
      from: ethereum.address,
      to,
      gasPrice: finalGasPrice,
      data,
      value,
      gas: gasLimit
    };

    const signPromise = web3RPCEndpoint.eth.accounts.signTransaction(
      tx,
      ethereum.privateKey
    );
    isHashGenerated = true;
    signPromise.then(signedTx => {
      if (signedTx.rawTransaction) {
        web3RPCEndpoint.eth.sendSignedTransaction(signedTx.rawTransaction)
          .once('transactionHash', function (hash) {
            webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(hash)})`);
            // showModal('state', {type: 'info', title: 'Transaction Hash', description: hash, onSuccess: hideModal, onFailure: hideModal});
            Toast.show({ type: 'info', text1: 'Transaction Hash', text2: hash, position: 'bottom' });
            activityRef.current && activityContext.dispatch({
              type: ActivityReducerAction.PATCH,
              value: {
                id: activityRef.current.id,
                transactionHash: hash,
                status: ActivityStatus.SUCCESS
              }
            });
            analytics().logEvent('transaction_submit', {
              from: ethereum.address,
              to: payload.params[0].to,
              gasPrice: finalGasPrice,
              data: payload.params[0].data,
              value: payload.params[0].value,
              gas: gasLimit,
              hash,
              chain: hdWalletContext.state.selectedChain.name
            });
          })
          .once('receipt', function (receipt) {
            // showModal('state', {type: 'success', title: '', description: 'Transaction Receipt Received', onSuccess: hideModal, onFailure: hideModal});
            Toast.show({ type: 'success', text1: 'Transaction', text2: 'Transaction Receipt Received', position: 'bottom' });
          })
          .on('confirmation', function (confNumber) {
          })
          .on('error', function (error) {
            activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityRef.current.id, status: ActivityStatus.FAILED, reason: error.message } });
            // showModal('state', {type: 'error', title: 'Transaction Error', description: error.message, onSuccess: hideModal, onFailure: hideModal});
            Toast.show({ type: 'error', text1: 'Transaction Error', text2: error.message, position: 'bottom' });
          })
          .then(function (receipt) {
            // showModal('state', {type: 'success', title: '', description: 'Transaction Receipt Received', onSuccess: hideModal, onFailure: hideModal});
            Toast.show({ type: 'success', text1: 'Transaction', text2: 'Transaction Receipt Received', position: 'bottom' });
            analytics().logEvent('transaction_receipt', {
              from: ethereum.address,
              to: payload.params[0].to,
              gasPrice: finalGasPrice,
              data: payload.params[0].data,
              value: payload.params[0].value,
              gas: gasLimit,
              receipt,
              chain: hdWalletContext.state.selectedChain.name
            });
          });
      }
    });
  } catch (e: any) {
    if (!isHashGenerated) { activityContext.dispatch({ type: ActivityReducerAction.DELETE, value: { id: activityRef.current.id } }); } else { activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activityRef.current.id, status: ActivityStatus.FAILED, reason: e.message } }); }

    Sentry.captureException(e);
  }
}

export function signTypedDataCypherD (hdWalletContext, payload, webviewRef, typeDataVersion) {
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const privateKeyBuffer = Buffer.from(
    ethereum.privateKey.substring(2),
    'hex'
  );
  let eip712Data;
  if (typeDataVersion == SignTypedDataVersion.V1) {
    eip712Data = payload.params[0];
  } else {
    eip712Data = JSON.parse(payload.params[1]);
  }
  const signature = signTypedData({
    privateKey: privateKeyBuffer,
    data: eip712Data,
    version: typeDataVersion
  });

  webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, "${signature}")`);
}

export function personal_sign (hdWalletContext, payload, webviewRef, web3RPCEndpoint) {
  // const {showModal, hideModal} = useGlobalModalContext();
  const ethereum = hdWalletContext.state.wallet.ethereum;
  let messageToSign = '';
  if (payload.method == 'personal_sign') {
    messageToSign = payload.params[0];
  } else if (payload.method == 'eth_sign') {
    messageToSign = payload.params[1];
  }

  const signature = web3RPCEndpoint.eth.accounts.sign(messageToSign, ethereum.privateKey);
  webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, "${signature.signature}")`);
  // showModal('state', {type: 'success', title: 'Message Signed', description: 'Message Signed', onSuccess: hideModal, onFailure: hideModal});
  Toast.show({ type: 'success', text1: 'Message Signed', text2: 'Message Signed', position: 'bottom' });
  analytics().logEvent('transaction_personal_sign', {
    from: ethereum.address,
    method: payload.method,
    chain: hdWalletContext.state.selectedChain.name
  });
}

export function parseWebviewPayload (payload,
  webviewRef,
  hdWalletContext,
  selectedChain,
  updateSelectedChain,
  payModal,
  signModal,
  pushModal,
  web3RPCEndpoint: Web3) {
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const pushPermissionURL = `${PORTFOLIO_HOST}/v1/push/permissions`;
  // const {showModal, hideModal} = useGlobalModalContext();
  console.log('parseRequest', toJson(payload, ['data']));

  if (payload.method === 'wallet_pushPermission') {
    const walletaddress = ethereum.address;

    const params = new URLSearchParams();
    params.append('wallet_address', walletaddress);
    params.append('app_id', payload.params[0].app_id);
    console.log('wallet_pushPermission', JSON.stringify(params));
    axios
      .get(pushPermissionURL, {
        params,
        timeout: 1000
      })
      .then(res => {
        console.log('wallet_pushPermission resolved', JSON.stringify(res.data));
        if (res.data.permission) {
          if (res.data.permission == 'NO_DATA' || res.data.permission == 'DENY') {
            pushModal({
              app_name: payload.params[0].app_name,
              appImage: payload.params[0].appImage,
              reasonMessage: payload.params[0].reasonMessage,
              app_id: payload.params[0].app_id,
              wallet_address: walletaddress,
              payload_id: payload.id
            });
          } else if (res.data.permission == 'ALLOW') {
            webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, "${res.data.permission}")`);
          }
        }
      })
      .catch(error => {
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, "")`);
        Sentry.captureException(error);
      });
  } else if (payload.method === 'eth_sendTransaction') {
    getGasPriceFor(selectedChain, web3RPCEndpoint)
      .then((gasFeeResponse) => {
        console.log('gasFeeResponse >>> ', gasFeeResponse);
        estimateGas(payload, webviewRef, hdWalletContext, selectedChain, gasFeeResponse, payModal, web3RPCEndpoint);
      })
      .catch((gasFeeError) => {
        Sentry.captureException(gasFeeError);
        estimateGas(payload, webviewRef, hdWalletContext, selectedChain, { chainId: selectedChain.backendName, gasPrice: 0, tokenPrice: 0 }, payModal, web3RPCEndpoint);
      });
  } else if (payload.method == 'eth_accounts' || payload == 'eth_accounts' || payload == 'eth_requestAccounts' ||
		payload.method == 'eth_requestAccounts') {
    webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ["${ethereum.address}"])`);
  } else if (payload.method === 'eth_getBalance') {
    let tmpAddress;
    if (payload.params !== undefined) {
      tmpAddress = payload.params[0];
    } else {
      tmpAddress = ethereum.address;
    }
    web3RPCEndpoint.eth.getBalance(tmpAddress)
      .then(result => {
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, "${bigNumberToHex(result)}")`);
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_blockNumber') {
    web3RPCEndpoint.eth.getBlockNumber()
      .then(result => {
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${result})`);
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_getBlockByNumber' || payload.method === 'eth_getBlockByHash') {
    web3RPCEndpoint.eth.getBlock(payload.params[0], payload.params[1])
      .then(result => {
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(result)})`);
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_gasPrice') {
    web3RPCEndpoint.eth.getGasPrice()
      .then(result => {
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(result)})`);
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'net_version' || payload === 'net_version') {
    web3RPCEndpoint.eth.net.getId()
      .then(result => {
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${result})`);
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_getLogs') {
    web3RPCEndpoint.eth.getPastLogs(payload.params[0])
      .then(result => {
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(result)})`);
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_call') {
    web3RPCEndpoint.eth.call(payload.params[0])
      .then(result => {
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(result)})`);
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_getTransactionByHash') {
    web3RPCEndpoint.eth
      .getTransaction(payload.params[0])
      .then(result => {
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(result)})`);
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_getTransactionReceipt') {
    web3RPCEndpoint.eth.getTransactionReceipt(payload.params[0])
      .then(result => {
        let res: any = result;
        if (result) {
          res = { ...result, status: result.status ? '0x1' : '0x0' };
        }
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(res)})`);
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_getTransactionCount') {
    web3RPCEndpoint.eth.getTransactionCount(payload.params[0])
      .then(result => {
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(result)})`);
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method == 'personal_sign') {
    let signMsg = payload.params[0];
    if (Web3.utils.isHex(payload.params[0])) {
      try {
        signMsg = Web3.utils.hexToUtf8(payload.params[0]);
      } catch (err) {
        signMsg = payload.params[0];
      }
    }
    signModal('Sign to prove that you own this wallet\n' + signMsg, payload, 'Message');
  } else if (payload.method == 'eth_sign') {
    signModal('Sign to prove that you own this wallet\n' + payload.params[1], payload, 'Message');
  } else if (payload.method === 'eth_estimateGas') {
    web3RPCEndpoint.eth.estimateGas(payload.params[0])
      .then(result => {
        console.log('eth_estimateGas response', JSON.stringify(result));
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(result)})`);
      })
      .catch(err => {
        Sentry.captureException(err);
        // ('state', {type: 'error', title: 'Error', description: err.toString(), onSuccess: hideModal, onFailure: hideModal});
        Toast.show({ type: 'error', text1: 'Error', text2: err.toString(), position: 'bottom' });
        webviewRef.current.reload();
      });
  } else if (payload.method == 'eth_feeHistory') {
    web3RPCEndpoint.eth.getFeeHistory(payload.params[0], payload.params[1], payload.params[2])
      .then((result) => {
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${JSON.stringify(result)})`);
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method == 'eth_signTypedData') {
    signModal(JSON.stringify(payload.params[0]), payload, 'Message');
  } else if (payload.method == 'eth_signTypedData_v3') {
    signModal(payload.params[1], payload, 'Message');
  } else if (payload.method == 'eth_signTypedData_v4') {
    const eip712Object = JSON.parse(payload.params[1]);
    let payloadMessage = '';
    let signMessageTitleLocal = '';
    if (eip712Object.primaryType == 'Permit') {
      console.log('Permit', JSON.stringify(eip712Object.message));
      payloadMessage = 'Approve ' +
				eip712Object.message.value +
				' ' + eip712Object.domain.name +
				' \nuntil block number ' +
				eip712Object.message.deadline +
				' \nfor contract ' +
				eip712Object.message.spender;
      signMessageTitleLocal = 'Approve';
    } else {
      payloadMessage = JSON.stringify(eip712Object.message);
      signMessageTitleLocal = 'Message';
    }
    signModal(payloadMessage, payload, signMessageTitleLocal);
    analytics().logEvent('eth_signtypeddata_v4', {
      from: ethereum.address,
      method: payload.method,
      chain: hdWalletContext.state.selectedChain.name,
      primary_type: eip712Object.primaryType
    });
  } else if (payload.method === 'wallet_addEthereumChain' || payload.method === 'wallet_switchEthereumChain') {
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
      webviewRef.current.injectJavaScript(`window.ethereum.chainId="${intChainId}"`);
      webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, "null")`);
      webviewRef.current.injectJavaScript(`window.ethereum.loadChainChange(${payload.id}, ${addEthereumChainId})`);
    }

    updateSelectedChain(strChainName);
  } else if (payload.method === 'eth_chainId' || payload === 'eth_chainid') {
    web3RPCEndpoint.eth.net.getId()
      .then(result => {
        webviewRef.current.injectJavaScript(`window.ethereum.sendResponse(${payload.id}, ${result})`);
      })
      .catch(err => {
        // TODO (user feedback): Give feedback to user.
        Sentry.captureException(err);
      });
  } else if (payload.method === 'eth_getCode') {
    // To be implementated
  } else {
    analytics().logEvent('unknown_rpc_call', {
      from: ethereum.address,
      method: payload.method,
      chain: hdWalletContext.state.selectedChain.name
    });
  }
}
