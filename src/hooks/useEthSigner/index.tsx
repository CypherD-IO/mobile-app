import { useNavigation } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import {
  getChainId,
  switchChain,
  waitForTransactionReceipt,
} from '@wagmi/core';
import { useWalletInfo } from '@web3modal/wagmi-react-native';
import { get } from 'lodash';
import { useContext } from 'react';
import { Linking, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSendTransaction, useSwitchChain, useWriteContract } from 'wagmi';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { wagmiConfig } from '../../components/wagmiConfigBuilder';
import { ConnectionTypes } from '../../constants/enum';
import { walletConnectChainData } from '../../constants/server';
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

export default function useEthSigner() {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const { walletInfo } = useWalletInfo();
  const { showModal, hideModal } = useGlobalModalContext();
  const navigation = useNavigation();

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

  // used To Send NativeCoins and to make any contact execution with contract data
  async function sendNativeCoin({
    transactionToBeSigned,
    chainId,
  }: {
    transactionToBeSigned: EthTransaction;
    chainId: number;
  }) {
    const response = await sendTransactionAsync({
      account: transactionToBeSigned.from as `0x${string}`,
      to: transactionToBeSigned.to as `0x${string}`,
      chainId,
      value: BigInt(transactionToBeSigned.value),
      ...(transactionToBeSigned?.data
        ? { data: transactionToBeSigned?.data }
        : {}),
    });
    return response;
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
    const response = await writeContractAsync({
      abi: contractAbiFragment,
      address: transactionToBeSigned.to as `0x${string}`,
      functionName: 'transfer',
      args: [
        transactionToBeSigned.contractParams?.toAddress,
        BigInt(transactionToBeSigned.contractParams?.numberOfTokens as string),
      ],
      chainId,
    });
    return response;
  }

  const signApprovalEthereum = async ({ web3, sendChain, dataToSign }) => {
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
          String(Number(dataToSign.contractParams.numberOfTokens).toFixed(9)),
        );
        const response = await writeContractAsync({
          abi: allowanceApprovalContractABI,
          address: dataToSign.to as `0x${string}`,
          functionName: 'approve',
          args: [dataToSign.contractParams?.toAddress, numberOfTokensInWei],
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
            dataToSign,
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
        }
      }
    } catch (e: any) {
      throw new Error(e);
    }
  };

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
        if (
          Platform.OS === 'android' &&
          walletInfo?.name === 'MetaMask Wallet'
        ) {
          setTimeout(() => {
            showModal('state', {
              type: 'warning',
              title: `Approve transaction`,
              description: `Incase you don't see a redirection to ${walletInfo?.name}, please open ${walletInfo?.name}`,
              onSuccess: () => {
                hideModal();
                redirectToMetaMask();
              },
              onFailure: hideModal(),
            });
          }, 2000);
        }
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
        hideModal();
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
