import { Core } from '@walletconnect/core';
import { getSdkError } from '@walletconnect/utils';
import { WalletKit, IWalletKit } from '@reown/walletkit';
import * as Sentry from '@sentry/react-native';

export let web3wallet: IWalletKit;
export let core: any;

export async function createWeb3Wallet(projectId: string) {
  try {
    core = new Core({
      projectId,
      relayUrl: 'wss://relay.walletconnect.com',
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

    try {
      const clientId =
        await web3wallet.engine.signClient.core.crypto.getClientId();
    } catch (error) {
      console.error('Failed to set WalletConnect clientId in state', error);
    }

    return web3wallet;
  } catch (e) {
    console.error('[WalletConnectV2Utils] Error creating web3wallet:', e);
    Sentry.captureException(e);
    throw e;
  }
}

export async function web3WalletPair({ uri }: { uri: string }) {
  try {
    if (!web3wallet) {
      throw new Error('web3wallet not initialized');
    }
    const pairPromise = await web3wallet.core.pairing.pair({ uri });
    return pairPromise;
  } catch (e) {
    console.error('[WalletConnectV2Utils] Error pairing:', e);
    throw e;
  }
}

export const deleteTopic = async (topic: string) => {
  try {
    await web3wallet.disconnectSession({
      topic,
      reason: getSdkError('USER_DISCONNECTED'),
    });
  } catch (e) {
    console.error('[WalletConnectV2Utils] Error disconnecting session:', e);
    throw e;
  }
};
