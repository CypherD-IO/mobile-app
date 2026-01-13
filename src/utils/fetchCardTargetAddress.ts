import { http, createPublicClient, zeroAddress, isAddress } from "viem";
import { CYPHER_TARGET_ROUTER_CONTRACT_ADDRESS } from "../constants/data";
import { isCosmosAddress, isNobleAddress, isOsmosisAddress, isSolanaAddress, isCoreumAddress, isInjectiveAddress } from "../utils/utils";
import { CHAIN_BASE, ChainBackendNames } from "../constants/server";
import * as Sentry from '@sentry/react';
import { TargetRouterABI } from '../constants/targetRouterABI';
import { initialGlobalState } from "../core/globalContext";
import { getWeb3Endpoint } from "../core/util";
import { hostWorker, PRODUCTION_ARCH_HOST } from "../global";
import { COSMOS_ONLY_CHAINS, EVM_ONLY_CHAINS, SOLANA_ONLY_CHAINS } from "../constants/enum";

const publicClient = createPublicClient({
  transport: http(getWeb3Endpoint(CHAIN_BASE, { globalState: initialGlobalState, globalDispatch: () => {} })),
});

/**
 * Validates if the given address is valid for the specified chain.
 * 
 * @param address - The address to validate
 * @param chain - The chain identifier to validate against
 * @returns True if the address is valid for the chain, false otherwise
 */
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
    const result = await publicClient.readContract({
      abi: TargetRouterABI,
      address: CYPHER_TARGET_ROUTER_CONTRACT_ADDRESS,
      functionName: "targets", 
      args: [cardProgram, provider, chain],
    });

    if (!isValidAddress(result, chain)) {
      console.error("fetchCardTargetAddress: Invalid address returned from contract", { result, cardProgram, provider, chain });
      throw new Error(`Target address not found in contract (returned invalid address: ${result}).`);
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

/**
 * Parameters required for target address verification
 */
export interface TargetAddressVerificationParams {
  programId: string | undefined;
  cardProvider: string | undefined;
  chain: string | undefined;
  targetAddress: string;
  quoteId: string;
}

/**
 * Result of target address verification
 */
export interface TargetAddressVerificationResult {
  isValid: boolean;
  targetAddress: string;
  error?: {
    type: 'MISSING_PARAMS' | 'FETCH_FAILED' | 'ADDRESS_MISMATCH';
    title: string;
    description: string;
  };
}

/**
 * Verifies and returns the target address for card funding transactions.
 * 
 * In production (ARCH_HOST === PRODUCTION_ARCH_HOST), performs full security verification:
 * - Validates that programId, cardProvider, and chain are present
 * - Fetches the target address from the smart contract
 * - Compares it with the quote's target address (case-insensitive for EVM chains)
 * 
 * In non-production environments (dev/staging), trusts the backend and returns
 * the quote's target address directly without contract verification.
 * 
 * @param params - The verification parameters from the quote
 * @returns TargetAddressVerificationResult with isValid status and target address or error details
 */
export async function fetchVerifiedCardTargetAddress(
  params: TargetAddressVerificationParams
): Promise<TargetAddressVerificationResult> {
  const { programId, cardProvider, chain, targetAddress, quoteId } = params;
  
  const currentArchHost = hostWorker.getHost('ARCH_HOST');
  const isProductionBackend = currentArchHost === PRODUCTION_ARCH_HOST;

  if (!isProductionBackend) {
    return {
      isValid: true,
      targetAddress: targetAddress,
    };
  }

  if (!programId || !cardProvider || !chain) {
    Sentry.captureMessage('Target address lookup validation failed', {
      level: 'warning',
      extra: {
        hasProgramId: !!programId,
        hasCardProvider: !!cardProvider,
        hasChain: !!chain,
        quoteId,
      },
    });

    return {
      isValid: false,
      targetAddress: '',
      error: {
        type: 'MISSING_PARAMS',
        title: 'Transaction Security Check Failed',
        description: `We detected missing transaction details (program/provider/chain). To protect your funds, this transaction has been stopped. Please contact Cypher support with Quote ID: ${quoteId}`,
      },
    };
  }

  let contractTargetAddress: string;
  try {
    let targetChain = "";
    if (EVM_ONLY_CHAINS.includes(chain)) {
      targetChain = ChainBackendNames.ETH;
    } else if (COSMOS_ONLY_CHAINS.includes(chain)) {
      targetChain = ChainBackendNames.OSMOSIS;
    } else if (SOLANA_ONLY_CHAINS.includes(chain)) {
      targetChain = ChainBackendNames.SOLANA;
    } else {
      throw new Error('Invalid chain name: ' + chain);
    }
    contractTargetAddress = await fetchCardTargetAddress(
      programId,
      cardProvider,
      targetChain,
    );
  } catch (error) {
    Sentry.captureException(error, {
      extra: {
        quoteId,
        chain,
        program: programId,
        provider: cardProvider,
        quoteAddress: targetAddress,
      },
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      isValid: false,
      targetAddress: '',
      error: {
        type: 'FETCH_FAILED',
        title: 'Transaction Security Check Failed',
        description: `We were unable to verify the destination address (${errorMessage}). To protect your funds, this transaction has been stopped. Please contact Cypher support with Quote ID: ${quoteId}`,
      },
    };
  }

  let isAddressMatch = false;
  if (EVM_ONLY_CHAINS.includes(chain)) {
    const normalizedContractAddress = contractTargetAddress.toLowerCase();
    const normalizedQuoteAddress = targetAddress.toLowerCase();
    isAddressMatch = normalizedContractAddress === normalizedQuoteAddress;
  } else {
    isAddressMatch = contractTargetAddress === targetAddress;
  }

  if (!isAddressMatch) {
    const mismatchError = new Error("Target address mismatch between contract and quote");
    Sentry.captureException(mismatchError, {
      extra: {
        quoteId,
        chain,
        program: programId,
        provider: cardProvider,
        quoteAddress: targetAddress,
        contractAddress: contractTargetAddress,
      },
    });

    return {
      isValid: false,
      targetAddress: '',
      error: {
        type: 'ADDRESS_MISMATCH',
        title: 'Transaction Security Check Failed',
        description: `We detected a mismatch in the destination address. To protect your funds, this transaction has been stopped. Please contact Cypher support with Quote ID: ${quoteId}`,
      },
    };
  }

  return {
    isValid: true,
    targetAddress: contractTargetAddress,
  };
}
