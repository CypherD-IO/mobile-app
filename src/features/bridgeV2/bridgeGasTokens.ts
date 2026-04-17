import { parseGwei } from 'viem';
import {
  calcEvmGasReserve,
  backendGasPriceToWei,
  type BackendGasPriceResponse,
} from './bridgeMaxSpendable';
import { getCosmosGasEstimate } from './bridgeGasLimits';
import { ALL_CHAINS, CHAIN_SOLANA } from '../../constants/server';
import { cosmosConfig } from '../../constants/cosmosConfig';

/**
 * Resolves the native gas token for a bridge source chain.
 *
 * Single source of truth:
 *   - EVM:   ALL_CHAINS (symbol), decimals fixed at 18
 *   - Cosmos: ALL_CHAINS → chainName → cosmosConfig (denom, gasPrice, decimals)
 *   - Solana: CHAIN_SOLANA (symbol), lamports decimals fixed at 9
 *
 * Never infer gas token from holdings or quote defaults; resolve via this
 * function so money-movement paths know exactly what denom gas is paid in.
 *
 * `chainId` format matches BridgeV2's internal ids:
 *   - EVM: stringified `chainIdNumber` (e.g. '1', '56', '8453')
 *   - Cosmos: chain_id string (e.g. 'cosmoshub-4', 'noble-1')
 *   - Solana: 'solana'
 */
export type BridgeGasTokenInfo = {
  symbol: string;
  decimals: number;
  /** On-chain denom (EVM has no denom — gas paid in native). */
  denom: string;
  /** Cosmos min gas price in smallest-unit-per-gas-unit (e.g. 0.025 uatom/gas). */
  cosmosMinGasPrice?: number;
};

const SOLANA_LAMPORTS_DECIMALS = 9;
const EVM_NATIVE_DECIMALS = 18;

/**
 * Cosmos gas symbol derived from denom. Strips leading 'u' micro-prefix
 * when present (uatom→ATOM, uusdc→USDC, ucore→CORE), otherwise uppercases
 * the raw denom (inj→INJ).
 */
function cosmosSymbolFromDenom(denom: string): string {
  if (denom.length > 1 && denom.startsWith('u')) {
    return denom.slice(1).toUpperCase();
  }
  return denom.toUpperCase();
}

export function getBridgeGasToken(
  chainId: string,
): BridgeGasTokenInfo | undefined {
  if (!chainId) return undefined;

  // Solana
  if (chainId === CHAIN_SOLANA.chain_id) {
    return {
      symbol: CHAIN_SOLANA.symbol,
      decimals: SOLANA_LAMPORTS_DECIMALS,
      denom: 'lamports',
    };
  }

  // EVM: bridge chainId is stringified chainIdNumber
  const chainIdNum = Number(chainId);
  if (Number.isFinite(chainIdNum) && chainIdNum > 0) {
    const evm = ALL_CHAINS.find(
      c => c.chainIdNumber === chainIdNum && c.chain_id.startsWith('0x'),
    );
    if (evm) {
      return {
        symbol: evm.symbol,
        decimals: EVM_NATIVE_DECIMALS,
        denom: 'native',
      };
    }
  }

  // Cosmos: bridge chainId matches ALL_CHAINS.chain_id, chainName keys cosmosConfig
  const cosmosChain = ALL_CHAINS.find(c => c.chain_id === chainId);
  if (cosmosChain) {
    const cfg = cosmosConfig[cosmosChain.chainName];
    if (cfg) {
      return {
        symbol: cosmosSymbolFromDenom(cfg.denom),
        decimals: cfg.contractDecimal,
        denom: cfg.denom,
        cosmosMinGasPrice: cfg.gasPrice,
      };
    }
  }

  return undefined;
}

/** Integer ceiling division. */
function ceilDiv(a: bigint, b: bigint): bigint {
  if (b === 0n) return 0n;
  return (a + b - 1n) / b;
}

function applyMultiplier(value: bigint, multiplier: number): bigint {
  const factor = BigInt(Math.ceil(multiplier * 1_000_000));
  return ceilDiv(value * factor, 1_000_000n);
}

/**
 * Solana native reserve fallback. Matches the conservative 0.01 SOL buffer
 * used in `getMaxBridgeSpendable`. A more accurate fee requires an on-chain
 * RPC round-trip which is not available in the pre-sign pipeline.
 */
const SOLANA_RESERVE_LAMPORTS = 10_000_000n;

export type CalcReserveParams = {
  /** Bridge `chainId` (see {@link getBridgeGasToken}). */
  chainId: string;
  chainType: 'evm' | 'cosmos' | 'solana' | 'tron';
  isCrossChain: boolean;
  provider: 'lifi' | 'skip';
  /** Required for EVM; from `/v1/prices/gas/${chain}` (may be undefined). */
  evmBackendGasPrice?: BackendGasPriceResponse;
};

/**
 * Compute the gas reserve for the source chain in the native gas token's
 * smallest unit (wei / utokens / lamports).
 *
 * Returns `null` if the chain is unsupported or no reserve can be computed.
 */
export function calcBridgeGasReserve(
  params: CalcReserveParams,
): bigint | null {
  const { chainId, chainType, isCrossChain, provider } = params;

  if (chainType === 'evm') {
    const chainIdNum = Number(chainId);
    if (!Number.isFinite(chainIdNum)) return null;
    const operationType =
      provider === 'skip'
        ? isCrossChain
          ? 'skipgo_evm_bridge'
          : 'skipgo_evm_swap'
        : isCrossChain
        ? 'lifi_bridge'
        : 'lifi_swap';
    const gasPriceWei = params.evmBackendGasPrice
      ? backendGasPriceToWei(params.evmBackendGasPrice)
      : parseGwei('30');
    return calcEvmGasReserve(gasPriceWei, chainIdNum, operationType);
  }

  if (chainType === 'cosmos') {
    const info = getBridgeGasToken(chainId);
    if (!info || info.cosmosMinGasPrice == null) return null;
    const { gasUnits, multiplier } = getCosmosGasEstimate(chainId, !isCrossChain);
    const SCALE = 1_000_000_000_000n;
    const gasPriceScaled = BigInt(
      Math.ceil(info.cosmosMinGasPrice * Number(SCALE)),
    );
    const feeScaled = gasUnits * gasPriceScaled;
    const feeRaw = ceilDiv(feeScaled, SCALE);
    return applyMultiplier(feeRaw, multiplier);
  }

  if (chainType === 'solana') {
    return SOLANA_RESERVE_LAMPORTS;
  }

  return null;
}
