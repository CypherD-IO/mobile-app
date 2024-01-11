import Web3 from 'web3';
import {
  SendInEvmInterface,
  SendNativeToken,
} from '../../models/sendInEvm.interface';
import { HdWalletContext, getWeb3Endpoint } from '../../core/util';
import { useContext } from 'react';
import { GlobalContext } from '../../core/globalContext';
import {
  CHAIN_OPTIMISM,
  CHAIN_SHARDEUM,
  CHAIN_SHARDEUM_SPHINX,
  Chain,
  ChainConfigMapping,
  ChainNameMapping,
} from '../../constants/server';
import { getConnectionType } from '../../core/asyncStorage';
import { ConnectionTypes } from '../../constants/enum';
import * as Sentry from '@sentry/react-native';
import useGasService from '../useGasService';
import analytics from '@react-native-firebase/analytics';
import Toast from 'react-native-toast-message';
import { get } from 'lodash';

export default function useTransactionManager() {
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const OP_ETH_ADDRESS = '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000';
  const { estimateGasForEvm } = useGasService();

  function isNativeCurrency(
    fromChain: Chain,
    contractAddress: string,
  ): boolean {
    const isNative = [
      fromChain.native_token_address,
      fromChain.secondaryAddress,
    ].includes(contractAddress);
    return isNative;
  }

  const decideGasLimitBasedOnTypeOfToAddress = (
    code: string,
    gasLimit: number,
  ): number => {
    if (gasLimit > 21000) {
      if (code !== '0x') {
        return 2 * gasLimit;
      }
      return gasLimit;
    } else {
      return 21000;
    }
  };

  const sendNativeToken = async ({
    web3,
    chain,
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
  }: SendNativeToken) => {
    const connectionType = await getConnectionType();
    if (!connectionType || connectionType === ConnectionTypes.SEED_PHRASE) {
      const ethereum = hdWalletContext.state.wallet.ethereum;
      const fromAddress = ethereum.address;
      try {
        const code = await web3.eth.getCode(toAddress);
        let { gasLimit, gasPrice } = await estimateGasForEvm({
          web3,
          chain,
          fromAddress,
          toAddress,
          amountToSend,
          contractAddress,
          contractDecimals,
        });
        gasLimit = decideGasLimitBasedOnTypeOfToAddress(code, gasLimit);
        const tx = {
          from: ethereum.address,
          to: toAddress,
          gasPrice,
          value: web3.utils.toWei(amountToSend, 'ether'),
          gas: web3.utils.toHex(gasLimit),
        };

        let txHash: string;
        const signedTransaction = await web3.eth.accounts.signTransaction(
          tx,
          ethereum.privateKey,
        );
        const hash = await new Promise((resolve, reject) => {
          void web3.eth
            .sendSignedTransaction(String(signedTransaction.rawTransaction))
            .once('transactionHash', function (hash: string) {
              txHash = hash;
              console.log('🚀 ~ txHash:', txHash);
              Toast.show({
                type: 'info',
                text1: 'Transaction Hash',
                text2: hash,
                position: 'bottom',
              });
              void analytics().logEvent('bridge_transaction_receipt', {
                from: fromAddress,
                to: toAddress,
                gasPrice,
                data: '',
                value: amountToSend,
                gas: gasLimit,
                hash,
                chain,
              });
            })
            .once('receipt', () => {
              // expression expected
            })
            .on('confirmation', () => {
              // expression expected
            })
            .on('error', function (error: { message: string }) {
              if (!txHash) {
                void analytics().logEvent('bridge_transaction_receipt_failed', {
                  from: fromAddress,
                  to: toAddress,
                  value: amountToSend,
                  message: 'Insufficient funds for gas',
                });
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
                      console.log(receipt);
                      resolve(receipt.transactionHash);
                    } else {
                      void analytics().logEvent(
                        'bridge_transaction_receipt_failed',
                        {
                          from: fromAddress,
                          to: toAddress,
                          value: amountToSend,
                          hash: receipt.transactionHash,
                          message: JSON.stringify(receipt),
                        },
                      );
                      Sentry.captureException(error);
                      Toast.show({
                        type: 'error',
                        text1: 'Transaction Error',
                        text2: error.message,
                        position: 'bottom',
                      });
                    }
                    console.log('🚀 ~ void ~ receipt:', receipt);
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
              void analytics().logEvent('bridge_transaction_receipt', {
                from: fromAddress,
                to: toAddress,
                gasPrice,
                data: '',
                value: amountToSend,
                gas: gasLimit,
                hash: receipt.transactionHash,
                chain,
              });
              console.log(receipt);
              resolve(receipt.transactionHash);
            });
        });
        console.log(hash);
        return hash;
      } catch (err: any) {
        // TODO (user feedback): Give feedback to user.
        throw new Error(err);
      }
    }
  };

  const sendEvmToken = async ({
    chain,
    amountToSend,
    toAddress,
    contractAddress,
    contractDecimals,
    symbol,
  }: SendInEvmInterface): Promise<{
    isError: boolean;
    hash?: string;
    error?: any;
  }> => {
    const chainConfig = get(
      ChainConfigMapping,
      String(get(ChainNameMapping, chain)),
    );
    const web3 = new Web3(getWeb3Endpoint(chainConfig, globalContext));
    if (
      (contractAddress.toLowerCase() === OP_ETH_ADDRESS &&
        chain === CHAIN_OPTIMISM.backendName) ||
      ((chain === CHAIN_SHARDEUM.backendName ||
        chain === CHAIN_SHARDEUM_SPHINX.backendName) &&
        symbol === 'SHM') ||
      isNativeCurrency(chainConfig, contractAddress)
    ) {
      try {
        const hash = await sendNativeToken({
          web3,
          chain,
          amountToSend,
          toAddress,
          contractAddress,
          contractDecimals,
        });
        return { hash: String(hash), isError: false };
      } catch (error) {
        Sentry.captureException(error);
        return { isError: true, error };
      }
    } else {
    }
    return { hash: '', isError: false }; // fallback
  };

  return { sendEvmToken };
}
