/**
 * Human-readable summaries for EVM / Solana sign-review (minimal raw hex/base64).
 */

import { Transaction, VersionedTransaction } from '@solana/web3.js';
import { formatEther, formatUnits } from 'viem';

const EVM_CHAIN_PRETTY: Record<string, string> = {
  '1': 'Ethereum',
  '10': 'Optimism',
  '56': 'BNB Chain',
  '137': 'Polygon',
  '324': 'zkSync Era',
  '8453': 'Base',
  '42161': 'Arbitrum One',
  '43114': 'Avalanche C-Chain',
};

export function shortEvmAddr(addr: string, head = 8, tail = 6): string {
  const a = (addr || '').toLowerCase();
  if (!a.startsWith('0x') || a.length <= head + tail + 2) return addr;
  return `${a.slice(0, 2 + head)}…${a.slice(-tail)}`;
}

export function evmChainPrettyName(chainId: string): string {
  return EVM_CHAIN_PRETTY[chainId] ?? `Chain ${chainId}`;
}

const UINT256_MAX = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
);

function trimAmountZeros(amount: string): string {
  if (!amount.includes('.')) return amount;
  const t = amount.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  return t.endsWith('.') ? t.slice(0, -1) : t;
}

/**
 * Human-readable ERC-20 `approve` amount.
 * With `decimals` + `symbol`, shows e.g. `1.5 USDC` instead of raw base units.
 */
export function formatErc20ApprovalAmount(
  raw: string,
  decimals?: number,
  symbol?: string,
): string {
  const s = (raw || '0').trim();
  const sym = symbol?.trim();
  try {
    const v = BigInt(s);
    if (v === UINT256_MAX) {
      return sym ? `Unlimited · ${sym}` : 'Unlimited (max allowance)';
    }
    if (v === 0n) return sym ? `0 ${sym}` : '0';
    if (
      decimals != null &&
      Number.isInteger(decimals) &&
      decimals >= 0 &&
      decimals <= 78
    ) {
      const human = trimAmountZeros(formatUnits(v, decimals));
      return sym ? `${human} ${sym}` : human;
    }
    if (v < 10_000_000_000_000_000_000n) {
      const base = v.toString();
      return sym ? `${base} (raw units) · ${sym}` : base;
    }
    return `${s.slice(0, 14)}… (raw)`;
  } catch {
    return s.length > 24 ? `${s.slice(0, 24)}…` : s;
  }
}

export function formatEvmNativeValue(valueWei: string): string {
  try {
    const v = BigInt(valueWei || '0');
    if (v === 0n) return '0 (no native value)';
    return `${formatEther(v)} (native token)`;
  } catch {
    return valueWei || '—';
  }
}

/** First bytes of calldata for power users; keep short. */
export function evmCalldataPreview(dataHex: string, maxChars = 180): string {
  const d = dataHex?.startsWith('0x') ? dataHex : `0x${dataHex ?? ''}`;
  if (d.length <= maxChars) return d;
  return `${d.slice(0, maxChars)}… (${d.length} chars total)`;
}

function shortSolAddr(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export type SolanaTxSummary = {
  summaryRows: { label: string; value: string }[];
  narrative: string;
  /** Truncated fee payer for inline signer row */
  feePayerShort?: string;
  instructionCount?: number;
};

export function summarizeSolanaSerializedBase64(base64: string): SolanaTxSummary {
  try {
    const buf = Buffer.from(base64, 'base64');
    const u8 = Uint8Array.from(buf);

    try {
      const vt = VersionedTransaction.deserialize(u8);
      const keys = vt.message.staticAccountKeys.map(k => k.toBase58());
      const feePayer = keys[0] ?? '—';
      const numIx = vt.message.compiledInstructions.length;
      return {
        summaryRows: [
          { label: 'Fee payer', value: shortSolAddr(feePayer, 8, 6) },
          { label: 'Instructions', value: String(numIx) },
          { label: 'Format', value: 'Versioned (v0)' },
        ],
        narrative: `You are signing a Solana transaction with ${numIx} instruction(s). The fee payer account is ${shortSolAddr(feePayer, 8, 6)}. Swipe to confirm only if you intended this bridge or swap.`,
        feePayerShort: shortSolAddr(feePayer, 10, 6),
        instructionCount: numIx,
      };
    } catch {
      const legacy = Transaction.from(buf);
      const feePayer = legacy.feePayer?.toBase58() ?? legacy.signatures?.[0]?.publicKey?.toBase58() ?? '—';
      const numIx = legacy.instructions?.length ?? 0;
      return {
        summaryRows: [
          { label: 'Fee payer', value: shortSolAddr(feePayer, 8, 6) },
          { label: 'Instructions', value: String(numIx) },
          { label: 'Format', value: 'Legacy' },
        ],
        narrative: `You are signing a legacy Solana transaction with ${numIx} instruction(s). Swipe to confirm only if you intended this bridge or swap.`,
        feePayerShort: shortSolAddr(feePayer, 10, 6),
        instructionCount: numIx,
      };
    }
  } catch {
    return {
      summaryRows: [
        { label: 'Serialized size', value: `${base64.length} chars (base64)` },
      ],
      narrative:
        'We could not decode this Solana transaction. Only swipe to sign if you trust this route and expected a Solana step.',
      instructionCount: undefined,
    };
  }
}
