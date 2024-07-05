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
  useAccount,
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
import { waitForTransactionReceipt } from '@wagmi/core';
import { useWalletInfo } from '@web3modal/wagmi-react-native';

export default function useEthSigner() {
  const { connector, chain } = useAccount();
  const { getConnectedType } = useConnectionManager();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const { walletInfo } = useWalletInfo();

  // const getTransactionReceipt = async (
  //   hash: `0x${string}`,
  //   chainId: number,
  // ) => {
  //   return new Promise((resolve) => {
  //     const timeout = new Promise((resolve) =>
  //       setTimeout(() => resolve(hash), 5000)
  //     );

  //     const receiptPromise = (async () => {
  //       try {
  //         const receipt = await waitForTransactionReceipt(config, {
  //           hash,
  //           chainId,
  //         });
  //         return receipt?.transactionHash;
  //       } catch (error) {
  //         return hash;
  //       }
  //     })();

  //     Promise.race([timeout, receiptPromise]).then((result) => {
  //       resolve(result);
  //     });
  //   });
  // };

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

  const signEthTransaction = async ({
    web3,
    sendChain,
    transactionToBeSigned,
  }: RawTransaction) => {
    try {
      const connectionTypeValue = await getConnectedType();
      if (connectionTypeValue === ConnectionTypes.WALLET_CONNECT) {
        const chainConfig = get(walletConnectChainData, sendChain).chainConfig;
        if (
          walletInfo?.name === 'MetaMask Wallet' &&
          chain.id !== chainConfig.id
        ) {
          try {
            await switchChainAsync({ chainId: chainConfig.id });
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
              .once('receipt', () => {
                // expression expected
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

  return { signEthTransaction };
}
