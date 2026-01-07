/**
 * Chain backend names.
 *
 * NOTE:
 * This enum is extracted from `src/constants/server.tsx` to avoid runtime circular
 * dependencies like:
 * `constants/server.tsx` -> `models/defi.interface.ts` -> `constants/server.tsx`
 *
 * React Native 0.83 / Metro 0.83 is stricter about module initialization order,
 * so previously "harmless" cycles can surface as `undefined` exports at runtime.
 */
export enum ChainBackendNames {
  ALL = 'ALL',
  ETH = 'ETH',
  POLYGON = 'POLYGON',
  AVALANCHE = 'AVALANCHE',
  ARBITRUM = 'ARBITRUM',
  OPTIMISM = 'OPTIMISM',
  BSC = 'BSC',
  COSMOS = 'COSMOS',
  OSMOSIS = 'OSMOSIS',
  NOBLE = 'NOBLE',
  COREUM = 'COREUM',
  INJECTIVE = 'INJECTIVE',
  ZKSYNC_ERA = 'ZKSYNC_ERA',
  BASE = 'BASE',
  SOLANA = 'SOLANA',
  HYPERLIQUID = 'HYPERLIQUID',
  BASE_SEPOLIA = 'BASE_SEPOLIA',
}


