import Toast from 'react-native-toast-message';
import * as Sentry from '@sentry/react-native';
import { EthTransaction, RawTransaction } from '../../models/ethSigner.interface';
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

export default function useEthSigner() {
  const { connector, chain } = useAccount();
  const { connectionType } = useConnectionManager();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();

  const getTransactionReceipt = async (
    hash: `0x${string}`,
    chainId: number,
  ) => {
    return new Promise(async resolve => {
      let hashFromReceipt;
      try {
        const receipt = await waitForTransactionReceipt(config, {
          hash,
          chainId,
        });
        hashFromReceipt = receipt?.transactionHash;
      } catch (error) {
        hashFromReceipt = hash;
      }
      resolve(hashFromReceipt);
    });
  };

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
    const hash = await getTransactionReceipt(response, chainId);
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
    const response = await writeContractAsync({
      abi: contractAbiFragment,
      address: transactionToBeSigned.to as `0x${string}`,
      functionName: 'transfer',
      args: [
        transactionToBeSigned.contractParams?.toAddress,
        BigInt(transactionToBeSigned.contractParams?.numberOfTokens as string),
      ],
      chainId: chainId,
    });
    const hash = await getTransactionReceipt(response, chainId);
    return hash;
  }

  const signEthTransaction = async ({
    web3,
    sendChain,
    transactionToBeSigned,
  }: RawTransaction) => {
    try {
      if (connectionType === ConnectionTypes.WALLET_CONNECT) {
        console.log('connectors : ', connector);
        // console.log('in sign eth txn ::::::::::: ');
        // const provider = await connector?.getProvider();
        // console.log('🚀 ~ signConnectionMessage ~ provider:', provider);
        // const signer = provider?.getSigner();
        // console.log('🚀 ~ useEthSigner ~ signer:', signer);
        console.log('🚀 ~ useEthSigner ~ sendChain:', sendChain);
        const chainConfig = get(walletConnectChainData, sendChain).chainConfig;
        console.log('🚀 ~ useEthSigner ~ chainConfig:', chainConfig);
        // const walletClient = createWalletClient({
        //   account: transactionToBeSigned.from,
        //   chain: chainConfig,
        //   transport: custom(await connector?.getProvider()),
        // });
        console.log({ 'current chain ids': chain.id, config: chainConfig.id });
        if (chain.id !== chainConfig.id) {
          try {
            // await walletClient.switchChain({ id: chainConfig.id });
            console.log('switch chain called');
            await switchChainAsync({ chainId: chainConfig.id });
            console.log('switch chain done .......');
          } catch (e) {}
        }
        // set(transactionToBeSigned, 'data', '0x');
        console.log('sending txn', {
          account: transactionToBeSigned.from as `0x${string}}`,
          to: transactionToBeSigned.to as `0x${string}}`,
          chainId: chainConfig.id,
          gas: BigInt(transactionToBeSigned.gas),
          value: BigInt(transactionToBeSigned.value),
          ...(transactionToBeSigned.gasPrice
            ? { gasPrice: BigInt(transactionToBeSigned.gasPrice) }
            : {}),
          ...(transactionToBeSigned.maxFeePerGas
            ? { maxFeePerGas: BigInt(transactionToBeSigned.maxFeePerGas) }
            : {}),
          ...(transactionToBeSigned.maxPriorityFeePerGas
            ? { gasPrice: BigInt(transactionToBeSigned.maxPriorityFeePerGas) }
            : {}),
        });
        // const response = await walletClient.sendTransaction(
        //   transactionToBeSigned as any,
        // );
        // const hash = await sendTransactionAsync({
        //   account: transactionToBeSigned.from as `0x${string}`,
        //   to: transactionToBeSigned.to as `0x${string}`,
        //   chainId: chainConfig.id,
        //   gas: BigInt(transactionToBeSigned.gas),
        //   value: BigInt(transactionToBeSigned.value),
          // ...(transactionToBeSigned.gasPrice
          //   ? { gasPrice: BigInt(transactionToBeSigned.gasPrice) }
          //   : {}),
          // ...(transactionToBeSigned.maxFeePerGas
          //   ? { maxFeePerGas: BigInt(transactionToBeSigned.maxFeePerGas) }
          //   : {}),
          // ...(transactionToBeSigned.maxPriorityFeePerGas
          //   ? {
          //       maxPriorityFeePerGas: BigInt(
          //         transactionToBeSigned.maxPriorityFeePerGas,
          //       ),
          //     }
          //   : {}),
        // });
        // console.log('resposne : ', response);
        // const rawMsg = utf8ToHex(JSON.stringify(transactionToBeSigned));
        // console.log('🚀 ~ rawMsg:', rawMsg);
        // const signature = await signMessageAsync({
        //   message: { raw: rawMsg as `0x${string}` },
        // });
        // const signature = await signer.signTransaction(transactionToBeSigned);
        // console.log('snd txn rsp : ', signature);
        // let txHash: string;
        // const hash = await new Promise((resolve, reject) => {
        //   void web3.eth
        //     .sendSignedTransaction(String(signature))
        //     .once('transactionHash', function (hash: string) {
        //       txHash = hash;
        //       Toast.show({
        //         type: 'info',
        //         text1: 'Transaction Hash',
        //         text2: hash,
        //         position: 'bottom',
        //       });
        //     })
        //     .once('receipt', () => {
        //       // expression expected
        //     })
        //     .on('confirmation', () => {
        //       // expression expected
        //     })
        //     .on('error', function (error: any) {
        //       if (!txHash) {
        //         reject(error);
        //       } else {
        //         setTimeout(() => {
        //           void (async () => {
        //             const receipt =
        //               await web3.eth.getTransactionReceipt(txHash);
        //             if (receipt?.status) {
        //               Toast.show({
        //                 type: 'success',
        //                 text1: 'Transaction',
        //                 text2: 'Transaction Receipt Received',
        //                 position: 'bottom',
        //               });
        //               resolve(receipt.transactionHash);
        //             } else {
        //               Sentry.captureException(error);
        //               Toast.show({
        //                 type: 'error',
        //                 text1: 'Transaction Error',
        //                 text2: error.message,
        //                 position: 'bottom',
        //               });
        //             }
        //           })();
        //         }, 5000);
        //       }
        //     })
        //     .then(async function (receipt: { transactionHash: string }) {
        //       Toast.show({
        //         type: 'success',
        //         text1: 'Transaction',
        //         text2: 'Transaction Receipt Received',
        //         position: 'bottom',
        //       });
        //       resolve(receipt.transactionHash);
        //     });
        // });
        // console.log('hash : ', hash);
        let hash;
        await sleepFor(1000);
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
        console.log('hash ::::: ', hash);
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
          console.log('signed txn : ', signedTransaction);
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
                        Sentry.captureException(error);
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
      throw new Error(e);
    }
  };

  return { signEthTransaction };
}
