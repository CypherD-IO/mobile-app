import { http, createPublicClient, zeroAddress, isAddress } from "viem";
import { CYPHER_TARGET_ROUTER_CONTRACT_ADDRESS } from "../constants/data";
import { isCosmosAddress, isNobleAddress, isOsmosisAddress, isSolanaAddress, isCoreumAddress, isInjectiveAddress } from "../utils/utils";
import { CHAIN_BASE, ChainBackendNames } from "../constants/server";
import * as Sentry from '@sentry/react';
import { TargetRouterABI } from '../constants/targetRouterABI';
import { initialGlobalState } from "../core/globalContext";
import { getWeb3Endpoint } from "../core/util";

const publicClient = createPublicClient({
  transport: http(getWeb3Endpoint(CHAIN_BASE, { globalState: initialGlobalState, globalDispatch: () => {} })),
});

const isValidAddress = (address: string | undefined | null, chain: string): boolean => {
  if (!address) return false;
  if (address === zeroAddress) return false;
  switch (chain) {
    case ChainBackendNames.ETH:
    case ChainBackendNames.POLYGON:
    case ChainBackendNames.BSC:
    case ChainBackendNames.AVALANCHE:
    case ChainBackendNames.ARBITRUM:
    case ChainBackendNames.OPTIMISM:
    case ChainBackendNames.ZKSYNC_ERA:
    case ChainBackendNames.BASE:
      return isAddress(address);

      case ChainBackendNames.SOLANA:
        return isSolanaAddress(address);
  
      case ChainBackendNames.COSMOS:
        return isCosmosAddress(address);
      
      case ChainBackendNames.OSMOSIS:
        return isOsmosisAddress(address);
      
      case ChainBackendNames.NOBLE:
        return isNobleAddress(address);
      
      case ChainBackendNames.COREUM:
        return isCoreumAddress(address);
  
      case ChainBackendNames.INJECTIVE:
        return isInjectiveAddress(address);
  
      default:
        return address.length > 0;
  }
};

/**
 * Fetches the target address for a given card program, provider, and chain
 * from the smart contract.
 *
 * @param cardProgram - The card program identifier
 * @param provider - The provider identifier
 * @param chain - The chain identifier
 * @returns The target address string
 * @throws Error if arguments are missing or if the target address is not found
 */
export async function fetchCardTargetAddress(
  cardProgram: string,
  provider: string,
  chain: string
): Promise<string> {
  try {
    if (!cardProgram || !provider || !chain) {
        console.error("fetchCardTargetAddress: Missing required arguments", { cardProgram, provider, chain });
        throw new Error('Missing cardProgram/provider/chain for target lookup.');
    }

    const result = await publicClient.readContract({
      abi: TargetRouterABI,
      address: CYPHER_TARGET_ROUTER_CONTRACT_ADDRESS,
      functionName: "targets", 
      args: [cardProgram, provider, chain],
    });

    if (!isValidAddress(result, chain)) {
      console.error("fetchCardTargetAddress: Invalid address returned from contract", { result, cardProgram, provider, chain });
      throw new Error("Target address not found in contract (returned empty or zero address).");
    }
    
    return result;
  } catch (err) {
    console.error("Error fetching target address:", err, { cardProgram, provider, chain });
    Sentry.captureException(err, {
      extra: { cardProgram, provider, chain }
    });
    const enrichedError = err instanceof Error ? err : new Error(String(err));
    (enrichedError as any).context = { cardProgram, provider, chain }
    throw enrichedError;
  }
}