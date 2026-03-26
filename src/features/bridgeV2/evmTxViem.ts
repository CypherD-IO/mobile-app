import {
  decodeFunctionData,
  encodeFunctionData,
  getAddress,
  hexToBigInt,
  isHex,
  type Hex,
} from 'viem';

/** ERC-20 `approve(spender, amount)` — LiFi / Skip payloads. */
const ERC20_APPROVE_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

/**
 * Backend may return calldata with or without `0x`. Normalize to a viem `Hex`.
 */
export function normalizeEvmCalldata(data: string): Hex {
  const trimmed = data.trim();
  const body =
    trimmed.startsWith('0x') || trimmed.startsWith('0X')
      ? trimmed.slice(2)
      : trimmed;
  const prefixed = `0x${body}` as Hex;
  if (!isHex(prefixed)) {
    throw new Error('Invalid EVM calldata');
  }
  return prefixed;
}

/**
 * Quote / tx `value` may be hex (`0x...`) or decimal string.
 */
export function parseEvmTxValueToBigInt(val: string | undefined): bigint {
  if (val === undefined || val === '') return 0n;
  const v = val.trim();
  if (v === '0') return 0n;
  if (isHex(v)) return hexToBigInt(v);
  return BigInt(v);
}

export function encodeErc20ApproveData(spender: string, amount: string): Hex {
  return encodeFunctionData({
    abi: ERC20_APPROVE_ABI,
    functionName: 'approve',
    args: [getAddress(spender as `0x${string}`), BigInt(amount)],
  });
}

/** If calldata is standard `approve(address,uint256)`, return spender + amount (decimal string). */
export function tryDecodeErc20ApproveCalldata(
  data: string | undefined,
): { spender: string; amount: string } | null {
  if (!data || data === '0x') return null;
  try {
    const hex = normalizeEvmCalldata(data);
    const decoded = decodeFunctionData({
      abi: ERC20_APPROVE_ABI,
      data: hex,
    });
    if (decoded.functionName !== 'approve') return null;
    const [spender, amountBn] = decoded.args;
    return {
      spender,
      amount: amountBn.toString(),
    };
  } catch {
    return null;
  }
}

export function normalizeEvmAddress(address: string): `0x${string}` {
  return getAddress(address as `0x${string}`);
}

/**
 * LiFi / ARCH quote `gasLimit` — use as a floor when estimating (hex or decimal string).
 * Adds 20% headroom so the signed tx is less likely to run out of gas vs simulation.
 */
export function bridgeTxMinGasFromQuote(gasLimitField: string | undefined): bigint | undefined {
  if (gasLimitField == null || String(gasLimitField).trim() === '') return undefined;
  try {
    const t = String(gasLimitField).trim();
    const base = t.startsWith('0x') || t.startsWith('0X') ? BigInt(t) : BigInt(t);
    if (base <= 0n) return undefined;
    return (base * 120n + 99n) / 100n;
  } catch {
    return undefined;
  }
}
