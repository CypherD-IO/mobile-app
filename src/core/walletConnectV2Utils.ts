/* eslint-disable no-useless-catch */
import { Core } from '@walletconnect/core';
import { getSdkError } from '@walletconnect/utils';
import { WalletKit, IWalletKit } from '@reown/walletkit';
import * as Sentry from '@sentry/react-native';
export let web3wallet: IWalletKit;
export let core: any;

export async function createWeb3Wallet(projectId: string) {
  try {
    core = new Core({
      // logger: 'debug',
      projectId,
      relayUrl: 'wss://relay.walletconnect.com', // Note the .com instead of .org
      // relayUrl: relayerRegionURL ?? process.env.NEXT_PUBLIC_RELAY_URL
    });

    web3wallet = await WalletKit.init({
      core,
      metadata: {
        name: 'Cypher Wallet',
        description: 'Wallet for WalletConnect',
        url: 'https://app.cypherhq.io/',
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
