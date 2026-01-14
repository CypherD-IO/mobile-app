import { http, createPublicClient, zeroAddress, isAddress } from "viem";
import { CYPHER_TARGET_ROUTER_CONTRACT_ADDRESS } from "../constants/data";
import { isCosmosAddress, isNobleAddress, isOsmosisAddress, isSolanaAddress, isCoreumAddress, isInjectiveAddress } from "../utils/utils";
import { CHAIN_BASE, ChainBackendNames, CHAIN_HYPERLIQUID } from "../constants/server";
import * as Sentry from '@sentry/react-native';
import { TargetRouterABI } from '../constants/targetRouterABI';
import { initialGlobalState } from "../core/globalContext";
import { getWeb3Endpoint } from "../core/util";
import { COSMOS_ONLY_CHAINS, EVM_ONLY_CHAINS, SOLANA_ONLY_CHAINS } from "../constants/enum";



// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Error types that can occur during target address resolution and validation.
 * These help the consumer determine how to handle and display the error to users.
 */
export enum TargetAddressErrorType {
  /** Required parameters (programId, provider, chainName) are missing */
  MISSING_PARAMS = 'MISSING_PARAMS',
  /** Chain name is not recognized or supported */
  INVALID_CHAIN = 'INVALID_CHAIN',
  /** Failed to fetch address from the smart contract */
  FETCH_FAILED = 'FETCH_FAILED',
  /** Address from contract doesn't match the quote's target address */
  ADDRESS_MISMATCH = 'ADDRESS_MISMATCH',
}

/**
 * Parameters required for resolving and validating a card target address.
 */
export interface ResolveTargetAddressParams {
  /** The cypher card program identifier from the quote */
  programId: string | undefined | null;
  /** The card provider identifier */
  provider: string | undefined | null;
  /** The blockchain network name (e.g., 'ETH', 'POLYGON', 'SOLANA') */
  chainName: string | undefined | null;
  /** The target address provided in the quote (for validation) */
  quoteTargetAddress: string | undefined | null;
  /** Quote ID for error reporting and support reference */
  quoteId?: string;
}

/**
 * Successful result from target address resolution.
 */
export interface ResolveTargetAddressSuccess {
  success: true;
  /** The validated target address to use for the transaction */
  targetAddress: string;
}

/**
 * Failed result from target address resolution.
 */
export interface ResolveTargetAddressFailure {
  success: false;
  /** The type of error that occurred */
  errorType: TargetAddressErrorType;
  /** Human-readable error message for logging/debugging */
  errorMessage: string;
  /** User-friendly description suitable for display in error modals */
  userFriendlyMessage: string;
}

export type ResolveTargetAddressResult = ResolveTargetAddressSuccess | ResolveTargetAddressFailure;

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Public client for reading from the target router contract on Base chain.
 */
const publicClient = createPublicClient({
  transport: http(getWeb3Endpoint(CHAIN_BASE, { globalState: initialGlobalState, globalDispatch: () => {} })),
});

/**
 * Validates that an address is properly formatted for the given chain.
 *
 * @param address - The address to validate
 * @param chain - The chain family (ETH, SOLANA, COSMOS, etc.)
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
    case ChainBackendNames.HYPERLIQUID:
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
 * Maps a specific chain backend name to its chain family for target address lookup.
 * The target router contract uses chain families (ETH, OSMOSIS, SOLANA)
 * rather than individual chain names.
 *
 * @param chainName - The specific chain backend name (e.g., 'POLYGON', 'ARBITRUM')
 * @returns The chain family to use for contract lookup
 * @throws Error if the chain name is not recognized
 */
export function getChainFamilyForTargetLookup(chainName: string): ChainBackendNames {
  // EVM chains (including Hyperliquid which settles on Arbitrum) use ETH family
  if (EVM_ONLY_CHAINS.includes(chainName) || CHAIN_HYPERLIQUID.backendName === chainName) {
    return ChainBackendNames.ETH;
  }

  // Cosmos ecosystem chains use OSMOSIS family
  if (COSMOS_ONLY_CHAINS.includes(chainName)) {
    return ChainBackendNames.OSMOSIS;
  }

  // Solana chain family
  if (SOLANA_ONLY_CHAINS.includes(chainName)) {
    return ChainBackendNames.SOLANA;
  }

  throw new Error(`Unrecognized chain name for target lookup: ${chainName}`);
}

/**
 * Normalizes addresses for comparison based on chain type.
 * EVM addresses (including Hyperliquid which uses EVM-compatible addresses)
 * are case-insensitive, others are case-sensitive.
 *
 * @param address - The address to normalize
 * @param chainName - The chain backend name
 * @returns Normalized address string
 */
function normalizeAddressForComparison(address: string, chainName: string): string {
  // EVM chains and Hyperliquid use case-insensitive EVM addresses
  if (EVM_ONLY_CHAINS.includes(chainName) || chainName === CHAIN_HYPERLIQUID.backendName) {
    return address.toLowerCase();
  }
  return address;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Fetches the target address for a given card program, provider, and chain
 * from the smart contract.
 *
 * @param cardProgram - The card program identifier
 * @param provider - The provider identifier
 * @param chain - The chain family identifier (ETH, OSMOSIS, SOLANA)
 * @returns The target address string
 * @throws Error if arguments are missing or if the target address is not found
 */
export async function fetchCardTargetAddress(cardProgram: string, provider: string, chain: string): Promise<string> {
  try {
    if (!cardProgram || !provider || !chain) {
      throw new Error('Missing cardProgram/provider/chain for target lookup.');
    }

    const result = await publicClient.readContract({
      address: CYPHER_TARGET_ROUTER_CONTRACT_ADDRESS,
      abi: TargetRouterABI,
      functionName: 'targets',
      args: [cardProgram, provider, chain],
    });

    if (!isValidAddress(result, chain)) {
      throw new Error(`Target address not found in contract (returned invalid address: ${result}).`);
    }

    return result as string;
  } catch (err) {
    Sentry.captureException(err, {
      extra: { cardProgram, provider, chain },
    });
    const enrichedError = err instanceof Error ? err : new Error(String(err));
    (enrichedError as unknown as { context: { cardProgram: string; provider: string; chain: string } }).context = {
      cardProgram,
      provider,
      chain,
    };
    throw enrichedError;
  }
}

/**
 * Resolves and validates the target address for a card funding transaction.
 *
 * This function performs a complete security check by:
 * 1. Validating all required parameters are present
 * 2. Mapping the chain to its family for contract lookup
 * 3. Fetching the target address from the on-chain router contract
 * 4. Validating that the fetched address matches the quote's target address
 *
 * @param params - The parameters for target address resolution
 * @returns A result object indicating success with the target address, or failure with error details
 *
 * @example
 * ```typescript
 * const result = await resolveAndValidateCardTargetAddress({
 *   programId: quote.programId,
 *   provider: 'payce',
 *   chainName: 'POLYGON',
 *   quoteTargetAddress: quote.targetAddress,
 *   quoteId: quote.quoteId,
 * });
 *
 * if (result.success) {
 *   // Use result.targetAddress for the transaction
 * } else {
 *   // Handle error based on result.errorType
 *   showErrorModal(result.userFriendlyMessage);
 * }
 * ```
 */
export async function resolveAndValidateCardTargetAddress(
  params: ResolveTargetAddressParams,
): Promise<ResolveTargetAddressResult> {
  const { programId, provider, chainName, quoteTargetAddress, quoteId } = params;

  // --------------------------------------------------------------------------
  // Step 1: Validate required parameters
  // --------------------------------------------------------------------------
  if (!programId || !provider || !chainName) {
    const missingParams = [!programId && 'programId', !provider && 'provider', !chainName && 'chainName']
      .filter(Boolean)
      .join(', ');
    Sentry.captureMessage('Target address lookup validation failed - missing params', {
      level: 'warning',
      extra: {
        hasProgramId: !!programId,
        hasProvider: !!provider,
        hasChainName: !!chainName,
        quoteId,
      },
    });

    return {
      success: false,
      errorType: TargetAddressErrorType.MISSING_PARAMS,
      errorMessage: `Missing required parameters: ${missingParams}`,
      userFriendlyMessage: `We detected missing transaction details (${missingParams}). To protect your funds, this transaction has been stopped. Please contact Cypher support${
        quoteId ? ` with Quote ID: ${quoteId}` : ''
      }.`,
    };
  }

  // --------------------------------------------------------------------------
  // Step 2: Map chain to chain family
  // --------------------------------------------------------------------------
  let chainFamily: ChainBackendNames;
  try {
    chainFamily = getChainFamilyForTargetLookup(chainName);
  } catch (error) {
    Sentry.captureMessage('Target address lookup failed - invalid chain', {
      level: 'warning',
      extra: { chainName, quoteId },
    });

    return {
      success: false,
      errorType: TargetAddressErrorType.INVALID_CHAIN,
      errorMessage: `Invalid chain name: ${chainName}`,
      userFriendlyMessage: `Unsupported blockchain network. To protect your funds, this transaction has been stopped. Please contact Cypher support${
        quoteId ? ` with Quote ID: ${quoteId}` : ''
      }.`,
    };
  }

  // --------------------------------------------------------------------------
  // Step 3: Fetch target address from contract
  // --------------------------------------------------------------------------
  let contractAddress: string;
  try {
    contractAddress = await fetchCardTargetAddress(programId, provider, chainFamily);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Sentry.captureException(error, {
      extra: {
        quoteId,
        chainName,
        chainFamily,
        programId,
        provider,
        message: 'Target address lookup failed',
      },
    });

    return {
      success: false,
      errorType: TargetAddressErrorType.FETCH_FAILED,
      errorMessage: `Target address lookup failed: ${errorMessage}`,
      userFriendlyMessage: `We were unable to verify the destination address (${errorMessage}). To protect your funds, this transaction has been stopped. Please contact Cypher support${
        quoteId ? ` with Quote ID: ${quoteId}` : ''
      }.`,
    };
  }

  // --------------------------------------------------------------------------
  // Step 4: Validate address match
  // --------------------------------------------------------------------------
  if (!quoteTargetAddress) {
    return {
      success: false,
      errorType: TargetAddressErrorType.ADDRESS_MISMATCH,
      errorMessage: 'Quote target address is missing for validation',
      userFriendlyMessage: `We detected missing quote data for verification. To protect your funds, this transaction has been stopped. Please contact Cypher support${
        quoteId ? ` with Quote ID: ${quoteId}` : ''
      }.`,
    };
  }

  const normalizedContractAddress = normalizeAddressForComparison(contractAddress, chainName);
  const normalizedQuoteAddress = normalizeAddressForComparison(quoteTargetAddress, chainName);
  const isAddressMatch = normalizedContractAddress === normalizedQuoteAddress;

  if (!isAddressMatch) {
    Sentry.captureException(new Error('Target address mismatch between contract and quote'), {
      extra: {
        quoteId,
        chainName,
        programId,
        provider,
        contractAddress,
        quoteTargetAddress,
      },
    });

    return {
      success: false,
      errorType: TargetAddressErrorType.ADDRESS_MISMATCH,
      errorMessage: `Target address mismatch: Contract(${contractAddress}) vs Quote(${quoteTargetAddress})`,
      userFriendlyMessage: `We detected a mismatch in the destination address. To protect your funds, this transaction has been stopped. Please contact Cypher support${
        quoteId ? ` with Quote ID: ${quoteId}` : ''
      }.`,
    };
  }

  // --------------------------------------------------------------------------
  // Success: Address resolved and validated
  // --------------------------------------------------------------------------
  return {
    success: true,
    targetAddress: contractAddress,
  };
}
