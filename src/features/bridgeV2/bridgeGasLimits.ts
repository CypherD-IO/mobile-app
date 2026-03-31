/**
 * Pre-quote gas limit tables and constants for the bridge Max button.
 *
 * These are conservative estimates used *before* a quote is available so the UI
 * can immediately show a Max amount that leaves enough native balance for fees.
 * After a quote arrives the actual gas cost from the response should be used for
 * final validation.
 *
 * All values are in the chain's gas-unit denomination (wei for EVM, lamports for
 * Solana, utoken for Cosmos) and use BigInt to avoid JS number overflow.
 */

// ─── EVM Gas Limits (per chain, per operation) ──────────────────────

type ChainGasMap = Record<number | 'fallback', number>;

export const EVM_GAS_LIMITS: Record<string, ChainGasMap> = {
  lifi_swap: {
    1: 500_000,
    56: 400_000,
    137: 500_000,
    43114: 400_000,
    100: 600_000,
    10: 500_000,
    8453: 500_000,
    42161: 3_500_000,
    324: 3_000_000,
    59144: 600_000,
    fallback: 600_000,
  },
  lifi_bridge: {
    1: 700_000,
    56: 600_000,
    137: 700_000,
    43114: 600_000,
    100: 700_000,
    10: 700_000,
    8453: 700_000,
    42161: 5_000_000,
    fallback: 800_000,
  },
  skipgo_evm_swap: {
    1: 400_000,
    8453: 400_000,
    10: 400_000,
    42161: 3_000_000,
    137: 400_000,
    fallback: 500_000,
  },
  skipgo_evm_bridge: {
    1: 500_000,
    8453: 500_000,
    10: 500_000,
    42161: 3_500_000,
    137: 500_000,
    fallback: 600_000,
  },
};

export const EVM_GAS_MULTIPLIERS: Record<string, number> = {
  lifi_swap: 1.3,
  lifi_bridge: 1.3,
  skipgo_evm_swap: 1.2,
  skipgo_evm_bridge: 1.2,
  send: 1.0,
};

/** OP-stack chain IDs that incur an L1 data fee on top of L2 gas. */
export const OP_STACK_CHAIN_IDS = [10, 8453, 7777777] as const;

export function isOpStackChain(chainId: number): boolean {
  return (OP_STACK_CHAIN_IDS as readonly number[]).includes(chainId);
}

/**
 * Look up the pre-quote gas limit for a given operation + EVM chain.
 * Returns the limit as a BigInt.
 */
export function getEvmGasLimit(
  operationType: string,
  chainIdNum: number,
): bigint {
  const table = EVM_GAS_LIMITS[operationType];
  if (!table) return BigInt(EVM_GAS_LIMITS.lifi_bridge.fallback);
  const limit = table[chainIdNum] ?? table.fallback;
  return BigInt(limit);
}

export function getEvmGasMultiplier(operationType: string): number {
  return EVM_GAS_MULTIPLIERS[operationType] ?? 1.3;
}

// ─── Cosmos Pre-Route Gas Estimates ─────────────────────────────────

type CosmosGasEntry = { swapGas: number; ibcGas: number; multiplier: number };

export const COSMOS_GAS_ESTIMATES: Record<string, CosmosGasEntry> = {
  'osmosis-1': { swapGas: 500_000, ibcGas: 200_000, multiplier: 1.5 },
  'cosmoshub-4': { swapGas: 300_000, ibcGas: 200_000, multiplier: 1.5 },
  'noble-1': { swapGas: 200_000, ibcGas: 200_000, multiplier: 1.3 },
  'neutron-1': { swapGas: 500_000, ibcGas: 200_000, multiplier: 1.5 },
  'injective-1': { swapGas: 500_000, ibcGas: 200_000, multiplier: 1.5 },
  'pacific-1': { swapGas: 300_000, ibcGas: 200_000, multiplier: 1.5 },
  'dydx-mainnet-1': { swapGas: 300_000, ibcGas: 200_000, multiplier: 1.5 },
};

const COSMOS_FALLBACK: CosmosGasEntry = {
  swapGas: 500_000,
  ibcGas: 200_000,
  multiplier: 1.5,
};

export function getCosmosGasEstimate(
  chainId: string,
  isSwap: boolean,
): { gasUnits: bigint; multiplier: number } {
  const entry = COSMOS_GAS_ESTIMATES[chainId] ?? COSMOS_FALLBACK;
  return {
    gasUnits: BigInt(isSwap ? entry.swapGas : entry.ibcGas),
    multiplier: entry.multiplier,
  };
}

// ─── Solana Constants ───────────────────────────────────────────────

/** Solana native SOL mint used in LiFi quote payloads. */
export const SOLANA_NATIVE_LIFI_DENOM =
  '11111111111111111111111111111111' as const;

/** wSOL mint address. */
export const WSOL_MINT =
  'So11111111111111111111111111111111111111112' as const;

/** Protocol constant: 5000 lamports per signature. */
export const SOL_BASE_FEE_LAMPORTS = 5_000n;

/** Rent-exempt minimum for a single SPL Token ATA (~0.00204 SOL). */
export const SOL_ATA_RENT_LAMPORTS = 2_039_280n;

/** Wallet must never go below this floor to stay rent-exempt. */
export const SOL_WALLET_RENT_EXEMPT = 890_880n;

/** Small safety buffer for LiFi CPI overhead. */
export const SOL_LIFI_FIXED_BUFFER = 25_000n;

/** Fallback priority fee in micro-lamports per CU if RPC fails. */
export const SOL_PRIORITY_FEE_FALLBACK = 1_000n;

/** Approximate CU for a LiFi swap on Solana. */
export const SOL_LIFI_SWAP_CU = 800_000n;

/** CU for a plain SOL send. */
export const SOL_SEND_CU = 200n;

/** CU for an SPL token send. */
export const SOL_SPL_SEND_CU = 30_000n;
