import Web3 from 'web3';
import { ALL_CHAINS, Chain, CHAIN_ETH } from '../../constants/server';
import axios from '../../core/Http';
import BigNumber from 'bignumber.js';
import {
  signTypedData,
  SignTypedDataVersion,
  TYPED_MESSAGE_SCHEMA,
} from '@metamask/eth-sig-util';
import { WALLET_PERMISSIONS, WEB3METHODS } from '../../constants/web3';
import { JSONRPCRequestPayload } from '../../types/Web3';
import { getGasPriceFor } from '../Browser/gasHelper';
import { hostWorker } from '../../global';
import { _NO_CYPHERD_CREDENTIAL_AVAILABLE_ } from '../../core/util';
import { loadPrivateKeyFromKeyChain } from '../../core/Keychain';

const bigNumberToHex = (val: string) =>
  `0x${new BigNumber(val, 10).toString(16)}`;

const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
const pushPermissionURL = `${PORTFOLIO_HOST}/v1/push/permissions`;
const chainIdToChain = (chainId: any) =>
  ALL_CHAINS.find(chain => chain.chainIdNumber == chainId) ?? CHAIN_ETH;

export async function handleWeb3Payload(
  hdWalletContext: any,
  payload: JSONRPCRequestPayload,
  web3RPCEndpoint: Web3,
  chain: Chain,
) {
  const { ethereum } = hdWalletContext.state.wallet;
  const { address: wallet_address } = ethereum;

  console.log('privatekey needed in handle web3 payload');

  const privateKey = await loadPrivateKeyFromKeyChain(
    false,
    hdWalletContext.state.pinValue,
  );
  if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
    const { method, params, id: payload_id } = payload;

    const result: { data: any; isPermitted: boolean } = {
      data: '',
      isPermitted: true,
    };
    const [{ app_id, app_name, appImage, reasonMessage }] = params;
    if (method === WEB3METHODS.WALLET_PUSH_PERRMISSION) {
      const params = new URLSearchParams({ wallet_address, app_id });

      const { permission } = (
        await axios.get(pushPermissionURL, { params, timeout: 1000 })
      ).data;
      if (
        [WALLET_PERMISSIONS.NO_DATA, WALLET_PERMISSIONS.DENY].includes(
          permission,
        )
      ) {
        result.data = {
          app_name,
          appImage,
          reasonMessage,
          app_id,
          wallet_address,
          payload_id,
        };
      } else if (permission == WALLET_PERMISSIONS.ALLOW) {
        result.data = permission;
      }

      return result;
    } else if (method === WEB3METHODS.SIGN_TRANSACTION) {
      const {
        params: [txPayload],
      } = payload;
      const signedTx = await web3RPCEndpoint.eth.accounts.signTransaction(
        txPayload,
        privateKey,
      );
      const receipt = signedTx?.rawTransaction
        ? await web3RPCEndpoint.eth.sendSignedTransaction(
            signedTx.rawTransaction,
          )
        : undefined;

      return receipt?.transactionHash ?? undefined;
    } else if (method === WEB3METHODS.SEND_TRANSACTION) {
      let {
        params: [
          { from, to, maxPriorityFeePerGas, gasPrice, data, value, gas },
        ],
      } = payload;

      let gasPriceFinal = gasPrice ?? maxPriorityFeePerGas;
      value = value ?? '0x0';

      if (!gasPriceFinal) {
        gasPrice = await (
          await getGasPriceFor(chain, web3RPCEndpoint)
        ).gasPrice;
        gasPriceFinal = Web3.utils.toHex(
          Web3.utils.toWei(gasPrice.toFixed(9), 'gwei'),
        );
      }

      if (!from) {
        from = wallet_address;
      }

      const txPayload = {
        from,
        to,
        gasPrice: parseInt(gasPriceFinal),
        data,
        value: parseInt(value),
        gas: parseInt(gas) ?? undefined,
      };

      const signedTx = await web3RPCEndpoint.eth.accounts.signTransaction(
        txPayload,
        privateKey,
      );

      let receipt;

      if (signedTx.rawTransaction) {
        receipt = await web3RPCEndpoint.eth.sendSignedTransaction(
          signedTx.rawTransaction,
        );
      } else {
        throw new Error('Transaction hash not found in signed transaction');
      }

      return receipt.transactionHash;
    } else if (
      [WEB3METHODS.ACCOUNTS, WEB3METHODS.REQUEST_ACCOUNTS].includes(method)
    ) {
      return [wallet_address];
    } else if (method === WEB3METHODS.GET_BALANCE) {
      const { params } = payload;
      const address = params ? params[0] : wallet_address;

      const balanceInHex = bigNumberToHex(
        await web3RPCEndpoint.eth.getBalance(address),
      );

      return balanceInHex;
    } else if (method === WEB3METHODS.BLOCK_NUMBER) {
      const blockNumber = await web3RPCEndpoint.eth.getBlockNumber();

      return blockNumber;
    } else if (
      [WEB3METHODS.BLOCK_BY_HASH, WEB3METHODS.BLOCK_BY_NUMBER].includes(method)
    ) {
      const {
        params: [blockNumber, returnTransactionObject],
      } = payload;
      const blockByNumber = await web3RPCEndpoint.eth.getBlock(
        blockNumber,
        returnTransactionObject,
      );

      return blockByNumber;
    } else if (method === WEB3METHODS.GAS_PRICE) {
      const gasPrice = await web3RPCEndpoint.eth.getGasPrice();

      return gasPrice;
    } else if (
      [
        WEB3METHODS.CHAINID,
        WEB3METHODS.CHAIN_ID,
        WEB3METHODS.NET_VERSION,
      ].includes(method)
    ) {
      const netId = await web3RPCEndpoint.eth.net.getId();

      return netId;
    } else if (method === WEB3METHODS.GET_LOGS) {
      const {
        params: [options],
      } = payload;
      const logs = await web3RPCEndpoint.eth.getPastLogs(options);

      return logs;
    } else if (method === WEB3METHODS.ETH_CALL) {
      const {
        params: [transactionConfig],
      } = payload;
      const callResult = await web3RPCEndpoint.eth.call(transactionConfig);

      return callResult;
    } else if (method === WEB3METHODS.GET_TRANSACTION_BY_HASH) {
      const {
        params: [transactionHash],
      } = payload;
      const txnByHash =
        await web3RPCEndpoint.eth.getTransaction(transactionHash);

      return txnByHash;
    } else if (method === WEB3METHODS.GET_TRANSACTION_RECEIPT) {
      const {
        params: [hash],
      } = payload;
      const txnReceipt = await web3RPCEndpoint.eth.getTransactionReceipt(hash);

      return txnReceipt;
    } else if (method === WEB3METHODS.GET_TRANSACTION_COUNT) {
      const {
        params: [address],
      } = payload;
      const txnCount = await web3RPCEndpoint.eth.getTransactionCount(address);

      return txnCount;
    } else if (
      [WEB3METHODS.PERSONAL_SIGN, WEB3METHODS.ETH_SIGN].includes(method)
    ) {
      const {
        params: [personalSignData, ethSignData],
      } = payload;
      const messageToSign =
        method === WEB3METHODS.PERSONAL_SIGN
          ? personalSignData
          : method === WEB3METHODS.ETH_SIGN
            ? ethSignData
            : personalSignData;
      const signature = web3RPCEndpoint.eth.accounts.sign(
        messageToSign,
        privateKey,
      );

      return signature.signature;
    } else if (method === WEB3METHODS.ESTIMATE_GAS) {
      const {
        params: [transactionConfig],
      } = payload;
      const gas = await web3RPCEndpoint.eth.estimateGas(transactionConfig);

      return gas;
    } else if (method === WEB3METHODS.FEE_HISTORY) {
      const {
        params: [blockCount, lastBlock, rewardPercentile],
      } = payload;
      const feeHistory = await web3RPCEndpoint.eth.getFeeHistory(
        blockCount,
        lastBlock,
        rewardPercentile,
      );

      return feeHistory;
    } else if (
      [
        WEB3METHODS.SIGN_TYPED_DATA,
        WEB3METHODS.SIGN_TYPED_DATA_V3,
        WEB3METHODS.SIGN_TYPED_DATA_V4,
      ].includes(method)
    ) {
      const privateKeyBuffer = Buffer.from(privateKey.substring(2), 'hex');

      const {
        params: [arg1, arg2],
      } = payload;
      const eip712Data = Array.isArray(arg1) ? arg1 : JSON.parse(arg2);

      const typedDataVersion = Array.isArray(arg1)
        ? SignTypedDataVersion.V1
        : WEB3METHODS.SIGN_TYPED_DATA_V4 === method
          ? SignTypedDataVersion.V4
          : SignTypedDataVersion.V3;

      const signature = signTypedData({
        privateKey: privateKeyBuffer,
        data: eip712Data,
        version: typedDataVersion,
      });

      return signature;
    } else if (
      [
        WEB3METHODS.ADD_ETHEREUM_CHAIN,
        WEB3METHODS.SWITCH_ETHEREUM_CHAIN,
      ].includes(method)
    ) {
      let {
        params: [{ chainId: ethereumChainId }],
      } = payload;
      const supportedChain = !!ALL_CHAINS.find(
        chain => chain.chain_id === ethereumChainId,
      );

      ethereumChainId = supportedChain ? ethereumChainId : CHAIN_ETH.chain_id;

      // const chain = chainIdToChain(parseInt(ethereumChainId, 16));
      // hdWalletContext.dispatch({ type: 'CHOOSE_CHAIN', value: { selectedChain: chain } });

      return ethereumChainId;
    } else if (method === WEB3METHODS.GET_CODE) {
      throw 'Method Not Implemeted';
    } else {
      throw 'Unknown Rpc';
    }
  }
}
