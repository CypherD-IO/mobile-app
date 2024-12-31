import { useNavigation } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import {
  getChainId,
  switchChain,
  waitForTransactionReceipt,
  estimateGas,
  getGasPrice,
  getWalletClient,
  getBlockNumber,
  getBlock,
  getPublicClient,
  watchPendingTransactions,
  getTransaction,
  watchBlocks,
} from '@wagmi/core';
import { useWalletInfo } from '@reown/appkit-wagmi-react-native';
import { get } from 'lodash';
import { useContext } from 'react';
import { Linking, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import {
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
  WagmiContext,
} from 'wagmi';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { ConnectionTypes } from '../../constants/enum';
import { Chain, walletConnectChainData } from '../../constants/server';
import { getConnectionType } from '../../core/asyncStorage';
import { MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import { loadPrivateKeyFromKeyChain } from '../../core/Keychain';
import { allowanceApprovalContractABI } from '../../core/swap';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  sleepFor,
} from '../../core/util';
import {
  EthTransaction,
  RawTransaction,
} from '../../models/ethSigner.interface';
import { TransactionResponse } from 'ethers';
import { Hash } from 'viem';
import { ChainIdToBackendNameMapping } from '../../constants/data';
import useAxios from '../../core/HttpRequest';

export default function useEthSigner() {
  const wagmiConfig = useContext(WagmiContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync, sendTransaction } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
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
            `/v1/txn/transactions/${fromAddress}?isUnmarshalQuery=true&blockchain=${get(ChainIdToBackendNameMapping, [String(chainId)])}&toAddress=${toAddress}&fromBlock=${startBlockNumber}${contractAddress ? `&contractAddress=${contractAddress}` : ''}`,
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
    transactionToBeSigned: EthTransaction;
    chainId: number;
  }) {
    const hash = await sendTransactionAsync({
      account: transactionToBeSigned.from as `0x${string}`,
      to: transactionToBeSigned.to as `0x${string}`,
      chainId,
      value: BigInt(transactionToBeSigned.value),
      data: transactionToBeSigned?.data ?? '0x',
    });

    return hash;
  }

  async function sendToken({
    transactionToBeSigned,
    chainId,
  }: {
    transactionToBeSigned: EthTransaction;
    chainId: number;
  }) {
    const contractAbiFragment = [
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          {
            name: '_to',
            type: 'address',
          },
          {
            type: 'uint256',
            name: '_tokens',
          },
        ],
        constant: false,
        outputs: [],
        payable: false,
      },
    ];

    const hash = await writeContractAsync({
      abi: contractAbiFragment,
      address: transactionToBeSigned.to as `0x${string}`,
      functionName: 'transfer',
      args: [
        transactionToBeSigned.contractParams?.toAddress,
        BigInt(transactionToBeSigned.contractParams?.numberOfTokens as string),
      ],
      chainId,
    });

    return hash;
  }

  const signApprovalEthereum = async ({
    web3,
    sendChain,
    transactionToBeSigned,
  }: RawTransaction) => {
    try {
      const connectionType = await getConnectionType();
      const connectedChain = getChainId(wagmiConfig);
      if (connectionType === ConnectionTypes.WALLET_CONNECT) {
        const chainConfig = get(walletConnectChainData, sendChain).chainConfig;
        if (
          walletInfo?.name === 'MetaMask Wallet' &&
          connectedChain !== chainConfig.id
        ) {
          try {
            showModal('state', {
              type: 'warning',
              title: `Switch to ${chainConfig.name} chain`,
              description: `Incase you don't see a switch chain popup in your ${walletInfo?.name} wallet, please change the connected chain to ${chainConfig.name} chain.`,
              onSuccess: hideModal,
            });
            const response = await switchChain(wagmiConfig, {
              chainId: chainConfig.id,
            });
            hideModal();
            await sleepFor(1000);
          } catch (e) {}
        }
        const numberOfTokensInWei = web3?.utils.toWei(
          String(
            Number(transactionToBeSigned.contractParams.numberOfTokens).toFixed(
              9,
            ),
          ),
        );
        const response = await writeContractAsync({
          abi: allowanceApprovalContractABI,
          address: transactionToBeSigned.to as `0x${string}`,
          functionName: 'approve',
          args: [
            transactionToBeSigned.contractParams?.toAddress,
            numberOfTokensInWei,
          ],
          chainId: chainConfig.id,
        });
        const receipt = await getTransactionReceipt(response, chainConfig.id);
        return receipt;
      } else {
        const privateKey = await loadPrivateKeyFromKeyChain(
          false,
          hdWalletContext.state.pinValue,
        );
        if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
          const signedTransaction = await web3.eth.accounts.signTransaction(
            transactionToBeSigned,
            privateKey,
          );
          let txHash: string;
          const hash = await new Promise((resolve, reject) => {
            void web3.eth
              .sendSignedTransaction(String(signedTransaction.rawTransaction))
              .once('transactionHash', function (hash: string) {
                txHash = hash;
                Toast.show({
                  type: 'info',
                  text1: 'Transaction Hash',
                  text2: hash,
                  position: 'bottom',
                });
              })
              .once('receipt', () => {
                // expression expected
              })
              .on('confirmation', () => {
                // expression expected
              })
              .on('error', async function (error: any) {
                if (!txHash) {
                  reject(error);
                } else {
                  await sleepFor(5000);
                  const receipt = await web3.eth.getTransactionReceipt(txHash);
                  if (receipt?.status) {
                    Toast.show({
                      type: 'success',
                      text1: 'Transaction',
                      text2: 'Transaction Receipt Received',
                      position: 'bottom',
                    });
                    resolve(receipt.transactionHash);
                  } else {
                    Sentry.captureException(error);
                    Toast.show({
                      type: 'error',
                      text1: 'Transaction Error',
                      text2: error.message,
                      position: 'bottom',
                    });
                  }
                }
              })
              .then(async function (receipt: { transactionHash: string }) {
                Toast.show({
                  type: 'success',
                  text1: 'Transaction',
                  text2: 'Transaction Receipt Received',
                  position: 'bottom',
                });
                resolve(receipt.transactionHash);
              });
          });
          return hash;
        } else {
          throw new Error('Authentication failed');
        }
      }
    } catch (e: any) {
      throw new Error(e);
    }
  };

  async function handleTransaction(
    transactionToBeSigned: EthTransaction,
    chainConfig: Chain,
  ) {
    // Get the current block number before starting
    const startBlockNumber = await getBlockNumber(wagmiConfig);

    // First attempt: Direct transaction
    try {
      let hash;
      if (transactionToBeSigned.contractParams) {
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
          transactionToBeSigned.from,
          transactionToBeSigned.to,
          BigInt(transactionToBeSigned.value),
          chainConfig.id,
          startBlockNumber,
        );

        if (hash) {
          return hash;
        }
      } catch (findError) {}
      throw new Error(
        'Your transaction has been submitted but is yet to be confirmed. Please check your transaction history after some time.',
      );
    }
  }

  const signEthTransaction = async ({
    web3,
    sendChain,
    transactionToBeSigned,
  }: RawTransaction) => {
    try {
      const connectionType = await getConnectionType();
      const connectedChain = getChainId(wagmiConfig);
      if (connectionType === ConnectionTypes.WALLET_CONNECT) {
        const chainConfig = get(walletConnectChainData, sendChain).chainConfig;
        if (
          walletInfo?.name === 'MetaMask Wallet' &&
          connectedChain !== chainConfig.id
        ) {
          try {
            setTimeout(() => {
              const currentConnectedChain = getChainId(wagmiConfig);
              if (
                Platform.OS === 'android' &&
                currentConnectedChain !== chainConfig.id
              ) {
                showModal('state', {
                  type: 'warning',
                  title: `Switch to ${chainConfig.name} chain`,
                  description: `Incase you don't see a switch chain popup in your ${walletInfo?.name} wallet, please change the connected chain to ${chainConfig.name} chain and try again.`,
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
            const response = await switchChainAsync({
              chainId: chainConfig.id,
            });
            await sleepFor(1000);
          } catch (e) {
            Sentry.captureException(e);
            setTimeout(() => {
              showModal('state', {
                type: 'error',
                title: "Couldn't Switch Chain",
                description: e,
                onSuccess: () => {
                  hideModal();
                },
                onFailure: () => {
                  hideModal();
                },
              });
            }, MODAL_HIDE_TIMEOUT_250);
          }
        }
        let hash;
        try {
          hash = await handleTransaction(transactionToBeSigned, chainConfig);
        } catch (error) {
          Sentry.captureException(error);
          showModal('state', {
            type: 'error',
            title: 'Transaction Failed',
            description: error.message,
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
        return hash;
      } else {
        const privateKey = await loadPrivateKeyFromKeyChain(
          false,
          hdWalletContext.state.pinValue,
        );
        if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
          const signedTransaction = await web3.eth.accounts.signTransaction(
            transactionToBeSigned,
            privateKey,
          );
          let txHash: string;

          const hash = await new Promise((resolve, reject) => {
            void web3.eth
              .sendSignedTransaction(String(signedTransaction.rawTransaction))
              .once('transactionHash', function (_hash: string) {
                txHash = _hash;
                Toast.show({
                  type: 'info',
                  text1: 'Transaction Hash',
                  text2: _hash,
                  position: 'bottom',
                });
              })
              .once('receipt', function (receipt: any) {
                resolve(receipt.transactionHash);
              })
              .on('confirmation', () => {
                // expression expected
              })
              .on('error', function (error: any) {
                if (!txHash) {
                  reject(error);
                } else {
                  setTimeout(() => {
                    void (async () => {
                      const receipt =
                        await web3.eth.getTransactionReceipt(txHash);
                      if (receipt?.status) {
                        Toast.show({
                          type: 'success',
                          text1: 'Transaction',
                          text2: 'Transaction Receipt Received',
                          position: 'bottom',
                        });
                        resolve(receipt.transactionHash);
                      } else {
                        Sentry.captureException(error.message ?? error);
                        Toast.show({
                          type: 'error',
                          text1: 'Transaction Error',
                          text2: error.message,
                          position: 'bottom',
                        });
                        reject(error);
                      }
                    })();
                  }, 5000);
                }
              })
              .then(async function (receipt: { transactionHash: string }) {
                Toast.show({
                  type: 'success',
                  text1: 'Transaction',
                  text2: 'Transaction Receipt Received',
                  position: 'bottom',
                });
                resolve(receipt.transactionHash);
              });
          });
          return hash;
        } else {
          throw new Error('Authentication failed');
        }
      }
    } catch (e: any) {
      throw new Error(e);
    }
  };

  return {
    signEthTransaction,
    signApprovalEthereum,
    sendNativeCoin,
    sendToken,
  };
}
