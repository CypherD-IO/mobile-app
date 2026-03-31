/**
 * Max-spendable calculation for the bridge Max button.
 *
 * Computes the largest `amountIn` (in the token's smallest unit, as a string)
 * that can be bridged while reserving enough native balance to cover gas fees.
 *
 * All arithmetic uses BigInt to prevent JS number overflow.  Conversion between
 * human-readable decimals and on-chain integers uses viem's `formatUnits`.
 */

import { formatUnits, parseGwei } from 'viem';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import {
  getEvmGasLimit,
  getEvmGasMultiplier,
  isOpStackChain,
  getCosmosGasEstimate,
  WSOL_MINT,
  SOL_BASE_FEE_LAMPORTS,
  SOL_ATA_RENT_LAMPORTS,
  SOL_WALLET_RENT_EXEMPT,
  SOL_LIFI_FIXED_BUFFER,
  SOL_PRIORITY_FEE_FALLBACK,
  SOL_LIFI_SWAP_CU,
} from './bridgeGasLimits';

// ─── Helpers ────────────────────────────────────────────────────────

/** Integer ceiling division for BigInt: ceil(a / b). */
function ceilDiv(a: bigint, b: bigint): bigint {
  if (b === 0n) return 0n;
  return (a + b - 1n) / b;
}

/**
 * Apply a float multiplier to a BigInt without leaving BigInt-land.
 * Multiplies by (multiplier × 1e6) then divides by 1e6, ceiling.
 */
function applyMultiplier(value: bigint, multiplier: number): bigint {
  const factor = BigInt(Math.ceil(multiplier * 1_000_000));
  return ceilDiv(value * factor, 1_000_000n);
}

// ─── EVM ────────────────────────────────────────────────────────────

/**
 * Backend gas price response shape from `/v1/prices/gas/${chain}`.
 * Values are in **gwei** (numbers).
 */
export type BackendGasPriceResponse = {
  chainId?: string;
  gasPrice?: number;
  tokenPrice?: number;
  isEIP1559Supported?: boolean;
  maxFee?: number;
  baseFee?: number;
  priorityFee?: number;
};

/**
 * Convert a backend gas price response to a wei BigInt.
 * The backend returns gasPrice / maxFee in gwei.
 */
function backendGasPriceToWei(resp: BackendGasPriceResponse): bigint {
  const gweiValue = resp.isEIP1559Supported
    ? (resp.maxFee ?? resp.gasPrice ?? 30)
    : (resp.gasPrice ?? 30);
  // parseGwei handles decimal gwei values correctly
  return parseGwei(String(gweiValue));
}

/**
 * Calculate the gas reserve (in wei) for an EVM bridge/swap.
 */
export function calcEvmGasReserve(
  gasPriceWei: bigint,
  chainIdNum: number,
  operationType: string,
): bigint {
  const gasLimit = getEvmGasLimit(operationType, chainIdNum);
  const multiplier = getEvmGasMultiplier(operationType);
  const baseCost = gasPriceWei * gasLimit;
  // For OP-stack chains (Base, Optimism), add L1 data fee buffer.
  // Post EIP-4844 these are very small (~0.000005 ETH for swap calldata).
  const l1Buffer = isOpStackChain(chainIdNum) ? 8_000_000_000_000n : 0n;
  return applyMultiplier(baseCost, multiplier) + l1Buffer;
}

export type EvmMaxResult = {
  /** Max amount in smallest unit (wei), as a string. */
  maxAmountInteger: string;
  /** Max amount as a human-readable decimal string. */
  maxAmountDecimal: string;
  /** Gas reserve in wei. */
  reserveWei: bigint;
};

/**
 * Compute the max spendable amount for a native EVM token bridge/swap.
 *
 * @param balanceInteger      On-chain balance in smallest unit (from Holding.balanceInteger)
 * @param decimals            Token decimals (18 for ETH/MATIC/etc.)
 * @param chainIdNum          Numeric EVM chain ID
 * @param operationType       Key from EVM_GAS_LIMITS ('lifi_swap', 'lifi_bridge', etc.)
 * @param backendGasPrice     Gas price response from the backend API `/v1/prices/gas/${chain}`
 */
export function getEvmMaxNativeAmount(
  balanceInteger: string,
  decimals: number,
  chainIdNum: number,
  operationType: string,
  backendGasPrice?: BackendGasPriceResponse,
): EvmMaxResult {
  const balance = BigInt(balanceInteger);

  const gasPriceWei = backendGasPrice
    ? backendGasPriceToWei(backendGasPrice)
    : parseGwei('30'); // Conservative fallback: 30 gwei

  const reserveWei = calcEvmGasReserve(gasPriceWei, chainIdNum, operationType);
  const maxWei = balance > reserveWei ? balance - reserveWei : 0n;

  return {
    maxAmountInteger: maxWei.toString(),
    maxAmountDecimal: formatUnits(maxWei, decimals),
    reserveWei,
  };
}

// ─── Cosmos ─────────────────────────────────────────────────────────

/**
 * Cosmos pre-route max: subtract estimated fee (gasUnits × minGasPrice × multiplier).
 *
 * `minGasPrice` is the chain's configured minimum, expressed in the native
 * denom's smallest unit (e.g. 0.0025 for uosmo means 0.0025 uosmo per gas unit).
 * Since we do BigInt arithmetic, we scale by 1e12 to keep precision.
 */
export function getCosmosMaxNativeAmount(
  balanceInteger: string,
  chainId: string,
  isSwap: boolean,
  minGasPrice: number = 0.025,
): { maxAmountInteger: string; reserveUtokens: bigint } {
  const balance = BigInt(balanceInteger);
  const { gasUnits, multiplier } = getCosmosGasEstimate(chainId, isSwap);

  // Scale gasPrice to avoid float: gasPrice * 1e12, compute, then divide back
  const SCALE = 1_000_000_000_000n;
  const gasPriceScaled = BigInt(Math.ceil(minGasPrice * Number(SCALE)));
  const feeScaled = gasUnits * gasPriceScaled;
  const feeRaw = ceilDiv(feeScaled, SCALE);
  const reserveUtokens = applyMultiplier(feeRaw, multiplier);

  const max = balance > reserveUtokens ? balance - reserveUtokens : 0n;
  return { maxAmountInteger: max.toString(), reserveUtokens };
}

// ─── Solana ─────────────────────────────────────────────────────────

/**
 * Fetch live Solana priority fee (p75) via direct JSON-RPC.
 * Returns micro-lamports per compute unit.
 */
export async function fetchSolanaPriorityFee(
  rpcUrl: string,
): Promise<bigint> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getRecentPrioritizationFees',
        params: [],
      }),
    });
    const json = await response.json();
    const fees: Array<{ prioritizationFee: number }> = json.result ?? [];

    if (fees.length === 0) return SOL_PRIORITY_FEE_FALLBACK;

    const sorted = fees
      .map(f => f.prioritizationFee)
      .sort((a, b) => a - b);
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    return BigInt(p75 || Number(SOL_PRIORITY_FEE_FALLBACK));
  } catch {
    return SOL_PRIORITY_FEE_FALLBACK;
  }
}

/**
 * Check if a Solana ATA exists. Returns rent cost if it doesn't.
 */
async function getAtaRentIfNeeded(
  connection: Connection,
  owner: PublicKey,
  mint: string,
): Promise<bigint> {
  try {
    const ata = await getAssociatedTokenAddress(
      new PublicKey(mint),
      owner,
    );
    const info = await connection.getAccountInfo(ata);
    return info === null ? SOL_ATA_RENT_LAMPORTS : 0n;
  } catch {
    // If derivation fails, assume ATA will need creation
    return SOL_ATA_RENT_LAMPORTS;
  }
}

export type SolanaMaxResult = {
  maxAmountInteger: string;
  maxAmountDecimal: string;
  reserveLamports: bigint;
  breakdown: {
    walletRentExempt: bigint;
    wsolAtaRent: bigint;
    destAtaRent: bigint;
    baseFee: bigint;
    priorityFee: bigint;
    lifiBuffer: bigint;
  };
};

/**
 * Max spendable native SOL for a LiFi swap.
 *
 * @param balanceInteger   SOL balance in lamports (string from Holding.balanceInteger)
 * @param rpcUrl           Solana RPC URL
 * @param walletAddress    Wallet public key (base58 string)
 * @param destTokenMint    Destination token mint address
 */
export async function getSolanaMaxSwapAmount(
  balanceInteger: string,
  rpcUrl: string,
  walletAddress: string,
  destTokenMint: string,
): Promise<SolanaMaxResult> {
  const balance = BigInt(balanceInteger);
  const connection = new Connection(rpcUrl, 'confirmed');
  const walletPubkey = new PublicKey(walletAddress);

  // Check ATAs and priority fee in parallel.
  // wSOL ATA rent is needed temporarily during the swap even though LiFi
  // may close it afterwards — the simulation requires funds to cover it.
  const [priorityFeePerCU, wsolAtaRent, destAtaRent] = await Promise.all([
    fetchSolanaPriorityFee(rpcUrl),
    getAtaRentIfNeeded(connection, walletPubkey, WSOL_MINT),
    getAtaRentIfNeeded(connection, walletPubkey, destTokenMint),
  ]);

  const priorityFee = ceilDiv(
    priorityFeePerCU * SOL_LIFI_SWAP_CU,
    1_000_000n,
  );

  const total =
    SOL_WALLET_RENT_EXEMPT +
    wsolAtaRent +
    destAtaRent +
    SOL_BASE_FEE_LAMPORTS +
    priorityFee +
    SOL_LIFI_FIXED_BUFFER;

  const max = balance > total ? balance - total : 0n;

  return {
    maxAmountInteger: max.toString(),
    maxAmountDecimal: formatUnits(max, 9), // SOL has 9 decimals
    reserveLamports: total,
    breakdown: {
      walletRentExempt: SOL_WALLET_RENT_EXEMPT,
      wsolAtaRent,
      destAtaRent,
      baseFee: SOL_BASE_FEE_LAMPORTS,
      priorityFee,
      lifiBuffer: SOL_LIFI_FIXED_BUFFER,
    },
  };
}

// ─── Unified Entry Point ────────────────────────────────────────────

export type BridgeMaxSpendableParams = {
  /** On-chain balance in smallest units (Holding.balanceInteger). */
  balanceInteger: string;
  /** Token decimals. */
  decimals: number;
  /** Whether the source token is the chain's native gas token. */
  isNativeToken: boolean;
  /** Chain ecosystem. */
  chainType: 'evm' | 'cosmos' | 'solana';
  /** EVM numeric chain ID (required for EVM). */
  chainIdNum?: number;
  /** Cosmos chain ID string (required for Cosmos). */
  cosmosChainId?: string;
  /** Whether this is a same-chain swap vs cross-chain bridge. */
  isCrossChain?: boolean;
  /** Bridge provider — determines which gas table to use. */
  provider?: 'lifi' | 'skip';
  /** Gas price from the backend API `/v1/prices/gas/${chain}` (EVM only). */
  evmBackendGasPrice?: BackendGasPriceResponse;
  /** Solana RPC URL. */
  solanaRpcUrl?: string;
  /** Solana wallet address (base58). */
  solanaWalletAddress?: string;
  /** Destination token mint for Solana ATA rent check. */
  solanaDestMint?: string;
};

export type BridgeMaxSpendableResult = {
  /** Max amount in smallest units as a string (for quote API amountIn). */
  maxAmountInteger: string;
  /** Max amount as a human-readable decimal string (for UI input field). */
  maxAmountDecimal: string;
};

/**
 * Unified max spendable calculation for bridge/swap.
 *
 * For non-native tokens, returns the full balance (fees are paid in native token).
 * For native tokens, subtracts the estimated gas reserve.
 */
export async function getMaxBridgeSpendable(
  params: BridgeMaxSpendableParams,
): Promise<BridgeMaxSpendableResult> {
  const { balanceInteger, decimals, isNativeToken, chainType } = params;

  // Non-native tokens: full balance (gas paid from separate native balance)
  if (!isNativeToken) {
    return {
      maxAmountInteger: balanceInteger,
      maxAmountDecimal: formatUnits(BigInt(balanceInteger), decimals),
    };
  }

  // ── EVM native ────────────────────────────────────────────────
  if (chainType === 'evm') {
    const chainIdNum = params.chainIdNum ?? 1;
    const provider = params.provider ?? 'lifi';
    const isCross = params.isCrossChain ?? true;
    const opType =
      provider === 'lifi'
        ? isCross
          ? 'lifi_bridge'
          : 'lifi_swap'
        : isCross
          ? 'skipgo_evm_bridge'
          : 'skipgo_evm_swap';

    const result = getEvmMaxNativeAmount(
      balanceInteger,
      decimals,
      chainIdNum,
      opType,
      params.evmBackendGasPrice,
    );
    return {
      maxAmountInteger: result.maxAmountInteger,
      maxAmountDecimal: result.maxAmountDecimal,
    };
  }

  // ── Cosmos native ─────────────────────────────────────────────
  if (chainType === 'cosmos') {
    const cosmosChainId = params.cosmosChainId ?? '';
    const isSwap = !(params.isCrossChain ?? true); // same-chain = swap
    const result = getCosmosMaxNativeAmount(
      balanceInteger,
      cosmosChainId,
      isSwap,
    );
    return {
      maxAmountInteger: result.maxAmountInteger,
      maxAmountDecimal: formatUnits(BigInt(result.maxAmountInteger), decimals),
    };
  }

  // ── Solana native ─────────────────────────────────────────────
  if (chainType === 'solana') {
    if (params.solanaRpcUrl && params.solanaWalletAddress && params.solanaDestMint) {
      const result = await getSolanaMaxSwapAmount(
        balanceInteger,
        params.solanaRpcUrl,
        params.solanaWalletAddress,
        params.solanaDestMint,
      );
      return {
        maxAmountInteger: result.maxAmountInteger,
        maxAmountDecimal: result.maxAmountDecimal,
      };
    }

    // Fallback: subtract a conservative 0.01 SOL
    const balance = BigInt(balanceInteger);
    const reserve = 10_000_000n; // 0.01 SOL in lamports
    const max = balance > reserve ? balance - reserve : 0n;
    return {
      maxAmountInteger: max.toString(),
      maxAmountDecimal: formatUnits(max, 9),
    };
  }

  // Unknown chain type — return full balance
  return {
    maxAmountInteger: balanceInteger,
    maxAmountDecimal: formatUnits(BigInt(balanceInteger), decimals),
  };
}
