import { useNavigation } from '@react-navigation/native';
import { useWalletInfo } from '@reown/appkit-react-native';
import * as Sentry from '@sentry/react-native';
import {
  getBlockNumber,
  getChainId,
  waitForTransactionReceipt,
} from '@wagmi/core';
import { get } from 'lodash';
import { useContext } from 'react';
import { Linking, Platform } from 'react-native';
import {
  createWalletClient,
  custom,
  Hash,
  Hex,
  http,
  SignTypedDataParameters,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
  WagmiContext,
} from 'wagmi';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { ChainIdToBackendNameMapping } from '../../constants/data';
import { ConnectionTypes } from '../../constants/enum';
import { Chain, walletConnectChainData } from '../../constants/server';
import { getConnectionType } from '../../core/asyncStorage';
import { MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import useAxios from '../../core/HttpRequest';
import { loadPrivateKeyFromKeyChain } from '../../core/Keychain';
import {
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  HdWalletContext,
  sleepFor,
} from '../../core/util';
import {
  EthSingerParams,
  EthTransactionPayload,
} from '../../models/ethSigner.interface';
import { recoverTypedSignature } from '@metamask/eth-sig-util';
import { WALLET_CONNECT_SIGNING_TIMEOUT } from '../../constants/timeOuts';

export default function useEthSigner() {
  const wagmiConfig = useContext(WagmiContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { signTypedDataAsync } = useSignTypedData();
  const { walletInfo } = useWalletInfo();
  const { showModal, hideModal } = useGlobalModalContext();
  const navigation = useNavigation();
  const { getWithAuth } = useAxios();

  const getTransactionReceipt = async (
    hash: `0x${string}`,
    chain: number,
  ): Promise<string> => {
    return await new Promise(async resolve => {
      let hashFromReceipt;
      try {
        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash,
          chainId: chain,
        });
        hashFromReceipt = receipt?.transactionHash;
      } catch (error) {
        hashFromReceipt = hash;
      }
      resolve(hashFromReceipt);
    });
  };

  const redirectToMetaMask = () => {
    const metamaskDeepLink = 'metamask://';
    Linking.openURL(metamaskDeepLink).catch(err =>
      Sentry.captureException(err),
    );
  };

  const findTransaction = async (
    fromAddress: string,
    toAddress: string,
    value: bigint,
    chainId: number,
    startBlockNumber: bigint,
    contractAddress?: string,
  ): Promise<Hash | null> => {
    return await new Promise((resolve, reject) => {
      // Make API call to get transactions
      const getTransactions = async () => {
        try {
          const response = await getWithAuth(
            `/v1/txn/transactions/${fromAddress}?isUnmarshalQuery=true&blockchain=${get(
              ChainIdToBackendNameMapping,
              [String(chainId)],
            )}&toAddress=${toAddress}&fromBlock=${startBlockNumber}${
              contractAddress ? `&contractAddress=${contractAddress}` : ''
            }`,
          );
          const data = response.data;
          if (data.transactions && data.transactions.length === 1) {
            const matchingTx = data.transactions[0];
            resolve(matchingTx.hash as `0x${string}`);
            return;
          }

          // No match found
          resolve(null);
        } catch (error) {
          reject(error);
        }
      };

      // Start transaction search
      void getTransactions();
    });
  };

  // used To Send NativeCoins and to make any contact execution with contract data
  async function sendNativeCoin({
    transactionToBeSigned,
    chainId,
  }: {
    transactionToBeSigned: EthTransactionPayload;
    chainId: number;
  }) {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            "Signing transaction request timed out. User didn't sign / decline the transaction request. \n\n NOTE: Please cancel any pending reuests in your connected wallet and retry",
          ),
        );
      }, WALLET_CONNECT_SIGNING_TIMEOUT);
    });

    const cleanup = () => {
      clearTimeout(timer);
    };

    // Build transaction params explicitly - avoid spreading extra fields like 'from'
    // Always include 'data' (use '0x' for native sends) per Reown AppKit docs
    const txParams = {
      to: transactionToBeSigned.to,
      value: transactionToBeSigned.value,
      data: transactionToBeSigned.data ?? ('0x' as `0x${string}`),
      gas: transactionToBeSigned.gas,
      chainId,
      ...(transactionToBeSigned.gasPrice
        ? { gasPrice: transactionToBeSigned.gasPrice }
        : {
            maxPriorityFeePerGas: transactionToBeSigned.maxPriorityFeePerGas,
            maxFeePerGas: transactionToBeSigned.maxFeePerGas,
          }),
    };

    const sendTransactionPromise = sendTransactionAsync(txParams);
    const hash = await Promise.race([sendTransactionPromise, timeoutPromise]);
    cleanup();

    return hash;
  }

  async function sendToken({
    transactionToBeSigned,
    chainId,
  }: {
    transactionToBeSigned: EthTransactionPayload;
    chainId: number;
  }) {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            `Signing transaction request timed out. User didn't sign / decline the transaction request. \n\n NOTE: Please cancel any pending reuests in your connected wallet and retry`,
          ),
        );
      }, WALLET_CONNECT_SIGNING_TIMEOUT);
    });
    const cleanup = () => {
      clearTimeout(timer);
    };

    // Build transaction params explicitly - avoid spreading extra fields like 'from'
    // Always include 'data' (use '0x' for token sends) per Reown AppKit docs
    const txParams = {
      to: transactionToBeSigned.to,
      value: transactionToBeSigned.value,
      data: transactionToBeSigned.data ?? ('0x' as `0x${string}`),
      gas: transactionToBeSigned.gas,
      chainId,
      ...(transactionToBeSigned.gasPrice
        ? { gasPrice: transactionToBeSigned.gasPrice }
        : {
            maxPriorityFeePerGas: transactionToBeSigned.maxPriorityFeePerGas,
            maxFeePerGas: transactionToBeSigned.maxFeePerGas,
          }),
    };

    const sendTransactionPromise = sendTransactionAsync(txParams);
    const hash = await Promise.race([sendTransactionPromise, timeoutPromise]);
    cleanup();

    return hash;
  }

  const signApprovalEthereum = async ({
    rpc,
    sendChain,
    transactionToBeSigned,
    tokens,
  }: EthSingerParams): Promise<`0x${string}`> => {
    const connectionType = await getConnectionType();

    if (connectionType === ConnectionTypes.WALLET_CONNECT) {
      const connectedChain = getChainId(wagmiConfig);
      const chainConfig = get(walletConnectChainData, sendChain).chainConfig;
      // Switch chain for ALL WalletConnect wallets (required by wagmi - it doesn't auto-switch)
      // Do this silently - the wallet app will show its own UI for the switch
      if (connectedChain !== chainConfig.id) {
        try {
          await switchChainAsync({
            chainId: chainConfig.id,
          });
          await sleepFor(1000);
        } catch (e) {
          throw new Error(`Failed to switch to ${chainConfig?.name} chain`);
        }
      }

      // Build approval tx params explicitly - avoid passing 'from' as 'account'
      const approvalTxParams = {
        to: transactionToBeSigned.to,
        data: transactionToBeSigned.data ?? ('0x' as `0x${string}`),
        value: transactionToBeSigned.value,
        gas: transactionToBeSigned.gas,
        chainId: chainConfig.id,
        ...(transactionToBeSigned.gasPrice
          ? { gasPrice: transactionToBeSigned.gasPrice }
          : {
              maxPriorityFeePerGas: transactionToBeSigned.maxPriorityFeePerGas,
              maxFeePerGas: transactionToBeSigned.maxFeePerGas,
            }),
      };

      const response = await sendTransactionAsync(approvalTxParams);
      const receipt = await getTransactionReceipt(response, chainConfig.id);
      return receipt;
    } else {
      return await signAndSendEthTransaction({
        rpc,
        transactionToBeSigned,
      });
    }
  };

  async function handleTransaction(
    transactionToBeSigned: EthTransactionPayload,
    chainConfig: Chain,
  ) {
    // Get the current block number before starting
    const startBlockNumber = await getBlockNumber(wagmiConfig);

    // First attempt: Direct transaction
    try {
      let hash;
      if (transactionToBeSigned.data) {
        hash = await sendToken({
          transactionToBeSigned,
          chainId: chainConfig.id,
        });
      } else {
        hash = await sendNativeCoin({
          transactionToBeSigned,
          chainId: chainConfig.id,
        });
      }
      return hash;
    } catch (directError) {
      // Check if error is user cancellation
      if (
        directError instanceof Error &&
        directError.message.includes('User cancelled the request')
      ) {
        throw new Error('User cancelled the request');
      }

      // Second attempt: Find transaction
      try {
        const hash = await findTransaction(
          transactionToBeSigned.from as `0x${string}`,
          transactionToBeSigned.to,
          BigInt(transactionToBeSigned.value),
          chainConfig.id,
          startBlockNumber,
        );

        if (hash) {
          return hash;
        }
      } catch (findError) {}
      throw directError;
    }
  }

  const signEthTransaction = async ({
    rpc,
    sendChain,
    transactionToBeSigned,
  }: EthSingerParams): Promise<`0x${string}`> => {
    const connectionType = await getConnectionType();

    if (connectionType === ConnectionTypes.WALLET_CONNECT) {
      const connectedChain = getChainId(wagmiConfig);
      const chainConfig = get(walletConnectChainData, sendChain).chainConfig;
      // Switch chain for ALL WalletConnect wallets (required by wagmi - it doesn't auto-switch)
      if (connectedChain !== chainConfig.id) {
        const isMetaMask = walletInfo?.name === 'MetaMask Wallet';
        try {
          // For MetaMask on Android, show a fallback modal in case switch doesn't appear
          if (isMetaMask && Platform.OS === 'android') {
            setTimeout(() => {
              const currentConnectedChain = getChainId(wagmiConfig);
              if (currentConnectedChain !== chainConfig.id) {
                showModal('state', {
                  type: 'warning',
                  title: `Switch to ${chainConfig.name} chain`,
                  description: `If you don't see a switch chain popup in your ${walletInfo?.name} wallet, please change the connected chain to ${chainConfig.name} chain and try again.`,
                  onSuccess: () => {
                    hideModal();
                    redirectToMetaMask();
                    navigation.goBack();
                  },
                  onFailure: () => {
                    hideModal();
                    navigation.goBack();
                  },
                });
              }
            }, 2000);
          }
          // For non-MetaMask wallets, switch silently - wallet app will show its own UI
          await switchChainAsync({
            chainId: chainConfig.id,
          });
          hideModal();
          await sleepFor(1000);
        } catch (e) {
          Sentry.captureException(e);
          hideModal();
          // Only show error modal for MetaMask (which has known issues)
          if (isMetaMask) {
            setTimeout(() => {
              showModal('state', {
                type: 'error',
                title: "Couldn't Switch Chain",
                description: `Failed to switch to ${chainConfig.name}. Please switch manually in your wallet and try again.`,
                onSuccess: () => {
                  hideModal();
                  navigation.goBack();
                },
                onFailure: () => {
                  hideModal();
                  navigation.goBack();
                },
              });
            }, MODAL_HIDE_TIMEOUT_250);
          }
          throw e;
        }
      }
      try {
        const hash = await handleTransaction(
          transactionToBeSigned,
          chainConfig,
        );
        return hash as `0x${string}`;
      } catch (error: unknown) {
        Sentry.captureException(error);
        showModal('state', {
          type: 'error',
          title: 'Transaction Failed',
          description: (error as Error).message,
          onSuccess: () => {
            hideModal();
            navigation.goBack();
          },
          onFailure: () => {
            hideModal();
            navigation.goBack();
          },
        });
        throw error;
      }
    } else {
      return await signAndSendEthTransaction({
        rpc,
        transactionToBeSigned,
      });
    }
  };

  const signAndSendEthTransaction = async ({
    rpc,
    transactionToBeSigned,
  }: {
    rpc: string;
    transactionToBeSigned: EthTransactionPayload;
  }): Promise<`0x${string}`> => {
    const client = createWalletClient({
      transport: http(rpc),
    });
    const privateKey = await loadPrivateKeyFromKeyChain(
      false,
      hdWalletContext.state.pinValue,
    );
    if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
      const account = privateKeyToAccount(privateKey as Hex);

      const hash = await client.sendTransaction({
        chain: null,
        account,
        ...transactionToBeSigned,
      });
      return hash;
    } else {
      throw new Error('Authentication failed, unable to retrieve private key');
    }
  };

  const signTypedDataEth = async ({
    dataToBeSigned,
  }: {
    dataToBeSigned: SignTypedDataParameters;
  }): Promise<string> => {
    const privateKey = await loadPrivateKeyFromKeyChain(
      false,
      hdWalletContext.state.pinValue,
    );
    const account = privateKeyToAccount(privateKey as Hex);
    const signature = await account.signTypedData(dataToBeSigned);
    return signature;
  };

  return {
    signEthTransaction,
    signApprovalEthereum,
    sendNativeCoin,
    sendToken,
    signTypedDataEth,
  };
}
