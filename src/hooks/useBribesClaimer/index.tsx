/**
 * useBribesClaimer Hook
 *
 * Custom hook for interacting with the Election smart contract on Base chain
 * to claim bribe rewards from voting activities.
 *
 * Contract: 0x6a70dbBf029B00F177D697Bc549386A3b163c80F (Election)
 * Chain: Base (Chain ID: 8453 / 0x2105)
 *
 * This hook follows the same pattern as useRewardsDistributor and uses
 * useTransactionManager for executing contract calls on mobile.
 */

import * as Sentry from '@sentry/react-native';
import { useContext } from 'react';
import { encodeFunctionData } from 'viem';
import { get } from 'lodash';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { getViemPublicClient, getWeb3Endpoint } from '../../core/util';
import useTransactionManager from '../useTransactionManager';
import { ChainConfigMapping } from '../../constants/server';
import {
  ClaimBribesParams,
  ClaimBribesResult,
} from '../../models/bribesClaim.interface';

/**
 * Election Contract Address on Base mainnet
 * This contract implements the claimBribes function
 */
const ELECTION_CONTRACT = '0x6a70dbBf029B00F177D697Bc549386A3b163c80F' as const;

/**
 * ABI for the claimBribes function
 *
 * Function signature:
 * claimBribes(
 *   uint256 tokenId,
 *   address[] calldata bribeTokens,
 *   bytes32[] calldata candidates,
 *   uint256 from,
 *   uint256 until
 * )
 */
const ELECTION_ABI = [
  {
    name: 'claimBribes',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'bribeTokens',
        type: 'address[]',
        internalType: 'address[]',
      },
      {
        name: 'candidates',
        type: 'bytes32[]',
        internalType: 'bytes32[]',
      },
      {
        name: 'from',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'until',
        type: 'uint256',
        internalType: 'uint256',
      },
    ] as const,
    outputs: [],
  },
] as const;

/**
 * Custom hook for Election contract interactions (bribe claiming)
 * Uses the same pattern as useRewardsDistributor with useTransactionManager
 */
export default function useBribesClaimer() {
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const { executeTransferContract } = useTransactionManager();

  /**
   * Execute bribes claim contract call
   * Similar to executeRewardsClaimContract pattern
   *
   * @param params - ClaimBribesParams containing tokenId, bribeTokens, candidates, timestamps
   * @returns ClaimBribesResult with transaction hash or error
   */
  const executeBribesClaimContract = async (
    params: ClaimBribesParams,
  ): Promise<ClaimBribesResult> => {
    try {
      // Log the claim attempt for debugging
      console.log('🎯 Executing bribes claim contract call', {
        tokenId: params.tokenId,
        bribeTokensCount: params.bribeTokens.length,
        candidatesCount: params.candidates.length,
        fromTimestamp: params.fromTimestamp,
        untilTimestamp: params.untilTimestamp,
      });

      // Use Base mainnet chain
      const chain = 'base';
      const chainConfig = get(ChainConfigMapping, chain);

      if (!chainConfig) {
        console.error('❌ Chain config not found for Base');
        throw new Error('Chain configuration not found for Base');
      }

      params.onStatusUpdate?.('Preparing bribe claim transaction...');

      // Get public client for Base
      const publicClient = getViemPublicClient(
        getWeb3Endpoint(chainConfig, globalContext),
      );

      // Validate inputs before encoding
      if (params.bribeTokens.length === 0) {
        throw new Error('At least one bribe token must be specified');
      }
      if (params.candidates.length === 0) {
        throw new Error('At least one candidate must be specified');
      }
      if (params.fromTimestamp >= params.untilTimestamp) {
        throw new Error(
          'Invalid time range: from timestamp must be before until timestamp',
        );
      }

      // Encode the claimBribes function call
      const contractData = encodeFunctionData({
        abi: ELECTION_ABI,
        functionName: 'claimBribes',
        args: [
          BigInt(params.tokenId),
          params.bribeTokens as `0x${string}`[],
          params.candidates as `0x${string}`[],
          BigInt(params.fromTimestamp),
          BigInt(params.untilTimestamp),
        ],
      });

      console.log('✅ Contract data encoded successfully');
      params.onStatusUpdate?.('Submitting claim transaction...');

      // Execute the contract call using the transaction manager
      const resp = await executeTransferContract({
        publicClient,
        chain: chainConfig,
        amountToSend: '0', // No ETH needed for claim
        toAddress: ELECTION_CONTRACT,
        contractAddress: ELECTION_CONTRACT,
        contractDecimals: 18,
        contractData,
        isErc20: true, // Treat as ERC20 contract call
      });

      if (resp.isError) {
        console.error('❌ Contract execution failed', resp.error);
        throw new Error('Contract execution failed');
      }

      console.log('✅ Bribes claim transaction successful', {
        hash: resp.hash,
      });

      params.onStatusUpdate?.(
        'Transaction confirmed! Bribes claimed successfully.',
      );

      return {
        isError: false,
        hash: resp.hash,
        // Note: claimedAmounts would need to be parsed from transaction logs
        // For now, we return empty array - can be enhanced later
        claimedAmounts: [],
      };
    } catch (error) {
      console.error('❌ Error in executeBribesClaimContract:', error);
      Sentry.captureException(error, {
        tags: {
          component: 'useBribesClaimer',
          function: 'executeBribesClaimContract',
        },
        extra: {
          tokenId: params.tokenId,
          bribeTokensCount: params.bribeTokens.length,
          candidatesCount: params.candidates.length,
        },
      });

      return {
        isError: true,
        error,
      };
    }
  };

  /**
   * Main function to claim bribes
   * Wrapper around executeBribesClaimContract with additional validation
   *
   * @param params - ClaimBribesParams
   * @returns ClaimBribesResult
   */
  const claimBribes = async (
    params: ClaimBribesParams,
  ): Promise<ClaimBribesResult> => {
    try {
      console.log('🎁 Starting bribe claim process', {
        tokenId: params.tokenId,
        bribeTokensCount: params.bribeTokens.length,
        candidatesCount: params.candidates.length,
      });

      // Additional validation
      if (params.tokenId < 0) {
        throw new Error('Invalid token ID: must be a positive number');
      }

      // Ensure all addresses are properly formatted
      const invalidTokens = params.bribeTokens.filter(
        token => !token.startsWith('0x') || token.length !== 42,
      );
      if (invalidTokens.length > 0) {
        console.error('❌ Invalid bribe token addresses:', invalidTokens);
        throw new Error('Invalid bribe token address format');
      }

      const invalidCandidates = params.candidates.filter(
        candidate => !candidate.startsWith('0x') || candidate.length !== 66,
      );
      if (invalidCandidates.length > 0) {
        console.error(
          '❌ Invalid candidate IDs (should be bytes32):',
          invalidCandidates,
        );
        throw new Error('Invalid candidate ID format (expected bytes32)');
      }

      const result = await executeBribesClaimContract(params);

      if (!result.isError) {
        console.log('✅ Bribes claimed successfully', {
          hash: result.hash,
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Error claiming bribes:', error);
      Sentry.captureException(error, {
        tags: {
          component: 'useBribesClaimer',
          function: 'claimBribes',
        },
        extra: {
          tokenId: params.tokenId,
        },
      });

      return {
        isError: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  /**
   * Claim bribes for multiple veNFTs in batch
   * Executes claims sequentially and returns results for each
   *
   * @param paramsList - Array of ClaimBribesParams
   * @returns Array of ClaimBribesResult
   */
  const claimBribesBatch = async (
    paramsList: ClaimBribesParams[],
  ): Promise<ClaimBribesResult[]> => {
    console.log(
      `🎁 Starting batch bribe claim for ${paramsList.length} veNFTs`,
    );

    const results: ClaimBribesResult[] = [];

    for (let i = 0; i < paramsList.length; i++) {
      const params = paramsList[i];
      console.log(
        `📝 Processing claim ${i + 1}/${paramsList.length} for veNFT ${params.tokenId}`,
      );

      params.onStatusUpdate?.(
        `Claiming bribes for veNFT ${params.tokenId} (${i + 1}/${paramsList.length})...`,
      );

      try {
        const result = await claimBribes(params);
        results.push(result);

        // Small delay between transactions to avoid rate limiting
        if (i < paramsList.length - 1 && !result.isError) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(
          `❌ Failed to claim bribes for veNFT ${params.tokenId}:`,
          error,
        );
        results.push({
          isError: true,
          error,
        });
      }
    }

    const successCount = results.filter(r => !r.isError).length;
    console.log(
      `✅ Batch claim completed: ${successCount}/${paramsList.length} successful`,
    );

    return results;
  };

  return {
    /**
     * Claim bribes for a single veNFT
     */
    claimBribes,

    /**
     * Claim bribes for multiple veNFTs in batch
     */
    claimBribesBatch,

    /**
     * Execute bribes claim contract (same pattern as airdrop)
     */
    executeBribesClaimContract,

    /**
     * Election contract address
     */
    contractAddress: ELECTION_CONTRACT,
  };
}
