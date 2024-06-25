import Toast from 'react-native-toast-message';
import * as Sentry from '@sentry/react-native';
import { RawTransaction } from '../../models/ethSigner.interface';
import { useContext } from 'react';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import useConnectionManager from '../useConnectionManager';
import { ConnectionTypes } from '../../constants/enum';
import { useAccount, useSwitchChain } from 'wagmi';
import { walletConnectChainData } from '../../constants/server';
import { get, set } from 'lodash';
import { createWalletClient, custom } from 'viem';
import { loadPrivateKeyFromKeyChain } from '../../core/Keychain';

export default function useEthSigner() {
  const { connector, chain } = useAccount();
  const { connectionType } = useConnectionManager();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { switchChainAsync } = useSwitchChain();

  const signEthTransaction = async ({
    web3,
    sendChain,
    transactionToBeSigned,
  }: RawTransaction) => {
    try {
      if (connectionType === ConnectionTypes.WALLET_CONNECT) {
        const chainConfig = get(walletConnectChainData, sendChain).chainConfig;
        const walletClient = createWalletClient({
          account: transactionToBeSigned.from,
          chain: chainConfig,
          transport: custom(await connector?.getProvider()),
        });
        if (chain.id !== chainConfig.id) {
          try {
            // await walletClient.switchChain({ id: chainConfig.id });
            await switchChainAsync({ chainId: chainConfig.id });
          } catch (e) {}
        }
        set(transactionToBeSigned, 'data', '0x');
        const response = await walletClient.sendTransaction(
          transactionToBeSigned as any,
        );
        return response;
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
