const PERMIT2_ADDRESS = '0x000000000022d473030f116ddee9f6b43ac78ba3';

const UINT256_MAX = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
);
// eslint-disable-next-line no-bitwise
const UINT160_MAX = (1n << 160n) - 1n;
const UNLIMITED_THRESHOLD_256 = UINT256_MAX / 2n;
const UNLIMITED_THRESHOLD_160 = UINT160_MAX / 2n;

export type PermitKind = 'eip2612' | 'permit2-single' | 'permit2-batch';

export interface PermitItem {
  token: string;
  tokenSymbol?: string;
  decimals?: number;
  amount: bigint;
  isUnlimited: boolean;
  expiration?: number;
}

export interface NormalizedPermit {
  kind: PermitKind;
  spender: string;
  owner?: string;
  chainId?: number;
  deadline?: number;
  items: PermitItem[];
  raw: unknown;
}

function parseBigIntLoose(value: unknown): bigint | null {
  if (value === undefined || value === null) return null;
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(Math.trunc(value));
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      return trimmed.startsWith('0x') || trimmed.startsWith('0X')
        ? BigInt(trimmed)
        : BigInt(trimmed.split('.')[0]);
    }
  } catch {
    return null;
  }
  return null;
}

function parseNumberLoose(value: unknown): number | undefined {
  const big = parseBigIntLoose(value);
  if (big === null) return undefined;
  const num = Number(big);
  return Number.isFinite(num) ? num : undefined;
}

function lowerOrUndef(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim() || undefined;
}

export function parseEip712Json(jsonOrObj: unknown): Record<string, unknown> | null {
  if (jsonOrObj == null) return null;
  if (typeof jsonOrObj === 'string') {
    try {
      return JSON.parse(jsonOrObj);
    } catch {
      return null;
    }
  }
  if (typeof jsonOrObj === 'object') {
    return jsonOrObj as Record<string, unknown>;
  }
  return null;
}

export function parsePermitTypedData(
  typedDataJsonOrObj: unknown,
): NormalizedPermit | null {
  const data = parseEip712Json(typedDataJsonOrObj);
  if (!data) return null;

  const primaryType = lowerOrUndef(data.primaryType);
  const domain = (data.domain ?? {}) as Record<string, unknown>;
  const message = (data.message ?? {}) as Record<string, unknown>;
  const verifyingContract = lowerOrUndef(domain.verifyingContract)?.toLowerCase();
  const chainId = parseNumberLoose(domain.chainId);

  if (primaryType === 'permit') {
    if (verifyingContract === PERMIT2_ADDRESS) {
      return parsePermit2Single(data, domain, message, chainId);
    }
    return parseEip2612(data, domain, message, chainId);
  }
  if (primaryType === 'permitsingle') {
    return parsePermit2Single(data, domain, message, chainId);
  }
  if (primaryType === 'permitbatch') {
    return parsePermit2Batch(data, domain, message, chainId);
  }
  return null;
}

function parseEip2612(
  raw: unknown,
  domain: Record<string, unknown>,
  message: Record<string, unknown>,
  chainId: number | undefined,
): NormalizedPermit | null {
  const tokenContract = lowerOrUndef(domain.verifyingContract);
  const spender = lowerOrUndef(message.spender);
  if (!tokenContract || !spender) return null;
  const rawAllowed = message.allowed;
  const amount =
    typeof rawAllowed === 'boolean'
      ? rawAllowed
        ? UINT256_MAX
        : 0n
      : parseBigIntLoose(message.value ?? rawAllowed);
  const deadline = parseNumberLoose(message.deadline);
  if (amount === null) return null;
  return {
    kind: 'eip2612',
    spender,
    owner: lowerOrUndef(message.owner),
    chainId,
    deadline,
    items: [
      {
        token: tokenContract,
        tokenSymbol: lowerOrUndef(domain.name),
        amount,
        isUnlimited: amount >= UNLIMITED_THRESHOLD_256,
      },
    ],
    raw,
  };
}

function parsePermit2Single(
  raw: unknown,
  domain: Record<string, unknown>,
  message: Record<string, unknown>,
  chainId: number | undefined,
): NormalizedPermit | null {
  const spender = lowerOrUndef(message.spender);
  const details = (message.details ?? {}) as Record<string, unknown>;
  const token = lowerOrUndef(details.token);
  const amount = parseBigIntLoose(details.amount);
  if (!spender || !token || amount === null) return null;
  return {
    kind: 'permit2-single',
    spender,
    chainId,
    deadline: parseNumberLoose(message.sigDeadline ?? details.expiration),
    items: [
      {
        token,
        amount,
        isUnlimited: amount >= UNLIMITED_THRESHOLD_160,
        expiration: parseNumberLoose(details.expiration),
      },
    ],
    raw,
  };
}

function parsePermit2Batch(
  raw: unknown,
  domain: Record<string, unknown>,
  message: Record<string, unknown>,
  chainId: number | undefined,
): NormalizedPermit | null {
  const spender = lowerOrUndef(message.spender);
  if (!spender) return null;
  const detailsArr: Record<string, unknown>[] | null = Array.isArray(
    message.details,
  )
    ? (message.details as Record<string, unknown>[])
    : null;
  if (!detailsArr || detailsArr.length === 0) return null;
  const items: PermitItem[] = [];
  for (const entry of detailsArr) {
    const token = lowerOrUndef(entry.token);
    const amount = parseBigIntLoose(entry.amount);
    if (!token || amount === null) continue;
    items.push({
      token,
      amount,
      isUnlimited: amount >= UNLIMITED_THRESHOLD_160,
      expiration: parseNumberLoose(entry.expiration),
    });
  }
  if (items.length === 0) return null;
  return {
    kind: 'permit2-batch',
    spender,
    chainId,
    deadline: parseNumberLoose(message.sigDeadline),
    items,
    raw,
  };
}
