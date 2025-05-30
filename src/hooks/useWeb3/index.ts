import { makeSignBytes } from '@cosmjs/proto-signing';
import {
  encodeSecp256k1Signature,
  serializeSignDoc,
  StdSignDoc,
} from '@cosmjs/launchpad';
import { PrivKeySecp256k1 } from '@keplr-wallet/crypto';
import { AuthInfo } from '@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx';
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import * as Sentry from '@sentry/react-native';
import Axios from 'axios';
import Long from 'long';
import { useContext, useEffect, useRef } from 'react';
import { ConnectionTypes, Web3Origin } from '../../constants/enum';
import {
  ALL_CHAINS,
  Chain,
  CHAIN_ARBITRUM,
  CHAIN_COLLECTION,
  CHAIN_ETH,
  CHAIN_HYPERLIQUID,
} from '../../constants/server';
import {
  CosmosWeb3Method,
  errorCodes,
  ProviderError,
  WALLET_PERMISSIONS,
  Web3Method,
} from '../../constants/web3';
import {
  PushModalFunc,
  SendTransactionCosmosFunc,
  SendTransactionModalFunc,
  SignTransactionModalFunc,
} from '../../containers/Browser/ConfirmationModalPromises';
import {
  getGasPriceFor,
  getPayloadParams,
} from '../../containers/Browser/gasHelper';
import { genId } from '../../containers/utilities/activityUtilities';
import { hexToUint } from '../../core/Address';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';
import { GlobalContext } from '../../core/globalContext';
import axios from '../../core/Http';
import { GasPriceDetail } from '../../core/types';
import {
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  getViemPublicClient,
  getWeb3Endpoint,
  HdWalletContext,
} from '../../core/util';
import { hostWorker } from '../../global';
import { ActivityStatus, ActivityType } from '../../reducers/activity_reducer';
import { ModalContext } from '../../reducers/modalReducer';
import { WebsiteInfo } from '../../types/Browser';
import useWeb3Callbacks from '../useWeb3Callbacks';
import { ProtoSignDocDecoder } from './cosmos/decoder';
import { calculateFeeSignAmino, calculateFeeSignDirect } from './gas';
import {
  checkAndValidateADR36AminoSignDoc,
  getChainInfo,
  JSONUint8Array,
  parseCosmosMessage,
} from './util';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { useTranslation } from 'react-i18next';
import { getConnectionType } from '../../core/asyncStorage';
import { loadPrivateKeyFromKeyChain } from '../../core/Keychain';
import {
  PublicClient,
  formatUnits,
  parseUnits,
  hexToBigInt,
  toHex,
  fromHex,
  hexToString,
  createWalletClient,
  http,
  type EstimateGasParameters,
  type SendTransactionParameters,
  type GetFeeHistoryParameters,
  type SignableMessage,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const bigNumberToHex = (val: string) => toHex(BigInt(val));

const NumberToHex = (val: number) => toHex(BigInt(val));

const invalidParams = () => ({
  error: {
    code: errorCodes.rpc.invalidParams,
    message: ProviderError[errorCodes.rpc.internal.toString()].message,
  },
});

const methodNotSupported = () => ({
  error: {
    code: errorCodes.rpc.methodNotSupported,
    message: ProviderError[errorCodes.rpc.internal.toString()].message,
  },
});

const userRejectedRequest = () => ({
  error: {
    code: errorCodes.provider.userRejectedRequest,
    message:
      ProviderError[errorCodes.provider.userRejectedRequest.toString()].message,
  },
});

const internalError = (e: any) => {
  return {
    error: {
      code: errorCodes.rpc.internal,
      message: e.message,
    },
  };
};

export default function useWeb3(origin: Web3Origin) {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const modalContext = useContext<any>(ModalContext);
  const { showModal, hideModal } = useGlobalModalContext();
  const { t } = useTranslation();

  const web3Callback = useWeb3Callbacks(origin);

  const getChainForViemClient = () => {
    if (
      hdWalletContext.state.selectedChain?.chainName !==
      CHAIN_COLLECTION.chainName
    ) {
      if (
        hdWalletContext.state.selectedChain?.backendName ===
        CHAIN_HYPERLIQUID.backendName
      ) {
        return CHAIN_ARBITRUM;
      }
      return hdWalletContext.state.selectedChain;
    }
    return CHAIN_ETH;
  };

  const publicClient = useRef<PublicClient>(
    getViemPublicClient(
      getWeb3Endpoint(getChainForViemClient(), globalContext),
    ),
  );

  const updateSelectedChain = (chain: Chain) => {
    hdWalletContext.dispatch({
      type: 'CHOOSE_CHAIN',
      value: { selectedChain: chain },
    });
  };

  useEffect(() => {
    publicClient.current = getViemPublicClient(
      getWeb3Endpoint(getChainForViemClient(), globalContext),
    );
  }, [hdWalletContext.state.selectedChain]);

  async function handleWeb3Cosmos(payload: any, websiteInfo: WebsiteInfo) {
    const { method } = payload;

    const { wallet } = hdWalletContext.state;

    const parsed = parseCosmosMessage(payload);

    const changeSelectedChainForCosmos = (chainId: string) => {
      try {
        const chainInfo = getChainInfo(chainId);
        const { name: chainName } = chainInfo;
        const chainDetails = ALL_CHAINS.find(
          (chain: Chain) => chain.chainName === chainName,
        );
        if (
          hdWalletContext.state.selectedChain.chainName !== chainName &&
          chainDetails
        ) {
          hdWalletContext.dispatch({
            type: 'CHOOSE_CHAIN',
            value: { selectedChain: chainDetails },
          });
        }
      } catch (e) {
        Sentry.captureException(e);
      }
    };

    if (!parsed) {
      return { error: 'Invalid arguments' };
    }

    try {
      if (method === CosmosWeb3Method.GETKEY) {
        const [chainId] = parsed;
        origin === Web3Origin.BROWSER && changeSelectedChainForCosmos(chainId);

        const chainInfo = getChainInfo(chainId);
        const { name: chainName } = chainInfo;
        const { address: bech32Address } = wallet[chainName];
        const privKey = await loadPrivateKeyFromKeyChain(
          false,
          hdWalletContext.state.pinValue,
        );
        if (privKey && privKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
          const privateKey = hexToUint(privKey);

          const privateKeyInstance = new PrivKeySecp256k1(privateKey);
          const publicKey = privateKeyInstance.getPubKey();

          const pubKey = publicKey.toBytes();
          const address = publicKey.getAddress();

          const unWrappedJson = {
            name: 'cypherd',
            algo: 'secp256k1',
            pubKey,
            address,
            bech32Address,
            isNanoLedger: false,
          };

          return JSONUint8Array.wrap(unWrappedJson);
        }
      } else if (method === CosmosWeb3Method.ENABLE) {
        // TODO: Implement enable method
        const [chainId] = parsed;
        changeSelectedChainForCosmos(chainId);
        return undefined;
      } else if (method === CosmosWeb3Method.SIGN_AMINO) {
        const [chainId, signer, signDoc, signOptions] = parsed;
        changeSelectedChainForCosmos(chainId);

        const chainInfo = getChainInfo(chainId);

        const privKey = await loadPrivateKeyFromKeyChain(
          false,
          hdWalletContext.state.pinValue,
        );
        if (privKey && privKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
          if (signer !== wallet[chainInfo.name].address) {
            throw new Error('Signer mismatch');
          }

          const bech32Prefix = chainInfo.bech32Config.bech32PrefixAccAddr;
          const isADR36SignDoc = checkAndValidateADR36AminoSignDoc(
            signDoc,
            bech32Prefix,
          );

          if (isADR36SignDoc) {
            if (signDoc.msgs[0].value.signer !== signer) {
              throw new Error('Unmatched signer in sign doc');
            }
          }

          if (signOptions.isADR36WithString != null && !isADR36SignDoc) {
            throw new Error(
              'Sign doc is not for ADR-36. But, "isADR36WithString" option is defined',
            );
          }

          const privateKeyInstance = new PrivKeySecp256k1(hexToUint(privKey));
          const publicKey = privateKeyInstance.getPubKey().toBytes();

          const finalSignDoc: StdSignDoc = calculateFeeSignAmino(
            chainId,
            signDoc,
          );

          const serializedSignDoc = serializeSignDoc(finalSignDoc);

          const acknowledgement = await SendTransactionCosmosFunc(
            modalContext,
            {
              signable: finalSignDoc,
              chain: chainInfo.name,
            },
          );

          if (!acknowledgement) {
            return { error: 'Request rejected' };
          }

          const signature = privateKeyInstance.sign(serializedSignDoc);

          logAnalyticsToFirebase(AnalyticEvent.COSMOS_SIGNAMINO, {
            origin,
            websiteInfo,
            method,
            payload,
          });

          const unWrappedJson = {
            signed: signDoc,
            signature: encodeSecp256k1Signature(publicKey, signature),
          };

          return JSONUint8Array.wrap(unWrappedJson);
        }
      } else if (method === CosmosWeb3Method.SIGN_DIRECT) {
        const [chainId, signer, signDoc] = parsed;
        changeSelectedChainForCosmos(chainId);

        const chainInfo = getChainInfo(chainId);
        const { name: chainName } = chainInfo;

        const { publicKey, address: bech32Address } = wallet[chainName];

        const privateKey = await loadPrivateKeyFromKeyChain(
          false,
          hdWalletContext.state.pinValue,
        );
        if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
          const privateKeyInstance = new PrivKeySecp256k1(
            hexToUint(privateKey),
          );

          const pubKey = hexToUint(publicKey);

          if (signer !== bech32Address) {
            throw new Error('Signer mismatch');
          }

          const authInfo = calculateFeeSignDirect(chainId, signDoc);

          const authInfoBytes = AuthInfo.encode(authInfo).finish();
          const modifiedSignDoc = { ...signDoc, authInfoBytes };

          const decoder = new ProtoSignDocDecoder(modifiedSignDoc);

          const signable = decoder.toJSON();

          const { accountNumber, ...signDocRest } = modifiedSignDoc;

          const cosmJsSignDoc = {
            ...signDocRest,
            accountNumber:
              typeof accountNumber === 'string'
                ? Long.fromString(accountNumber)
                : accountNumber,
          };

          const messageToSign = makeSignBytes(cosmJsSignDoc);

          const acknowledgement = await SendTransactionCosmosFunc(
            modalContext,
            {
              signable,
              chain: chainInfo.name,
            },
          );

          if (!acknowledgement) {
            return { error: 'Request rejected' };
          }

          const signature = privateKeyInstance.sign(messageToSign);

          logAnalyticsToFirebase(AnalyticEvent.COSMOS_SIGNDIRECT, {
            origin,
            method,
            websiteInfo,
            payload,
          });

          const unWrappedJson = {
            signed: cosmJsSignDoc,
            signature: encodeSecp256k1Signature(pubKey, signature),
          };

          return JSONUint8Array.wrap(unWrappedJson);
        }
      } else if (method === CosmosWeb3Method.SEND_TX) {
        const [chainId, tx, mode] = parsed;
        const chainInfo = getChainInfo(chainId);

        changeSelectedChainForCosmos(chainId);
        const restInstance = Axios.create({
          ...{
            baseURL: chainInfo.rest,
          },
        });

        const isProtoTx = Buffer.isBuffer(tx) || tx instanceof Uint8Array;

        const params = isProtoTx
          ? {
              tx_bytes: Buffer.from(tx as any).toString('base64'),
              mode: (() => {
                switch (mode) {
                  case 'async':
                    return 'BROADCAST_MODE_ASYNC';
                  case 'block':
                    return 'BROADCAST_MODE_BLOCK';
                  case 'sync':
                    return 'BROADCAST_MODE_SYNC';
                  default:
                    return 'BROADCAST_MODE_UNSPECIFIED';
                }
              })(),
            }
          : {
              tx,
              mode,
            };

        const result = await restInstance.post(
          isProtoTx ? '/cosmos/tx/v1beta1/txs' : '/txs',
          params,
        );

        const txResponse = isProtoTx ? result.data.tx_response : result.data;

        if (txResponse.code != null && txResponse.code !== 0) {
          throw new Error(txResponse.raw_log);
        }
        const txHash = Buffer.from(txResponse.txhash, 'hex');

        return txHash;
      } else {
        logAnalyticsToFirebase(AnalyticEvent.COSMOS_METHOD_NOTFOUND, {
          method,
          websiteInfo,
        });

        return { error: 'Method not found ' };
      }
    } catch (e: any) {
      Sentry.captureException(e);
      logAnalyticsToFirebase(AnalyticEvent.COSMOS_PROVIDER_ERROR, {
        origin,
        method,
        payload,
        errorMessage: e.message,
      });

      return { error: e.message };
    }
  }

  async function handleWeb3(
    payload: any,
    websiteInfo: WebsiteInfo,
    chain?: Chain,
  ) {
    const { method } = payload;
    if (!method) {
      return {
        error: {
          code: errorCodes.rpc.methodNotFound,
          message: 'args.method should be a non-empty string',
        },
      };
    }

    try {
      const result: any = await HandleWeb3PayloadEthereum(
        payload,
        websiteInfo,
        chain,
      );
      const { callbackData } = result;

      callbackData && web3Callback({ ...callbackData, payload, result });
      delete result.callbackData;
      return result;
    } catch (e: any) {
      logAnalyticsToFirebase(AnalyticEvent.JSON_RPC_ERROR, {
        origin,
        websiteInfo,
        payload,
      });
      const errorObject = {
        e,
        origin,
        websiteInfo,
        payload: JSON.stringify(payload),
      };

      Sentry.captureException(errorObject);
      return internalError(e);
    }
  }

  async function HandleWeb3PayloadEthereum(
    payload: any,
    websiteInfo: WebsiteInfo,
    chain: Chain | undefined,
  ) {
    const connectionType = await getConnectionType();
    if (connectionType === ConnectionTypes.WALLET_CONNECT) {
      showModal('state', {
        type: 'error',
        title: t('UNABLE_TO_CONNECT'),
        description: t('BROWSER_WALLET_CONNECT_ERROR'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      const {
        wallet: {
          ethereum: { address },
        },
      } = hdWalletContext.state;

      const { params, method, id: payloadId } = payload;
      const selectedChain = chain ?? getChainForViemClient();
      publicClient.current = getViemPublicClient(
        getWeb3Endpoint(selectedChain, globalContext),
      );
      switch (method) {
        case 'eth_cypherd_state': {
          const stateAaccounts = [address];
          const stateChainId = await publicClient.current.getChainId();
          return {
            result: {
              accounts: stateAaccounts,
              chainId: NumberToHex(Number(stateChainId)),
              networkVersion: Number(stateChainId),
            },
          };
        }
        case Web3Method.SEND_TRANSACTION: {
          let [{ from, to, gasPrice, data, value, gas }] = params;
          const gasPriceFinal = gasPrice;
          value = value ?? '0x0';

          const callbackData: any = {};

          const gasPriceDetail: GasPriceDetail = await getGasPriceFor(
            selectedChain,
            publicClient.current,
          );
          if (gasPriceFinal) {
            if (gasPriceFinal.startsWith('0x')) {
              gasPriceDetail.gasPrice = parseFloat(
                formatUnits(hexToBigInt(gasPriceFinal), 9),
              );
            } else {
              // Finally this code path has a breaking test-case with KOGE when gasPrice is an integer
              gasPriceDetail.gasPrice = parseFloat(
                formatUnits(BigInt(gasPriceFinal), 9),
              );
            }
          } else {
            gasPriceDetail.gasPrice = parseFloat(
              gasPriceDetail.gasPrice.toString(),
            );
          }

          const gasPriceInHex = toHex(
            parseUnits(gasPriceDetail.gasPrice.toFixed(9), 9),
          );

          try {
            const estimateParams: EstimateGasParameters = {
              account: address as `0x${string}`,
              to: to as `0x${string}`,
              data: data as `0x${string}`,
              value: BigInt(parseInt(value || '0', 16)),
            };
            const estimated =
              await publicClient.current.estimateGas(estimateParams);
            gas = gas ?? Number(estimated);
          } catch (e) {
            const estimatedGasException = {
              e,
              params,
              message:
                'estimateGas inside eth_sendTransaction failed. Using given gas.',
            };
            Sentry.captureException(estimatedGasException);
          }

          from = from ?? address;

          const modalParams = await getPayloadParams(
            payload,
            gasPriceDetail,
            selectedChain,
            gas,
          );

          const acknowledgement =
            origin !== Web3Origin.WALLETCONNECT
              ? await SendTransactionModalFunc(modalContext, modalParams)
              : true;
          if (!acknowledgement) {
            return userRejectedRequest();
          }

          const activityData = {
            id: genId(),
            status: ActivityStatus.SUCCESS,
            type: ActivityType.BROWSER,
            transactionHash: '',
            fromAddress: address,
            toAddress: to,
            websiteInfo,
            chainName: hdWalletContext.state.selectedChain.name,
            symbol: modalParams.networkCurrency,
            datetime: new Date(),
            amount: modalParams.totalETH,
          };

          const privateKey = await loadPrivateKeyFromKeyChain(
            false,
            hdWalletContext.state.pinValue,
          );

          if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
            const account = privateKeyToAccount(privateKey as `0x${string}`);
            const walletClient = createWalletClient({
              account,
              transport: http(getWeb3Endpoint(selectedChain, globalContext)),
            });

            let receipt;

            try {
              const txParams: SendTransactionParameters = {
                account,
                chain: null,
                to: to as `0x${string}`,
                value: BigInt(parseInt(value || '0', 16)),
                data: data as `0x${string}`,
                gas: BigInt(parseInt(gas || '0', 16)),
                gasPrice: BigInt(parseInt(gasPriceInHex || '0', 16)),
              };
              const hash = await walletClient.sendTransaction(txParams);
              activityData.transactionHash = hash;
              receipt = await publicClient.current.waitForTransactionReceipt({
                hash,
              });
            } catch (e: unknown) {
              Sentry.captureException(e);
              activityData.status = ActivityStatus.FAILED;
              return internalError(e);
            }

            callbackData.activityData = activityData;
            callbackData.receipt = receipt?.transactionHash;

            if (receipt?.transactionHash) {
              return {
                result: receipt.transactionHash,
                callbackData,
              };
            }
            return invalidParams();
          }
          break;
        }
        case Web3Method.ACCOUNTS:
        case Web3Method.REQUEST_ACCOUNTS: {
          return {
            result: [address],
          };
        }
        case Web3Method.GET_BALANCE: {
          const addressToFetch = params ? (params[0] ?? address) : address;
          const balance = await publicClient.current.getBalance({
            address: addressToFetch as `0x${string}`,
          });
          const balanceInHex = bigNumberToHex(balance.toString());
          return {
            result: balanceInHex,
          };
        }
        case Web3Method.BLOCK_NUMBER: {
          const blockNumber = await publicClient.current.getBlockNumber();
          return {
            result: toHex(blockNumber),
          };
        }
        case Web3Method.BLOCK_BY_NUMBER:
        case Web3Method.BLOCK_BY_HASH: {
          const [blockNumber, returnTransactionObject] = params;

          if (!blockNumber || !returnTransactionObject === undefined) {
            return invalidParams();
          }
          const blockByNumber = await publicClient.current.getBlock({
            blockNumber: fromHex(blockNumber, 'bigint'),
            includeTransactions: returnTransactionObject,
          });

          return {
            result: blockByNumber,
          };
        }
        case Web3Method.GAS_PRICE: {
          const gasPrice = await publicClient.current.getGasPrice();
          return {
            result: toHex(gasPrice),
          };
        }
        case Web3Method.CHAINID:
        case Web3Method.CHAIN_ID: {
          const chainId = await publicClient.current.getChainId();
          return {
            result: NumberToHex(Number(chainId)),
          };
        }
        case Web3Method.NET_VERSION: {
          const chainId = await publicClient.current.getChainId();
          return {
            result: chainId.toString(),
          };
        }
        case Web3Method.GET_LOGS: {
          const [options] = params;
          if (!options) {
            return invalidParams();
          }
          const logs = await publicClient.current.getLogs(options);
          return {
            result: logs,
          };
        }
        case Web3Method.ETH_CALL: {
          const [transactionConfig] = params;
          if (!transactionConfig) {
            return invalidParams();
          }

          const callResult = await publicClient.current.call(transactionConfig);
          return {
            result: callResult?.data,
          };
        }
        case Web3Method.GET_TRANSACTION_BY_HASH: {
          const [transactionHash] = params;
          if (!transactionHash) {
            return invalidParams();
          }
          const rawTx = await publicClient.current.getTransaction({
            hash: transactionHash,
          });

          return {
            result: rawTx,
          };
        }
        case Web3Method.GET_TRANSACTION_RECEIPT: {
          const [hash] = params;
          if (!hash) {
            return invalidParams();
          }
          const rawTx = await publicClient.current.getTransactionReceipt({
            hash,
          });

          if (rawTx) {
            return {
              result: { ...rawTx, status: rawTx.status ? '0x1' : '0x0' },
            };
          }
          return rawTx;
        }
        case Web3Method.GET_TRANSACTION_COUNT: {
          const [addressToFetch] = params;
          if (!addressToFetch) {
            return invalidParams();
          }
          const txnCount = await publicClient.current.getTransactionCount({
            address: addressToFetch as `0x${string}`,
          });

          return {
            result: toHex(txnCount),
          };
        }
        case Web3Method.PERSONAL_SIGN:
        case Web3Method.ETH_SIGN: {
          const [personalSignData, ethSignData] = params;
          if (!(personalSignData || ethSignData)) {
            return invalidParams();
          }
          let messageToSign =
            method === Web3Method.PERSONAL_SIGN
              ? personalSignData
              : method === Web3Method.ETH_SIGN
                ? ethSignData
                : personalSignData;

          try {
            messageToSign = hexToString(messageToSign);
          } catch (e) {
            Sentry.captureMessage(
              'Nothing to bother. Just a mandatory catch block',
            );
          }

          let acknowledgement;
          try {
            acknowledgement =
              origin !== Web3Origin.WALLETCONNECT
                ? await SignTransactionModalFunc(modalContext, {
                    signMessage: messageToSign,
                    chainIdNumber: Number(
                      (messageToSign.match(/Chain ID: (\d+)/) || [
                        null,
                        '0',
                      ])[1],
                    ),
                    payload,
                    signMessageTitle: 'Message',
                  })
                : true;
          } catch (e) {
            acknowledgement = false;
          }

          if (!acknowledgement) {
            return userRejectedRequest();
          }

          const privateKey = await loadPrivateKeyFromKeyChain(
            false,
            hdWalletContext.state.pinValue,
          );

          if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
            const account = privateKeyToAccount(privateKey as `0x${string}`);
            const walletClient = createWalletClient({
              account,
              transport: http(getWeb3Endpoint(selectedChain, globalContext)),
            });

            const signature = await walletClient.signMessage({
              message: messageToSign,
            });

            return {
              result: signature,
            };
          }
          break;
        }
        case Web3Method.ESTIMATE_GAS: {
          const [transactionConfig] = params;
          if (!transactionConfig) {
            return invalidParams();
          }
          const gas = await publicClient.current.estimateGas(transactionConfig);

          return {
            result: toHex(gas),
          };
        }
        case Web3Method.FEE_HISTORY: {
          const [blockCount, lastBlock, rewardPercentile] = params;
          if (!blockCount || !lastBlock || !rewardPercentile) {
            return invalidParams();
          }
          const feeHistoryParams: GetFeeHistoryParameters = {
            blockCount: Number(blockCount),
            rewardPercentiles: rewardPercentile,
          };
          const feeHistory =
            await publicClient.current.getFeeHistory(feeHistoryParams);

          return {
            result: feeHistory,
          };
        }
        case Web3Method.SIGN_TYPED_DATA:
        case Web3Method.SIGN_TYPED_DATA_V3:
        case Web3Method.SIGN_TYPED_DATA_V4: {
          const privateKey = await loadPrivateKeyFromKeyChain(
            false,
            hdWalletContext.state.pinValue,
          );

          if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
            const privateKeyBuffer = Buffer.from(
              privateKey.substring(2),
              'hex',
            );

            const [arg1, arg2] = params;
            if (!arg1 || !arg2) {
              return invalidParams();
            }
            const eip712Data = Array.isArray(arg1) ? arg1 : JSON.parse(arg2);

            const typedDataVersion = Array.isArray(arg1)
              ? SignTypedDataVersion.V1
              : Web3Method.SIGN_TYPED_DATA_V4 === method
                ? SignTypedDataVersion.V4
                : SignTypedDataVersion.V3;

            const acknowledgement = await SignTransactionModalFunc(
              modalContext,
              {
                signMessage: JSON.stringify(eip712Data, undefined, 4),
                payload,
                signMessageTitle:
                  'SignTypedData ' + typedDataVersion.toString(),
              },
            );

            if (!acknowledgement) {
              return userRejectedRequest();
            }

            const signature = signTypedData({
              privateKey: privateKeyBuffer,
              data: eip712Data,
              version: typedDataVersion,
            });

            return {
              result: signature,
            };
          }
          break;
        }
        case Web3Method.ADD_ETHEREUM_CHAIN:
        case Web3Method.SWITCH_ETHEREUM_CHAIN: {
          let [{ chainId: ethereumChainId }] = params;
          const supportedChain = ALL_CHAINS.find(
            chain => chain.chain_id === ethereumChainId,
          );
          ethereumChainId = supportedChain
            ? ethereumChainId
            : CHAIN_ETH.chain_id;
          if (supportedChain) {
            updateSelectedChain(supportedChain);
            return {
              result: null,
            };
          }
          break;
        }
        case Web3Method.WALLET_PUSH_PERRMISSION: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          const [{ app_id, app_name, appImage, reasonMessage }] = params;
          const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
          const pushPermissionURL = `${PORTFOLIO_HOST}/v1/push/permissions`;
          const Urlparams = new URLSearchParams({
            wallet_address: address,
            app_id,
          });

          const { permission } = (
            await axios.get(pushPermissionURL, {
              params: Urlparams,
              timeout: 1000,
            })
          ).data;
          if (
            [WALLET_PERMISSIONS.NO_DATA, WALLET_PERMISSIONS.DENY].includes(
              permission,
            )
          ) {
            const modalParams = {
              app_name,
              appImage,
              reasonMessage,
              app_id,
              wallet_address: address,
              payload_id: payloadId,
            };
            const acknowledgement = await PushModalFunc(
              modalContext,
              modalParams,
            );
            if (!acknowledgement) {
              return {
                result: WALLET_PERMISSIONS.DENY,
              };
            }
          }

          return {
            result: WALLET_PERMISSIONS.ALLOW,
          };
        }
        case Web3Method.PERSONAL_ECRECOVER: {
          const [msg, signature] = params;
          const recoverAddress = await publicClient.current.verifyMessage({
            address: address as `0x${string}`,
            message: msg as SignableMessage,
            signature: signature as `0x${string}`,
          });
          return {
            result: recoverAddress,
          };
        }
        default: {
          logAnalyticsToFirebase(AnalyticEvent.WEB3_METHOD_NOTFOUND, {
            origin,
            ...payload,
            websiteInfo,
          });
          return methodNotSupported();
        }
      }
    }
  }

  return [handleWeb3, handleWeb3Cosmos];
}
