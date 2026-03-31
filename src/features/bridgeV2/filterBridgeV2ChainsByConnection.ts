import { ConnectionTypes } from '../../constants/enum';
import type { BridgeV2Chain } from './types';

/**
 * Restricts bridge chain picker by login / import method — aligned with
 * {@link getAvailableChains} / funding flows:
 * - Seed phrase → all chains returned by the bridge API
 * - WalletConnect (both variants) → EVM only
 * - Private key import → EVM only
 * - Social login (EVM) → EVM only
 * - Social login (Solana) → Solana only
 */
export function filterBridgeV2ChainsByConnectionType(
  chains: BridgeV2Chain[],
  connectionType: ConnectionTypes | null | undefined,
): BridgeV2Chain[] {
  if (
    !connectionType ||
    connectionType === ConnectionTypes.SEED_PHRASE
  ) {
    return chains;
  }

  if (
    connectionType === ConnectionTypes.WALLET_CONNECT ||
    connectionType === ConnectionTypes.WALLET_CONNECT_WITHOUT_SIGN ||
    connectionType === ConnectionTypes.PRIVATE_KEY ||
    connectionType === ConnectionTypes.SOCIAL_LOGIN_EVM
  ) {
    return chains.filter(c => c.chainType === 'evm');
  }

  if (connectionType === ConnectionTypes.SOCIAL_LOGIN_SOLANA) {
    return chains.filter(c => c.chainType === 'solana');
  }

  return chains;
}
