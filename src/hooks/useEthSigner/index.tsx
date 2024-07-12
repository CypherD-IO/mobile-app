import Toast from 'react-native-toast-message';
import * as Sentry from '@sentry/react-native';
import {
  EthTransaction,
  RawTransaction,
} from '../../models/ethSigner.interface';
import { useContext } from 'react';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  sleepFor,
} from '../../core/util';
import useConnectionManager from '../useConnectionManager';
import { ConnectionTypes } from '../../constants/enum';
import {
  useSwitchChain,
  useSendTransaction,
  useSignMessage,
  useWriteContract,
} from 'wagmi';
import { walletConnectChainData } from '../../constants/server';
import { get, set } from 'lodash';
import { Address, createWalletClient, custom } from 'viem';
import { loadPrivateKeyFromKeyChain } from '../../core/Keychain';
import { utf8ToHex } from 'web3-utils';
import {
  waitForTransactionReceipt,
  getChainId,
  switchChain,
} from '@wagmi/core';
import { useWalletInfo } from '@web3modal/wagmi-react-native';
import { allowanceApprovalContractABI } from '../../core/swap';
import { getConnectionType } from '../../core/asyncStorage';
import { ethers } from 'ethers';
import { wagmiConfig } from '../../components/wagmiConfigBuilder';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';

export default function useEthSigner() {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const { walletInfo } = useWalletInfo();
  const { showModal, hideModal } = useGlobalModalContext();

  const getTransactionReceipt = async (
    hash: `0x${string}`,
    chain: number,
  ): Promise<string> => {
    return new Promise(async resolve => {
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
              .once('receipt', function (receipt: unknown) {
                resolve(receipt?.transactionHash);
              })
              .on('confirmation', () => {
                // expression expected
              })
              .on('error', function (error: any) {
                if (!txHash) {
                  reject(error.message ?? error);
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
      throw new Error(e.message ?? e);
    }
  };

  return {
    signEthTransaction,
    signApprovalEthereum,
    sendNativeCoin,
    sendToken,
  };
}
