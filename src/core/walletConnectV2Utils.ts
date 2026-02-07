import { getSdkError } from '@walletconnect/utils';
import { WalletKit, IWalletKit } from '@reown/walletkit';
import { Core } from '@walletconnect/core';
import * as Sentry from '@sentry/react-native';
import { wcDebug, wcError, redactWcUri } from './walletConnectDebug';

export let web3wallet: IWalletKit;

export async function createWeb3Wallet(projectId: string) {
  try {
    wcDebug('WalletKit', 'createWeb3Wallet() called', {
      hasProjectId: Boolean(projectId),
      projectIdSuffix: projectId ? projectId.slice(-6) : '',
      relayUrl: 'wss://relay.walletconnect.com',
      customStoragePrefix: 'walletkit',
    });

    // Create Core with WalletKit's dedicated project ID and custom storage prefix
    // The customStoragePrefix ensures WalletKit uses separate storage keys from AppKit
    // WalletKit will use "walletkit@2:*" keys, AppKit uses default "wc@2:*" keys
    const core = new Core({
      projectId,
      relayUrl: 'wss://relay.walletconnect.com',
      customStoragePrefix: 'walletkit',
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

    wcDebug('WalletKit', 'WalletKit initialized', {
      pairingCount: web3wallet?.core?.pairing?.getPairings?.()?.length,
      sessionCount: Object.keys(web3wallet?.getActiveSessions?.() ?? {}).length,
    });

    return web3wallet;
  } catch (e) {
    console.error('[WalletConnectV2Utils] Error creating web3wallet:', e);
    wcError('WalletKit', 'WalletKit init failed', e as any);
    Sentry.captureException(e);
    throw e;
  }
}

export async function web3WalletPair({ uri }: { uri: string }) {
  try {
    if (!web3wallet) {
      throw new Error('web3wallet not initialized');
    }
    wcDebug('WalletKit', 'Pairing requested', {
      uri: redactWcUri(uri),
      hasRelayProtocol: uri.includes('relay-protocol'),
    });
    const pairPromise = await web3wallet.core.pairing.pair({ uri });
    wcDebug('WalletKit', 'Pairing promise created', {
      expiry: (pairPromise as any)?.expiry,
      topic: (pairPromise as any)?.topic,
    });
    return pairPromise;
  } catch (e) {
    console.error('[WalletConnectV2Utils] Error pairing:', e);
    wcError('WalletKit', 'Pairing failed', e as any);
    throw e;
  }
}

export const deleteTopic = async (topic: string) => {
  try {
    wcDebug('WalletKit', 'Disconnecting session/topic', { topic });
    await web3wallet.disconnectSession({
      topic,
      reason: getSdkError('USER_DISCONNECTED'),
    });
    wcDebug('WalletKit', 'Disconnected session/topic', { topic });
  } catch (e) {
    console.error('[WalletConnectV2Utils] Error disconnecting session:', e);
    wcError('WalletKit', 'Disconnect failed', { topic, error: e });
    throw e;
  }
};
