/* eslint-disable no-useless-catch */
import { Core } from '@walletconnect/core';
import { ICore } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { Web3Wallet, IWeb3Wallet } from '@walletconnect/web3wallet';
import * as Sentry from '@sentry/react-native';
export let web3wallet: IWeb3Wallet;
export let core: ICore;

export async function createWeb3Wallet(projectId: string) {
  console.log('🚀 ~ createWeb3Wallet ~ createWeb3Wallet:');

  try {
    core = new Core({
      // logger: 'debug',
      projectId,
      // relayUrl: relayerRegionURL ?? process.env.NEXT_PUBLIC_RELAY_URL
    });

    web3wallet = await Web3Wallet.init({
      core,
      metadata: {
        name: 'Cypher Wallet',
        description: 'Wallet for WalletConnect',
        url: 'https://app.cypherwallet.io/',
        icons: ['https://public.cypherd.io/icons/appLogo.png'],
      },
    });
    return web3wallet;
  } catch (e) {
    Sentry.captureException(e);
  }
}

export async function web3WalletPair({ uri }: { uri: string }) {
  try {
    const pairPromise = await web3wallet.core.pairing.pair({ uri });
    return pairPromise;
  } catch (e) {
    throw e;
  }
}

export const deleteTopic = async (topic: string) => {
  await web3wallet.disconnectSession({
    topic,
    reason: getSdkError('USER_DISCONNECTED'),
  });
};
