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

export function useTokenBalanceForApprove(
  publicClient: PublicClient | undefined,
  tokenAddress: string | undefined,
  ownerAddress: string | undefined,
): { balanceRaw: bigint | null; isLoading: boolean } {
  const [balanceRaw, setBalanceRaw] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!publicClient || !isLikelyAddress(tokenAddress) || !isLikelyAddress(ownerAddress)) {
      setBalanceRaw(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    publicClient
      .readContract({
        address: tokenAddress,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [ownerAddress],
      })
      .then(result => {
        if (cancelled) return;
        setBalanceRaw(result);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setBalanceRaw(null);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [publicClient, tokenAddress, ownerAddress]);

  return { balanceRaw, isLoading };
}
