import { useEffect, useState } from 'react';
import type { PublicClient } from 'viem';

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

function isLikelyAddress(value: string | undefined): value is `0x${string}` {
  return Boolean(value && /^0x[0-9a-fA-F]{40}$/.test(value));
}

export function useTokenBalances(
  publicClient: PublicClient | undefined,
  tokenAddresses: readonly string[],
  ownerAddress: string | undefined,
): { balances: Map<string, bigint | null>; isLoading: boolean } {
  const [balances, setBalances] = useState<Map<string, bigint | null>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const key = `${ownerAddress ?? ''}|${tokenAddresses.map(t => t.toLowerCase()).join(',')}`;

  useEffect(() => {
    let cancelled = false;
    if (!publicClient || !isLikelyAddress(ownerAddress)) {
      setBalances(new Map());
      setIsLoading(false);
      return;
    }
    const validTokens = tokenAddresses.filter(isLikelyAddress);
    if (validTokens.length === 0) {
      setBalances(new Map());
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const fetchAll = async (): Promise<void> => {
      const results = await Promise.all(
        validTokens.map(async addr => {
          try {
            const value = await publicClient.readContract({
              address: addr,
              abi: ERC20_BALANCE_ABI,
              functionName: 'balanceOf',
              args: [ownerAddress],
            });
            return [addr.toLowerCase(), value] as const;
          } catch {
            return [addr.toLowerCase(), null] as const;
          }
        }),
      );
      if (cancelled) return;
      const next = new Map<string, bigint | null>();
      for (const [addr, value] of results) {
        next.set(addr, value);
      }
      setBalances(next);
      setIsLoading(false);
    };
    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [publicClient, key, ownerAddress, tokenAddresses]);

  return { balances, isLoading };
}
