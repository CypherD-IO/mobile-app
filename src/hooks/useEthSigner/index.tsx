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
import { useAccount } from 'wagmi';
import { walletConnectChainData } from '../../constants/server';
import { get } from 'lodash';
import { createWalletClient, custom } from 'viem';
import { loadPrivateKeyFromKeyChain } from '../../core/Keychain';

export default function useEthSigner() {
  const { connector } = useAccount();
  const { connectionType } = useConnectionManager();
  const hdWalletContext = useContext<any>(HdWalletContext);

  const signEthTransaction = async ({
    web3,
    chain,
    transactionToBeSigned,
  }: RawTransaction) => {
    const ethereum = hdWalletContext.state.wallet.ethereum;
    try {
      if (connectionType === ConnectionTypes.WALLET_CONNECT) {
        const chainConfig = get(walletConnectChainData, chain).chainConfig;
        const walletClient = createWalletClient({
          account: transactionToBeSigned.from,
          chain: chainConfig,
          transport: custom(await connector?.getProvider()),
        });
        try {
          await walletClient.switchChain({ id: chainConfig.id });
        } catch (e) {}
        transactionToBeSigned['data'] = '0x';
        const response = await walletClient.sendTransaction(
          transactionToBeSigned,
        );
        return response;
      } else {
        console.log('privatekey needed in use eth signer');
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
