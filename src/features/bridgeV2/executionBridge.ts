import { BridgeV2Executors } from './hooks/useBridgeV2';

/**
 * Module-level registry for bridge execution functions.
 * Populated by BridgeV2ExecutionRegistrar (inside WagmiProvider tree)
 * and consumed by useBridgeV2Sheet (outside WagmiProvider tree).
 * This avoids pulling wagmi-dependent hooks into components that
 * render outside the WagmiProvider context boundary.
 */
const executorsRef: { current: BridgeV2Executors | null } = { current: null };

export function registerBridgeExecutors(executors: BridgeV2Executors): void {
  executorsRef.current = executors;
}

export function getBridgeExecutors(): BridgeV2Executors | null {
  return executorsRef.current;
}
